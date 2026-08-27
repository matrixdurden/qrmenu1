#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "${1:-}" != "--force" ] || [ -z "${2:-}" ]; then
  echo "Usage: ./scripts/restore-postgres.sh --force backups/qrmenu-YYYYMMDDTHHMMSSZ.dump" >&2
  echo "WARNING: this replaces data in the configured database." >&2
  exit 2
fi
FILE="$2"
[ -f "$FILE" ] || { echo "Backup not found: $FILE" >&2; exit 2; }

if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi
: "${DATABASE_URL:?DATABASE_URL is required}"

if ! command -v pg_restore >/dev/null 2>&1; then
  . "$ROOT/scripts/postgres-env.sh"
fi

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$FILE"
echo "Restore completed: $FILE"
