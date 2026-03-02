"""Content API — draft lifecycle management and content ingestion."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content_draft import ContentDraft
from app.models.social_post import SocialPost
from app.security.audit import audit_log

logger = structlog.get_logger()

router = APIRouter(tags=["content"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class GenerateRequest(BaseModel):
    platform: str
    topic: str
    style: str | None = None
    user_id: str


class PublishRequest(BaseModel):
    draft_id: uuid.UUID
    user_id: str


class IngestRequest(BaseModel):
    user_id: str
    source: str
    content: str
    metadata: dict | None = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/generate")
async def generate_draft(
    body: GenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a content draft. Actual generation is done by the OpenClaw agent.

    This endpoint stores the draft record so the agent can update it later.
    """
    draft = ContentDraft(
        user_id=body.user_id,
        platform=body.platform,
        content=f"[pending] {body.topic}",
        status="draft",
        metadata_={
            "topic": body.topic,
            "style": body.style,
        },
    )
    db.add(draft)
    await db.flush()

    await audit_log(
        db,
        action="content_generate",
        resource_type="content_draft",
        resource_id=str(draft.id),
        metadata={"platform": body.platform, "topic": body.topic},
    )

    logger.info("content_draft_created", draft_id=str(draft.id), platform=body.platform)
    return {
        "id": str(draft.id),
        "user_id": draft.user_id,
        "platform": draft.platform,
        "content": draft.content,
        "status": draft.status,
        "topic": (draft.metadata_ or {}).get("topic"),
        "tone": (draft.metadata_ or {}).get("style"),
        "created_at": draft.created_at.isoformat(),
        "metadata": draft.metadata_,
    }


@router.get("/drafts")
async def list_drafts(
    user_id: str = Query(default="default"),
    status_filter: str | None = Query(default=None, alias="status"),
    platform: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List content drafts with optional filters."""
    conditions = [ContentDraft.user_id == user_id]
    if status_filter:
        conditions.append(ContentDraft.status == status_filter)
    if platform:
        conditions.append(ContentDraft.platform == platform)

    stmt = (
        select(ContentDraft)
        .where(*conditions)
        .order_by(ContentDraft.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    drafts = result.scalars().all()

    return [
        {
            "id": str(d.id),
            "platform": d.platform,
            "content": d.content,
            "status": d.status,
            "topic": (d.metadata_ or {}).get("topic"),
            "tone": (d.metadata_ or {}).get("style"),
            "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
            "published_at": d.published_at.isoformat() if d.published_at else None,
            "created_at": d.created_at.isoformat(),
            "metadata": d.metadata_,
        }
        for d in drafts
    ]


@router.get("/queue")
async def list_queue(
    user_id: str = Query(default="default"),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List queued drafts ordered by scheduled_at ascending."""
    stmt = (
        select(ContentDraft)
        .where(
            ContentDraft.user_id == user_id,
            ContentDraft.status == "queued",
        )
        .order_by(ContentDraft.scheduled_at.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    drafts = result.scalars().all()

    return [
        {
            "id": str(d.id),
            "platform": d.platform,
            "content": d.content,
            "status": d.status,
            "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
            "created_at": d.created_at.isoformat(),
            "metadata": d.metadata_,
        }
        for d in drafts
    ]


@router.post("/publish")
async def publish_draft(
    body: PublishRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a draft as published and create a SocialPost record.

    Does NOT call LinkedIn/X API directly -- that is the social router's job.
    """
    stmt = select(ContentDraft).where(
        ContentDraft.id == body.draft_id,
        ContentDraft.user_id == body.user_id,
    )
    result = await db.execute(stmt)
    draft = result.scalar_one_or_none()

    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {body.draft_id} not found",
        )

    now = datetime.now(UTC)
    draft.status = "published"
    draft.published_at = now

    # Create a corresponding SocialPost record
    post = SocialPost(
        user_id=body.user_id,
        platform=draft.platform,
        content=draft.content,
        posted_at=now,
        engagement={},
    )
    db.add(post)
    await db.flush()

    await audit_log(
        db,
        action="content_publish",
        resource_type="content_draft",
        resource_id=str(draft.id),
        metadata={"platform": draft.platform, "social_post_id": str(post.id)},
    )

    logger.info(
        "content_published",
        draft_id=str(draft.id),
        social_post_id=str(post.id),
        platform=draft.platform,
    )
    return {
        "id": str(draft.id),
        "platform": draft.platform,
        "content": draft.content,
        "status": draft.status,
        "published_at": draft.published_at.isoformat(),
        "social_post_id": str(post.id),
        "metadata": draft.metadata_,
    }


@router.post("/ingest")
async def ingest_content(
    body: IngestRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Store research material or content ideas for later use."""
    draft = ContentDraft(
        user_id=body.user_id,
        platform="general",
        content=body.content,
        status="idea",
        metadata_={
            "source": body.source,
            **(body.metadata or {}),
        },
    )
    db.add(draft)
    await db.flush()

    await audit_log(
        db,
        action="content_ingest",
        resource_type="content_draft",
        resource_id=str(draft.id),
        metadata={"source": body.source},
    )

    logger.info("content_ingested", draft_id=str(draft.id), source=body.source)
    return {
        "id": str(draft.id),
        "user_id": draft.user_id,
        "content": draft.content,
        "status": draft.status,
        "source": body.source,
        "created_at": draft.created_at.isoformat(),
    }
