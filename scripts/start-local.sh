#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT/scripts/node-env.sh"
cd "$ROOT"
./scripts/postgres-start.sh
exec npm run start
