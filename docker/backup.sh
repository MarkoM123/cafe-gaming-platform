#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${1:-cafe_igraonica_db}"
DATABASE="${2:-cafe_gaming}"
USER_NAME="${3:-postgres}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backups"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql"
docker exec "$CONTAINER_NAME" pg_dump -U "$USER_NAME" "$DATABASE" > "$BACKUP_FILE"
echo "Backup saved to $BACKUP_FILE"
