#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT/scripts/node-env.sh"
cd "$ROOT"
./scripts/postgres-start.sh
npm run db:migrate
exec npm run build
