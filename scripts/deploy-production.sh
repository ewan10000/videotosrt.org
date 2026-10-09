#!/usr/bin/env bash
set -euo pipefail

npx opennextjs-cloudflare build
node scripts/check-seo-pages.mjs
if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  env -u CLOUDFLARE_API_TOKEN npx wrangler deploy
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
popd >/dev/null

npm run typecheck
VTS_BACKEND_DIR="$backend_dir" npm test
npm run lint
printf "Release validation complete; production deployment uses verified operator Wrangler OAuth.\n"
