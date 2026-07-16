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
npm run deploy
popd >/dev/null
