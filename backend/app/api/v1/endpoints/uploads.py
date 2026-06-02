"""
File upload endpoints.

Existing (DATA_FACT / MODEL_FACT — direct ingest):
  POST /api/v1/uploads/data-fact     → upload DATA_FACT file
  POST /api/v1/uploads/model-fact    → upload MODEL_FACT file

Channel Parameter (two-step parse/commit):
  POST /api/v1/uploads/parse         → parse file, return preview (Admin, Data Scientist)
  POST /api/v1/uploads/commit        → commit parsed upload, making data active (Admin, Data Scientist)

Upload history:
  GET  /api/v1/uploads               → paginated upload history (all authenticated)
  GET  /api/v1/uploads/{id}          → single upload record (all authenticated)
  DELETE /api/v1/uploads/{id}        → delete upload record + cascade (Admin only)
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import AuthorizationError, NotFoundError, UploadError
from app.db.database import get_db
from app.models.models import Upload, User
from app.schemas.schemas import (
    PaginatedUploads, UploadCommitIn, UploadOut, UploadPreviewOut, UploadResponse,
)
from app.services import upload_service as svc
from app.services.upload_service import UploadService

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Roles that may upload files.
_UPLOAD_ROLES = {"admin", "data scientist"}


# ── DATA_FACT / MODEL_FACT endpoints (existing, preserved) ───────────────────

@router.post(
    "/data-fact",
    response_model=UploadResponse,
    status_code=201,
    summary="Upload a DATA_FACT file",
    description="Validates schema, coerces types, deduplicates, and inserts rows "
                "into the data_fact table in a single transaction.",
)
async def upload_data_fact(
    file: UploadFile = File(...),
    cycle_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Upload a DATA_FACT CSV or XLSX file."""
    _validate_file_meta(file)
    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise UploadError(f"File exceeds maximum size of {settings.max_file_size_mb} MB.")

    service = UploadService(db)
    result = await service.process_upload(
        file_bytes=file_bytes,
        filename=file.filename or "upload.csv",
        is_datafile=True,
        cycle_id=cycle_id,
        uploaded_by=current_user.user_id,
    )
    return UploadResponse(**result)


@router.post(
    "/model-fact",
    response_model=UploadResponse,
    status_code=201,
    summary="Upload a MODEL_FACT file",
    description="After successful ingestion, triggers MODEL_CHANNEL_CALCULATIONS generation.",
)
async def upload_model_fact(
    file: UploadFile = File(...),
    cycle_id: Optional[str] = Form(None),
    target_variable: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Upload a MODEL_FACT CSV or XLSX file."""
    _validate_file_meta(file)
    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise UploadError(f"File exceeds maximum size of {settings.max_file_size_mb} MB.")

    service = UploadService(db)
    result = await service.process_upload(
        file_bytes=file_bytes,
        filename=file.filename or "model.csv",
        is_datafile=False,
        cycle_id=cycle_id,
        uploaded_by=current_user.user_id,
    )
    return UploadResponse(**result)


# ── Channel Parameter parse/commit endpoints ─────────────────────────────────

@router.post(
    "/parse",
    response_model=UploadPreviewOut,
    status_code=201,
    summary="Parse a channel parameter file",
    description="Parses a CSV or XLSX file containing channel and subchannel MMM parameters. "
                "Creates a pending upload record and returns a structured preview of the data. "
                "The upload is NOT active until /commit is called. "
                "Required columns: channel_name, subchannel_name, roi_coefficient, min_spend, max_spend. "
                "Restricted to Admin and Data Scientist roles.",
)
async def parse_channel_params(
    file: UploadFile = File(...),
    cycle_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadPreviewOut:
    """Parse a channel parameter file and return a structured preview."""
    if current_user.role not in _UPLOAD_ROLES:
        raise AuthorizationError("Only Admins and Data Scientists can upload files.")

    _validate_file_meta(file)
    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise UploadError(f"File exceeds maximum size of {settings.max_file_size_mb} MB.")

    return await svc.parse_channel_params_file(
        file_bytes=file_bytes,
        filename=file.filename or "channel_params.csv",
        cycle_id=cycle_id,
        uploaded_by=current_user.user_id,
        db=db,
    )


@router.post(
    "/commit",
    response_model=UploadOut,
    summary="Commit a parsed channel parameter upload",
    description="Marks a pending channel parameter upload as active (status: success). "
                "After commit, the data is visible to Scenario Planning and downstream modules. "
                "Restricted to Admin and Data Scientist roles.",
)
async def commit_channel_params(
    body: UploadCommitIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadOut:
    """Commit a pending channel parameter upload."""
    if current_user.role not in _UPLOAD_ROLES:
        raise AuthorizationError("Only Admins and Data Scientists can commit uploads.")
    return await svc.commit_channel_params_upload(body.upload_record_id, db)


# ── Upload history endpoints ──────────────────────────────────────────────────

@router.get(
    "",
    response_model=PaginatedUploads,
    summary="List upload history",
    description="Returns a paginated list of upload records. Supports filtering by cycle, "
                "status, and upload type. Accessible to all authenticated users.",
)
async def list_uploads(
    cycle_id: Optional[str] = None,
    status: Optional[str] = None,
    upload_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedUploads:
    """Return paginated upload history with optional filters."""
    return await svc.get_upload_history(
        db=db,
        cycle_id=cycle_id,
        status=status,
        upload_type=upload_type,
        page=max(1, page),
        page_size=min(100, max(1, page_size)),
    )


@router.get(
    "/{upload_id}",
    response_model=UploadOut,
    summary="Get a single upload record",
    description="Returns a single upload record by its ID. "
                "Accessible to all authenticated users.",
)
async def get_upload(
    upload_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadOut:
    """Return a single upload record."""
    result = await db.execute(select(Upload).where(Upload.upload_id == upload_id))
    upload = result.scalar_one_or_none()
    if not upload:
        raise NotFoundError(f"Upload {upload_id} not found.")
    return UploadOut.model_validate(upload)


@router.delete(
    "/{upload_id}",
    status_code=200,
    summary="Delete an upload record",
    description="Hard-deletes an upload record and all associated channel/subchannel parameters. "
                "Restricted to Admin role.",
)
async def delete_upload(
    upload_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete an upload record and cascade to its channel parameters. Admin only."""
    await svc.delete_upload_record(upload_id, db)
    return {"detail": "Upload record deleted."}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_file_meta(file: UploadFile) -> None:
    """
    Validate that the uploaded file has a supported extension.

    Args:
        file: The incoming UploadFile.

    Raises:
        UploadError: If filename is missing or the extension is not .csv/.xlsx.
    """
    if not file.filename:
        raise UploadError("Filename is required.")
    name = file.filename.lower()
    if not (name.endswith(".csv") or name.endswith(".xlsx") or name.endswith(".xls")):
        raise UploadError("Only CSV and XLSX files are supported.")
