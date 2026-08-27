#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/postgres-env.sh"
mkdir -p "$PG_BASE/log"
if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then echo "PostgreSQL zaten çalışıyor."; else pg_ctl -D "$PGDATA" -l "$PG_BASE/log/postgresql.log" start; fi
