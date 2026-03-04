"""SQLAlchemy models for the Aegis data-api."""

from __future__ import annotations

# Import all models to ensure they're registered with SQLAlchemy
from app.models.account import Account
from app.models.assignment import Assignment
from app.models.audit import AuditLogEntry
from app.models.base import Base
from app.models.content_draft import ContentDraft
from app.models.credential import Credential
from app.models.health_metric import HealthMetric
from app.models.listening_history import ListeningHistory, SpotifyTopSnapshot
from app.models.llm_usage import LLMUsage
from app.models.social_post import SocialPost
from app.models.transaction import Transaction

__all__ = [
    "Account",
    "Assignment",
    "AuditLogEntry",
    "Base",
    "ContentDraft",
    "Credential",
    "HealthMetric",
    "ListeningHistory",
    "SpotifyTopSnapshot",
    "LLMUsage",
    "SocialPost",
    "Transaction",
]
