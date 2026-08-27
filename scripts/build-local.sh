#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
export PATH="$ROOT/.tools/node/bin:$PATH"
cd "$ROOT"
./scripts/postgres-start.sh
npm run db:migrate
exec npm run build
