"""Credential model — encrypted API credentials storage."""

from __future__ import annotations

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Credential(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "credentials"
    __table_args__ = (UniqueConstraint("user_id", "service_name", name="uq_user_service"),)

    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    encrypted_value: Mapped[str] = mapped_column(Text, nullable=False)
