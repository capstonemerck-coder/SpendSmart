"""
Adstock transformation module.

Adstock models the carryover effect of advertising: spend in period t
continues to have diminishing impact in future periods t+1, t+2, ...

Formula (geometric decay):
    adstock[t] = spend[t] + rate * adstock[t-1]
"""
from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def apply_adstock(
    spend: NDArray[np.float64],
    rate: float,
    horizon: int | None = None,
) -> NDArray[np.float64]:
    """
    Apply geometric adstock transformation to a spend time-series.

    Args:
        spend:   1-D array of spend values over time.
        rate:    Adstock decay rate ∈ [0, 1].  0 = no carryover; 1 = full persist.
        horizon: Optional cap on the number of lagged periods.  None = no cap.

    Returns:
        Adstocked spend array (same length as input).
    """
    rate = float(np.clip(rate, 0.0, 1.0))
    result = np.zeros_like(spend, dtype=np.float64)
    for t in range(len(spend)):
        result[t] = spend[t]
        lag_limit = t if horizon is None else min(t, horizon - 1)
        for lag in range(1, lag_limit + 1):
            result[t] += (rate ** lag) * spend[t - lag]
    return result


def apply_adstock_scalar(spend: float, rate: float) -> float:
    """
    Single-period adstock applied to a scalar spend value.
    Useful when optimizing a single budget allocation snapshot.

    Returns spend with adstock weight factor:
        effective_spend = spend / (1 - rate)   [infinite-horizon sum]
    """
    rate = float(np.clip(rate, 0.0, 0.9999))
    return spend / (1.0 - rate)
