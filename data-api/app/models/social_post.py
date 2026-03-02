"""Social post model — tracks published posts and engagement metrics."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class SocialPost(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "social_posts"

    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    engagement: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    # engagement: {"likes": 10, "comments": 3, "shares": 1, "impressions": 500}
