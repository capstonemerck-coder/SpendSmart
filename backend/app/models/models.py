"""
SQLAlchemy ORM models.

Matches the ERD:
  Master tables:  META_DATA, ROLE_SCREEN_PERMISSIONS
  Upload tables:  DATA_FACT, MODEL_FACT
  Derived tables: MODEL_CHANNEL_CALCULATIONS, SCENARIO_CHANNEL_RESULTS, SCENARIO_OUTCOME
  App tables:     USERS, UPLOADS, CYCLE_DEF, CHANNEL_HIERARCHY,
                  SCENARIO_HEADER, SCENARIO_CONSTRAINTS
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, Date, DateTime, ForeignKey, Integer,
    Numeric, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Master / seed tables ──────────────────────────────────────────────────────

class MetaData(Base):
    """
    META_DATA — preconfigured market/brand hierarchy.
    Seeded at startup; not user-editable.
    """
    __tablename__ = "meta_data"

    metadata_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region: Mapped[Optional[str]] = mapped_column(String(100))
    market: Mapped[Optional[str]] = mapped_column(String(100))
    currency: Mapped[Optional[str]] = mapped_column(String(10))
    therapeutic_area: Mapped[Optional[str]] = mapped_column(String(200))
    brand: Mapped[Optional[str]] = mapped_column(String(200))
    indication: Mapped[Optional[str]] = mapped_column(String(200))

    # relationships
    cycles: Mapped[list["CycleDef"]] = relationship("CycleDef", back_populates="meta")
    channel_hierarchy: Mapped[list["ChannelHierarchy"]] = relationship(
        "ChannelHierarchy", back_populates="meta"
    )


class RoleScreenPermission(Base):
    """
    ROLE_SCREEN_PERMISSIONS — preconfigured RBAC mapping.
    Seeded at startup.
    """
    __tablename__ = "role_screen_permissions"

    role_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    screen_name: Mapped[str] = mapped_column(String(100), primary_key=True)


# ── Users ─────────────────────────────────────────────────────────────────────

class User(Base):
    """USERS — application user accounts."""
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(200))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    region: Mapped[Optional[str]] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(100), nullable=False, default="data scientist")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationships
    uploads: Mapped[list["Upload"]] = relationship("Upload", back_populates="uploader")
    scenarios: Mapped[list["ScenarioHeader"]] = relationship(
        "ScenarioHeader", back_populates="creator"
    )


# ── Channel Hierarchy ─────────────────────────────────────────────────────────

class ChannelHierarchy(Base):
    """
    CHANNEL_HIERARCHY — channel taxonomy (category > channel > sub-channel).
    Self-referencing tree via parent_id.
    """
    __tablename__ = "channel_hierarchy"

    channel_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    metdata_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("meta_data.metadata_id"), index=True
    )
    channel_name: Mapped[str] = mapped_column(String(200), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("channel_hierarchy.channel_id"), index=True
    )
    depth: Mapped[int] = mapped_column(Integer, default=0)  # 0=category,1=channel,2=subchannel

    meta: Mapped[Optional["MetaData"]] = relationship("MetaData", back_populates="channel_hierarchy")
    parent: Mapped[Optional["ChannelHierarchy"]] = relationship(
        "ChannelHierarchy", remote_side="ChannelHierarchy.channel_id", back_populates="children"
    )
    children: Mapped[list["ChannelHierarchy"]] = relationship(
        "ChannelHierarchy", back_populates="parent"
    )
    model_calculations: Mapped[list["ModelChannelCalculation"]] = relationship(
        "ModelChannelCalculation", back_populates="channel"
    )
    scenario_channel_results: Mapped[list["ScenarioChannelResult"]] = relationship(
        "ScenarioChannelResult", back_populates="channel"
    )
    scenario_constraints: Mapped[list["ScenarioConstraint"]] = relationship(
        "ScenarioConstraint", back_populates="channel"
    )


# ── Cycle Definition ──────────────────────────────────────────────────────────

class CycleDef(Base):
    """CYCLE_DEF — a planning cycle (e.g. Q1 2026)."""
    __tablename__ = "cycle_def"

    cycle_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    metadata_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("meta_data.metadata_id"), index=True
    )
    target_variable: Mapped[Optional[str]] = mapped_column(String(100))
    time_granularity: Mapped[Optional[str]] = mapped_column(String(50))
    cycle_start_date: Mapped[Optional[datetime]] = mapped_column(Date)
    cycle_end_date: Mapped[Optional[datetime]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    meta: Mapped[Optional["MetaData"]] = relationship("MetaData", back_populates="cycles")
    uploads: Mapped[list["Upload"]] = relationship("Upload", back_populates="cycle")
    data_facts: Mapped[list["DataFact"]] = relationship("DataFact", back_populates="cycle")
    model_facts: Mapped[list["ModelFact"]] = relationship("ModelFact", back_populates="cycle")
    model_calculations: Mapped[list["ModelChannelCalculation"]] = relationship(
        "ModelChannelCalculation", back_populates="cycle"
    )
    scenarios: Mapped[list["ScenarioHeader"]] = relationship(
        "ScenarioHeader", back_populates="cycle"
    )


# ── Uploads ───────────────────────────────────────────────────────────────────

class Upload(Base):
    """UPLOADS — file upload audit log."""
    __tablename__ = "uploads"

    upload_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cycle_id: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("cycle_def.cycle_id"), index=True
    )
    is_datafile: Mapped[bool] = mapped_column(Boolean, nullable=False)  # True=DATA_FACT, False=MODEL_FACT
    filename: Mapped[Optional[str]] = mapped_column(String(500))
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)
    row_count: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending|success|failed
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    uploaded_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.user_id"), index=True
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    cycle: Mapped[Optional["CycleDef"]] = relationship("CycleDef", back_populates="uploads")
    uploader: Mapped[Optional["User"]] = relationship("User", back_populates="uploads")


# ── DATA_FACT ─────────────────────────────────────────────────────────────────

class DataFact(Base):
    """
    DATA_FACT — historical media/business data uploaded by users.
    One row = one observation (date x channel x variable).
    """
    __tablename__ = "data_fact"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cycle_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("cycle_def.cycle_id"), nullable=False, index=True
    )
    date: Mapped[Optional[datetime]] = mapped_column(Date, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    channel: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    sub_channel: Mapped[Optional[str]] = mapped_column(String(200))
    variable: Mapped[Optional[str]] = mapped_column(String(200))
    spend: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    reach: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    value: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    price: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    upload_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("uploads.upload_id"), index=True
    )

    cycle: Mapped["CycleDef"] = relationship("CycleDef", back_populates="data_facts")


# ── MODEL_FACT ────────────────────────────────────────────────────────────────

class ModelFact(Base):
    """
    MODEL_FACT — externally generated MMM model outputs.
    Primary optimizer input.
    """
    __tablename__ = "model_fact"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cycle_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("cycle_def.cycle_id"), nullable=False, index=True
    )
    variable: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    channel: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    sub_channel: Mapped[Optional[str]] = mapped_column(String(200))
    category: Mapped[Optional[str]] = mapped_column(String(100), index=True)

    # MMM coefficients
    estimate: Mapped[Optional[float]] = mapped_column(Numeric(20, 8))
    curve_type: Mapped[Optional[str]] = mapped_column(String(50))   # adstock | diminishing_returns | linear
    curvature: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))
    adstock_rate: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))
    adstock_horizon: Mapped[Optional[int]] = mapped_column(Integer)
    p_value: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))
    impactable_sales_pct: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))
    base_sales: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))

    upload_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("uploads.upload_id"), index=True
    )

    cycle: Mapped["CycleDef"] = relationship("CycleDef", back_populates="model_facts")


# ── MODEL_CHANNEL_CALCULATIONS ────────────────────────────────────────────────

class ModelChannelCalculation(Base):
    """
    MODEL_CHANNEL_CALCULATIONS — backend-generated baseline KPIs per channel/cycle.
    Created after MODEL_FACT upload is processed.
    """
    __tablename__ = "model_channel_calculations"
    __table_args__ = (
        UniqueConstraint("cycle_id", "channel_id", name="uq_model_calc_cycle_channel"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cycle_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("cycle_def.cycle_id"), nullable=False, index=True
    )
    channel_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("channel_hierarchy.channel_id"), nullable=False, index=True
    )
    total_sales: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    total_spend: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    impactable_sales: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    roi: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))

    cycle: Mapped["CycleDef"] = relationship("CycleDef", back_populates="model_calculations")
    channel: Mapped["ChannelHierarchy"] = relationship(
        "ChannelHierarchy", back_populates="model_calculations"
    )


# ── SCENARIO_HEADER ───────────────────────────────────────────────────────────

class ScenarioHeader(Base):
    """SCENARIO_HEADER — one row per scenario created by a user."""
    __tablename__ = "scenario_header"

    scenario_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scenario_name: Mapped[str] = mapped_column(String(300), nullable=False)
    cycle_id: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("cycle_def.cycle_id"), index=True
    )
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.user_id"), index=True
    )
    scenario_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Spend Based"
    )  # "Spend Based" | "Goal Based"
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    target_spend: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    target_value: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    target_kpi: Mapped[Optional[str]] = mapped_column(String(100))
    is_pending: Mapped[bool] = mapped_column(Boolean, default=True)
    category_constraint: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    cycle: Mapped[Optional["CycleDef"]] = relationship("CycleDef", back_populates="scenarios")
    creator: Mapped[Optional["User"]] = relationship("User", back_populates="scenarios")
    constraints: Mapped[list["ScenarioConstraint"]] = relationship(
        "ScenarioConstraint", back_populates="scenario", cascade="all, delete-orphan"
    )
    channel_results: Mapped[list["ScenarioChannelResult"]] = relationship(
        "ScenarioChannelResult", back_populates="scenario", cascade="all, delete-orphan"
    )
    outcome: Mapped[Optional["ScenarioOutcome"]] = relationship(
        "ScenarioOutcome", back_populates="scenario", uselist=False, cascade="all, delete-orphan"
    )


# ── SCENARIO_CONSTRAINTS ──────────────────────────────────────────────────────

class ScenarioConstraint(Base):
    """SCENARIO_CONSTRAINTS — per-channel spend bounds for a scenario."""
    __tablename__ = "scenario_constraints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scenario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scenario_header.scenario_id"), nullable=False, index=True
    )
    channel_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("channel_hierarchy.channel_id"), nullable=False
    )
    min_spend_pct: Mapped[Optional[float]] = mapped_column(Numeric(7, 2))
    max_spend_pct: Mapped[Optional[float]] = mapped_column(Numeric(7, 2))

    scenario: Mapped["ScenarioHeader"] = relationship(
        "ScenarioHeader", back_populates="constraints"
    )
    channel: Mapped["ChannelHierarchy"] = relationship(
        "ChannelHierarchy", back_populates="scenario_constraints"
    )


# ── SCENARIO_CHANNEL_RESULTS ──────────────────────────────────────────────────

class ScenarioChannelResult(Base):
    """
    SCENARIO_CHANNEL_RESULTS — optimizer output per channel.
    Populated after optimizer run.
    """
    __tablename__ = "scenario_channel_results"
    __table_args__ = (
        UniqueConstraint("scenario_id", "channel_id", name="uq_scenario_channel"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scenario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scenario_header.scenario_id"), nullable=False, index=True
    )
    channel_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("channel_hierarchy.channel_id"), nullable=False, index=True
    )
    optimized_spend: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    impactable_sales: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    roi: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))
    mroi: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))

    scenario: Mapped["ScenarioHeader"] = relationship(
        "ScenarioHeader", back_populates="channel_results"
    )
    channel: Mapped["ChannelHierarchy"] = relationship(
        "ChannelHierarchy", back_populates="scenario_channel_results"
    )


# ── SCENARIO_OUTCOME ──────────────────────────────────────────────────────────

class ScenarioOutcome(Base):
    """
    SCENARIO_OUTCOME — scenario-level aggregated KPIs.
    One row per scenario; populated after optimizer run.
    """
    __tablename__ = "scenario_outcome"

    scenario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("scenario_header.scenario_id"), primary_key=True
    )
    total_sales: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    total_spend: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    impactable_sales: Mapped[Optional[float]] = mapped_column(Numeric(20, 4))
    roi: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))
    mroi: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))

    scenario: Mapped["ScenarioHeader"] = relationship(
        "ScenarioHeader", back_populates="outcome"
    )
