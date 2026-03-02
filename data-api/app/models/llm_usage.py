"""LLM usage tracking model — daily spend per model."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class LLMUsage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "llm_usage"
    __table_args__ = (UniqueConstraint("usage_date", "model", name="uq_date_model"),)

    usage_date: Mapped[date] = mapped_column(Date, nullable=False)
    model: Mapped[str] = mapped_column(String(50), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0)
