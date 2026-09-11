#!/bin/sh
set -e

# ==============================================================================
# AgentCall AI — PostgreSQL Database Restore Script
# ==============================================================================

if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_backup_file.dump>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting restore from: ${BACKUP_FILE}..."

if [ -n "$DATABASE_URL" ]; then
  pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$BACKUP_FILE"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-postgres_secure_production_password}" \
  pg_restore --host="${POSTGRES_HOST:-postgres}" \
             --port="${POSTGRES_PORT:-5432}" \
             --username="${POSTGRES_USER:-postgres}" \
             --dbname="${POSTGRES_DB:-agentcall_db}" \
             --clean \
             --if-exists \
             --no-owner \
             --no-privileges \
             "$BACKUP_FILE"
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Database successfully restored from ${BACKUP_FILE}."
