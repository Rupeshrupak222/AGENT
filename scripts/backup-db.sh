#!/bin/sh
set -e

# ==============================================================================
# AgentCall AI — Automated PostgreSQL Database Backup Script
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/agentcall_backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting database backup..."

if [ -n "$DATABASE_URL" ]; then
  pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "${BACKUP_FILE}"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-postgres_secure_production_password}" \
  pg_dump --host="${POSTGRES_HOST:-postgres}" \
          --port="${POSTGRES_PORT:-5432}" \
          --username="${POSTGRES_USER:-postgres}" \
          --format=custom \
          --no-owner \
          --no-privileges \
          "${POSTGRES_DB:-agentcall_db}" > "${BACKUP_FILE}"
fi

FILESIZE=$(wc -c < "${BACKUP_FILE}")
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup successfully created: ${BACKUP_FILE} (${FILESIZE} bytes)"

# Retention: retain backups for 14 days, remove older dumps
find "${BACKUP_DIR}" -name "agentcall_backup_*.dump" -type f -mtime +14 -exec rm {} \;
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Retention policy applied (retained last 14 days)."
