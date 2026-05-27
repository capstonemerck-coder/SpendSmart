"""
Constraint builders for scipy.optimize.minimize.

Builds the `constraints` list consumed by scipy's SLSQP / trust-constr solvers.
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np


def build_budget_equality_constraint(target_spend: float) -> Dict:
    """
    Spend-based constraint: total spend must equal target_spend.

    Returns a scipy equality constraint dict.
    """
    return {
        "type": "eq",
        "fun": lambda x: np.sum(x) - target_spend,
        "jac": lambda x: np.ones_like(x),
    }


def build_min_sales_constraint(
    channel_params: List[Dict],
    target_sales: float,
) -> Dict:
    """
    Goal-based constraint: total incremental sales must be ≥ target_sales.

    Returns a scipy inequality constraint dict (fun ≥ 0).
    """
    from app.services.optimizer.transformations.response import channel_response

    def sales_surplus(x: np.ndarray) -> float:
        total = sum(
            channel_response(float(x[i]), **{k: v for k, v in p.items() if k != "channel_id"})
            for i, p in enumerate(channel_params)
        )
        return total - target_sales

    return {"type": "ineq", "fun": sales_surplus}


def build_channel_bounds(
    current_spends: List[float],
    min_pcts: List[float],
    max_pcts: List[float],
) -> List[tuple]:
    """
    Build per-channel spend bounds for scipy.

    Args:
        current_spends: Baseline spend for each channel.
        min_pcts:       Minimum allowed spend as percent change (negative = decrease).
        max_pcts:       Maximum allowed spend as percent change (positive = increase).

    Returns:
        List of (lower_bound, upper_bound) tuples; one per channel.
    """
    bounds = []
    for spend, min_pct, max_pct in zip(current_spends, min_pcts, max_pcts):
        lo = spend * (1.0 + min_pct / 100.0)
        hi = spend * (1.0 + max_pct / 100.0)
        lo = max(0.0, lo)
        hi = max(lo, hi)
        bounds.append((lo, hi))
    return bounds
