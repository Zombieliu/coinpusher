#!/usr/bin/env bash
set -euo pipefail

# 统一的 Railway 部署脚本
# 用法:
#   bash scripts/railway-deploy-all.sh gate
#   bash scripts/railway-deploy-all.sh admin
#   bash scripts/railway-deploy-all.sh all

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

declare -A SERVICE_ROOTS=(
  [gate]="tsrpc_server"
  [match]="tsrpc_server"
  [room]="tsrpc_server"
  [admin]="admin-dashboard"
)

deploy_service() {
  local service="$1"
  local root="${SERVICE_ROOTS[$service]}"

  if [[ -z "${root:-}" ]]; then
    echo "未知服务: ${service}" >&2
    exit 1
  fi

  echo "🚀 部署 ${service} (root=${root})"
  (
    cd "${PROJECT_ROOT}/${root}"
    railway up --service "${service}" --root . --detach "$@"
  )
}

if [[ $# -lt 1 ]]; then
  echo "请指定要部署的服务 (gate|match|room|admin|all)" >&2
  exit 1
fi

target="$1"
shift || true

case "${target}" in
  gate|match|room|admin)
    deploy_service "${target}" "$@"
    ;;
  all)
    deploy_service gate "$@"
    deploy_service match "$@"
    deploy_service room "$@"
    deploy_service admin "$@"
    ;;
  *)
    echo "未知目标: ${target}" >&2
    exit 1
    ;;
esac
