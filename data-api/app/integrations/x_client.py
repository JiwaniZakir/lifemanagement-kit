"""X/Twitter API v2 client — posting and tweet management."""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.integrations.base import BaseIntegration

logger = structlog.get_logger()

_API_BASE = "https://api.twitter.com/2"


class XClient(BaseIntegration):
    """X/Twitter API v2 integration.

    Uses OAuth 2.0 Bearer token for read operations and OAuth 1.0a (via
    API key + secret + access token + access token secret) for posting.
    Basic tier ($100/mo) required for read + write.
    """

    def _get_oauth1_headers(self, method: str, url: str) -> dict:
        """Generate OAuth 1.0a headers for user-context requests.

        For production, use a proper OAuth 1.0a library (e.g., authlib).
        This is a simplified version using Bearer token for posting.
        """
        settings = get_settings()
        return {
            "Authorization": f"Bearer {settings.x_bearer_token}",
            "Content-Type": "application/json",
        }

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
        params: dict | None = None,
    ) -> dict:
        url = f"{_API_BASE}{path}"
        headers = self._get_oauth1_headers(method, url)

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(
                method,
                url,
                headers=headers,
                json=json,
                params=params,
            )
            resp.raise_for_status()
            return resp.json() if resp.content else {}

    async def post(self, content: str) -> dict:
        """Create a tweet."""
        result = await self._api_request("POST", "/tweets", json={"text": content})
        tweet_data = result.get("data", {})
        tweet_id = tweet_data.get("id", "")

        await self._audit(
            action="x_post",
            resource_type="social",
            resource_id=tweet_id,
            metadata={"length": len(content)},
        )

        logger.info("x_post_success", tweet_id=tweet_id)
        return {"ok": True, "platform": "x", "post_id": tweet_id}

    async def get_recent_tweets(self, count: int = 10) -> list[dict]:
        """Get the authenticated user's recent tweets."""
        # Get user ID first
        me = await self._api_request("GET", "/users/me")
        user_id = me.get("data", {}).get("id", "")
        if not user_id:
            return []

        result = await self._api_request(
            "GET",
            f"/users/{user_id}/tweets",
            params={
                "max_results": str(min(count, 100)),
                "tweet.fields": "created_at,public_metrics",
            },
        )
        return [
            {
                "id": t.get("id", ""),
                "text": t.get("text", ""),
                "created_at": t.get("created_at", ""),
                "metrics": t.get("public_metrics", {}),
            }
            for t in result.get("data", [])
        ]

    async def sync(self) -> dict[str, Any]:
        """X sync — fetch recent tweet metrics."""
        try:
            tweets = await self.get_recent_tweets(count=20)
            await self._audit(
                action="x_sync",
                resource_type="social",
                metadata={"tweets": len(tweets)},
            )
            return {"ok": True, "tweets": len(tweets)}
        except httpx.HTTPStatusError as exc:
            logger.warning("x_sync_failed", status=exc.response.status_code)
            return {"ok": False, "error": f"API returned {exc.response.status_code}"}

    async def health_check(self) -> bool:
        """Verify X API v2 connectivity and bearer token."""
        try:
            settings = get_settings()
            if not settings.x_bearer_token:
                return False
            me = await self._api_request("GET", "/users/me")
            return bool(me.get("data", {}).get("id"))
        except Exception:
            return False
