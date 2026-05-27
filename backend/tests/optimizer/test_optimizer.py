"""
Unit tests for the optimizer pipeline.

Tests: transformations, response function, constraints, KPI calculators, solver.
"""
from __future__ import annotations

import numpy as np
import pytest

from app.services.optimizer.calculators.kpi_calculator import (
    calculate_channel_kpis,
    calculate_scenario_outcome,
)
from app.services.optimizer.constraints.spend_constraints import (
    build_budget_equality_constraint,
    build_channel_bounds,
    build_min_sales_constraint,
)
from app.services.optimizer.solvers.scipy_solver import solve_goal_based, solve_spend_based
from app.services.optimizer.transformations.adstock import (
    apply_adstock,
    apply_adstock_scalar,
)
from app.services.optimizer.transformations.response import channel_mroi, channel_response
from app.services.optimizer.transformations.saturation import (
    apply_saturation,
    power_saturation,
)


# ── Adstock ───────────────────────────────────────────────────────────────────

class TestAdstock:
    def test_zero_rate_no_carryover(self):
        spend = np.array([100.0, 0.0, 0.0])
        result = apply_adstock(spend, rate=0.0)
        assert result[0] == pytest.approx(100.0)
        assert result[1] == pytest.approx(0.0)

    def test_nonzero_rate_carryover(self):
        spend = np.array([100.0, 0.0, 0.0])
        result = apply_adstock(spend, rate=0.5)
        assert result[0] == pytest.approx(100.0)
        assert result[1] == pytest.approx(50.0)
        assert result[2] == pytest.approx(25.0)

    def test_scalar_adstock(self):
        # Infinite-horizon sum for rate=0.5: spend / (1 - rate) = 2 * spend
        result = apply_adstock_scalar(100.0, rate=0.5)
        assert result == pytest.approx(200.0)

    def test_clips_rate_boundaries(self):
        # rate > 1 clamped to 0.9999
        result = apply_adstock_scalar(100.0, rate=2.0)
        assert result > 100.0  # doesn't blow up


# ── Saturation ────────────────────────────────────────────────────────────────

class TestSaturation:
    def test_power_saturation_diminishing(self):
        # With curvature < 1, higher spend → less than proportional response
        r1 = float(power_saturation(100.0, 0.8))
        r2 = float(power_saturation(200.0, 0.8))
        assert r2 < r1 * 2  # not linear

    def test_zero_spend_zero_response(self):
        result = float(power_saturation(0.0, 0.8))
        assert result == pytest.approx(0.0)

    def test_saturation_dispatcher(self):
        result = apply_saturation(np.array([100.0]), "diminishing_returns", 0.8)
        assert result[0] > 0

    def test_unknown_curve_falls_back_to_power(self):
        result = apply_saturation(np.array([100.0]), "unknown_type", 0.8)
        assert result[0] > 0


# ── Channel Response ──────────────────────────────────────────────────────────

class TestChannelResponse:
    _params = dict(
        estimate=0.03,
        curve_type="diminishing_returns",
        curvature=0.8,
        adstock_rate=0.4,
        base_sales=1_000_000,
        impactable_sales_pct=25,
    )

    def test_positive_spend_positive_response(self):
        r = channel_response(spend=100_000, **self._params)
        assert r > 0

    def test_zero_spend_zero_response(self):
        r = channel_response(spend=0, **self._params)
        assert r == pytest.approx(0.0)

    def test_higher_spend_higher_response(self):
        r1 = channel_response(spend=50_000, **self._params)
        r2 = channel_response(spend=100_000, **self._params)
        assert r2 > r1

    def test_diminishing_returns(self):
        r1 = channel_response(spend=100_000, **self._params)
        r2 = channel_response(spend=200_000, **self._params)
        # Doubling spend should NOT double response (diminishing returns)
        assert r2 < r1 * 2

    def test_mroi_decreases_with_spend(self):
        m1 = channel_mroi(spend=100_000, **self._params)
        m2 = channel_mroi(spend=500_000, **self._params)
        assert m2 < m1  # mROI falls as spend rises


# ── Constraints ───────────────────────────────────────────────────────────────

