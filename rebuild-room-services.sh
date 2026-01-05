#!/bin/bash

# One-click rebuild & restart for Physics Worker and TSRPC room server.
# Usage: ./rebuild-room-services.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run() {
    echo ""
    echo "==> $*"
    "$@"
}

PHYSICS_SERVICES="${PHYSICS_WORKER_SERVICES:-physics-worker}"
read -r -a PHYSICS_ARRAY <<< "$PHYSICS_SERVICES"

echo "⚙️ Rebuilding physics-worker service (${PHYSICS_ARRAY[*]})…"
pushd "$ROOT_DIR" >/dev/null
run docker-compose build "${PHYSICS_ARRAY[@]}"
run docker-compose up -d "${PHYSICS_ARRAY[@]}"
popd >/dev/null

TARGET_TSRPC_SERVICE="${TARGET_TSRPC_SERVICE:-room-server}"

echo "⚙️ Rebuilding tsrpc_server service (${TARGET_TSRPC_SERVICE}) …"
pushd "$ROOT_DIR" >/dev/null
run docker-compose build "$TARGET_TSRPC_SERVICE"
run docker-compose up -d "$TARGET_TSRPC_SERVICE"
popd >/dev/null

echo ""
echo "✅ Physics worker & room server rebuilt. Check docker-compose logs if needed."
