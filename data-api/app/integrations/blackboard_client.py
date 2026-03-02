"""Blackboard Learn REST API client."""

from __future__ import annotations

import contextlib
from datetime import datetime
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.integrations.base import BaseIntegration
from app.models.assignment import Assignment


class BlackboardClient(BaseIntegration):
    """Blackboard Learn REST API integration.

    Requires institutional API access or user credentials for session-based auth.
    Stores session token as an encrypted credential.
    """

    async def _authenticate(self) -> str:
        """Authenticate and return session token."""
        settings = get_settings()
        base_url = settings.blackboard_url.rstrip("/")

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{base_url}/learn/api/public/v1/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.blackboard_username,
                    "client_secret": settings.blackboard_password,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        token = data["access_token"]
        await self.store_credential("blackboard_token", token)
        return token

    async def _get_token(self) -> str:
        try:
            return await self.get_credential("blackboard_token")
        except (ValueError, LookupError):
            return await self._authenticate()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.TimeoutException),
        reraise=True,
    )
    async def _api_request(self, path: str) -> dict:
        settings = get_settings()
        base_url = settings.blackboard_url.rstrip("/")
        token = await self._get_token()

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{base_url}/learn/api/public/v3{path}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 401:
                token = await self._authenticate()
                resp = await client.get(
                    f"{base_url}/learn/api/public/v3{path}",
                    headers={"Authorization": f"Bearer {token}"},
                )
            resp.raise_for_status()
            return resp.json()

    async def get_courses(self) -> list[dict]:
        """Fetch all courses from Blackboard Learn."""
        data = await self._api_request("/courses")
        return [
            {
                "id": c.get("id", ""),
                "name": c.get("name", ""),
                "courseId": c.get("courseId", ""),
            }
            for c in data.get("results", [])
        ]

    async def get_assignments(self, course_id: str) -> list[dict]:
        """Fetch assignments for a specific course."""
        data = await self._api_request(f"/courses/{course_id}/contents")
        assignments = []
        for item in data.get("results", []):
            if item.get("contentHandler", {}).get("id") in (
                "resource/x-bb-assignment",
                "resource/x-bb-asmt-test-link",
            ):
                assignments.append(
                    {
                        "title": item.get("title", ""),
                        "due_date": item.get("availability", {})
                        .get("adaptiveRelease", {})
                        .get("end", ""),
                        "url": item.get("links", {}).get("url", ""),
                        "external_id": item.get("id", ""),
                    }
                )
        return assignments

    async def store_assignments(self, course_name: str, assignments: list[dict]) -> int:
        """Persist new assignments to the database, skipping duplicates."""
        from sqlalchemy import select

        stored = 0
        for a in assignments:
            ext_id = a.get("external_id", "")
            if not ext_id:
                continue

            stmt = select(Assignment).where(
                Assignment.external_id == ext_id,
                Assignment.platform == "blackboard",
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                continue

            due_str = a.get("due_date", "")
            due_dt = None
            if due_str:
                with contextlib.suppress(ValueError):
                    due_dt = datetime.fromisoformat(due_str)

            entry = Assignment(
                user_id=self.user_id,
                platform="blackboard",
                course=course_name,
                title=a["title"],
                due_date=due_dt,
                status="pending",
                assignment_type="homework",
                url=a.get("url"),
                external_id=ext_id,
            )
            self.db.add(entry)
            stored += 1

        if stored:
            await self.db.flush()
        return stored

    async def sync(self) -> dict[str, Any]:
        """Pull all courses and assignments from Blackboard."""
        courses = await self.get_courses()
        total_stored = 0
        for course in courses:
            assignments = await self.get_assignments(course["id"])
            total_stored += await self.store_assignments(course["name"], assignments)
        await self._audit(
            action="blackboard_sync",
            resource_type="assignment",
            metadata={
                "courses": len(courses),
                "stored": total_stored,
            },
        )
        return {"ok": True, "courses": len(courses), "stored": total_stored}

    async def health_check(self) -> bool:
        """Verify Blackboard API connectivity."""
        try:
            await self._api_request("/courses?limit=1")
            return True
        except Exception:
            return False
