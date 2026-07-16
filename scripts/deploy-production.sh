#!/usr/bin/env bash
set -euo pipefail

npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy

if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  exit 0
fi

backend_dir="$(mktemp -d)"
cleanup() {
  git worktree remove --force "$backend_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git fetch origin backend
git worktree add --detach "$backend_dir" FETCH_HEAD

pushd "$backend_dir" >/dev/null
npm ci
npm run typecheck
npm test

schema="$(npx wrangler d1 execute videotosrt-db --remote --command 'PRAGMA table_info(users);' --json)"
has_column() {
  SCHEMA="$schema" COLUMN="$1" node -e '
    const data = JSON.parse(process.env.SCHEMA);
    const rows = data.flatMap((entry) => entry.results || []);
    process.exit(rows.some((row) => row.name === process.env.COLUMN) ? 0 : 1);
  '
}

if ! has_column plan; then
  npx wrangler d1 execute videotosrt-db --remote --command "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';"
fi
if ! has_column extra_credit_hours; then
  npx wrangler d1 execute videotosrt-db --remote --command "ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0;"
fi
if ! has_column last_login_at; then
  npx wrangler d1 execute videotosrt-db --remote --command "ALTER TABLE users ADD COLUMN last_login_at TEXT;"
fi

npx wrangler d1 execute videotosrt-db --remote --file=./migrations/0002_plan_and_webhook_events.sql
npm run deploy
popd >/dev/null
