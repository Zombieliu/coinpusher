#!/usr/bin/env bash
set -euo pipefail

# 在 Railway 远端执行初始化/演示数据脚本
# 用法: bash scripts/railway-seed.sh [service]
# 默认为 gate 服务 (继承了 MongoDB 连接配置)。

SERVICE="${1:-gate}"
COMMAND='cd tsrpc_server && npx ts-node initialize-game-data.ts && npx ts-node seed-admin-demo.ts'

echo "☁️  在 Railway 服务 ${SERVICE} 上执行初始化脚本"
railway run --service "${SERVICE}" --command "${COMMAND}"
