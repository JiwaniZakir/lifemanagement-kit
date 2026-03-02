"""Social API — LinkedIn + X/Twitter posting, history, and engagement analytics."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx
import structlog
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.database import get_db
from app.models.social_post import SocialPost
from app.security.audit import audit_log

logger = structlog.get_logger()

router = APIRouter(tags=["social"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class PostRequest(BaseModel):
    platform: str  # "linkedin" or "x"
    content: str
    media_url: str | None = None


# ---------------------------------------------------------------------------
# Internal helpers — LinkedIn
# ---------------------------------------------------------------------------


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
    reraise=True,
)
async def _post_linkedin(content: str, media_url: str | None = None) -> dict:
    """Post to LinkedIn via official API."""
    settings = get_settings()
    token = settings.linkedin_access_token
    if not token:
        return {"ok": False, "error": "LinkedIn access token not configured"}

    # LinkedIn UGC post API
    async with httpx.AsyncClient(timeout=30) as client:
        # First get the user URN
        me_resp = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {token}"},
        )
        if me_resp.status_code != 200:
            return {"ok": False, "error": f"LinkedIn auth failed: {me_resp.status_code}"}

        user_sub = me_resp.json().get("sub", "")

        post_body = {
            "author": f"urn:li:person:{user_sub}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": content},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }

        resp = await client.post(
            "https://api.linkedin.com/v2/ugcPosts",
            json=post_body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
        )

    if resp.status_code in (200, 201):
        logger.info("linkedin_post_success")
        return {"ok": True, "platform": "linkedin", "post_id": resp.json().get("id", "")}

    logger.warning("linkedin_post_failed", status=resp.status_code)
    return {"ok": False, "error": f"LinkedIn API returned {resp.status_code}"}


# ---------------------------------------------------------------------------
# Internal helpers — X / Twitter
# ---------------------------------------------------------------------------


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
    reraise=True,
)
async def _post_x(content: str) -> dict:
    """Post to X/Twitter via API v2."""
    settings = get_settings()
    bearer = settings.x_bearer_token
    if not bearer:
        return {"ok": False, "error": "X bearer token not configured"}

    # OAuth 1.0a for posting (requires user context)
    # Using OAuth 2.0 Bearer for simplicity here; production needs OAuth 1.0a
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.twitter.com/2/tweets",
            json={"text": content},
            headers={
                "Authorization": f"Bearer {bearer}",
                "Content-Type": "application/json",
            },
        )

    if resp.status_code in (200, 201):
        data = resp.json().get("data", {})
        logger.info("x_post_success", tweet_id=data.get("id"))
        return {"ok": True, "platform": "x", "post_id": data.get("id", "")}

    logger.warning("x_post_failed", status=resp.status_code)
    return {"ok": False, "error": f"X API returned {resp.status_code}"}


# ---------------------------------------------------------------------------
# Helper — persist a SocialPost record
# ---------------------------------------------------------------------------


async def _store_social_post(
    db: AsyncSession,
    *,
    user_id: str,
    platform: str,
    content: str,
    external_id: str,
    engagement: dict | None = None,
) -> SocialPost:
    """Insert a SocialPost row and flush (but don't commit — the session dep does that)."""
    post = SocialPost(
        user_id=user_id,
        platform=platform,
        content=content,
        external_id=external_id,
        posted_at=datetime.now(UTC),
        engagement=engagement or {},
    )
    db.add(post)
    await db.flush()
    return post


# ---------------------------------------------------------------------------
# 1. POST /post — unified multi-platform posting (existing, now stores record)
# ---------------------------------------------------------------------------


@router.post("/post")
async def create_post(
    body: PostRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Post content to LinkedIn or X and persist a SocialPost record."""
    if body.platform == "linkedin":
        result = await _post_linkedin(body.content, body.media_url)
    elif body.platform == "x":
        result = await _post_x(body.content)
    else:
        return {"ok": False, "error": f"Unknown platform: {body.platform}"}

    if result.get("ok"):
        await _store_social_post(
            db,
            user_id="default",
            platform=body.platform,
            content=body.content,
            external_id=result.get("post_id", ""),
        )

    await audit_log(
        db,
        action="social_post",
        resource_type="social",
        metadata={"platform": body.platform, "length": len(body.content)},
    )
    return result


# ---------------------------------------------------------------------------
# 2. GET /history — query past social posts
# ---------------------------------------------------------------------------


@router.get("/history")
async def get_post_history(
    user_id: str,
    platform: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return recent social posts, optionally filtered by platform."""
    stmt = select(SocialPost).where(SocialPost.user_id == user_id)
    if platform:
        stmt = stmt.where(SocialPost.platform == platform)
    stmt = stmt.order_by(SocialPost.posted_at.desc()).limit(limit)

    result = await db.execute(stmt)
    posts = result.scalars().all()

    return {
        "posts": [
            {
                "id": str(post.id),
                "platform": post.platform,
                "content": post.content,
                "external_id": post.external_id,
                "posted_at": post.posted_at.isoformat() if post.posted_at else None,
                "engagement": post.engagement or {},
                "created_at": post.created_at.isoformat() if post.created_at else None,
            }
            for post in posts
        ],
        "count": len(posts),
    }


# ---------------------------------------------------------------------------
# 5. GET /engagement — aggregate engagement metrics
# ---------------------------------------------------------------------------


@router.get("/engagement")
async def get_engagement_metrics(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Aggregate engagement metrics per platform over the given window."""
    cutoff = datetime.now(UTC) - timedelta(days=days)

    stmt = (
        select(SocialPost)
        .where(SocialPost.user_id == user_id)
        .where(SocialPost.posted_at >= cutoff)
    )
    result = await db.execute(stmt)
    posts = result.scalars().all()

    metrics: dict[str, dict] = {}
    for post in posts:
        plat = post.platform
        if plat not in metrics:
            metrics[plat] = {"posts": 0}
        metrics[plat]["posts"] += 1

        engagement = post.engagement or {}
        for key, value in engagement.items():
            if isinstance(value, int | float):
                agg_key = f"total_{key}"
                metrics[plat][agg_key] = metrics[plat].get(agg_key, 0) + value

    return metrics


# ---------------------------------------------------------------------------
# 6. GET /x/me — fetch authenticated X user profile
# ---------------------------------------------------------------------------


@router.get("/x/me")
async def get_x_profile(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Fetch the authenticated X/Twitter user profile."""
    settings = get_settings()
    bearer = settings.x_bearer_token
    if not bearer:
        return {"ok": False, "error": "X bearer token not configured"}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://api.twitter.com/2/users/me",
            headers={"Authorization": f"Bearer {bearer}"},
            params={
                "user.fields": "id,name,username,description,profile_image_url,"
                "public_metrics,created_at"
            },
        )

    if resp.status_code != 200:
        logger.warning("x_profile_failed", status=resp.status_code)
        return {"ok": False, "error": f"X API returned {resp.status_code}"}

    await audit_log(
        db,
        action="social_x_profile",
        resource_type="social",
        metadata={"endpoint": "/x/me"},
    )
    return {"ok": True, "data": resp.json().get("data", {})}


# ---------------------------------------------------------------------------
# 7. GET /x/search — search recent tweets
# ---------------------------------------------------------------------------


@router.get("/x/search")
async def search_x_tweets(
    query: str,
    max_results: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Search recent tweets via X API v2."""
    settings = get_settings()
    bearer = settings.x_bearer_token
    if not bearer:
        return {"ok": False, "error": "X bearer token not configured"}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://api.twitter.com/2/tweets/search/recent",
            headers={"Authorization": f"Bearer {bearer}"},
            params={
                "query": query,
                "max_results": max_results,
                "tweet.fields": "created_at,author_id,public_metrics,text",
            },
        )

    if resp.status_code != 200:
        logger.warning("x_search_failed", status=resp.status_code)
        return {"ok": False, "error": f"X API returned {resp.status_code}"}

    data = resp.json()

    await audit_log(
        db,
        action="social_x_search",
        resource_type="social",
        metadata={"query": query, "max_results": max_results},
    )
    return {
        "ok": True,
        "tweets": data.get("data", []),
        "meta": data.get("meta", {}),
    }
