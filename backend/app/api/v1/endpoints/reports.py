"""
Reporting endpoints — Model Insights, Data History, and Dashboard screens.

GET /api/v1/reports/model-summary/{cycle_id}       → Model Insights KPIs + channel table
GET /api/v1/reports/data-history/{cycle_id}        → DATA_FACT rows (paginated)
GET /api/v1/reports/dashboard                      → Homepage KPI cards
GET /api/v1/reports/metadata                       → All MetaData rows for cascading filters
GET /api/v1/reports/data-fact-variables/{cycle_id} → Distinct variable values in DATA_FACT

Data History endpoints:
GET /api/v1/reports/cycles                         → Available cycle IDs
GET /api/v1/reports/kpi-summary/{cycle_id}         → Aggregated KPIs for a cycle
GET /api/v1/reports/spend-trend/{cycle_id}         → Daily spend aggregated by date
GET /api/v1/reports/revenue-trend/{cycle_id}       → Daily revenue aggregated by date
GET /api/v1/reports/channel-breakdown/{cycle_id}   → Per-channel spend/reach/ratio
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.models import (
    CycleDef,
    DataFact,
    MetaData,
    ModelChannelCalculation,
    ModelFact,
    ScenarioHeader,
    Upload,
    User,
)
from app.schemas.schemas import (
    ChannelBreakdownRow,
    DashboardKPIs,
    DataFactOut,
    DataHistoryKPIOut,
    MetaDataOut,
    ModelChannelCalcOut,
    ModelSummaryOut,
    PaginatedResponse,
    RevenueTrendPoint,
    SpendTrendPoint,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/model-summary/{cycle_id}", response_model=ModelSummaryOut)
async def model_summary(
    cycle_id: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModelSummaryOut:
    """
    Return aggregated model-level KPIs and channel-breakdown for the Model Insights screen.
    Reads from MODEL_CHANNEL_CALCULATIONS (pre-computed after upload).
    Falls back to computing from MODEL_FACT rows if calculations haven't been generated.
    """
    # Try pre-computed calculations first
    calc_result = await db.execute(
        select(ModelChannelCalculation).where(
            ModelChannelCalculation.cycle_id == cycle_id
        )
    )
    calcs = list(calc_result.scalars().all())

    if calcs:
        total_sales = sum(c.total_sales or 0 for c in calcs)
        total_spend = sum(c.total_spend or 0 for c in calcs)
        impactable_sales = sum(c.impactable_sales or 0 for c in calcs)
        base_sales = total_sales - impactable_sales
        overall_roi = impactable_sales / total_spend if total_spend else 0

        channel_calcs = [
            ModelChannelCalcOut(
                cycle_id=c.cycle_id,
                channel_id=c.channel_id,
                total_sales=c.total_sales,
                total_spend=c.total_spend,
                impactable_sales=c.impactable_sales,
                roi=c.roi,
            )
            for c in calcs
        ]
    else:
        # Fallback: aggregate from MODEL_FACT directly
        mf_result = await db.execute(
            select(ModelFact).where(ModelFact.cycle_id == cycle_id)
        )
        model_facts = list(mf_result.scalars().all())

        if not model_facts:
            return ModelSummaryOut(
                cycle_id=cycle_id,
                total_sales=0,
                total_spend=0,
                overall_roi=0,
                base_sales=0,
                incremental_sales=0,
                base_pct=0,
                incremental_pct=0,
                channel_calculations=[],
            )

        base_sales = sum(mf.base_sales or 0 for mf in model_facts)
        impactable_sales = sum(
            (mf.base_sales or 0) * ((mf.impactable_sales_pct or 0) / 100)
            for mf in model_facts
        )
        # Use spend from DATA_FACT if available
        df_result = await db.execute(
            select(func.sum(DataFact.spend)).where(DataFact.cycle_id == cycle_id)
        )
        total_spend = float(df_result.scalar() or 0)
        total_sales = base_sales + impactable_sales
        overall_roi = impactable_sales / total_spend if total_spend else 0
        channel_calcs = []

    return ModelSummaryOut(
        cycle_id=cycle_id,
        total_sales=round(total_sales, 2),
        total_spend=round(total_spend if calcs else total_spend, 2),
        overall_roi=round(overall_roi, 4),
        base_sales=round(base_sales, 2),
        incremental_sales=round(impactable_sales, 2),
        base_pct=round(base_sales / total_sales * 100 if total_sales else 0, 1),
        incremental_pct=round(impactable_sales / total_sales * 100 if total_sales else 0, 1),
        channel_calculations=channel_calcs,
    )


@router.get("/data-history/{cycle_id}", response_model=PaginatedResponse)
async def data_history(
    cycle_id: str,
    channel: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    """
    Return paginated DATA_FACT rows for the Data History screen.
    Supports optional channel and category filtering.
    """
    stmt = select(DataFact).where(DataFact.cycle_id == cycle_id)
    count_stmt = select(func.count()).select_from(DataFact).where(
        DataFact.cycle_id == cycle_id
    )

    if channel:
        stmt = stmt.where(DataFact.channel == channel)
        count_stmt = count_stmt.where(DataFact.channel == channel)
    if category:
        stmt = stmt.where(DataFact.category == category)
        count_stmt = count_stmt.where(DataFact.category == category)

    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar() or 0)

    stmt = stmt.order_by(DataFact.date.desc(), DataFact.id).offset(
        (page - 1) * page_size
    ).limit(page_size)

    rows_result = await db.execute(stmt)
    rows = list(rows_result.scalars().all())

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[DataFactOut.model_validate(r) for r in rows],
    )


@router.get("/dashboard", response_model=DashboardKPIs)
async def dashboard_kpis(
    cycle_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardKPIs:
    """Homepage KPI cards — aggregate numbers for the active cycle."""
    # Latest cycle if not specified
    if not cycle_id:
        latest = await db.execute(
            select(CycleDef.cycle_id).order_by(CycleDef.created_at.desc()).limit(1)
        )
        row = latest.scalar_one_or_none()
        cycle_id = row if row else None

    total_sales = 0.0
    total_spend = 0.0
    overall_roi = 0.0

    if cycle_id:
        sales_row = await db.execute(
            select(func.sum(DataFact.value)).where(DataFact.cycle_id == cycle_id)
        )
        total_sales = float(sales_row.scalar() or 0)

        spend_row = await db.execute(
            select(func.sum(DataFact.spend)).where(DataFact.cycle_id == cycle_id)
        )
        total_spend = float(spend_row.scalar() or 0)
        overall_roi = total_sales / total_spend if total_spend else 0.0

    scenario_count_row = await db.execute(select(func.count()).select_from(ScenarioHeader))
    scenario_count = int(scenario_count_row.scalar() or 0)

    upload_count_row = await db.execute(select(func.count()).select_from(Upload))
    upload_count = int(upload_count_row.scalar() or 0)

    return DashboardKPIs(
        total_sales=round(total_sales, 2),
        total_spend=round(total_spend, 2),
        overall_roi=round(overall_roi, 4),
        scenario_count=scenario_count,
        upload_count=upload_count,
        active_cycle_id=cycle_id,
    )


@router.get("/metadata", response_model=List[MetaDataOut])
async def get_metadata(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MetaDataOut]:
    """
    Return all MetaData rows for populating cascading filters (Market, Brand, Indication).
    Frontend derives filtering logic from this flat list.
    """
    result = await db.execute(select(MetaData))
    rows = list(result.scalars().all())
    return [MetaDataOut.model_validate(r) for r in rows]


@router.get("/data-fact-variables/{cycle_id}", response_model=List[str])
async def get_data_fact_variables(
    cycle_id: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[str]:
    """
    Return distinct variable values from DATA_FACT for a given cycle.
    Used to populate the searchable variable grid on the Target Variable selection screen.
    """
    result = await db.execute(
        select(DataFact.variable).where(DataFact.cycle_id == cycle_id).distinct()
    )
    rows = list(result.scalars().all())
    return sorted([r for r in rows if r])  # Filter out None, return sorted


# ── Data History endpoints ────────────────────────────────────────────────────


async def _get_available_cycles(
    db: AsyncSession,
    metadata_id: Optional[int],
) -> List[str]:
    """
    Query cycle IDs from CYCLE_DEF ordered by creation date descending.

    Args:
        db:          Active async database session.
        metadata_id: Optional filter — when provided, restricts to cycles
                     linked to that metadata context.

    Returns:
        List of cycle_id strings, most recent first.
    """
    stmt = select(CycleDef.cycle_id).order_by(CycleDef.created_at.desc())
    if metadata_id is not None:
        stmt = stmt.where(CycleDef.metadata_id == metadata_id)
    result = await db.execute(stmt)
    return [r for r in result.scalars().all() if r]


@router.get(
    "/cycles",
    response_model=List[str],
    summary="List available cycle IDs",
    description=(
        "Returns cycle IDs for the given metadata context, most recent first. "
        "Used to populate the cycle selector on the Data History screen."
    ),
)
async def list_cycles(
    metadata_id: Optional[int] = Query(None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[str]:
    """
    Return available cycle IDs ordered by creation date descending.

    Args:
        metadata_id: Optional — filters to cycles linked to this metadata context.

    Returns:
        Ordered list of cycle_id strings.
    """
    return await _get_available_cycles(db, metadata_id)


@router.get(
    "/kpi-summary/{cycle_id}",
    response_model=DataHistoryKPIOut,
    summary="KPI summary for a cycle",
    description=(
        "Returns total sales (value), total spend, and total reach aggregated "
        "from DATA_FACT rows for the given cycle."
    ),
)
async def kpi_summary(
    cycle_id: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataHistoryKPIOut:
    """
    Aggregate KPI totals from DATA_FACT for a given cycle.

    Args:
        cycle_id: The planning cycle identifier.

    Returns:
        DataHistoryKPIOut with total_sales, total_spend, and total_reach.
        All values are 0.0 if no DATA_FACT rows exist for the cycle.
    """
    sales_row = await db.execute(
        select(func.sum(DataFact.value)).where(DataFact.cycle_id == cycle_id)
    )
    spend_row = await db.execute(
        select(func.sum(DataFact.spend)).where(DataFact.cycle_id == cycle_id)
    )
    reach_row = await db.execute(
        select(func.sum(DataFact.reach)).where(DataFact.cycle_id == cycle_id)
    )
    return DataHistoryKPIOut(
        cycle_id=cycle_id,
        total_sales=round(float(sales_row.scalar() or 0), 2),
        total_spend=round(float(spend_row.scalar() or 0), 2),
        total_reach=round(float(reach_row.scalar() or 0), 2),
    )


@router.get(
    "/spend-trend/{cycle_id}",
    response_model=List[SpendTrendPoint],
    summary="Daily spend trend for a cycle",
    description=(
        "Aggregates DATA_FACT spend by date for the given cycle, "
        "ordered chronologically."
    ),
)
async def spend_trend(
    cycle_id: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SpendTrendPoint]:
    """
    Return daily spend totals aggregated from DATA_FACT for a cycle.

    Args:
        cycle_id: The planning cycle identifier.

    Returns:
        Chronologically ordered list of date/spend data points.
        Rows with null dates are excluded.
    """
    result = await db.execute(
        select(DataFact.date, func.sum(DataFact.spend).label("spend"))
        .where(DataFact.cycle_id == cycle_id)
        .where(DataFact.date.isnot(None))
        .group_by(DataFact.date)
        .order_by(DataFact.date.asc())
    )
    return [
        SpendTrendPoint(date=str(r.date), spend=round(float(r.spend or 0), 2))
        for r in result.all()
    ]


@router.get(
    "/revenue-trend/{cycle_id}",
    response_model=List[RevenueTrendPoint],
    summary="Daily revenue trend for a cycle",
    description=(
        "Aggregates DATA_FACT value by date for the given cycle, "
        "ordered chronologically."
    ),
)
async def revenue_trend(
    cycle_id: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[RevenueTrendPoint]:
    """
    Return daily revenue totals aggregated from DATA_FACT for a cycle.

    Args:
        cycle_id: The planning cycle identifier.

    Returns:
        Chronologically ordered list of date/revenue data points.
        Rows with null dates are excluded.
    """
    result = await db.execute(
        select(DataFact.date, func.sum(DataFact.value).label("revenue"))
        .where(DataFact.cycle_id == cycle_id)
        .where(DataFact.date.isnot(None))
        .group_by(DataFact.date)
        .order_by(DataFact.date.asc())
    )
    return [
        RevenueTrendPoint(date=str(r.date), revenue=round(float(r.revenue or 0), 2))
        for r in result.all()
    ]


@router.get(
    "/channel-breakdown/{cycle_id}",
    response_model=List[ChannelBreakdownRow],
    summary="Channel spend vs reach breakdown for a cycle",
    description=(
        "Returns total spend and reach per channel, with reach/spend ratio, "
        "sorted by ratio descending."
    ),
)
async def channel_breakdown(
    cycle_id: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ChannelBreakdownRow]:
    """
    Aggregate DATA_FACT spend and reach per channel for a cycle.

    Args:
        cycle_id: The planning cycle identifier.

    Returns:
        Per-channel breakdown with spend, reach, and ratio (reach/spend).
        Sorted by ratio descending. Rows with null channel are excluded.
        Ratio is 0.0 when spend is zero.
    """
    result = await db.execute(
        select(
            DataFact.channel,
            func.sum(DataFact.spend).label("spend"),
            func.sum(DataFact.reach).label("reach"),
        )
        .where(DataFact.cycle_id == cycle_id)
        .where(DataFact.channel.isnot(None))
        .group_by(DataFact.channel)
    )
    breakdown: List[ChannelBreakdownRow] = []
    for r in result.all():
        spend = round(float(r.spend or 0), 2)
        reach = round(float(r.reach or 0), 2)
        ratio = round(reach / spend, 4) if spend > 0 else 0.0
        breakdown.append(ChannelBreakdownRow(channel=r.channel, spend=spend, reach=reach, ratio=ratio))
    breakdown.sort(key=lambda x: x.ratio, reverse=True)
    return breakdown
