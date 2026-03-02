"""Garmin Connect integration — health metrics, activities, and sleep data."""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime, timedelta

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.integrations.base import BaseIntegration
from app.models.health_metric import HealthMetric

logger = structlog.get_logger()

try:
    from garminconnect import Garmin

    GARMIN_AVAILABLE = True
except ImportError:
    Garmin = None  # type: ignore[assignment, misc]
    GARMIN_AVAILABLE = False


class GarminClientError(RuntimeError):
    """Raised when a Garmin Connect API call fails."""


class GarminClient(BaseIntegration):
    """Integration client for Garmin Connect (unofficial API)."""

    def __init__(self, user_id: str, db: AsyncSession) -> None:
        super().__init__(user_id, db)
        if not GARMIN_AVAILABLE:
            msg = "garminconnect is not installed."
            raise GarminClientError(msg)
        self._client: Garmin | None = None

    async def _ensure_client(self) -> Garmin:
        if self._client is not None:
            return self._client

        email = await self.get_credential("garmin_email")
        password = await self.get_credential("garmin_password")
        try:
            client = Garmin(email, password)
            await asyncio.to_thread(client.login)
            self._client = client
            return client
        except Exception as exc:
            raise GarminClientError("Failed to authenticate with Garmin Connect") from exc

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ConnectionError),
        reraise=True,
    )
    async def get_stats(self, target_date: date | None = None) -> dict:
        if target_date is None:
            target_date = date.today()
        client = await self._ensure_client()
        stats = await asyncio.to_thread(client.get_stats, target_date.isoformat())
        await self._audit(action="garmin_stats_read", resource_type="health")
        return stats if isinstance(stats, dict) else {}

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ConnectionError),
        reraise=True,
    )
    async def get_steps(self, days: int = 7) -> list[dict]:
        client = await self._ensure_client()
        results: list[dict] = []
        today = date.today()
        for i in range(days):
            target = today - timedelta(days=i)
            try:
                steps_data = await asyncio.to_thread(client.get_steps_data, target.isoformat())
                total_steps = 0
                if isinstance(steps_data, list):
                    total_steps = sum(e.get("steps", 0) for e in steps_data if isinstance(e, dict))
                elif isinstance(steps_data, dict):
                    total_steps = steps_data.get("totalSteps", 0)
                results.append(
                    {"date": target.isoformat(), "steps": total_steps, "source": "garmin"}
                )
            except Exception:  # noqa: S110, S112 — individual day failures expected
                continue
        return results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ConnectionError),
        reraise=True,
    )
    async def get_heart_rate(self, days: int = 7) -> list[dict]:
        client = await self._ensure_client()
        results: list[dict] = []
        today = date.today()
        for i in range(days):
            target = today - timedelta(days=i)
            try:
                hr_data = await asyncio.to_thread(client.get_heart_rates, target.isoformat())
                if isinstance(hr_data, dict):
                    results.append(
                        {
                            "date": target.isoformat(),
                            "resting_hr": hr_data.get("restingHeartRate", 0),
                            "max_hr": hr_data.get("maxHeartRate", 0),
                            "avg_hr": hr_data.get("averageHeartRate", 0),
                        }
                    )
            except Exception:  # noqa: S110, S112 — individual day failures expected
                continue
        return results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ConnectionError),
        reraise=True,
    )
    async def get_sleep(self, days: int = 7) -> list[dict]:
        client = await self._ensure_client()
        results: list[dict] = []
        today = date.today()
        for i in range(days):
            target = today - timedelta(days=i)
            try:
                sleep_data = await asyncio.to_thread(client.get_sleep_data, target.isoformat())
                if isinstance(sleep_data, dict):
                    daily = sleep_data.get("dailySleepDTO", {})
                    duration = daily.get("sleepTimeSeconds", 0) or 0
                    results.append(
                        {
                            "date": target.isoformat(),
                            "sleep_hours": round(duration / 3600, 2),
                            "deep_sleep_seconds": daily.get("deepSleepSeconds", 0),
                            "light_sleep_seconds": daily.get("lightSleepSeconds", 0),
                            "rem_sleep_seconds": daily.get("remSleepSeconds", 0),
                        }
                    )
            except Exception:  # noqa: S110, S112 — individual day failures expected
                continue
        return results

    async def store_metrics(self, metrics: list[dict]) -> int:
        stored = 0
        for m in metrics:
            try:
                ts = m.get("timestamp")
                if isinstance(ts, str):
                    ts = datetime.fromisoformat(ts)
                elif not isinstance(ts, datetime):
                    ts = datetime.now(UTC)

                record = HealthMetric(
                    user_id=self.user_id,
                    metric_type=m["metric_type"],
                    value=float(m["value"]),
                    unit=m.get("unit", "count"),
                    timestamp=ts,
                    source="garmin",
                )
                self.db.add(record)
                stored += 1
            except (KeyError, ValueError, TypeError):
                pass

        if stored:
            await self.db.flush()
            await self._audit(
                action="garmin_metrics_store", resource_type="health", metadata={"count": stored}
            )
        return stored

    async def sync(self) -> None:
        await self._ensure_client()
        metrics: list[dict] = []
        ts_now = datetime.now(UTC).isoformat()

        steps_data = await self.get_steps(days=1)
        for entry in steps_data:
            metrics.append(
                {
                    "metric_type": "steps",
                    "value": entry.get("steps", 0),
                    "unit": "count",
                    "timestamp": f"{entry['date']}T23:59:00+00:00",
                }
            )

        hr_data = await self.get_heart_rate(days=1)
        for entry in hr_data:
            if entry.get("resting_hr"):
                metrics.append(
                    {
                        "metric_type": "heart_rate",
                        "value": entry["resting_hr"],
                        "unit": "bpm",
                        "timestamp": f"{entry['date']}T23:59:00+00:00",
                    }
                )

        sleep_data = await self.get_sleep(days=1)
        for entry in sleep_data:
            metrics.append(
                {
                    "metric_type": "sleep_hours",
                    "value": entry.get("sleep_hours", 0),
                    "unit": "hours",
                    "timestamp": f"{entry['date']}T08:00:00+00:00",
                }
            )

        try:
            stats = await self.get_stats(date.today())
            if total_cal := stats.get("totalKilocalories"):
                metrics.append(
                    {
                        "metric_type": "calories_burned",
                        "value": total_cal,
                        "unit": "kcal",
                        "timestamp": ts_now,
                    }
                )
        except GarminClientError:
            pass

        if metrics:
            await self.store_metrics(metrics)

        await self._audit(
            action="garmin_sync", resource_type="health", metadata={"total_metrics": len(metrics)}
        )

    async def health_check(self) -> bool:
        try:
            await self._ensure_client()
            return True
        except GarminClientError:
            return False
