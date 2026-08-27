#!/usr/bin/env sh
PG_BASE="$HOME/.local/share/qrmenu-postgres"
export PGROOT="$PG_BASE/root/usr/lib/postgresql/18"
export PGDATA="$PG_BASE/data"
export LD_LIBRARY_PATH="$PG_BASE/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PATH="$PGROOT/bin:$PATH"
