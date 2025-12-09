#!/bin/bash

# ========================================
# Coin Pusher Game - 快速启动脚本
# ========================================

echo "🚀 Coin Pusher Game - 快速启动"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查 Docker
echo "1️⃣ 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "请安装 Docker: https://www.docker.com/get-started"
    exit 1
fi
echo -e "${GREEN}✅ Docker 已安装${NC}"
echo ""

# 2. 启动数据库服务
echo "2️⃣ 启动数据库服务..."

# 启动 MongoDB
if [ "$(docker ps -q -f name=coinpusher-mongodb)" ]; then
    echo -e "${YELLOW}MongoDB 已在运行${NC}"
else
    echo "启动 MongoDB..."
    docker run -d \
        --name coinpusher-mongodb \
        -p 27017:27017 \
        -e MONGO_INITDB_ROOT_USERNAME=coinpusher_app \
        -e MONGO_INITDB_ROOT_PASSWORD=coinpusher_secure_password_2025 \
        mongo:7.0.0
    echo -e "${GREEN}✅ MongoDB 已启动${NC}"
fi

# 启动 DragonflyDB
if [ "$(docker ps -q -f name=coinpusher-dragonflydb)" ]; then
    echo -e "${YELLOW}DragonflyDB 已在运行${NC}"
else
    echo "启动 DragonflyDB..."
    docker run -d \
        --name coinpusher-dragonflydb \
        -p 6379:6379 \
        docker.dragonflydb.io/dragonflydb/dragonfly
    echo -e "${GREEN}✅ DragonflyDB 已启动${NC}"
fi

echo ""

# 3. 等待数据库就绪
echo "3️⃣ 等待数据库就绪..."
sleep 5
echo -e "${GREEN}✅ 数据库已就绪${NC}"
echo ""

# 4. 显示启动说明
echo "========================================"
echo "📋 接下来的步骤:"
echo "========================================"
echo ""
echo -e "${YELLOW}在3个不同的终端中分别运行：${NC}"
echo ""
echo "终端 1 - Gate Server:"
echo "  npm run dev:gate"
echo ""
echo "终端 2 - Match Server:"
echo "  npm run dev:match"
echo ""
echo "终端 3 - Room Server:"
echo "  npm run dev:room"
echo ""
echo "========================================"
echo "📊 可选：启动监控服务"
echo "========================================"
echo ""
echo "cd monitoring && docker-compose up -d"
echo ""
echo -e "访问 Grafana: ${GREEN}http://localhost:3001${NC} (admin/admin123)"
echo -e "访问 Prometheus: ${GREEN}http://localhost:9093${NC}"
echo ""
echo "========================================"
echo "✅ 数据库服务已准备就绪！"
echo "========================================"
