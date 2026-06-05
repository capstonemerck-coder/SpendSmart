"""
Upload Service — validates and ingests CSV/XLSX files.

Covers two distinct ingestion flows:

DATA_FACT / MODEL_FACT (direct ingest):
  1. Parse file (CSV or XLSX)
  2. Validate schema (required columns, dtypes)
  3. Detect duplicates
  4. Transactional batch insert
  5. Create upload audit record

Channel Parameter (two-step parse/commit):
  1. POST /uploads/parse  — parses file, creates pending Upload + ChannelParameter rows
  2. POST /uploads/commit — marks Upload as 'success', making the data active
"""
from __future__ import annotations

import io
import logging
from math import ceil
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError, UploadError
from app.core.exceptions import ValidationError as AppValidationError
from app.models.models import (
    ChannelParameter, CycleDef, DataFact, ModelFact, SubchannelParameter, Upload,
)
from app.schemas.schemas import (
    ChannelParamOut, PaginatedUploads, SubchannelParamOut, UploadCommitIn,
    UploadOut, UploadPreviewOut,
)

logger = logging.getLogger(__name__)

# Required columns for channel parameter files.
CHANNEL_PARAM_REQUIRED = ["channel_name", "subchannel_name", "roi_coefficient", "min_spend", "max_spend"]

# ── Required column definitions ───────────────────────────────────────────────

DATA_FACT_REQUIRED = {
    "cycle_id": str,
    "date": "date",
    "channel": str,
    "sub_channel": str,
    "variable": str,
    "spend": float,
    "reach": float,
    "value": float,
}

MODEL_FACT_REQUIRED = {
    "cycle_id": str,
    "variable": str,
    "channel": str,
    "sub_channel": str,
    "category": str,
    "estimate": float,
    "curve_type": str,
    "curvature": float,
    "adstock_rate": float,
    "adstock_horizon": int,
    "p_value": float,
    "impactable_sales_pct": float,
    "base_sales": float,
}

NUMERIC_COLS_DATA = {"spend", "reach", "value", "price"}
NUMERIC_COLS_MODEL = {
    "estimate", "curvature", "adstock_rate", "adstock_horizon",
    "p_value", "impactable_sales_pct", "base_sales",
}


