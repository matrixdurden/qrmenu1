#!/usr/bin/env sh
set -eu

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  :
elif [ -n "${ROOT:-}" ] && [ -x "$ROOT/.tools/node/bin/node" ]; then
  export PATH="$ROOT/.tools/node/bin:$PATH"
else
  echo "Node.js 24+ ve npm bulunamadı. .node-version dosyasındaki sürümü kurun." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "Node.js 24+ gerekli; mevcut sürüm: $(node --version)" >&2
  exit 1
fi
