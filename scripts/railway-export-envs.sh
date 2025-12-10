#!/usr/bin/env bash
set -euo pipefail

# 批量导出 Railway 各服务环境变量
# 用法:
#   bash scripts/railway-export-envs.sh gate match room admin
# 如果不传参数则默认导出常见服务

if [[ $# -eq 0 ]]; then
  SERVICES=("gate" "match" "room" "admin" "mongodb" "dragonfly" "grafana" "prometheus" "loki" "tempo")
else
  SERVICES=("$@")
fi

OUTPUT_DIR=".railway/envs"
mkdir -p "${OUTPUT_DIR}"

for svc in "${SERVICES[@]}"; do
  echo "➡️  导出 ${svc} 变量..."
  railway service "${svc}" >/dev/null
  railway variables --json > "${OUTPUT_DIR}/${svc}.json"
done

echo "✅  全部导出完成，路径：${OUTPUT_DIR}"
