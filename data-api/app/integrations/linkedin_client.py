"""LinkedIn API client — posting via official LinkedIn API."""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.integrations.base import BaseIntegration

logger = structlog.get_logger()

_API_BASE = "https://api.linkedin.com/v2"


class LinkedInClient(BaseIntegration):
    """LinkedIn API integration for posting.

    Uses the official LinkedIn API (UGC Posts). Requires an approved
    LinkedIn Developer app with ``w_member_social`` scope.
    Only supports posting — feed reading requires unofficial scraping.
    """

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.TimeoutException),
        reraise=True,
    )
    async def _api_request(
        self,
        method: str,
        path: str,
        *,
        json: dict | None = None,
    ) -> dict:
        settings = get_settings()
        token = settings.linkedin_access_token
        if not token:
            return {"error": "LinkedIn access token not configured"}

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(
                method,
                f"{_API_BASE}{path}",
                headers=headers,
                json=json,
            )
            resp.raise_for_status()
            return resp.json() if resp.content else {}

    async def get_user_urn(self) -> str:
        """Get the authenticated user's LinkedIn URN."""
        async with httpx.AsyncClient(timeout=15) as client:
            settings = get_settings()
            resp = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {settings.linkedin_access_token}"},
            )
            resp.raise_for_status()
            return resp.json().get("sub", "")

    async def post(self, content: str) -> dict:
        """Create a text post on LinkedIn."""
        user_sub = await self.get_user_urn()
        if not user_sub:
            return {"ok": False, "error": "Could not resolve LinkedIn user URN"}

        body = {
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

        result = await self._api_request("POST", "/ugcPosts", json=body)
        post_id = result.get("id", "")

        await self._audit(
            action="linkedin_post",
            resource_type="social",
            resource_id=post_id,
            metadata={"length": len(content)},
        )

        logger.info("linkedin_post_success", post_id=post_id)
        return {"ok": True, "platform": "linkedin", "post_id": post_id}

    async def sync(self) -> dict[str, Any]:
        """LinkedIn sync is a no-op — we only post, never pull."""
        await self._audit(
            action="linkedin_sync",
            resource_type="social",
            detail="No-op: LinkedIn integration is post-only",
        )
        return {"ok": True, "detail": "Post-only integration"}

    async def health_check(self) -> bool:
        try:
            settings = get_settings()
            if not settings.linkedin_access_token:
                return False
            urn = await self.get_user_urn()
            return bool(urn)
        except Exception:
            return False
