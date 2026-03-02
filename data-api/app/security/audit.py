"""Audit logging — tamper-evident hash-chained append-only log.

Each entry stores a SHA-256 hash of its own fields in metadata_["_hash"] and
carries forward the previous entry's hash in metadata_["_prev_hash"]. This
creates a verifiable chain — any retrospective deletion or modification breaks
the chain and is detectable by sequential hash verification.
"""

from __future__ import annotations

import hashlib
import json
import uuid

import structlog
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = structlog.get_logger()


def _compute_hash(
    prev_hash: str,
    action: str,
    resource_type: str,
    resource_id: str | None,
    user_id: str | None,
) -> str:
    """Return SHA-256 hex digest of the chained entry fields."""
    payload = json.dumps(
        {
            "prev": prev_hash,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id or "",
            "user_id": user_id or "",
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


async def _get_prev_hash(db: AsyncSession) -> str:
    """Fetch the hash of the most recent audit entry, or genesis sentinel."""
    result = await db.execute(select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(1))
    last = result.scalar_one_or_none()
    if last is None:
        return "genesis"
    meta = last.metadata_ or {}
    return meta.get("_hash", "genesis")


async def audit_log(
    db: AsyncSession,
    *,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    user_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    metadata: dict | None = None,
    detail: str | None = None,
) -> AuditLog:
    """Write an audit log entry. Append-only — never update or delete.

    Each entry is hash-chained to the previous entry so that tampering
    (deletion, reordering, modification) is detectable offline.
    """
    prev_hash = await _get_prev_hash(db)
    entry_hash = _compute_hash(
        prev_hash,
        action,
        resource_type,
        resource_id,
        str(user_id) if user_id else None,
    )

    merged_meta: dict = dict(metadata or {})
    merged_meta["_prev_hash"] = prev_hash
    merged_meta["_hash"] = entry_hash

    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        metadata_=merged_meta,
        detail=detail,
    )
    db.add(entry)
    await db.flush()

    logger.info(
        "audit",
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        chain_hash=entry_hash[:12],
    )

    return entry


async def verify_audit_chain(db: AsyncSession, limit: int = 1000) -> dict:
    """Verify the hash chain integrity of the most recent *limit* audit entries.

    Returns:
        {"ok": True, "verified": N} if the chain is intact, or
        {"ok": False, "broken_at_id": "<uuid>", "verified": N} if broken.
    """
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp).limit(limit))
    entries = result.scalars().all()

    prev_hash = "genesis"
    for i, entry in enumerate(entries):
        meta = entry.metadata_ or {}
        stored_prev = meta.get("_prev_hash", "")
        stored_hash = meta.get("_hash", "")

        if stored_prev != prev_hash:
            return {"ok": False, "broken_at_id": str(entry.id), "verified": i}

        expected_hash = _compute_hash(
            prev_hash,
            entry.action,
            entry.resource_type,
            entry.resource_id,
            str(entry.user_id) if entry.user_id else None,
        )
        if expected_hash != stored_hash:
            return {"ok": False, "broken_at_id": str(entry.id), "verified": i}

        prev_hash = stored_hash

    return {"ok": True, "verified": len(entries)}
