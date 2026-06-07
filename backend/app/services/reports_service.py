"""
reports_service.py

Business logic for the Reporting module — Model Summary screen.

Loads the most recently committed channel parameter upload for a given
market / brand / indication filter combination, flattens the data to
subchannel-level rows, and computes aggregate KPIs.

Current spend resolution order for each subchannel:
  1. Sum of DATA_FACT.spend for (cycle_id, channel, sub_channel) — actual
     historical spend from the DATA_FACT upload for this cycle.
  2. SubchannelParameter.min_spend — fallback when no DATA_FACT rows exist
     for a given subchannel (e.g. when a MODEL_FACT was uploaded but no
     corresponding DATA_FACT exists yet for that subchannel).

Derived KPI formulas:
  total_incremental_sales = sum(current_spend × roi_coefficient)
  total_base_sales         = sum(subchannel.base_sales)   [0.0 if null]
  total_sales              = total_incremental_sales + total_base_sales
  overall_roi              = total_incremental_sales / total_spend  (0.0 if spend=0)
  base_pct                 = total_base_sales / total_sales × 100  (0.0 if sales=0)
  incremental_pct          = total_incremental_sales / total_sales × 100 (100.0 if sales=0)
  baseline_kpi             = total_incremental_sales  (kept for backward compatibility)
"""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    ChannelParameter,
    CycleDef,
    DataFact,
    MetaData,
    Upload,
)
from app.schemas.schemas import ModelSummaryDataSchema, SubChannelSummarySchema

logger = logging.getLogger(__name__)


