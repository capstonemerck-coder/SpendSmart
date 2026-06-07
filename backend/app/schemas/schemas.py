"""
Pydantic v2 schemas for request/response validation.
"""
from __future__ import annotations

from datetime import date, datetime
from math import ceil
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str
    permissions: List[str]


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    email: Optional[str] = None
    region: Optional[str] = None
    role: str = Field(default="data scientist")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"admin", "data scientist", "brand intelligence analyst", "leadership"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {allowed}")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    region: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    full_name: Optional[str]
    email: Optional[str]
    region: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    permissions: List[str] = []


# ── Metadata ──────────────────────────────────────────────────────────────────

class MetaDataOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    metadata_id: int
    region: Optional[str]
    market: Optional[str]
    currency: Optional[str]
    therapeutic_area: Optional[str]
    brand: Optional[str]
    indication: Optional[str]


# ── Cycle ─────────────────────────────────────────────────────────────────────

class CycleCreate(BaseModel):
    """Request body for creating a new planning cycle."""
    cycle_id: str = Field(..., min_length=1, max_length=50)
    metadata_id: Optional[int] = None
    target_variable: Optional[str] = None
    time_granularity: Optional[str] = None
    cycle_start_date: Optional[date] = None
    cycle_end_date: Optional[date] = None
    description: Optional[str] = None


class CycleUpdate(BaseModel):
    """Request body for partial update of a planning cycle."""
    description: Optional[str] = None
    is_active: Optional[bool] = None
    target_variable: Optional[str] = None
    time_granularity: Optional[str] = None
    cycle_start_date: Optional[date] = None
    cycle_end_date: Optional[date] = None


class CycleOut(BaseModel):
    """Response schema for a planning cycle."""
    model_config = ConfigDict(from_attributes=True)

    cycle_id: str
    metadata_id: Optional[int]
    target_variable: Optional[str]
    time_granularity: Optional[str]
    cycle_start_date: Optional[date]
    cycle_end_date: Optional[date]
    description: Optional[str] = None
    is_active: Optional[bool] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Upload ────────────────────────────────────────────────────────────────────

class ValidationError(BaseModel):
    """Single validation error detail."""
    field: str
    message: str
    row: Optional[int] = None


class UploadResponse(BaseModel):
    """Response for DATA_FACT / MODEL_FACT uploads (direct ingest flow)."""
    upload_id: int
    cycle_id: Optional[str]
    is_datafile: bool
    filename: str
    row_count: int
    status: str
    errors: List[ValidationError] = []
    warnings: List[str] = []
    message: str


class UploadOut(BaseModel):
    """Single upload record as returned by the API."""
    model_config = ConfigDict(from_attributes=True)

    upload_id: int
    cycle_id: Optional[str]
    is_datafile: bool
    upload_type: Optional[str] = None
    filename: Optional[str]
    file_size_bytes: Optional[int]
    row_count: Optional[int]
    status: str
    error_message: Optional[str]
    uploaded_at: datetime
    uploader_name: Optional[str] = None  # populated by service layer from joined user


