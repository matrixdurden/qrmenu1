#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/postgres-env.sh"
pg_ctl -D "$PGDATA" status
