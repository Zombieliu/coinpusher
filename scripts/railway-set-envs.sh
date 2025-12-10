#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "用法: bash scripts/railway-set-envs.sh <service> <env-file>" >&2
  exit 1
fi

SERVICE="$1"
ENV_FILE="$2"

railway service "$SERVICE" >/dev/null

while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  value="${value%$'\r'}"
  railway variables set "$key" "$value"
done < "$ENV_FILE"

echo "✅ 已将 $(basename "$ENV_FILE") 中的变量写入服务 $SERVICE"