class PaginatedUploads(BaseModel):
    """Paginated response wrapper for upload history."""
    records: List[UploadOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Channel / Subchannel Parameters ──────────────────────────────────────────

class SubchannelParamOut(BaseModel):
    """
    Single subchannel parameter row returned in upload previews and detail views.

    The MMM coefficient fields (estimate through base_sales) are populated only
    when the parent upload is of type 'model_fact'. They are null for rows sourced
    from channel_params uploads.
    """
    subchannel_name: str
    roi_coefficient: float
    min_spend: float
    max_spend: float
    category: Optional[str] = None
    variable: Optional[str] = None
    estimate: Optional[float] = None
    curve_type: Optional[str] = None
    curvature: Optional[float] = None
    adstock_rate: Optional[float] = None
    adstock_horizon: Optional[int] = None
    p_value: Optional[float] = None
    impactable_sales_pct: Optional[float] = None
    base_sales: Optional[float] = None


class ChannelParamOut(BaseModel):
    """
    Single channel parameter row with its subchannel children.

    category and variable are sourced from MODEL_FACT uploads. They are null
    for rows created by channel_params uploads.
    """
    channel_name: str
    roi_coefficient: float
    min_spend: float
    max_spend: float
    category: Optional[str] = None
    variable: Optional[str] = None
    subchannels: List[SubchannelParamOut]


class UploadPreviewOut(BaseModel):
    """
    Response from POST /uploads/parse.

    Contains the upload_record_id (used in the commit call) and
    the parsed channel/subchannel rows for frontend preview.
    """
    upload_record_id: int
    cycle_id: str
    row_count: int
    channels: List[ChannelParamOut]


class UploadCommitIn(BaseModel):
    """Request body for POST /uploads/commit."""
    upload_record_id: int = Field(..., gt=0)
    cycle_id: str = Field(..., min_length=1)


# ── Channel Hierarchy ─────────────────────────────────────────────────────────

class ChannelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    channel_id: int
    channel_name: str
    parent_id: Optional[int]
    depth: int
    children: List["ChannelOut"] = []


# ── Model Channel Calculations ────────────────────────────────────────────────

class ModelChannelCalcOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cycle_id: str
    channel_id: int
    channel_name: Optional[str] = None
    total_sales: Optional[float]
    total_spend: Optional[float]
    impactable_sales: Optional[float]
    roi: Optional[float]


class ModelSummaryOut(BaseModel):
    """Aggregated model summary for the Model Insights screen."""
    cycle_id: str
    total_sales: float
    total_spend: float
    overall_roi: float
    base_sales: float
    incremental_sales: float
    base_pct: float
    incremental_pct: float
    channel_calculations: List[ModelChannelCalcOut]


# ── Scenarios ─────────────────────────────────────────────────────────────────

class ConstraintIn(BaseModel):
    channel_id: int
    min_spend_pct: float = Field(default=0, ge=-100, le=0)
    max_spend_pct: float = Field(default=0, ge=0, le=100)


class ScenarioCreate(BaseModel):
    scenario_name: str = Field(..., min_length=1, max_length=300)
    cycle_id: Optional[str] = None
    scenario_type: str = Field(default="Spend Based")
    is_public: bool = True
    category_constraint: Optional[str] = None
    target_spend: Optional[float] = None
    target_kpi: Optional[str] = None
    target_value: Optional[float] = None
    constraints: List[ConstraintIn] = []

    @field_validator("scenario_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in {"Spend Based", "Goal Based"}:
            raise ValueError("scenario_type must be 'Spend Based' or 'Goal Based'")
        return v


class ScenarioUpdate(BaseModel):
    scenario_name: Optional[str] = None
    is_public: Optional[bool] = None
    category_constraint: Optional[str] = None
    target_spend: Optional[float] = None
    target_kpi: Optional[str] = None
    target_value: Optional[float] = None
    constraints: Optional[List[ConstraintIn]] = None


class ConstraintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    channel_id: int
    min_spend_pct: Optional[float]
    max_spend_pct: Optional[float]
    channel_name: Optional[str] = None
    current_roi: Optional[float] = None
    current_spend: Optional[float] = None


class ScenarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scenario_id: int
    scenario_name: str
    cycle_id: Optional[str]
    created_by: Optional[int]
    scenario_type: str
    is_public: bool
    target_spend: Optional[float]
    target_kpi: Optional[str]
    target_value: Optional[float]
    is_pending: bool
    category_constraint: Optional[str]
    created_at: datetime
    updated_at: datetime
    constraints: List[ConstraintOut] = []


# ── Optimizer Results ─────────────────────────────────────────────────────────

class OptimizerRunRequest(BaseModel):
    scenario_id: int


class ChannelResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    channel_id: int
    channel_name: Optional[str] = None
    optimized_spend: Optional[float]
    impactable_sales: Optional[float]
    roi: Optional[float]
    mroi: Optional[float]


class ScenarioOutcomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scenario_id: int
    scenario_name: Optional[str] = None
    scenario_type: Optional[str] = None
    total_sales: Optional[float]
    total_spend: Optional[float]
    impactable_sales: Optional[float]
    roi: Optional[float]
    mroi: Optional[float]
    channel_results: List[ChannelResultOut] = []


# ── DataHistory ───────────────────────────────────────────────────────────────

class DataFactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cycle_id: str
    date: Optional[date]
    category: Optional[str]
    channel: Optional[str]
    sub_channel: Optional[str]
    variable: Optional[str]
    spend: Optional[float]
    reach: Optional[float]
    value: Optional[float]
    upload_id: Optional[int] = None


class DataHistoryKPIOut(BaseModel):
    """KPI summary aggregated from DATA_FACT for the Data History screen."""
    cycle_id: str
    total_sales: float
    total_spend: float
    total_reach: float


class SpendTrendPoint(BaseModel):
    """A single chronological data point for the spend trend chart."""
    date: str   # YYYY-MM-DD
    spend: float


class RevenueTrendPoint(BaseModel):
    """A single chronological data point for the revenue trend chart."""
    date: str   # YYYY-MM-DD
    revenue: float


class ChannelBreakdownRow(BaseModel):
    """Per-channel spend and reach aggregation with efficiency ratio."""
    channel: str
    spend: float
    reach: float
    ratio: float   # reach / spend; 0.0 if spend is zero


class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper."""
    total: int
    page: int
    page_size: int
    items: List[Any]


# ── Model Summary (Channel Parameters) ───────────────────────────────────────

class SubChannelSummarySchema(BaseModel):
    """
    Per-subchannel row returned by GET /reports/model-summary.

    The MMM coefficient fields (estimate through base_sales) are populated only
    when the parent upload is of type 'model_fact'. They are null for rows sourced
    from channel_params uploads. impactable_sales_pct drives the contribution %
    displayed in the Model Summary screen.
    """

    channel: str
    sub_channel: str
    roi_coefficient: float
    current_spend: float  # sourced from SubchannelParameter.min_spend
    min_spend: float
    max_spend: float
    category: Optional[str] = None
    variable: Optional[str] = None
    estimate: Optional[float] = None
    curve_type: Optional[str] = None
    curvature: Optional[float] = None
    adstock_rate: Optional[float] = None
    adstock_horizon: Optional[int] = None
    p_value: Optional[float] = None
    impactable_sales_pct: Optional[float] = None
    base_sales: Optional[float] = None


class ModelSummaryDataSchema(BaseModel):
    """
    Response payload for GET /reports/model-summary.

    current_spend per subchannel is sourced from DATA_FACT (sum of spend for the
    cycle's channel/sub_channel combination), falling back to
    SubchannelParameter.min_spend when no DATA_FACT rows exist for that subchannel.

    baseline_kpi and total_incremental_sales are numerically identical:
    sum(current_spend × roi_coefficient) across all subchannels.  baseline_kpi is
    kept for backward compatibility with existing frontend consumers.

    total_base_sales sums SubchannelParameter.base_sales (populated from MODEL_FACT
    uploads); it is 0.0 for channel_params-sourced rows that lack this field.
    """

    baseline_kpi: float
    channels: List[SubChannelSummarySchema]
    cycle_id: str
    uploaded_at: datetime
    total_spend: float
    total_sales: float
    overall_roi: float
    total_base_sales: float
    total_incremental_sales: float
    base_pct: float
    incremental_pct: float


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardKPIs(BaseModel):
    total_sales: float
    total_spend: float
    overall_roi: float
    scenario_count: int
    upload_count: int
    active_cycle_id: Optional[str]
