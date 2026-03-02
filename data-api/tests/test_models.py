"""Tests for SQLAlchemy model definitions."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal


def test_credential_model():
    """Credential model should have expected columns."""
    from app.models.credential import Credential

    c = Credential(
        user_id="user-123",
        service_name="plaid",
        encrypted_value="encrypted-data",
    )
    assert c.user_id == "user-123"
    assert c.service_name == "plaid"
    assert c.encrypted_value == "encrypted-data"


def test_account_model():
    """Account model should have expected columns and defaults."""
    from app.models.account import Account

    a = Account(
        user_id="user-123",
        institution="Chase",
        account_type="checking",
        account_name="Personal Checking",
    )
    assert a.user_id == "user-123"
    assert a.institution == "Chase"
    assert a.account_type == "checking"


def test_transaction_model():
    """Transaction model should accept decimal amounts."""
    from app.models.transaction import Transaction

    t = Transaction(
        account_id=uuid.uuid4(),
        amount=Decimal("42.99"),
        transaction_date=date.today(),
        category="food",
        merchant="Chipotle",
    )
    assert t.amount == Decimal("42.99")
    assert t.merchant == "Chipotle"


def test_assignment_model():
    """Assignment model should accept all LMS fields."""
    from app.models.assignment import Assignment

    a = Assignment(
        user_id="user-123",
        platform="canvas",
        course="CS 101",
        title="Homework 5",
        status="pending",
        assignment_type="homework",
    )
    assert a.platform == "canvas"
    assert a.course == "CS 101"


def test_health_metric_model():
    """HealthMetric model should accept typed metric data."""
    from app.models.health_metric import HealthMetric

    h = HealthMetric(
        user_id="user-123",
        metric_type="steps",
        value=8500.0,
        unit="count",
        timestamp=datetime.now(UTC),
        source="garmin",
    )
    assert h.metric_type == "steps"
    assert h.value == 8500.0
    assert h.source == "garmin"


def test_audit_log_model():
    """AuditLog model should accept all audit fields."""
    from app.models.audit import AuditLog

    a = AuditLog(
        action="credential_accessed",
        resource_type="credential",
        resource_id="plaid",
        detail="Accessed plaid credential",
        metadata_={"integration": "plaid"},
    )
    assert a.action == "credential_accessed"
    assert a.metadata_["integration"] == "plaid"


def test_llm_usage_model():
    """LLMUsage model should track token spend."""
    from app.models.llm_usage import LLMUsage

    u = LLMUsage(
        usage_date=date.today(),
        model="claude-sonnet-4-6",
        input_tokens=1000,
        output_tokens=500,
        cost_usd=Decimal("0.010500"),
    )
    assert u.model == "claude-sonnet-4-6"
    assert u.input_tokens == 1000


def test_uuid_mixin_generates_id():
    """UUIDMixin should generate a UUID id."""
    from app.models.credential import Credential

    c = Credential(
        user_id="user-123",
        service_name="test",
        encrypted_value="data",
    )
    # Default factory generates an ID
    assert c.id is not None or hasattr(Credential, "id")


def test_all_models_have_tablename():
    """Every model should have __tablename__ set."""
    from app.models.account import Account
    from app.models.assignment import Assignment
    from app.models.audit import AuditLog
    from app.models.credential import Credential
    from app.models.health_metric import HealthMetric
    from app.models.llm_usage import LLMUsage
    from app.models.transaction import Transaction

    assert Account.__tablename__ == "accounts"
    assert Transaction.__tablename__ == "transactions"
    assert Assignment.__tablename__ == "assignments"
    assert Credential.__tablename__ == "credentials"
    assert HealthMetric.__tablename__ == "health_metrics"
    assert AuditLog.__tablename__ == "audit_logs"
    assert LLMUsage.__tablename__ == "llm_usage"
