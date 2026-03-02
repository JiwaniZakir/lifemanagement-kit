#!/usr/bin/env bash
# =============================================================================
# Aegis — Secret Rotation Script
# =============================================================================
# Rotates internal secrets (DB password, API token, encryption key).
# Restarts affected services after update.
#
# Usage: ./infrastructure/scripts/rotate-secrets.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

generate_secret() { openssl rand -hex 32; }

log_info "=== Aegis Secret Rotation ==="
echo ""

# --- Backup current .env ---
cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
log_info "Current .env backed up"

# --- Generate new secrets ---
NEW_POSTGRES_PW=$(generate_secret)
NEW_DATA_API_TOKEN=$(generate_secret)

# DANGER: Rotating the encryption key requires re-encrypting ALL stored
# credentials with the new key BEFORE the old key is discarded. This script
# does NOT perform re-encryption. Rotating the encryption key without
# re-encryption will make all encrypted credentials permanently unreadable.
ROTATE_ENCRYPTION_KEY="${ROTATE_ENCRYPTION_KEY:-false}"
if [ "$ROTATE_ENCRYPTION_KEY" = "true" ]; then
    log_warn "ROTATE_ENCRYPTION_KEY=true — generating new encryption key."
    log_warn "YOU MUST re-encrypt all stored credentials before restarting services!"
    log_warn "Run: data-api credential re-encryption migration BEFORE 'docker compose up'."
    NEW_ENCRYPTION_KEY=$(generate_secret)
else
    log_info "Skipping encryption key rotation (set ROTATE_ENCRYPTION_KEY=true to rotate)"
    NEW_ENCRYPTION_KEY=""
fi

log_info "New secrets generated"

# --- Update .env ---
ENV_FILE="$PROJECT_DIR/.env"

update_env_var() {
    local var="$1" val="$2"
    if grep -q "^${var}=" "$ENV_FILE"; then
        sed -i.bak "s|^${var}=.*|${var}=${val}|" "$ENV_FILE"
    else
        echo "${var}=${val}" >> "$ENV_FILE"
    fi
}

update_env_var "POSTGRES_PASSWORD" "$NEW_POSTGRES_PW"
update_env_var "DATA_API_TOKEN" "$NEW_DATA_API_TOKEN"
if [ -n "$NEW_ENCRYPTION_KEY" ]; then
    update_env_var "ENCRYPTION_MASTER_KEY" "$NEW_ENCRYPTION_KEY"
fi

rm -f "${ENV_FILE}.bak"
chmod 600 "$ENV_FILE"

log_info "Updated .env with new secrets"

# --- Update PostgreSQL password ---
log_info "Updating PostgreSQL password..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    psql -U "${POSTGRES_USER:-aegis}" -c \
    "ALTER USER ${POSTGRES_USER:-aegis} PASSWORD '${NEW_POSTGRES_PW}';" 2>/dev/null || \
    log_warn "Could not update PG password live — will take effect on next restart"

# --- Restart services ---
log_info "Restarting services with new credentials..."
cd "$PROJECT_DIR"
docker compose down
docker compose up -d

log_info "Waiting for services to become healthy..."
for i in $(seq 1 30); do
    if docker compose ps --format json 2>/dev/null | grep -q '"unhealthy"'; then
        sleep 5
    elif docker compose ps --format json 2>/dev/null | grep -q '"starting"'; then
        sleep 5
    else
        break
    fi
done

# --- Verify ---
docker compose ps
echo ""
log_info "Secret rotation complete. Verify services above show 'Up (healthy)'."
log_warn "Remember: external API keys (Plaid, Anthropic, etc.) are NOT rotated by this script."
log_warn "Rotate those manually via their respective dashboards."
