#!/usr/bin/env bash
set -euo pipefail

# 远程运行测试脚本
# 用法:
#   bash scripts/railway-run-tests.sh
#   或按需修改下面的 TASKS 数组

declare -a TASKS=(
  "gate|cd tsrpc_server && npx tsx test-admin-dashboard.ts"
  "admin|cd .. && npx tsx test-admin-dashboard.ts" # 示例：可替换为前端测试脚本
)

if ! command -v railway >/dev/null 2>&1; then
  echo "⚠️  未检测到 Railway CLI，请在本机安装并登录后再运行此脚本" >&2
  exit 1
fi

for task in "${TASKS[@]}"; do
  IFS="|" read -r service command <<< "${task}"
  echo "🚀 Railway run: service=${service}"
  railway run --service "${service}" -- ${command}
done
