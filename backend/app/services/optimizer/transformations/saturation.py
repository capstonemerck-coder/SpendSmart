"""
Saturation and response curve transformations.

MMM models commonly use these functional forms to capture diminishing returns:

  1. Hill / S-curve saturation
  2. Power curve (diminishing returns)
  3. Negative exponential saturation
  4. Log saturation
  5. Linear (pass-through)

Each function maps raw (adstocked) spend → response units.
"""
from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


# ── Hill / S-Curve ────────────────────────────────────────────────────────────

def hill_saturation(
    x: NDArray[np.float64] | float,
    alpha: float,
    gamma: float,
) -> NDArray[np.float64]:
    """
    Hill function saturation.

        f(x) = x^alpha / (x^alpha + gamma^alpha)

    Args:
        x:     Spend (scalar or array).
        alpha: Shape parameter > 0. Controls steepness.
        gamma: Half-saturation point. Response = 0.5 when x = gamma.

    Returns:
        Saturation value ∈ [0, 1).
    """
    x = np.asarray(x, dtype=np.float64)
    x = np.maximum(x, 0.0)
    xa = x ** alpha
    ga = gamma ** alpha
    return xa / (xa + ga)


# ── Power curve ───────────────────────────────────────────────────────────────

def power_saturation(
    x: NDArray[np.float64] | float,
    curvature: float,
) -> NDArray[np.float64]:
    """
    Power curve: f(x) = x^curvature.

    curvature ∈ (0, 1) produces diminishing returns.
    curvature = 1 is linear.

    Args:
        x:          Spend (non-negative).
        curvature:  Exponent ∈ (0, 1].
    """
    x = np.asarray(x, dtype=np.float64)
    x = np.maximum(x, 0.0)
    curvature = float(np.clip(curvature, 0.01, 2.0))
    return x ** curvature


# ── Negative exponential ──────────────────────────────────────────────────────

def exp_saturation(
    x: NDArray[np.float64] | float,
    alpha: float,
) -> NDArray[np.float64]:
    """
    Negative exponential saturation: f(x) = 1 - exp(-alpha * x).

    Approaches 1 asymptotically as x → ∞.

    Args:
        x:     Spend.
        alpha: Saturation speed > 0. Higher = saturates faster.
    """
    x = np.asarray(x, dtype=np.float64)
    x = np.maximum(x, 0.0)
    alpha = float(np.maximum(alpha, 1e-9))
    return 1.0 - np.exp(-alpha * x)


# ── Log saturation ────────────────────────────────────────────────────────────

def log_saturation(
    x: NDArray[np.float64] | float,
    alpha: float = 1.0,
) -> NDArray[np.float64]:
    """
    Logarithmic saturation: f(x) = alpha * log(1 + x).

    Args:
        x:     Spend.
        alpha: Scale multiplier.
    """
    x = np.asarray(x, dtype=np.float64)
    x = np.maximum(x, 0.0)
    return float(alpha) * np.log1p(x)


# ── Linear (no saturation) ────────────────────────────────────────────────────

def linear(x: NDArray[np.float64] | float) -> NDArray[np.float64]:
    """Identity transformation."""
    return np.asarray(x, dtype=np.float64)


# ── Dispatcher ────────────────────────────────────────────────────────────────

CURVE_MAP = {
    "adstock": power_saturation,        # adstock curve type uses curvature exponent
    "diminishing_returns": power_saturation,
    "hill": hill_saturation,
    "exp": exp_saturation,
    "log": log_saturation,
    "linear": linear,
}


def apply_saturation(
    x: NDArray[np.float64] | float,
    curve_type: str,
    curvature: float = 0.8,
    **kwargs,
) -> NDArray[np.float64]:
    """
    Apply the appropriate saturation curve based on MODEL_FACT.curve_type.

    Args:
        x:          Spend values.
        curve_type: Curve identifier string.
        curvature:  Primary shape parameter.
        **kwargs:   Additional params forwarded to the curve function.

    Returns:
        Transformed spend (response units).
    """
    fn = CURVE_MAP.get(curve_type.lower(), power_saturation)
    x_arr = np.asarray(x, dtype=np.float64)

    if fn in (hill_saturation,):
        gamma = kwargs.get("gamma", curvature)
        return fn(x_arr, curvature, gamma)
    elif fn in (exp_saturation,):
        return fn(x_arr, curvature)
    elif fn in (log_saturation,):
        return fn(x_arr, curvature)
    elif fn is linear:
        return fn(x_arr)
    else:  # power_saturation (default)
        return fn(x_arr, curvature)
