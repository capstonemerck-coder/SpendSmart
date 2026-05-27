"""
Objective functions for scipy.optimize.minimize.

All objectives return a scalar to MINIMIZE.
To maximize sales, return negative sales.
"""
from __future__ import annotations

from typing import Dict, List

import numpy as np

from app.services.optimizer.transformations.response import channel_response


def negative_total_sales(
    spend_vector: np.ndarray,
    channel_params: List[Dict],
) -> float:
    """
    Objective: maximize total incremental sales.
    Returns negative sales (scipy minimizes).

    Args:
        spend_vector:   1-D array of spend per channel (optimizer variable).
        channel_params: List of dicts with MMM params for each channel.

    Returns:
        Negative total incremental sales.
    """
    total = 0.0
    for i, params in enumerate(channel_params):
        total += channel_response(
            spend=float(spend_vector[i]),
            estimate=params["estimate"],
            curve_type=params["curve_type"],
            curvature=params["curvature"],
            adstock_rate=params["adstock_rate"],
            base_sales=params["base_sales"],
            impactable_sales_pct=params["impactable_sales_pct"],
        )
    return -total


def minimize_total_spend_for_target_sales(
    spend_vector: np.ndarray,
    channel_params: List[Dict],
    target_sales: float,
    penalty_weight: float = 1e6,
) -> float:
    """
    Objective: minimize total spend while hitting a target sales level.
    Uses quadratic penalty for shortfall.

    Args:
        spend_vector:   1-D array of spend per channel.
        channel_params: MMM params per channel.
        target_sales:   Required incremental sales.
        penalty_weight: Weight for constraint violation penalty.
    """
    total_spend = float(np.sum(spend_vector))
    total_sales = 0.0
    for i, params in enumerate(channel_params):
        total_sales += channel_response(
            spend=float(spend_vector[i]),
            **{k: v for k, v in params.items() if k != "channel_id"},
        )

    shortfall = max(0.0, target_sales - total_sales)
    penalty = penalty_weight * shortfall ** 2

    return total_spend + penalty
