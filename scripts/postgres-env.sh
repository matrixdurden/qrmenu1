#!/usr/bin/env sh
set -eu

PG_BASE="${PG_BASE:-$HOME/.local/share/qrmenu-postgres}"
export PGDATA="${PGDATA:-$PG_BASE/data}"
CUSTOM_PGROOT="$PG_BASE/root/usr/lib/postgresql/18"
CUSTOM_PGLIB="$PG_BASE/root/usr/lib/x86_64-linux-gnu"

if [ -x "$CUSTOM_PGROOT/bin/pg_ctl" ]; then
  export PGROOT="$CUSTOM_PGROOT"
  export PATH="$PGROOT/bin:$PATH"
  export LD_LIBRARY_PATH="$CUSTOM_PGLIB${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
elif command -v pg_config >/dev/null 2>&1; then
  PGROOT="$(pg_config --bindir)"
  export PGROOT
  export PATH="$PGROOT:$PATH"
elif command -v pg_ctl >/dev/null 2>&1; then
  PGROOT="$(dirname "$(command -v pg_ctl)")"
  export PGROOT
else
  echo "PostgreSQL araçları bulunamadı. PostgreSQL 18 kurun veya PG_BASE/PGDATA ayarlayın." >&2
  exit 1
fi
