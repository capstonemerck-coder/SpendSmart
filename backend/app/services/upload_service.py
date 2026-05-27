"""
Upload Service — validates and ingests DATA_FACT and MODEL_FACT CSV/XLSX files.

Pipeline:
  1. Parse file (CSV or XLSX)
  2. Validate schema (required columns, dtypes)
  3. Detect duplicates
  4. Transactional batch insert
  5. Create upload audit record
"""
from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UploadError
from app.models.models import CycleDef, DataFact, ModelFact, Upload

logger = logging.getLogger(__name__)

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
    ) -> Dict[str, Any]:
        """
        Full upload pipeline.

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

        # ── Ensure cycle exists ────────────────────────────────────────────────
        if cycle_id:
            await self._ensure_cycle(cycle_id)

        # ── Create upload audit record ─────────────────────────────────────────
        upload = Upload(
            cycle_id=cycle_id or df["cycle_id"].iloc[0] if "cycle_id" in df.columns else None,
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

    async def _ensure_cycle(self, cycle_id: str) -> None:
        exists = await self.db.execute(
            select(CycleDef).where(CycleDef.cycle_id == cycle_id)
        )
        if exists.scalar_one_or_none() is None:
            self.db.add(CycleDef(cycle_id=cycle_id))
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
