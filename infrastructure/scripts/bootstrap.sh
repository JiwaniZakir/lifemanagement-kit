#!/usr/bin/env bash
# =============================================================================
# Aegis Bootstrap — One-command setup for new installations
# =============================================================================
# Usage (from project root):
#   ./infrastructure/scripts/bootstrap.sh
#
# What it does:
#   0. Clones OpenClaw if not present
#   1. Generates secrets if .env doesn't exist
#   2. Starts Docker Compose services
#   3. Waits for healthy containers
#   4. Runs database migrations
#   5. Prints next steps
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "=== Aegis Bootstrap ==="
echo ""

# ---------------------------------------------------------------------------
# 0. Check for OpenClaw
# ---------------------------------------------------------------------------
if [ ! -d openclaw ]; then
    echo "[0/5] OpenClaw not found — cloning..."
    if command -v git &>/dev/null; then
        git clone https://github.com/openclaw/openclaw.git openclaw
        echo "      OpenClaw cloned successfully."
    else
        echo "      ERROR: git is required to clone OpenClaw."
        echo "      Install git or manually clone https://github.com/openclaw/openclaw.git into ./openclaw/"
        exit 1
    fi
else
    echo "[0/5] OpenClaw directory found."
fi

# ---------------------------------------------------------------------------
# 1. Generate .env if it doesn't exist
# ---------------------------------------------------------------------------
if [ ! -f .env ]; then
    echo "[1/5] Generating .env from template..."
    cp .env.example .env

    # Auto-generate secrets
    DATA_API_TOKEN=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    POSTGRES_PW=$(openssl rand -hex 24)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^DATA_API_TOKEN=.*/DATA_API_TOKEN=$DATA_API_TOKEN/" .env
        sed -i '' "s/^ENCRYPTION_MASTER_KEY=.*/ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY/" .env
        sed -i '' "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PW/" .env
    else
        sed -i "s/^DATA_API_TOKEN=.*/DATA_API_TOKEN=$DATA_API_TOKEN/" .env
        sed -i "s/^ENCRYPTION_MASTER_KEY=.*/ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY/" .env
        sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PW/" .env
    fi

    echo "      Generated secrets (DATA_API_TOKEN, ENCRYPTION_MASTER_KEY, POSTGRES_PASSWORD)"
    echo "      Edit .env to add your ANTHROPIC_API_KEY and integration credentials."
else
    echo "[1/5] .env already exists — skipping generation."
fi

# Validate that required secrets are non-empty
VALIDATION_FAILED=0
for VAR_NAME in DATA_API_TOKEN ENCRYPTION_MASTER_KEY POSTGRES_PASSWORD; do
    VAL=$(grep "^${VAR_NAME}=" .env | cut -d'=' -f2-)
    if [ -z "$VAL" ]; then
        echo "      ERROR: $VAR_NAME is empty in .env"
        VALIDATION_FAILED=1
    fi
done
if [ "$VALIDATION_FAILED" -eq 1 ]; then
    echo ""
    echo "      .env validation failed — required secrets are missing."
    echo "      Fix the values above in .env and re-run bootstrap."
    exit 1
fi

# ---------------------------------------------------------------------------
# 2. Start services
# ---------------------------------------------------------------------------
echo ""
echo "[2/5] Starting Docker Compose services..."
docker compose up -d --build
echo "      Services starting..."

# ---------------------------------------------------------------------------
# 3. Wait for healthy
# ---------------------------------------------------------------------------
echo ""
echo "[3/5] Waiting for services to become healthy..."

MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if docker compose exec -T data-api curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
        echo "      data-api is healthy."
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo "      Waiting... (${WAITED}s)"
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "      WARNING: data-api did not become healthy within ${MAX_WAIT}s."
    echo "      Check logs: docker compose logs data-api"
fi

# ---------------------------------------------------------------------------
# 4. Run migrations
# ---------------------------------------------------------------------------
echo ""
echo "[4/5] Running database migrations..."
docker compose exec -T data-api uv run alembic upgrade head
echo "      Migrations applied."

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=== Bootstrap complete ==="
echo ""
echo "Next steps:"
echo "  1. Add your ANTHROPIC_API_KEY to .env and restart:"
echo "       docker compose restart openclaw-gateway"
echo ""
echo "  2. Open the Control UI:"
echo "       http://localhost:18789"
echo ""
echo "  3. Pair WhatsApp: scan the QR code in the Control UI"
echo ""
echo "  4. Store integration credentials via the API:"
echo "       curl -X POST http://localhost:8000/credentials \\"
echo "         -H 'Authorization: Bearer <DATA_API_TOKEN>' \\"
echo "         -H 'Content-Type: application/json' \\"
echo "         -d '{\"user_id\":\"default\",\"service_name\":\"canvas_access_token\",\"value\":\"YOUR_TOKEN\"}'"
echo ""
echo "  5. Verify cron jobs:"
echo "       docker compose logs openclaw-gateway | grep cron"
