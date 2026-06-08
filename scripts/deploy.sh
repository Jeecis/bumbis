#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${BUMBIS_REPO_DIR:-/var/www/bumbis}"
BRANCH="${BUMBIS_BRANCH:-main}"
NODE_BIN_DIR="${BUMBIS_NODE_BIN_DIR:-}"

log() {
  printf '\n== %s ==\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Repo not found at $REPO_DIR" >&2
  exit 1
fi

cd "$REPO_DIR"

if [ -n "$NODE_BIN_DIR" ]; then
  export PATH="$NODE_BIN_DIR:$PATH"
elif [ -d /root/.nvm/versions/node ]; then
  LATEST_NODE_BIN="$(find /root/.nvm/versions/node -maxdepth 2 -mindepth 2 -type d -name bin | sort | tail -n1 || true)"
  if [ -n "$LATEST_NODE_BIN" ]; then
    export PATH="$LATEST_NODE_BIN:$PATH"
  fi
fi

require_cmd git
require_cmd nginx
require_cmd systemctl
require_cmd corepack
require_cmd node

log "repo state"
git status --short

if [ -n "$(git status --porcelain)" ]; then
  STASH_NAME="bumbis-deploy-$(date +%F-%H%M%S)"
  git stash push -u -m "$STASH_NAME"
  echo "Stashed local changes as $STASH_NAME"
fi

log "update source"
git fetch origin
git pull --ff-only origin "$BRANCH"

log "toolchain"
corepack enable
corepack prepare yarn@1.22.22 --activate
node -v
yarn -v

log "install deps"
yarn install --frozen-lockfile

log "build"
yarn build-only

log "matchmaking api"
if [ -f "$REPO_DIR/server/package.json" ]; then
  ( cd "$REPO_DIR/server" && yarn install --frozen-lockfile )
  if systemctl list-unit-files | grep -q '^bumbis-api\.service'; then
    systemctl restart bumbis-api
    echo "Restarted bumbis-api"
  else
    echo "bumbis-api.service not installed yet — see server/README.md for first-time setup"
  fi
fi

log "nginx verify"
nginx -t

log "reload nginx"
systemctl reload nginx

log "done"
echo "Bumbis deployed successfully"
