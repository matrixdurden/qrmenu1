#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi
: "${DATABASE_URL:?DATABASE_URL is required}"

if ! command -v pg_dump >/dev/null 2>&1; then
  . "$ROOT/scripts/postgres-env.sh"
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/qrmenu-$STAMP.dump"
pg_dump --format=custom --compress=6 --no-owner --no-acl --file="$FILE" "$DATABASE_URL"
chmod 600 "$FILE"
printf '%s\n' "$FILE"
