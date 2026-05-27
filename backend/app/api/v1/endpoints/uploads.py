"""
File upload endpoints.

POST /api/v1/uploads/data-fact     → upload DATA_FACT file
POST /api/v1/uploads/model-fact    → upload MODEL_FACT file
GET  /api/v1/uploads               → list uploads
GET  /api/v1/uploads/{id}          → get upload detail
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.exceptions import UploadError
from app.db.database import get_db
from app.models.models import Upload, User
from app.schemas.schemas import UploadOut, UploadResponse
from app.services.upload_service import UploadService

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/data-fact", response_model=UploadResponse, status_code=201)
async def upload_data_fact(
    file: UploadFile = File(...),
    cycle_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """
    Upload a DATA_FACT CSV or XLSX file.

    Validates schema, coerces types, deduplicates, and inserts rows
    into the data_fact table in a single transaction.
    """
    _validate_file_meta(file)

    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise UploadError(
            f"File exceeds maximum size of {settings.max_file_size_mb} MB."
        )

    svc = UploadService(db)
    result = await svc.process_upload(
        file_bytes=file_bytes,
        filename=file.filename or "upload.csv",
        is_datafile=True,
        cycle_id=cycle_id,
        uploaded_by=current_user.user_id,
    )
    return UploadResponse(**result)


@router.post("/model-fact", response_model=UploadResponse, status_code=201)
async def upload_model_fact(
    file: UploadFile = File(...),
    cycle_id: Optional[str] = Form(None),
    target_variable: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """
    Upload a MODEL_FACT CSV or XLSX file (externally generated MMM output).

    After successful ingestion, triggers MODEL_CHANNEL_CALCULATIONS generation.
    """
    _validate_file_meta(file)

    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise UploadError(
            f"File exceeds maximum size of {settings.max_file_size_mb} MB."
        )

    svc = UploadService(db)
    result = await svc.process_upload(
        file_bytes=file_bytes,
        filename=file.filename or "model.csv",
        is_datafile=False,
        cycle_id=cycle_id,
        uploaded_by=current_user.user_id,
    )
    return UploadResponse(**result)


@router.get("", response_model=List[UploadOut])
async def list_uploads(
    cycle_id: Optional[str] = None,
    is_datafile: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Upload]:
    stmt = select(Upload).order_by(Upload.uploaded_at.desc())
    if cycle_id:
        stmt = stmt.where(Upload.cycle_id == cycle_id)
    if is_datafile is not None:
        stmt = stmt.where(Upload.is_datafile == is_datafile)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{upload_id}", response_model=UploadOut)
async def get_upload(
    upload_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Upload:
    from app.core.exceptions import NotFoundError
    result = await db.execute(select(Upload).where(Upload.upload_id == upload_id))
    upload = result.scalar_one_or_none()
    if not upload:
        raise NotFoundError(f"Upload {upload_id} not found.")
    return upload


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_file_meta(file: UploadFile) -> None:
    if not file.filename:
        raise UploadError("Filename is required.")
    name = file.filename.lower()
    if not (name.endswith(".csv") or name.endswith(".xlsx") or name.endswith(".xls")):
        raise UploadError("Only CSV and XLSX files are supported.")