class TestConstraints:
    def test_budget_equality_satisfied(self):
        c = build_budget_equality_constraint(1_000_000)
        x = np.array([300_000, 400_000, 300_000])
        assert c["fun"](x) == pytest.approx(0.0)

    def test_budget_equality_violated(self):
        c = build_budget_equality_constraint(1_000_000)
        x = np.array([200_000, 200_000, 200_000])
        assert c["fun"](x) != pytest.approx(0.0)

    def test_channel_bounds_respect_percentages(self):
        bounds = build_channel_bounds(
            current_spends=[100_000, 200_000],
            min_pcts=[-20, -10],
            max_pcts=[30, 20],
        )
        lo0, hi0 = bounds[0]
        assert lo0 == pytest.approx(80_000)
        assert hi0 == pytest.approx(130_000)

    def test_lower_bound_never_negative(self):
        bounds = build_channel_bounds([1000], [-150], [50])
        lo, _ = bounds[0]
        assert lo >= 0.0


# ── Solver ────────────────────────────────────────────────────────────────────

MOCK_CHANNELS = [
    {
        "channel_id": 1,
        "estimate": 0.03,
        "curve_type": "diminishing_returns",
        "curvature": 0.8,
        "adstock_rate": 0.4,
        "base_sales": 1_000_000,
        "impactable_sales_pct": 25,
    },
    {
        "channel_id": 2,
        "estimate": 0.025,
        "curve_type": "diminishing_returns",
        "curvature": 0.75,
        "adstock_rate": 0.35,
        "base_sales": 800_000,
        "impactable_sales_pct": 20,
    },
]
CURRENT_SPENDS = [100_000, 80_000]


class TestSolver:
    def test_spend_based_respects_budget(self):
        opt, result = solve_spend_based(
            MOCK_CHANNELS, CURRENT_SPENDS,
            target_spend=200_000,
            min_pcts=[-30, -30],
            max_pcts=[50, 50],
        )
        assert np.sum(opt) == pytest.approx(200_000, rel=0.01)

    def test_spend_based_all_positive(self):
        opt, _ = solve_spend_based(
            MOCK_CHANNELS, CURRENT_SPENDS,
            target_spend=200_000,
            min_pcts=[0, 0],
            max_pcts=[0, 0],
        )
        assert np.all(opt >= 0)

    def test_goal_based_hits_sales_target(self):
        target_sales = 50_000
        opt, _ = solve_goal_based(
            MOCK_CHANNELS, CURRENT_SPENDS,
            target_sales=target_sales,
            min_pcts=[0, 0],
            max_pcts=[100, 100],
        )
        from app.services.optimizer.transformations.response import channel_response
        achieved = sum(
            channel_response(float(opt[i]), **{k: v for k, v in p.items() if k != "channel_id"})
            for i, p in enumerate(MOCK_CHANNELS)
        )
        assert achieved >= target_sales * 0.8  # allow 20% tolerance for solver


# ── KPI Calculator ────────────────────────────────────────────────────────────

class TestKPICalculator:
    _params = {
        "channel_id": 1,
        "estimate": 0.03,
        "curve_type": "diminishing_returns",
        "curvature": 0.8,
        "adstock_rate": 0.4,
        "base_sales": 1_000_000,
        "impactable_sales_pct": 25,
    }

    def test_kpis_have_required_keys(self):
        result = calculate_channel_kpis(100_000, self._params)
        assert "optimized_spend" in result
        assert "impactable_sales" in result
        assert "roi" in result
        assert "mroi" in result

    def test_roi_positive(self):
        result = calculate_channel_kpis(100_000, self._params)
        assert result["roi"] > 0

    def test_scenario_outcome_aggregates(self):
        channel_results = [
            {"optimized_spend": 100_000, "impactable_sales": 250_000, "roi": 2.5, "mroi": 1.8},
            {"optimized_spend": 80_000,  "impactable_sales": 180_000, "roi": 2.25, "mroi": 1.5},
        ]
        outcome = calculate_scenario_outcome(channel_results, base_sales_total=2_000_000)
        assert outcome["total_spend"] == pytest.approx(180_000)
        assert outcome["impactable_sales"] == pytest.approx(430_000)
        assert outcome["total_sales"] == pytest.approx(2_430_000)
        assert outcome["roi"] > 0
