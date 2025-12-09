#!/bin/bash

echo "🎮 Oops MOBA 运营后台启动脚本"
echo "================================"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js >= 18"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

# 检查环境变量
if [ ! -f ".env.local" ]; then
    echo "⚠️  未找到.env.local文件"
    echo "💡 如需自定义配置，请复制.env.local.example并修改"
    echo ""
fi

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo "访问地址: http://localhost:3001"
echo ""
npm run dev