class UploadService:
    """Handles file parsing, validation and DB ingestion."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_upload(
        self,
        file_bytes: bytes,
        filename: str,
        is_datafile: bool,
        cycle_id: Optional[str],
        uploaded_by: Optional[int],
        metadata_id: Optional[int] = None,
        target_variable: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full upload pipeline.

        Args:
            file_bytes:       Raw file content.
            filename:         Original filename.
            is_datafile:      True for DATA_FACT, False for MODEL_FACT.
            cycle_id:         Optional cycle identifier. If not provided, inferred from file.
            uploaded_by:      User ID who performed the upload.
            metadata_id:      Optional metadata ID for linking to Market/Brand/Indication context.
            target_variable:  Optional target variable name (for MODEL_FACT uploads).

        Returns:
            Dict with upload_id, status, row_count, errors, warnings.
        """
        errors: List[Dict] = []
        warnings: List[str] = []

        # ── Parse file ────────────────────────────────────────────────────────
        try:
            df = self._parse_file(file_bytes, filename)
        except Exception as exc:
            raise UploadError(f"Could not parse file: {exc}") from exc

        if df.empty:
            raise UploadError("Uploaded file contains no data rows.")

        # ── Validate schema ───────────────────────────────────────────────────
        schema_errors = self._validate_schema(df, is_datafile)
        if schema_errors:
            return await self._fail_upload(
                filename=filename,
                is_datafile=is_datafile,
                cycle_id=cycle_id,
                uploaded_by=uploaded_by,
                errors=schema_errors,
            )

        # ── Clean and coerce types ─────────────────────────────────────────────
        df, type_errors = self._coerce_types(df, is_datafile)
        errors.extend(type_errors)
        if type_errors:
            return await self._fail_upload(
                filename=filename,
                is_datafile=is_datafile,
                cycle_id=cycle_id,
                uploaded_by=uploaded_by,
                errors=type_errors,
            )

        # ── Detect/handle duplicates ───────────────────────────────────────────
        orig_len = len(df)
        df = df.drop_duplicates()
        if len(df) < orig_len:
            warnings.append(
                f"{orig_len - len(df)} duplicate rows removed."
            )

        # ── Resolve cycle_id — use passed value or auto-detect from file ────────
        resolved_cycle_id = cycle_id or (
            str(df["cycle_id"].iloc[0]) if "cycle_id" in df.columns and not df.empty else None
        )

        # ── Ensure cycle exists in cycle_def before Upload references it ────────
        if resolved_cycle_id:
            await self._ensure_cycle(resolved_cycle_id, metadata_id)

        # ── Create upload audit record ─────────────────────────────────────────
        upload = Upload(
            cycle_id=resolved_cycle_id,
            is_datafile=is_datafile,
            filename=filename,
            file_size_bytes=len(file_bytes),
            row_count=len(df),
            status="processing",
            uploaded_by=uploaded_by,
        )
        self.db.add(upload)
        await self.db.flush()  # get upload.upload_id

        # ── Ingest rows ────────────────────────────────────────────────────────
        try:
            if is_datafile:
                await self._ingest_data_fact(df, upload.upload_id)
            else:
                await self._ingest_model_fact(df, upload.upload_id)
                if target_variable and cycle_id:
                    await self._update_cycle_target_variable(cycle_id, target_variable)

            upload.status = "success"
            await self.db.flush()

        except Exception as exc:
            upload.status = "failed"
            upload.error_message = str(exc)
            await self.db.flush()
            raise UploadError(f"Ingestion failed: {exc}") from exc

        return {
            "upload_id": upload.upload_id,
            "cycle_id": upload.cycle_id,
            "is_datafile": is_datafile,
            "filename": filename,
            "row_count": len(df),
            "status": "success",
            "errors": errors,
            "warnings": warnings,
            "message": f"Successfully ingested {len(df)} rows.",
        }

    # ── Parsing ───────────────────────────────────────────────────────────────

    def _parse_file(self, file_bytes: bytes, filename: str) -> pd.DataFrame:
        fname = filename.lower()
        if fname.endswith(".csv"):
            return pd.read_csv(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
        elif fname.endswith((".xlsx", ".xls")):
            return pd.read_excel(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
        else:
            raise UploadError("Unsupported file format. Only CSV and XLSX are accepted.")

    # ── Schema validation ─────────────────────────────────────────────────────

    def _validate_schema(self, df: pd.DataFrame, is_datafile: bool) -> List[Dict]:
        required = DATA_FACT_REQUIRED if is_datafile else MODEL_FACT_REQUIRED
        missing = [col for col in required if col not in df.columns]
        extra = [col for col in df.columns if col not in required]

        errors = []
        if missing:
            errors.append({
                "field": "schema",
                "message": f"Missing required columns: {missing}",
                "row": None,
            })
        if extra:
            # Extra columns are warnings, not errors
            pass
        return errors

    # ── Type coercion ──────────────────────────────────────────────────────────

    def _coerce_types(
        self, df: pd.DataFrame, is_datafile: bool
    ) -> Tuple[pd.DataFrame, List[Dict]]:
        errors = []
        numeric_cols = NUMERIC_COLS_DATA if is_datafile else NUMERIC_COLS_MODEL

        for col in numeric_cols:
            if col not in df.columns:
                continue
            coerced = pd.to_numeric(df[col], errors="coerce")
            bad_rows = df.index[coerced.isna() & df[col].notna()].tolist()
            if bad_rows:
                errors.append({
                    "field": col,
                    "message": f"Non-numeric values in column '{col}' at rows {bad_rows[:5]}",
                    "row": bad_rows[0] if bad_rows else None,
                })
            df[col] = coerced

        if is_datafile and "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], errors="coerce", format="%Y-%m-%d")
            bad = df.index[df["date"].isna()].tolist()
            if bad:
                errors.append({
                    "field": "date",
                    "message": f"Invalid date format at rows {bad[:5]}. Expected YYYY-MM-DD.",
                    "row": bad[0],
                })

        return df, errors

    # ── Ingestion ─────────────────────────────────────────────────────────────

    async def _ingest_data_fact(self, df: pd.DataFrame, upload_id: int) -> None:
        rows = []
        for _, row in df.iterrows():
            rows.append(DataFact(
                cycle_id=str(row.get("cycle_id", "")),
                date=row.get("date") if not pd.isna(row.get("date", pd.NaT)) else None,
                category=str(row.get("category", "")) or None,
                channel=str(row.get("channel", "")) or None,
                sub_channel=str(row.get("sub_channel", "")) or None,
                variable=str(row.get("variable", "")) or None,
                spend=self._safe_float(row.get("spend")),
                reach=self._safe_float(row.get("reach")),
                value=self._safe_float(row.get("value")),
                price=self._safe_float(row.get("price")),
                upload_id=upload_id,
            ))
            if len(rows) >= 500:
                self.db.add_all(rows)
                await self.db.flush()
                rows = []
        if rows:
            self.db.add_all(rows)
            await self.db.flush()

    async def _ingest_model_fact(self, df: pd.DataFrame, upload_id: int) -> None:
        rows = []
        for _, row in df.iterrows():
            rows.append(ModelFact(
                cycle_id=str(row.get("cycle_id", "")),
                variable=str(row.get("variable", "")) or None,
                channel=str(row.get("channel", "")) or None,
                sub_channel=str(row.get("sub_channel", "")) or None,
                category=str(row.get("category", "")) or None,
                estimate=self._safe_float(row.get("estimate")),
                curve_type=str(row.get("curve_type", "")) or None,
                curvature=self._safe_float(row.get("curvature")),
                adstock_rate=self._safe_float(row.get("adstock_rate")),
                adstock_horizon=self._safe_int(row.get("adstock_horizon")),
                p_value=self._safe_float(row.get("p_value")),
                impactable_sales_pct=self._safe_float(row.get("impactable_sales_pct")),
                base_sales=self._safe_float(row.get("base_sales")),
                upload_id=upload_id,
            ))
            if len(rows) >= 500:
                self.db.add_all(rows)
                await self.db.flush()
                rows = []
        if rows:
            self.db.add_all(rows)
            await self.db.flush()

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _ensure_cycle(self, cycle_id: str, metadata_id: Optional[int] = None) -> None:
        """
        Create cycle if it doesn't exist. If metadata_id is provided, link it to the cycle.

        Args:
            cycle_id:    Cycle identifier.
            metadata_id: Optional metadata ID to link (Market/Brand/Indication context).
        """
        exists = await self.db.execute(
            select(CycleDef).where(CycleDef.cycle_id == cycle_id)
        )
        cycle = exists.scalar_one_or_none()
        if cycle is None:
            cycle = CycleDef(cycle_id=cycle_id, metadata_id=metadata_id)
            self.db.add(cycle)
        elif metadata_id and not cycle.metadata_id:
            cycle.metadata_id = metadata_id
        await self.db.flush()

    async def _update_cycle_target_variable(self, cycle_id: str, target_variable: str) -> None:
        """
        Update the target_variable field on a CycleDef row.

        Args:
            cycle_id:         Cycle identifier.
            target_variable:  Name of the target variable for this cycle.
        """
        result = await self.db.execute(
            select(CycleDef).where(CycleDef.cycle_id == cycle_id)
        )
        cycle = result.scalar_one_or_none()
        if cycle:
            cycle.target_variable = target_variable
            await self.db.flush()

    async def _fail_upload(
        self,
        filename: str,
        is_datafile: bool,
        cycle_id: Optional[str],
        uploaded_by: Optional[int],
        errors: List[Dict],
    ) -> Dict:
        upload = Upload(
            cycle_id=cycle_id,
            is_datafile=is_datafile,
            filename=filename,
            status="failed",
            error_message=str(errors),
            uploaded_by=uploaded_by,
        )
        self.db.add(upload)
        await self.db.flush()
        return {
            "upload_id": upload.upload_id,
            "cycle_id": cycle_id,
            "is_datafile": is_datafile,
            "filename": filename,
            "row_count": 0,
            "status": "failed",
            "errors": errors,
            "warnings": [],
            "message": "Upload failed due to validation errors.",
        }

    @staticmethod
    def _safe_float(v: Any) -> Optional[float]:
        try:
            return float(v) if v is not None and str(v).strip() != "" else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _safe_int(v: Any) -> Optional[int]:
        try:
            return int(float(v)) if v is not None and str(v).strip() != "" else None
        except (ValueError, TypeError):
            return None


# ── Channel parameter two-step flow ───────────────────────────────────────────

def _parse_file_bytes(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Parse raw bytes into a DataFrame, supporting CSV and XLSX.

    Args:
        file_bytes: Raw file content.
        filename:   Original filename (used to detect format via extension).

    Returns:
        DataFrame with all columns as strings (dtype=str).

    Raises:
        AppValidationError: If the file format is not .csv or .xlsx.
    """
    name = filename.lower()
    if name.endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    elif name.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    else:
        raise AppValidationError("Only CSV and XLSX files are supported.")


def _safe_float_val(v: Any) -> Optional[float]:
    """Convert a value to float, returning None on failure."""
    try:
        return float(v) if v is not None and str(v).strip() != "" else None
    except (ValueError, TypeError):
        return None


async def parse_channel_params_file(
    file_bytes: bytes,
    filename: str,
    cycle_id: str,
    uploaded_by: int,
    db: AsyncSession,
) -> UploadPreviewOut:
    """
    Parse a channel parameter file and create a pending upload record.

    Expects columns: channel_name, subchannel_name, roi_coefficient, min_spend, max_spend.
    Each row represents one subchannel. Channel-level parameters are aggregated
    (average ROI, summed spend bounds) from their subchannel rows.

    Creates a pending Upload record and the associated ChannelParameter /
    SubchannelParameter rows. The data is NOT active until commit_channel_params_upload
    is called with the returned upload_record_id.

    Args:
        file_bytes:  Raw file content.
        filename:    Original filename (used for format detection and audit trail).
        cycle_id:    Identifier of the planning cycle this upload belongs to.
        uploaded_by: user_id of the authenticated uploader.
        db:          Async database session.

    Returns:
        UploadPreviewOut containing the upload_record_id and parsed channel hierarchy.

    Raises:
        AppValidationError: For unsupported file format, missing required columns,
                            or invalid data values.
        NotFoundError:      If the specified cycle_id does not exist.
    """
    # Validate file size is handled in the endpoint; format check is here.
    df = _parse_file_bytes(file_bytes, filename)

    if df.empty:
        raise AppValidationError("Uploaded file contains no data rows.")

    # Normalize column names: strip whitespace, lower-case.
    df.columns = [c.strip().lower() for c in df.columns]

    missing_cols = [c for c in CHANNEL_PARAM_REQUIRED if c not in df.columns]
    if missing_cols:
        raise AppValidationError(
            f"Missing required columns: {', '.join(missing_cols)}. "
            f"Required: {', '.join(CHANNEL_PARAM_REQUIRED)}"
        )

    # Strip whitespace from string columns.
    for col in ["channel_name", "subchannel_name"]:
        df[col] = df[col].str.strip()

    # Row-level validation: collect all errors, then raise if any exist.
    errors: List[str] = []
    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed + 1 for header row
        channel = str(row["channel_name"])
        sub = str(row["subchannel_name"])
        roi = _safe_float_val(row["roi_coefficient"])
        min_s = _safe_float_val(row["min_spend"])
        max_s = _safe_float_val(row["max_spend"])

        if not channel:
            errors.append(f"Row {row_num}: channel_name is required.")
        if not sub:
            errors.append(f"Row {row_num}: subchannel_name is required.")
        if roi is None or roi <= 0:
            errors.append(
                f"Row {row_num}: roi_coefficient must be > 0 (got '{row['roi_coefficient']}')."
            )
        if min_s is None or min_s < 0:
            errors.append(f"Row {row_num}: min_spend must be >= 0.")
        if max_s is None:
            errors.append(f"Row {row_num}: max_spend is required.")
        elif min_s is not None and max_s < min_s:
            errors.append(
                f"Row {row_num}: max_spend ({max_s}) must be >= min_spend ({min_s})."
            )

    if errors:
        # Surface the first five errors; truncate with count if more.
        displayed = errors[:5]
        suffix = f" (+{len(errors) - 5} more)" if len(errors) > 5 else ""
        raise AppValidationError("; ".join(displayed) + suffix)

    # Verify the cycle exists before creating any records.
    cycle_result = await db.execute(
        select(CycleDef).where(CycleDef.cycle_id == cycle_id)
    )
    if not cycle_result.scalar_one_or_none():
        raise NotFoundError(f"Cycle '{cycle_id}' not found.")

    # Create a pending Upload audit record.
    upload = Upload(
        cycle_id=cycle_id,
        is_datafile=False,
        upload_type="channel_params",
        filename=filename,
        file_size_bytes=len(file_bytes),
        row_count=len(df),
        status="pending",
        uploaded_by=uploaded_by,
    )
    db.add(upload)
    await db.flush()  # generates upload.upload_id

    # Group rows by channel and create ChannelParameter / SubchannelParameter records.
    channel_params_out: List[ChannelParamOut] = []

    for channel_name, group in df.groupby("channel_name", sort=False):
        rois = [r for r in (
            _safe_float_val(v) for v in group["roi_coefficient"]
        ) if r is not None]
        avg_roi = sum(rois) / len(rois) if rois else 0.0
        total_min = sum(_safe_float_val(v) or 0.0 for v in group["min_spend"])
        total_max = sum(_safe_float_val(v) or 0.0 for v in group["max_spend"])

        channel_param = ChannelParameter(
            upload_id=upload.upload_id,
            cycle_id=cycle_id,
            channel_name=str(channel_name),
            roi_coefficient=avg_roi,
            min_spend=total_min,
            max_spend=total_max,
        )
        db.add(channel_param)
        await db.flush()  # generates channel_param.id

        subchannels_out: List[SubchannelParamOut] = []
        for _, sub_row in group.iterrows():
            roi_val = _safe_float_val(sub_row["roi_coefficient"]) or 0.0
            min_val = _safe_float_val(sub_row["min_spend"]) or 0.0
            max_val = _safe_float_val(sub_row["max_spend"]) or 0.0

            sub_param = SubchannelParameter(
                channel_parameter_id=channel_param.id,
                subchannel_name=str(sub_row["subchannel_name"]),
                roi_coefficient=roi_val,
                min_spend=min_val,
                max_spend=max_val,
            )
            db.add(sub_param)
            subchannels_out.append(SubchannelParamOut(
                subchannel_name=str(sub_row["subchannel_name"]),
                roi_coefficient=roi_val,
                min_spend=min_val,
                max_spend=max_val,
            ))

        await db.flush()

        channel_params_out.append(ChannelParamOut(
            channel_name=str(channel_name),
            roi_coefficient=avg_roi,
            min_spend=total_min,
            max_spend=total_max,
            subchannels=subchannels_out,
        ))

    logger.info(
        "Parsed channel params: upload_id=%d, cycle=%s, channels=%d, rows=%d",
        upload.upload_id, cycle_id, len(channel_params_out), len(df),
    )
    return UploadPreviewOut(
        upload_record_id=upload.upload_id,
        cycle_id=cycle_id,
        row_count=len(df),
        channels=channel_params_out,
    )


async def commit_channel_params_upload(
    upload_record_id: int,
    db: AsyncSession,
) -> UploadOut:
    """
    Commit a pending channel parameter upload, making its data active.

    Changes the Upload status from 'pending' to 'success'. Downstream modules
    (scenario planning, optimizer) only consume ChannelParameter records whose
    linked Upload.status = 'success'.

    Args:
        upload_record_id: ID of the pending Upload record to commit.
        db:               Async database session.

    Returns:
        UploadOut schema for the now-committed upload record.

    Raises:
        NotFoundError:  If no upload record with the given ID exists.
        ConflictError:  If the upload record is not in 'pending' status
                        (already committed or failed).
    """
    result = await db.execute(
        select(Upload).where(Upload.upload_id == upload_record_id)
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise NotFoundError(f"Upload record {upload_record_id} not found.")

    if upload.status != "pending":
        raise ConflictError(
            f"Upload record {upload_record_id} is in '{upload.status}' status "
            "and cannot be committed. Only 'pending' uploads can be committed."
        )

    upload.status = "success"
    await db.flush()
    await db.refresh(upload)
    logger.info("Channel params upload committed: upload_id=%d", upload_record_id)
    return UploadOut.model_validate(upload)


async def get_upload_history(
    db: AsyncSession,
    cycle_id: Optional[str] = None,
    status: Optional[str] = None,
    upload_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedUploads:
    """
    Return paginated upload records, optionally filtered by cycle, status, and type.

    Uses selectinload to avoid N+1 queries when accessing uploader username.
    Ordered by upload date descending (most recent first).

    Args:
        db:          Async database session.
        cycle_id:    Filter to uploads for a specific cycle.
        status:      Filter by status ('pending', 'processing', 'success', 'failed').
        upload_type: Filter by type ('data_fact', 'model_fact', 'channel_params').
        page:        Page number (1-indexed).
        page_size:   Number of records per page.

    Returns:
        PaginatedUploads schema with records and pagination metadata.
    """
    base_stmt = (
        select(Upload)
        .options(selectinload(Upload.uploader))
        .order_by(Upload.uploaded_at.desc())
    )

    if cycle_id:
        base_stmt = base_stmt.where(Upload.cycle_id == cycle_id)
    if status:
        base_stmt = base_stmt.where(Upload.status == status)
    if upload_type:
        base_stmt = base_stmt.where(Upload.upload_type == upload_type)

    # Count total matching records for pagination metadata.
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Apply pagination.
    paged_stmt = base_stmt.offset((page - 1) * page_size).limit(page_size)
    records = list((await db.execute(paged_stmt)).scalars().all())

    # Build response — enrich with uploader name from loaded relationship.
    record_outs: List[UploadOut] = []
    for r in records:
        out = UploadOut.model_validate(r)
        if r.uploader:
            out.uploader_name = r.uploader.username
        record_outs.append(out)

    return PaginatedUploads(
        records=record_outs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


async def delete_upload_record(upload_record_id: int, db: AsyncSession) -> None:
    """
    Hard-delete an upload record and all its associated channel/subchannel parameters.

    Cascade is handled at the SQLAlchemy relationship level via
    cascade="all, delete-orphan" on Upload.channel_parameters, so this function
    only needs to delete the Upload record itself.

    Args:
        upload_record_id: ID of the Upload record to delete.
        db:               Async database session.

    Raises:
        NotFoundError: If no upload record with the given ID exists.
    """
    result = await db.execute(
        select(Upload).where(Upload.upload_id == upload_record_id)
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise NotFoundError(f"Upload record {upload_record_id} not found.")

    await db.delete(upload)
    await db.flush()
    logger.info("Upload record %d deleted (cascade includes channel params).", upload_record_id)
