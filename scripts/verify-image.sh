#!/usr/bin/env bash
# Verifies the backend container image against the Cloud Run contract (plan Task 10).
# Usage: pnpm image:verify   (needs Docker running; exits non-zero on any failure)
#
# The image must build from the repo root, run as the unprivileged `node` user,
# listen on whatever $PORT Cloud Run gives it, boot without a reachable database,
# and ship no .env files or dev dependencies.
set -euo pipefail
cd "$(dirname "$0")/.."

# Unique per run, so parallel runs never overwrite each other's image or containers.
IMAGE=collections-backend:verify-$$
CONTAINER=collections-backend-verify-$$
GUARD_CONTAINER=collections-backend-guard-$$
PORT_IN=9123 # deliberately not 8080, to prove the app reads $PORT
# Unreachable on purpose: /health/live must not depend on the database.
DATABASE_URL=postgresql://u:p@127.0.0.1:1/x

failures=0
pass() { echo "  ok    $1"; }
fail() { echo "  FAIL  $1" >&2; failures=$((failures + 1)); }
cleanup() {
  docker rm -f "$CONTAINER" "$GUARD_CONTAINER" >/dev/null 2>&1 || true
  docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker info >/dev/null 2>&1 || { echo "image:verify: Docker is not running" >&2; exit 2; }

echo "build"
if docker build -q -f apps/backend/Dockerfile -t "$IMAGE" . >/dev/null; then
  pass "docker build -f apps/backend/Dockerfile ."
else
  fail "docker build failed"
  echo "image:verify: cannot continue without an image" >&2
  exit 1
fi

echo "image contract"
cmd=$(docker image inspect --format '{{json .Config.Cmd}}' "$IMAGE")
[[ "$cmd" == '["node","dist/main.js"]' ]] && pass "CMD is node dist/main.js" || fail "unexpected CMD: $cmd"

user=$(docker run --rm "$IMAGE" whoami 2>&1) || true
[[ "$user" == "node" ]] && pass "runs as node" || fail "runs as '$user', expected node"

envs=$(docker run --rm "$IMAGE" sh -c \
  "find / \( -name '.env' -o -name '.env.*' \) -not -name '.env.example' -not -path '/proc/*' 2>/dev/null" || true)
[[ -z "$envs" ]] && pass "no .env files" || fail "image contains: $envs"

# Every devDependency in the backend's package.json must be absent from the image.
dev_deps=$(node -p "Object.keys(require('./apps/backend/package.json').devDependencies).join(' ')")
dev=$(docker run --rm "$IMAGE" sh -c 'for d in "$@"; do [ -e "node_modules/$d" ] && echo "$d"; done; true' sh $dev_deps || true)
[[ -z "$dev" ]] && pass "no dev dependencies ($(wc -w <<<"$dev_deps" | tr -d ' ') checked)" || fail "dev dependencies present: $(tr '\n' ' ' <<<"$dev")"

# The env schema only blocks the dev tenant header when NODE_ENV=production,
# and NODE_ENV defaults to development, so the image must set it.
node_env=$(docker run --rm "$IMAGE" printenv NODE_ENV 2>&1) || true
[[ "$node_env" == "production" ]] && pass "NODE_ENV=production" || fail "NODE_ENV is '$node_env', expected production"

# Detached with a deadline: if the guard ever regresses the app would keep
# running, and a foreground run would hang this script (and CI) forever.
docker run -d --name "$GUARD_CONTAINER" -e DATABASE_URL="$DATABASE_URL" \
  -e ALLOW_DEV_TENANT_HEADER=true "$IMAGE" >/dev/null
for _ in $(seq 1 20); do
  [[ "$(docker inspect -f '{{.State.Running}}' "$GUARD_CONTAINER")" == "true" ]] || break
  sleep 1
done
out=$(docker logs "$GUARD_CONTAINER" 2>&1 || true)
if [[ "$(docker inspect -f '{{.State.Running}}' "$GUARD_CONTAINER")" == "true" ]]; then
  fail "still running 20s after starting with ALLOW_DEV_TENANT_HEADER=true"
elif [[ "$(docker inspect -f '{{.State.ExitCode}}' "$GUARD_CONTAINER")" == "0" ]]; then
  fail "exited 0 with ALLOW_DEV_TENANT_HEADER=true"
elif [[ "$out" == *"ALLOW_DEV_TENANT_HEADER: must not be enabled in production"* ]]; then
  pass "refuses to start with ALLOW_DEV_TENANT_HEADER=true"
else
  fail "exited without the expected ALLOW_DEV_TENANT_HEADER error: $(tail -3 <<<"$out")"
fi

echo "runtime"
# Docker picks a free host port, so a busy port never breaks the run.
docker run -d --name "$CONTAINER" -e PORT="$PORT_IN" -e DATABASE_URL="$DATABASE_URL" \
  -p "127.0.0.1::$PORT_IN" "$IMAGE" >/dev/null
PORT_OUT=$(docker port "$CONTAINER" "$PORT_IN/tcp" | head -1 | sed 's/.*://')
status=000
for _ in $(seq 1 30); do
  status=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT_OUT/api/v1/health/live" || true)
  [[ "$status" == "200" ]] && break
  [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" == "true" ]] || break
  sleep 1
done
if [[ "$status" == "200" ]]; then
  pass "listens on \$PORT=$PORT_IN, /api/v1/health/live = 200 with the database unreachable"
else
  fail "/api/v1/health/live returned $status; container logs:"
  docker logs --tail 20 "$CONTAINER" >&2 || true
fi

if ((failures)); then echo "image:verify: $failures check(s) failed" >&2; exit 1; fi
echo "image:verify: all checks passed"
