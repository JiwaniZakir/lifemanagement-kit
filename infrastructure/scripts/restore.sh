#!/usr/bin/env bash
# =============================================================================
# Aegis — Restore Script
# =============================================================================
# Restores a PostgreSQL backup created by backup.sh.
# Decrypts with age (if encrypted), drops/recreates the DB, restores the dump,
# and runs Alembic migrations to ensure schema is current.
#
# Usage:
#   ./infrastructure/scripts/restore.sh --confirm <backup-file>
#
# Examples:
#   ./infrastructure/scripts/restore.sh --confirm backups/aegis_20260301_120000.sql.gz.age
#   ./infrastructure/scripts/restore.sh --confirm backups/aegis_20260301_120000.sql.gz
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

usage() {
    echo "Usage: $0 --confirm <backup-file>"
    echo ""
    echo "  --confirm       Required flag to prevent accidental restores"
    echo "  <backup-file>   Path to .sql.gz or .sql.gz.age backup file"
    exit 1
}

# --- Parse arguments ---
CONFIRMED=0
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --confirm) CONFIRMED=1; shift ;;
        -*) log_error "Unknown option: $1"; usage ;;
        *) BACKUP_FILE="$1"; shift ;;
    esac
done

if [ "$CONFIRMED" -ne 1 ]; then
    log_error "--confirm flag is required to prevent accidental restores."
    usage
fi

if [ -z "$BACKUP_FILE" ]; then
    log_error "No backup file specified."
    usage
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment
if [[ -f "$PROJECT_DIR/.env" ]]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

DB_USER="${POSTGRES_USER:-aegis}"
DB_NAME="${POSTGRES_DB:-aegis}"

# --- Step 1: Decrypt if .age file ---
DUMP_FILE="$BACKUP_FILE"
DECRYPTED_TEMP=""

if [[ "$BACKUP_FILE" == *.age ]]; then
    if ! command -v age &>/dev/null; then
        log_error "age is required to decrypt .age backups but is not installed."
        exit 1
    fi

    DECRYPTED_TEMP="$(mktemp /tmp/aegis_restore_XXXXXX.sql.gz)"
    trap 'rm -f "$DECRYPTED_TEMP" 2>/dev/null' EXIT

    log_info "Decrypting backup..."
    AGE_KEY_FILE="${AGE_KEY_FILE:-}"
    if [[ -n "$AGE_KEY_FILE" && -f "$AGE_KEY_FILE" ]]; then
        age -d -i "$AGE_KEY_FILE" -o "$DECRYPTED_TEMP" "$BACKUP_FILE"
    else
        log_warn "AGE_KEY_FILE not set — prompting for passphrase"
        age -d -o "$DECRYPTED_TEMP" "$BACKUP_FILE"
    fi
    DUMP_FILE="$DECRYPTED_TEMP"
    log_info "Decrypted successfully."
fi

# --- Step 2: Drop and recreate database ---
log_warn "This will DROP and recreate the '$DB_NAME' database. All current data will be lost."
echo ""

log_info "Dropping and recreating database '$DB_NAME'..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
        DROP DATABASE IF EXISTS \"$DB_NAME\";
        CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";
    "

# Re-create extensions (from init.sql)
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
    "

log_info "Database recreated."

# --- Step 3: Restore from dump ---
log_info "Restoring from backup..."
gunzip -c "$DUMP_FILE" | docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    psql -U "$DB_USER" -d "$DB_NAME" --quiet

log_info "Restore complete."

# --- Step 4: Run migrations ---
log_info "Running Alembic migrations to ensure schema is current..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T data-api \
    uv run alembic upgrade head

log_info "Migrations applied."

# --- Done ---
echo ""
log_info "Restore complete. Verify with:"
echo "  docker compose exec postgres psql -U $DB_USER -d $DB_NAME -c '\\dt'"
