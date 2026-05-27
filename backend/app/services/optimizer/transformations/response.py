"""
Channel response function.

Computes the incremental sales response for a given spend level,
combining adstock carryover and saturation curve effects.

Response formula:
    response = base_sales * impactable_sales_pct * estimate
               * saturation(adstock(spend))
"""
from __future__ import annotations

import numpy as np

from app.services.optimizer.transformations.adstock import apply_adstock_scalar
from app.services.optimizer.transformations.saturation import apply_saturation


def channel_response(
    spend: float,
    estimate: float,
    curve_type: str,
    curvature: float,
    adstock_rate: float,
    base_sales: float,
    impactable_sales_pct: float,
) -> float:
    """
    Compute incremental sales for a single channel at a given spend level.

    This is the core function consumed by the optimizer objective.

    Args:
        spend:                  Budget allocated to this channel.
        estimate:               MMM coefficient (from MODEL_FACT).
        curve_type:             Saturation curve type string.
        curvature:              Curve shape parameter.
        adstock_rate:           Geometric adstock decay rate.
        base_sales:             Baseline sales (from MODEL_FACT).
        impactable_sales_pct:   Percentage of sales attributable to media.

    Returns:
        Projected incremental sales in dollar terms.
    """
    if spend <= 0:
        return 0.0

    # Step 1: Apply adstock (infinite-horizon geometric sum for budget optimization)
    effective_spend = apply_adstock_scalar(spend, adstock_rate)

    # Step 2: Apply saturation curve
    saturated = float(
        apply_saturation(np.array([effective_spend]), curve_type, curvature)[0]
    )

    # Step 3: Scale by model coefficient and impactable sales base
    impactable_base = base_sales * (impactable_sales_pct / 100.0)
    response = estimate * saturated * impactable_base

    return max(0.0, response)


def channel_mroi(
    spend: float,
    estimate: float,
    curve_type: str,
    curvature: float,
    adstock_rate: float,
    base_sales: float,
    impactable_sales_pct: float,
    delta: float = 1000.0,
) -> float:
    """
    Compute marginal ROI at a given spend level.

    mROI = (response(spend + δ) - response(spend)) / δ

    Args:
        delta: Spend increment used for numerical differentiation (default $1K).
    """
    if spend <= 0:
        return 0.0

    kwargs = dict(
        estimate=estimate,
        curve_type=curve_type,
        curvature=curvature,
        adstock_rate=adstock_rate,
        base_sales=base_sales,
        impactable_sales_pct=impactable_sales_pct,
    )
    r1 = channel_response(spend, **kwargs)
    r2 = channel_response(spend + delta, **kwargs)
    return (r2 - r1) / delta
