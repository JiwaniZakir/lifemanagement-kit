"""Canvas LMS integration — courses, assignments, grades, announcements."""

from __future__ import annotations

from datetime import datetime

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.integrations.base import BaseIntegration
from app.models.assignment import Assignment

logger = structlog.get_logger()


class CanvasClient(BaseIntegration):
    """Integration client for Canvas LMS REST API."""

    def __init__(self, user_id: str, db: AsyncSession) -> None:
        super().__init__(user_id, db)
        settings = get_settings()
        self._api_url = settings.canvas_api_url.rstrip("/")

    async def _get_token(self) -> str:
        """Fetch Canvas access token from encrypted credential store."""
        return await self.get_credential("canvas_access_token")

    async def _api_request(self, path: str, *, params: dict | None = None) -> list | dict:
        """Make a paginated API request, following Link: rel="next" headers."""
        token = await self._get_token()
        url = f"{self._api_url}{path}"
        headers = {"Authorization": f"Bearer {token}"}
        all_results: list = []

        async with httpx.AsyncClient(timeout=30) as client:
            while url:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()

                if isinstance(data, list):
                    all_results.extend(data)
                else:
                    # Single object response (not paginated)
                    return data

                # Follow Link: rel="next" for pagination
                url = _parse_next_link(response.headers.get("link", ""))
                params = None  # params are encoded in the next URL

        return all_results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def get_courses(self) -> list[dict]:
        """Fetch active courses from Canvas."""
        data = await self._api_request(
            "/courses", params={"enrollment_state": "active", "per_page": 100}
        )
        return [
            {
                "id": c["id"],
                "name": c.get("name", ""),
                "course_code": c.get("course_code", ""),
                "term": c.get("term", {}).get("name", ""),
            }
            for c in (data if isinstance(data, list) else [])
        ]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def get_assignments(self, course_id: int) -> list[dict]:
        """Fetch all assignments for a course, ordered by due date."""
        data = await self._api_request(
            f"/courses/{course_id}/assignments",
            params={"per_page": 100, "order_by": "due_at"},
        )
        return [
            {
                "id": a["id"],
                "name": a.get("name", ""),
                "due_at": a.get("due_at"),
                "points_possible": a.get("points_possible", 0),
                "submission_types": a.get("submission_types", []),
                "description": a.get("description", ""),
                "html_url": a.get("html_url", ""),
                "course_id": course_id,
            }
            for a in (data if isinstance(data, list) else [])
        ]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def get_grades(self, course_id: int) -> list[dict]:
        """Fetch submission grades for the authenticated user in a course."""
        data = await self._api_request(
            f"/courses/{course_id}/students/submissions",
            params={"student_ids[]": "self", "per_page": 100},
        )
        return [
            {
                "assignment_id": sub.get("assignment_id"),
                "score": sub.get("score"),
                "grade": sub.get("grade"),
                "submitted_at": sub.get("submitted_at"),
                "workflow_state": sub.get("workflow_state", ""),
            }
            for sub in (data if isinstance(data, list) else [])
        ]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def get_announcements(self, course_id: int) -> list[dict]:
        """Fetch recent announcements for a course."""
        data = await self._api_request(
            "/announcements",
            params={"context_codes[]": f"course_{course_id}", "per_page": 20},
        )
        return [
            {
                "id": ann.get("id"),
                "title": ann.get("title", ""),
                "message": ann.get("message", ""),
                "posted_at": ann.get("posted_at"),
                "author": ann.get("author", {}).get("display_name", ""),
            }
            for ann in (data if isinstance(data, list) else [])
        ]

    async def store_assignments(self, course_name: str, assignments: list[dict]) -> int:
        """Persist new Canvas assignments to the database, skipping duplicates."""
        stored = 0
        for a in assignments:
            external_id = f"canvas_{a['id']}"
            existing = await self.db.execute(
                select(Assignment).where(Assignment.external_id == external_id)
            )
            if existing.scalar_one_or_none() is not None:
                continue

            due_at = None
            if a.get("due_at"):
                import contextlib

                with contextlib.suppress(ValueError, AttributeError):
                    due_at = datetime.fromisoformat(a["due_at"].replace("Z", "+00:00"))

            assignment = Assignment(
                user_id=self.user_id,
                platform="canvas",
                course=course_name,
                title=a["name"],
                due_date=due_at,
                status="pending",
                assignment_type=_infer_type(a.get("submission_types", [])),
                url=a.get("html_url"),
                description=a.get("description", "")[:500] if a.get("description") else None,
                external_id=external_id,
            )
            self.db.add(assignment)
            stored += 1

        await self.db.flush()
        return stored

    async def sync(self) -> None:
        """Sync all courses and their assignments from Canvas."""
        courses = await self.get_courses()
        for course in courses:
            assignments = await self.get_assignments(course["id"])
            await self.store_assignments(course["name"], assignments)
        await self._audit(
            action="canvas_sync", resource_type="assignment", metadata={"courses": len(courses)}
        )

    async def health_check(self) -> bool:
        """Verify Canvas API connectivity and credentials."""
        try:
            await self.get_courses()
            return True
        except Exception:
            return False


def _parse_next_link(link_header: str) -> str | None:
    """Parse a Link header and return the URL for rel="next", or None."""
    import re

    for part in link_header.split(","):
        match = re.match(r'\s*<([^>]+)>;\s*rel="next"', part.strip())
        if match:
            return match.group(1)
    return None


def _infer_type(submission_types: list[str]) -> str:
    if "online_quiz" in submission_types:
        return "quiz"
    if "discussion_topic" in submission_types:
        return "discussion"
    if "online_upload" in submission_types:
        return "upload"
    if "external_tool" in submission_types:
        return "external"
    return "homework"
