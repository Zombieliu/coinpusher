#!/bin/bash

# 管理后台Gate Server开发模式启动脚本
# 使用transpileOnly模式跳过TypeScript类型检查，加快启动速度

echo "🚀 启动Gate Server（开发模式 - 忽略类型检查）"
echo ""

# 设置环境变量让ts-node跳过类型检查
export TS_NODE_TRANSPILE_ONLY=true

# 启动服务器
npm run dev:gate
