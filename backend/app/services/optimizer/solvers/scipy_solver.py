"""
scipy.optimize wrapper — the actual optimization solver.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.optimize import OptimizeResult, minimize

from app.services.optimizer.constraints.spend_constraints import (
    build_budget_equality_constraint,
    build_channel_bounds,
    build_min_sales_constraint,
)
from app.services.optimizer.objective_functions.objectives import (
    minimize_total_spend_for_target_sales,
    negative_total_sales,
)

logger = logging.getLogger(__name__)

_METHOD = "SLSQP"
_OPTIONS = {"maxiter": 1000, "ftol": 1e-9, "disp": False}


def solve_spend_based(
    channel_params: List[Dict],
    current_spends: List[float],
    target_spend: float,
    min_pcts: List[float],
    max_pcts: List[float],
) -> Tuple[np.ndarray, OptimizeResult]:
    """
    Spend-based optimization: allocate a fixed total budget to maximize sales.

    Args:
        channel_params: MMM parameter dicts (estimate, curve_type, …).
        current_spends: Baseline spend per channel (used for bounds).
        target_spend:   Total budget to allocate.
        min_pcts:       Per-channel minimum spend % change (e.g. -15).
        max_pcts:       Per-channel maximum spend % change (e.g. +20).

    Returns:
        (optimized_spend_vector, scipy OptimizeResult)
    """
    n = len(channel_params)
    if n == 0:
        raise ValueError("No channels to optimize.")

    # Initial guess: proportional to current spend, scaled to target
    total_current = sum(current_spends)
    if total_current > 0:
        x0 = np.array(current_spends) * (target_spend / total_current)
    else:
        x0 = np.full(n, target_spend / n)

    bounds = build_channel_bounds(current_spends, min_pcts, max_pcts)
    constraints = [build_budget_equality_constraint(target_spend)]

    result = minimize(
        fun=negative_total_sales,
        x0=x0,
        args=(channel_params,),
        method=_METHOD,
        bounds=bounds,
        constraints=constraints,
        options=_OPTIONS,
    )
    if not result.success:
        logger.warning("Spend-based optimizer did not converge: %s", result.message)

    optimized = np.maximum(result.x, 0.0)
    return optimized, result


def solve_goal_based(
    channel_params: List[Dict],
    current_spends: List[float],
    target_sales: float,
    min_pcts: List[float],
    max_pcts: List[float],
) -> Tuple[np.ndarray, OptimizeResult]:
    """
    Goal-based optimization: minimize total spend while achieving a sales target.

    Args:
        channel_params: MMM parameter dicts.
        current_spends: Baseline spend per channel.
        target_sales:   Required incremental sales.
        min_pcts:       Per-channel minimum spend % change.
        max_pcts:       Per-channel maximum spend % change.

    Returns:
        (optimized_spend_vector, scipy OptimizeResult)
    """
    n = len(channel_params)
    if n == 0:
        raise ValueError("No channels to optimize.")

    x0 = np.array(current_spends, dtype=np.float64)
    if np.sum(x0) == 0:
        x0 = np.ones(n) * 1000.0

    bounds = build_channel_bounds(current_spends, min_pcts, max_pcts)
    constraints = [build_min_sales_constraint(channel_params, target_sales)]

    result = minimize(
        fun=minimize_total_spend_for_target_sales,
        x0=x0,
        args=(channel_params, target_sales),
        method=_METHOD,
        bounds=bounds,
        constraints=constraints,
        options=_OPTIONS,
    )
    if not result.success:
        logger.warning("Goal-based optimizer did not converge: %s", result.message)

    optimized = np.maximum(result.x, 0.0)
    return optimized, result
