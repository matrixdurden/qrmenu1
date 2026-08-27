#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "QR Menu Studio is already running on port 3000."
  exit 0
fi

if pgrep -f "next dev" >/dev/null 2>&1; then
  echo "Next.js dev server is already starting."
  exit 0
fi

nohup npm run dev -- -H 0.0.0.0 > /tmp/qrmenu-dev.log 2>&1 &

echo "Starting QR Menu Studio..."
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "QR Menu Studio is ready."
    exit 0
  fi
  sleep 1
done

echo "Server did not become ready. Last log output:"
tail -n 80 /tmp/qrmenu-dev.log || true
exit 1