async def get_model_summary(
    market: str,
    brand: str,
    indication: str,
    db: AsyncSession,
) -> Optional[ModelSummaryDataSchema]:
    """
    Load model summary data for the given market/brand/indication combination.

    Resolution order:
      1. Find the MetaData row matching all three filter values.
      2. Find the most recent CycleDef linked to that metadata context.
      3. Find the most recent successful channel_params or model_fact Upload
         for that cycle.
      4. Load all ChannelParameter + SubchannelParameter rows for the upload.
      4b.Query DATA_FACT for actual spend per (channel, sub_channel) for this cycle.
      5. Flatten to subchannel-level rows, set current_spend from DATA_FACT
         (fallback: SubchannelParameter.min_spend), and compute KPIs.

    Args:
        market:     Market name from META_DATA (e.g. "US").
        brand:      Brand name from META_DATA.
        indication: Indication name from META_DATA.
        db:         Async database session.

    Returns:
        ModelSummaryDataSchema with flattened subchannel rows and aggregate
        KPIs, or None if any step in the resolution chain finds no matching
        records.
    """
    # 1. Resolve metadata_id for the market/brand/indication triple
    meta_result = await db.execute(
        select(MetaData).where(
            MetaData.market == market,
            MetaData.brand == brand,
            MetaData.indication == indication,
        )
    )
    meta = meta_result.scalar_one_or_none()
    if meta is None:
        logger.info(
            "No metadata row for market=%s brand=%s indication=%s",
            market, brand, indication,
        )
        return None

    # 2. Most recent CycleDef linked to this metadata context
    cycle_result = await db.execute(
        select(CycleDef)
        .where(CycleDef.metadata_id == meta.metadata_id)
        .order_by(CycleDef.created_at.desc())
        .limit(1)
    )
    cycle = cycle_result.scalar_one_or_none()
    if cycle is None:
        logger.info("No cycle found for metadata_id=%d", meta.metadata_id)
        return None

    # 3. Most recent successful channel_params or model_fact upload for this cycle.
    #    channel_params uploads are preferred (they carry explicit spend bounds);
    #    model_fact uploads are accepted because _ingest_model_fact also creates
    #    ChannelParameter / SubchannelParameter rows with all MMM coefficients.
    upload_result = await db.execute(
        select(Upload)
        .where(
            Upload.cycle_id == cycle.cycle_id,
            Upload.upload_type.in_(["channel_params", "model_fact"]),
            Upload.status == "success",
        )
        .order_by(Upload.uploaded_at.desc())
        .limit(1)
    )
    upload = upload_result.scalar_one_or_none()
    if upload is None:
        logger.info(
            "No successful channel_params or model_fact upload for cycle=%s",
            cycle.cycle_id,
        )
        return None

    # 4. Load all ChannelParameter rows for this upload with subchannels eager-loaded.
    #    selectinload avoids N+1 queries when iterating subchannel rows.
    params_result = await db.execute(
        select(ChannelParameter)
        .where(ChannelParameter.upload_id == upload.upload_id)
        .options(selectinload(ChannelParameter.subchannels))
    )
    channel_params = list(params_result.scalars().all())

    if not channel_params:
        logger.info(
            "No ChannelParameter rows found for upload_id=%d", upload.upload_id
        )
        return None

    # 4b. Query DATA_FACT for actual spend aggregated by (channel, sub_channel).
    #     This gives the real historical spend for the cycle rather than the
    #     configured min_spend bounds from the parameter upload.
    spend_query = await db.execute(
        select(
            DataFact.channel,
            DataFact.sub_channel,
            func.sum(DataFact.spend).label("total_spend"),
        )
        .where(DataFact.cycle_id == cycle.cycle_id)
        .where(DataFact.channel.isnot(None))
        .where(DataFact.sub_channel.isnot(None))
        .group_by(DataFact.channel, DataFact.sub_channel)
    )
    # Build a lookup keyed by (channel_name, subchannel_name) → actual spend
    data_fact_spend: dict[tuple[str, str], float] = {
        (row.channel, row.sub_channel): float(row.total_spend or 0.0)
        for row in spend_query.all()
    }

    # 5. Flatten to subchannel rows, resolve current_spend, and accumulate KPIs.
    subchannel_rows: list[SubChannelSummarySchema] = []
    total_spend_acc: float = 0.0
    total_incremental_acc: float = 0.0
    total_base_acc: float = 0.0

    for channel_param in channel_params:
        for sub in channel_param.subchannels:
            # Prefer DATA_FACT actual spend; fall back to min_spend from upload.
            df_spend = data_fact_spend.get(
                (channel_param.channel_name, sub.subchannel_name)
            )
            current_spend = df_spend if df_spend is not None else float(sub.min_spend)
            roi = float(sub.roi_coefficient)
            sub_base_sales = float(sub.base_sales) if sub.base_sales is not None else 0.0

            total_spend_acc += current_spend
            total_incremental_acc += current_spend * roi
            total_base_acc += sub_base_sales

            subchannel_rows.append(
                SubChannelSummarySchema(
                    channel=channel_param.channel_name,
                    sub_channel=sub.subchannel_name,
                    roi_coefficient=roi,
                    current_spend=current_spend,
                    min_spend=float(sub.min_spend),
                    max_spend=float(sub.max_spend),
                    category=sub.category,
                    variable=sub.variable,
                    estimate=float(sub.estimate) if sub.estimate is not None else None,
                    curve_type=sub.curve_type,
                    curvature=float(sub.curvature) if sub.curvature is not None else None,
                    adstock_rate=float(sub.adstock_rate) if sub.adstock_rate is not None else None,
                    adstock_horizon=sub.adstock_horizon,
                    p_value=float(sub.p_value) if sub.p_value is not None else None,
                    impactable_sales_pct=float(sub.impactable_sales_pct) if sub.impactable_sales_pct is not None else None,
                    base_sales=float(sub.base_sales) if sub.base_sales is not None else None,
                )
            )

    total_sales = total_incremental_acc + total_base_acc
    overall_roi = total_incremental_acc / total_spend_acc if total_spend_acc > 0 else 0.0
    base_pct = (total_base_acc / total_sales * 100) if total_sales > 0 else 0.0
    incremental_pct = (total_incremental_acc / total_sales * 100) if total_sales > 0 else 100.0

    logger.info(
        "Model summary: cycle=%s, channels=%d, subchannels=%d, "
        "total_spend=%.2f, total_sales=%.4f, overall_roi=%.4f",
        cycle.cycle_id,
        len(channel_params),
        len(subchannel_rows),
        total_spend_acc,
        total_sales,
        overall_roi,
    )

    return ModelSummaryDataSchema(
        baseline_kpi=round(total_incremental_acc, 4),
        channels=subchannel_rows,
        cycle_id=cycle.cycle_id,
        uploaded_at=upload.uploaded_at,
        total_spend=round(total_spend_acc, 4),
        total_sales=round(total_sales, 4),
        overall_roi=round(overall_roi, 4),
        total_base_sales=round(total_base_acc, 4),
        total_incremental_sales=round(total_incremental_acc, 4),
        base_pct=round(base_pct, 2),
        incremental_pct=round(incremental_pct, 2),
    )
