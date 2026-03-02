# CLAUDE.md — data-api

Encrypted data persistence layer for OpenClaw agents. Single-caller M2M API.

## Quick Commands

```bash
cd /Users/zakirjiwani/projects/bots/clawdbot_setup/data-api
uv run pytest -q               # Run all tests
uv run ruff check app/ tests/  # Lint
uv run ruff format app/ tests/ # Format
uv run alembic upgrade head    # Apply migrations (requires running Postgres)
```

## Architecture

- **FastAPI** app factory in `app/main.py`
- **Bearer token** auth (DATA_API_TOKEN, constant-time compare) — no JWT, no sessions
- **10 routers**: credentials, finance, calendar, lms, health, social, audit, budget, briefing, content
- **10 integration clients** in `app/integrations/` — all inherit `BaseIntegration(user_id, db)`
- **9 models** in `app/models/` — SQLAlchemy 2.0 `Mapped[]` types
- **AES-256-GCM** encryption in `app/security/encryption.py`
- **Hash-chained audit log** in `app/security/audit.py`

## Key Patterns

- `get_settings()` uses `@lru_cache` — in tests, patch the module-level import
- All integration clients: `BaseIntegration(user_id, db)` with `sync()` and `health_check()`
- Optional deps guarded by `try/except ImportError` → `*_AVAILABLE` flag
- Audit middleware skips `/health`, `/docs`, `/redoc`, `/openapi.json`
- Budget API uses PostgreSQL `ON CONFLICT DO UPDATE` for upsert

## Testing

- `pytest-asyncio` with `asyncio_mode = "auto"` — all test functions can be `async`
- `conftest.py` sets env vars before importing `app.main`
- `AUTH_HEADER` fixture in conftest for authenticated requests
- DB-dependent tests should `pytest.skip()` when no Postgres is available
- ruff ignores S101/S105/S106 in tests (assert, hardcoded passwords)

## Adding a New Integration

1. Create `app/integrations/<name>_client.py` inheriting `BaseIntegration`
2. Implement `sync()` and `health_check()`
3. Guard optional deps: `try: import lib; AVAILABLE = True except ImportError: ...`
4. Add route in `app/api/` that instantiates the client
5. Add test in `tests/test_integrations.py`

## Adding a New API Router

1. Create `app/api/<name>.py` with `router = APIRouter(tags=[...])`
2. Register in `app/main.py` with `dependencies=[Depends(verify_token)]`
3. Add routes to `_PROTECTED_ROUTES` in `tests/test_api_endpoints.py`
