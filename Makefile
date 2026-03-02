# =============================================================================
# Aegis — Makefile (OpenClaw Core Architecture)
# =============================================================================

COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.yml -f docker-compose.prod.yml

.PHONY: dev prod down backup restore logs health migrate test lint format clean

# --- Development ---
dev:
	$(COMPOSE) up -d
	@echo "Services starting... run 'make health' to check status"

# --- Production ---
prod:
	./infrastructure/scripts/deploy.sh --prod

# --- Stop all services ---
down:
	$(COMPOSE) down

# --- Backup ---
backup:
	./infrastructure/scripts/backup.sh

# --- Restore (requires BACKUP_FILE=path/to/file) ---
restore:
	./infrastructure/scripts/restore.sh --confirm $(BACKUP_FILE)

# --- Logs ---
logs:
	$(COMPOSE) logs -f

# --- Health check ---
health:
	@echo "=== Service Health ==="
	@$(COMPOSE) ps
	@echo ""
	@echo "=== PostgreSQL ==="
	@$(COMPOSE) exec postgres pg_isready -U aegis || echo "UNHEALTHY"
	@echo ""
	@echo "=== Data API ==="
	@$(COMPOSE) exec data-api curl -sf http://127.0.0.1:8000/health || echo "UNHEALTHY"
	@echo ""
	@echo "=== OpenClaw Gateway ==="
	@$(COMPOSE) exec openclaw-gateway node -e 'require("http").get("http://localhost:18789/health",(r)=>{process.exit(r.statusCode===200?0:1)}).on("error",()=>process.exit(1))' || echo "UNHEALTHY"

# --- Database migrations ---
migrate:
	cd data-api && uv run alembic upgrade head

# --- Run tests ---
test:
	cd data-api && uv run pytest tests/ -v

# --- Lint ---
lint:
	cd data-api && uv run ruff check .

# --- Format ---
format:
	cd data-api && uv run ruff format .

# --- Clean ---
clean:
	$(COMPOSE) down -v
	rm -rf data-api/.venv
