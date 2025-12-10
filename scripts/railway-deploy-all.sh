#!/usr/bin/env bash
set -euo pipefail

# 统一的 Railway 部署脚本（兼容 macOS 默认 bash 3.x）
# 用法:
#   bash scripts/railway-deploy-all.sh gate
#   bash scripts/railway-deploy-all.sh admin
#   bash scripts/railway-deploy-all.sh all

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_root() {
  case "$1" in
    gate|match|room)
      printf "tsrpc_server"
      ;;
    admin)
      printf "admin-dashboard"
      ;;
    *)
      printf ""
      ;;
  esac
}

deploy_service() {
  local service="$1"
  shift || true
  local root
  root="$(resolve_root "${service}")"

  if [[ -z "${root}" ]]; then
    echo "未知服务: ${service}" >&2
    exit 1
  fi

  echo "🚀 部署 ${service} (root=${root})"
  (
    cd "${PROJECT_ROOT}/${root}"
    railway service "${service}" >/dev/null
    railway up --detach . "$@"
  )
}

if [[ $# -lt 1 ]]; then
  echo "请指定要部署的目标 (gate|match|room|admin|all)" >&2
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
