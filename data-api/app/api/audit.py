"""Audit API — hash-chain verification and log queries."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit import AuditLog
from app.security.audit import audit_log, verify_audit_chain

router = APIRouter(tags=["audit"])


@router.get("/verify")
async def verify_chain(
    limit: int = Query(default=1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Verify the hash chain integrity of the audit log."""
    return await verify_audit_chain(db, limit=limit)


@router.get("/log")
async def get_audit_log(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Query recent audit log entries."""
    stmt = select(AuditLog).order_by(desc(AuditLog.timestamp))

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    entries = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "timestamp": e.timestamp.isoformat(),
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "detail": e.detail,
            "metadata": {
                k: v
                for k, v in (e.metadata_ or {}).items()
                if not k.startswith("_")  # Hide internal hash fields
            },
        }
        for e in entries
    ]


class AuditLogRequest(BaseModel):
    action: str
    resource_type: str
    resource_id: str | None = None
    detail: str | None = None
    metadata: dict | None = None


@router.post("/log")
async def write_audit_entry(
    body: AuditLogRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Write an audit log entry (used by OpenClaw hooks)."""
    entry = await audit_log(
        db,
        action=body.action,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        detail=body.detail,
        metadata=body.metadata,
    )
    return {"ok": True, "id": str(entry.id)}
