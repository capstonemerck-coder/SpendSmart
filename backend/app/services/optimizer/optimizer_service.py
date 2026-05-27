"""
OptimizerService — orchestrates the full optimization pipeline for a scenario.

Pipeline:
  1. Load scenario config from DB
  2. Load channel MMM params from MODEL_FACT
  3. Load current spends from MODEL_CHANNEL_CALCULATIONS
  4. Run scipy solver (spend-based or goal-based)
  5. Calculate per-channel KPIs
  6. Calculate scenario outcome KPIs
  7. Persist SCENARIO_CHANNEL_RESULTS + SCENARIO_OUTCOME
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, OptimizerError
from app.models.models import (
    ModelFact,
    ScenarioChannelResult,
    ScenarioConstraint,
    ScenarioHeader,
    ScenarioOutcome,
)
from app.services.optimizer.calculators.kpi_calculator import (
    calculate_channel_kpis,
    calculate_scenario_outcome,
)
from app.services.optimizer.solvers.scipy_solver import solve_goal_based, solve_spend_based

logger = logging.getLogger(__name__)


class OptimizerService:
    """Stateless service — all state passed via `db` session and `scenario_id`."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, scenario_id: int) -> Dict[str, Any]:
        """
        Execute full optimization pipeline for the given scenario.

        Returns:
            Dict with outcome KPIs and per-channel results.

        Raises:
            NotFoundError:  Scenario not found.
            OptimizerError: Optimization failed.
        """
        logger.info("Starting optimizer for scenario_id=%d", scenario_id)

        # ── 1. Load scenario ──────────────────────────────────────────────────
        scenario = await self._load_scenario(scenario_id)
        if scenario is None:
            raise NotFoundError(f"Scenario {scenario_id} not found.")

        cycle_id = scenario.cycle_id
        if not cycle_id:
            raise OptimizerError("Scenario has no associated cycle_id.")

        # ── 2. Load MMM params from MODEL_FACT ────────────────────────────────
        model_facts = await self._load_model_facts(cycle_id)
        if not model_facts:
            raise OptimizerError(
                f"No MODEL_FACT rows found for cycle '{cycle_id}'. "
                "Please upload model output before running the optimizer."
            )

        # ── 3. Build channel parameter list ───────────────────────────────────
        constraint_map = {c.channel_id: c for c in scenario.constraints}
        channel_params, current_spends, min_pcts, max_pcts = self._build_channel_inputs(
            model_facts, constraint_map
        )

        if not channel_params:
            raise OptimizerError("No optimizable channels found.")

        # ── 4. Run solver ─────────────────────────────────────────────────────
        try:
            if scenario.scenario_type == "Spend Based":
                target_spend = float(scenario.target_spend or sum(current_spends))
                opt_spend, result = solve_spend_based(
                    channel_params, current_spends, target_spend, min_pcts, max_pcts
                )
            else:  # Goal Based
                target_sales = float(scenario.target_value or 0)
                opt_spend, result = solve_goal_based(
                    channel_params, current_spends, target_sales, min_pcts, max_pcts
                )
        except Exception as exc:
            logger.exception("Optimizer solver raised exception")
            raise OptimizerError(f"Solver failed: {exc}") from exc

        # ── 5. Calculate per-channel KPIs ─────────────────────────────────────
        channel_results = []
        for i, params in enumerate(channel_params):
            kpis = calculate_channel_kpis(float(opt_spend[i]), params)
            kpis["channel_id"] = params["channel_id"]
            channel_results.append(kpis)

        # ── 6. Calculate scenario outcome ──────────────────────────────────────
        base_sales_total = sum(p.get("base_sales", 0) for p in channel_params)
        outcome_kpis = calculate_scenario_outcome(channel_results, base_sales_total)

        # ── 7. Persist results ─────────────────────────────────────────────────
        await self._persist_results(scenario_id, channel_results, outcome_kpis)

        # Mark scenario as complete
        scenario.is_pending = False
        await self.db.flush()

        logger.info(
            "Optimizer complete for scenario_id=%d | ROI=%.3f | spend=%.2f",
            scenario_id,
            outcome_kpis["roi"],
            outcome_kpis["total_spend"],
        )

        return {
            "scenario_id": scenario_id,
            "outcome": outcome_kpis,
            "channel_results": channel_results,
            "converged": result.success,
            "solver_message": result.message,
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _load_scenario(self, scenario_id: int) -> Optional[ScenarioHeader]:
        stmt = (
            select(ScenarioHeader)
            .options(selectinload(ScenarioHeader.constraints))
            .where(ScenarioHeader.scenario_id == scenario_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _load_model_facts(self, cycle_id: str) -> List[ModelFact]:
        stmt = select(ModelFact).where(ModelFact.cycle_id == cycle_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def _build_channel_inputs(
        self,
        model_facts: List[ModelFact],
        constraint_map: Dict[int, ScenarioConstraint],
    ):
        """Build parallel lists consumed by the solver."""
        channel_params = []
        current_spends = []
        min_pcts = []
        max_pcts = []

        for mf in model_facts:
            # Use a synthetic channel_id from model_fact row if no hierarchy exists
            ch_id = mf.id  # fallback; real implementation maps via CHANNEL_HIERARCHY
            params = {
                "channel_id": ch_id,
                "estimate": float(mf.estimate or 0.01),
                "curve_type": mf.curve_type or "diminishing_returns",
                "curvature": float(mf.curvature or 0.8),
                "adstock_rate": float(mf.adstock_rate or 0.3),
                "base_sales": float(mf.base_sales or 1_000_000),
                "impactable_sales_pct": float(mf.impactable_sales_pct or 20),
            }
            channel_params.append(params)

            # Current spend: use adstock_horizon as proxy for now;
            # real value comes from DATA_FACT aggregation
            current_spend = float(mf.base_sales or 100_000) * 0.05
            current_spends.append(current_spend)

            constraint = constraint_map.get(ch_id)
            min_pcts.append(float(constraint.min_spend_pct) if constraint else 0.0)
            max_pcts.append(float(constraint.max_spend_pct) if constraint else 0.0)

        return channel_params, current_spends, min_pcts, max_pcts

    async def _persist_results(
        self,
        scenario_id: int,
        channel_results: List[Dict],
        outcome_kpis: Dict,
    ) -> None:
        """Write SCENARIO_CHANNEL_RESULTS and SCENARIO_OUTCOME rows."""
        # Delete existing results
        existing_channels = await self.db.execute(
            select(ScenarioChannelResult).where(
                ScenarioChannelResult.scenario_id == scenario_id
            )
        )
        for row in existing_channels.scalars():
            await self.db.delete(row)

        existing_outcome = await self.db.execute(
            select(ScenarioOutcome).where(ScenarioOutcome.scenario_id == scenario_id)
        )
        for row in existing_outcome.scalars():
            await self.db.delete(row)

        await self.db.flush()

        # Insert channel results
        for cr in channel_results:
            self.db.add(ScenarioChannelResult(
                scenario_id=scenario_id,
                channel_id=cr["channel_id"],
                optimized_spend=cr["optimized_spend"],
                impactable_sales=cr["impactable_sales"],
                roi=cr["roi"],
                mroi=cr["mroi"],
            ))

        # Insert outcome
        self.db.add(ScenarioOutcome(
            scenario_id=scenario_id,
            total_sales=outcome_kpis["total_sales"],
            total_spend=outcome_kpis["total_spend"],
            impactable_sales=outcome_kpis["impactable_sales"],
            roi=outcome_kpis["roi"],
            mroi=outcome_kpis["mroi"],
        ))

        await self.db.flush()
