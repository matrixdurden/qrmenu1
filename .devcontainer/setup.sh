#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

APP_URL="http://localhost:3000"
if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  APP_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
fi

cat > .env.local <<EOF
DATABASE_URL=postgresql://qrmenu:qrmenu@db:5432/qrmenu
NEXT_PUBLIC_APP_URL=${APP_URL}
EOF

echo "Installing dependencies..."
npm ci

echo "Waiting for PostgreSQL..."
node <<'NODE'
const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL;

(async () => {
  for (let attempt = 1; attempt <= 30; attempt++) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.query('select 1');
      await client.end();
      console.log('PostgreSQL is ready.');
      return;
    } catch (error) {
      try { await client.end(); } catch {}
      if (attempt === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE

echo "Applying migrations..."
npm run db:migrate

SITE_COUNT=$(node <<'NODE'
const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query('select count(*)::int as count from sites');
  console.log(result.rows[0].count);
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
)

if [[ "$SITE_COUNT" == "0" ]]; then
  echo "Database is empty; loading MIRA demo data..."
  npm run db:seed
else
  echo "Database already contains ${SITE_COUNT} site(s); demo seed skipped."
fi

echo
echo "Codespace setup complete."
echo "Public app URL: ${APP_URL}"
echo "Admin URL: ${APP_URL}/admin"
echo "Demo menu: ${APP_URL}/menu/mira"
