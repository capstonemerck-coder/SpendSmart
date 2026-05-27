"""
KPI calculators for post-optimization metrics.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from app.services.optimizer.transformations.response import channel_mroi, channel_response


def calculate_channel_kpis(
    optimized_spend: float,
    channel_params: Dict,
) -> Dict[str, Optional[float]]:
    """
    Compute per-channel KPIs after optimization.

    Returns:
        Dict with keys: optimized_spend, impactable_sales, roi, mroi
    """
    imp_sales = channel_response(
        spend=optimized_spend,
        estimate=channel_params["estimate"],
        curve_type=channel_params["curve_type"],
        curvature=channel_params["curvature"],
        adstock_rate=channel_params["adstock_rate"],
        base_sales=channel_params["base_sales"],
        impactable_sales_pct=channel_params["impactable_sales_pct"],
    )
    roi = imp_sales / optimized_spend if optimized_spend > 0 else 0.0
    mroi = channel_mroi(
        spend=optimized_spend,
        estimate=channel_params["estimate"],
        curve_type=channel_params["curve_type"],
        curvature=channel_params["curvature"],
        adstock_rate=channel_params["adstock_rate"],
        base_sales=channel_params["base_sales"],
        impactable_sales_pct=channel_params["impactable_sales_pct"],
    )
    return {
        "optimized_spend": round(optimized_spend, 4),
        "impactable_sales": round(imp_sales, 4),
        "roi": round(roi, 6),
        "mroi": round(mroi, 6),
    }


def calculate_scenario_outcome(
    channel_results: List[Dict],
    base_sales_total: float,
) -> Dict[str, float]:
    """
    Aggregate channel-level results into scenario-level KPIs.

    Args:
        channel_results: List of per-channel dicts from calculate_channel_kpis.
        base_sales_total: Total base sales from MODEL_FACT for the cycle.

    Returns:
        Dict: total_sales, total_spend, impactable_sales, roi, mroi
    """
    total_spend = sum(r["optimized_spend"] for r in channel_results)
    total_imp_sales = sum(r["impactable_sales"] for r in channel_results)
    total_sales = base_sales_total + total_imp_sales
    overall_roi = total_imp_sales / total_spend if total_spend > 0 else 0.0

    # Marginal ROI at portfolio level (spend-weighted average)
    if total_spend > 0:
        mroi = sum(r["mroi"] * r["optimized_spend"] for r in channel_results) / total_spend
    else:
        mroi = 0.0

    return {
        "total_sales": round(total_sales, 4),
        "total_spend": round(total_spend, 4),
        "impactable_sales": round(total_imp_sales, 4),
        "roi": round(overall_roi, 6),
        "mroi": round(mroi, 6),
    }


def calculate_baseline_kpis(
    channel_params: List[Dict],
    current_spends: List[float],
) -> List[Dict]:
    """
    Compute MODEL_CHANNEL_CALCULATIONS (baseline KPIs before optimization).

    Args:
        channel_params: List of dicts with MMM params per channel.
        current_spends: Historical spend per channel from DATA_FACT.

    Returns:
        List of dicts: channel_id, total_spend, impactable_sales, roi
    """
    results = []
    for params, spend in zip(channel_params, current_spends):
        imp_sales = channel_response(spend=spend, **{
            k: v for k, v in params.items()
            if k in ("estimate", "curve_type", "curvature", "adstock_rate",
                     "base_sales", "impactable_sales_pct")
        })
        roi = imp_sales / spend if spend > 0 else 0.0
        results.append({
            "channel_id": params["channel_id"],
            "total_spend": round(spend, 4),
            "impactable_sales": round(imp_sales, 4),
            "total_sales": round(params.get("base_sales", 0) + imp_sales, 4),
            "roi": round(roi, 6),
        })
    return results
