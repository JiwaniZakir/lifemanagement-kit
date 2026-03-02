"""Smoke tests for the data-api health endpoint."""

from __future__ import annotations


async def test_health_check(client):
    """Health endpoint should return 200 without auth."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "aegis-data-api"
