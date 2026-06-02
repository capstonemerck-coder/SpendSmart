"""
Scenario management endpoints.

GET    /api/v1/scenarios           → list scenarios
POST   /api/v1/scenarios           → create scenario
GET    /api/v1/scenarios/{id}      → get scenario detail
PATCH  /api/v1/scenarios/{id}      → update scenario
DELETE /api/v1/scenarios/{id}      → delete scenario
POST   /api/v1/scenarios/{id}/run  → trigger optimizer
GET    /api/v1/scenarios/{id}/outcome → fetch results
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.db.database import get_db
from app.models.models import ScenarioChannelResult, ScenarioHeader, ScenarioOutcome, User
from app.schemas.schemas import (
    ScenarioCreate,
    ScenarioOut,
    ScenarioOutcomeOut,
    ScenarioUpdate,
)
from app.services.optimizer.optimizer_service import OptimizerService

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=List[ScenarioOut])
async def list_scenarios(
    cycle_id: Optional[str] = None,
    is_pending: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ScenarioHeader]:
    stmt = (
        select(ScenarioHeader)
        .options(selectinload(ScenarioHeader.constraints))
        .order_by(ScenarioHeader.created_at.desc())
    )
    if cycle_id:
        stmt = stmt.where(ScenarioHeader.cycle_id == cycle_id)
    if is_pending is not None:
        stmt = stmt.where(ScenarioHeader.is_pending == is_pending)

    # Non-admins only see public or their own scenarios
    if current_user.role != "admin":
        stmt = stmt.where(
            (ScenarioHeader.is_public.is_(True))
            | (ScenarioHeader.created_by == current_user.user_id)
        )

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=ScenarioOut, status_code=201)
async def create_scenario(
    body: ScenarioCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScenarioHeader:
    from app.core.exceptions import ConflictError
    from app.models.models import ScenarioConstraint

    # Unique name check per cycle
    if body.cycle_id:
        existing = await db.execute(
            select(ScenarioHeader).where(
                ScenarioHeader.cycle_id == body.cycle_id,
                ScenarioHeader.scenario_name == body.scenario_name,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(
                f"Scenario named '{body.scenario_name}' already exists for this cycle."
            )

    scenario = ScenarioHeader(
        scenario_name=body.scenario_name,
        cycle_id=body.cycle_id,
        created_by=current_user.user_id,
        scenario_type=body.scenario_type,
        is_public=body.is_public,
        category_constraint=body.category_constraint,
        target_spend=body.target_spend,
        target_kpi=body.target_kpi,
        target_value=body.target_value,
        is_pending=True,
    )
    db.add(scenario)
    await db.flush()

    for c in body.constraints:
        db.add(ScenarioConstraint(
            scenario_id=scenario.scenario_id,
            channel_id=c.channel_id,
            min_spend_pct=c.min_spend_pct,
            max_spend_pct=c.max_spend_pct,
        ))
    await db.flush()
    await db.refresh(scenario)
    return scenario


@router.get("/{scenario_id}", response_model=ScenarioOut)
async def get_scenario(
    scenario_id: int,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScenarioHeader:
    stmt = (
        select(ScenarioHeader)
        .options(selectinload(ScenarioHeader.constraints))
        .where(ScenarioHeader.scenario_id == scenario_id)
    )
    result = await db.execute(stmt)
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise NotFoundError(f"Scenario {scenario_id} not found.")
    return scenario


@router.patch("/{scenario_id}", response_model=ScenarioOut)
async def update_scenario(
    scenario_id: int,
    body: ScenarioUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScenarioHeader:
    from app.models.models import ScenarioConstraint

    result = await db.execute(
        select(ScenarioHeader)
        .options(selectinload(ScenarioHeader.constraints))
        .where(ScenarioHeader.scenario_id == scenario_id)
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise NotFoundError(f"Scenario {scenario_id} not found.")

    update_data = body.model_dump(exclude_none=True, exclude={"constraints"})
    for field, value in update_data.items():
        setattr(scenario, field, value)

    if body.constraints is not None:
        # Replace constraints atomically
        for c in list(scenario.constraints):
            await db.delete(c)
        await db.flush()
        for c in body.constraints:
            db.add(ScenarioConstraint(
                scenario_id=scenario_id,
                channel_id=c.channel_id,
                min_spend_pct=c.min_spend_pct,
                max_spend_pct=c.max_spend_pct,
            ))

    scenario.is_pending = True  # Reset to pending on update
    await db.flush()
    await db.refresh(scenario)
    return scenario


@router.delete("/{scenario_id}", status_code=204, response_model=None)
async def delete_scenario(
    scenario_id: int,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(ScenarioHeader).where(ScenarioHeader.scenario_id == scenario_id)
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise NotFoundError(f"Scenario {scenario_id} not found.")
    await db.delete(scenario)
    await db.flush()


@router.post("/{scenario_id}/run", summary="Execute optimizer for scenario")
async def run_scenario(
    scenario_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Trigger the constrained nonlinear optimizer for a saved scenario.
    Stores results in SCENARIO_CHANNEL_RESULTS and SCENARIO_OUTCOME.
    """
    svc = OptimizerService(db)
    result = await svc.run(scenario_id)
    return {
        "status": "success",
        "scenario_id": scenario_id,
        "converged": result["converged"],
        "message": f"Optimizer completed. ROI: {result['outcome']['roi']:.3f}",
        "outcome": result["outcome"],
    }


@router.get("/{scenario_id}/outcome", response_model=ScenarioOutcomeOut)
async def get_scenario_outcome(
    scenario_id: int,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScenarioOutcomeOut:
    """Retrieve stored optimization results for a scenario."""
    # Load outcome
    outcome_result = await db.execute(
        select(ScenarioOutcome).where(ScenarioOutcome.scenario_id == scenario_id)
    )
    outcome = outcome_result.scalar_one_or_none()
    if not outcome:
        raise NotFoundError(
            f"No outcome found for scenario {scenario_id}. "
            "Run the optimizer first via POST /scenarios/{id}/run."
        )

    # Load channel results
    ch_result = await db.execute(
        select(ScenarioChannelResult).where(
            ScenarioChannelResult.scenario_id == scenario_id
        )
    )
    channel_results = list(ch_result.scalars().all())

    # Load scenario name + type
    sc_result = await db.execute(
        select(ScenarioHeader).where(ScenarioHeader.scenario_id == scenario_id)
    )
    scenario = sc_result.scalar_one_or_none()

    return ScenarioOutcomeOut(
        scenario_id=scenario_id,
        scenario_name=scenario.scenario_name if scenario else None,
        scenario_type=scenario.scenario_type if scenario else None,
        total_sales=outcome.total_sales,
        total_spend=outcome.total_spend,
        impactable_sales=outcome.impactable_sales,
        roi=outcome.roi,
        mroi=outcome.mroi,
        channel_results=[
            {
                "channel_id": cr.channel_id,
                "optimized_spend": cr.optimized_spend,
                "impactable_sales": cr.impactable_sales,
                "roi": cr.roi,
                "mroi": cr.mroi,
            }
            for cr in channel_results
        ],
    )
