# =============================================================================
# Aegis — Makefile (OpenClaw Core Architecture)
# =============================================================================

COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.yml -f docker-compose.prod.yml

.PHONY: help dev prod down backup restore logs health migrate test lint format clean build security

# --- Help (default target) ---
help:
	@echo "Aegis — Personal Intelligence Platform"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Development:"
	@echo "  dev          Start all services locally"
	@echo "  test         Run data-api tests"
	@echo "  lint         Run ruff linter"
	@echo "  format       Run ruff formatter"
	@echo "  logs         Follow service logs"
	@echo "  health       Check service health"
	@echo ""
	@echo "Database:"
	@echo "  migrate      Run Alembic migrations"
	@echo ""
	@echo "Production:"
	@echo "  prod         Deploy to production"
	@echo "  build        Build all Docker images"
	@echo "  backup       Create encrypted database backup"
	@echo "  restore      Restore from backup (BACKUP_FILE=path)"
	@echo ""
	@echo "Maintenance:"
	@echo "  down         Stop all services"
	@echo "  clean        Stop services and remove volumes"
	@echo "  security     Scan Docker image for vulnerabilities"

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

# --- Build ---
build:
	$(COMPOSE) build

# --- Security scan ---
security:
	docker build -f infrastructure/Dockerfile.data-api -t aegis-data-api:scan . && \
	docker run --rm aquasec/trivy:latest image aegis-data-api:scan --severity HIGH,CRITICAL
