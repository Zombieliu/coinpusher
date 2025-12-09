#!/bin/bash

# ========================================
# 部署验证脚本
# ========================================

echo "🔍 开始验证 Coin Pusher Game 部署..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_service() {
    local url=$1
    local name=$2

    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name 正常${NC}"
        return 0
    else
        echo -e "${RED}❌ $name 失败${NC}"
        return 1
    fi
}

# 1. 检查 Docker 服务状态
echo "1️⃣ 检查 Docker Compose 服务状态..."
docker-compose ps
echo ""

# 2. 检查健康状态
echo "2️⃣ 检查服务健康状态..."
check_service "http://localhost:9090/live" "Gate Server (存活检查)"
check_service "http://localhost:9091/live" "Match Server (存活检查)"
check_service "http://localhost:9092/live" "Room Server (存活检查)"
echo ""

# 3. 检查完整健康检查
echo "3️⃣ 检查完整健康状态..."
echo "Gate Server:"
curl -s http://localhost:9090/health | jq '.' 2>/dev/null || echo "  ⚠️  需要安装 jq: brew install jq"
echo ""

# 4. 检查 Prometheus 指标
echo "4️⃣ 检查 Prometheus 指标..."
check_service "http://localhost:9090/metrics" "Gate Server (Metrics)"
check_service "http://localhost:9091/metrics" "Match Server (Metrics)"
check_service "http://localhost:9092/metrics" "Room Server (Metrics)"
echo ""

# 5. 检查监控服务
echo "5️⃣ 检查监控服务..."
check_service "http://localhost:9093/-/healthy" "Prometheus"
check_service "http://localhost:3001/api/health" "Grafana"
check_service "http://localhost:9094/-/healthy" "Alertmanager"
echo ""

# 6. 检查数据库连接
echo "6️⃣ 检查数据库连接..."
check_service "http://localhost:27017" "MongoDB (连接端口)"
check_service "http://localhost:6379" "DragonflyDB (连接端口)"
echo ""

# 7. 显示访问地址
echo "========================================"
echo "📊 监控面板访问地址:"
echo "========================================"
echo -e "${YELLOW}Grafana:${NC}      http://localhost:3001 (admin/admin123)"
echo -e "${YELLOW}Prometheus:${NC}   http://localhost:9093"
echo -e "${YELLOW}Alertmanager:${NC} http://localhost:9094"
echo ""
echo "========================================"
echo "🎮 游戏服务器端点:"
echo "========================================"
echo -e "${YELLOW}Gate Server:${NC}  http://localhost:3000 (监控: http://localhost:9090)"
echo -e "${YELLOW}Match Server:${NC} http://localhost:3002 (监控: http://localhost:9091)"
echo -e "${YELLOW}Room Server:${NC}  http://localhost:3001 (监控: http://localhost:9092)"
echo ""
echo "========================================"
echo "📝 常用命令:"
echo "========================================"
echo "查看日志:     docker-compose logs -f [service-name]"
echo "重启服务:     docker-compose restart [service-name]"
echo "停止服务:     docker-compose down"
echo "查看状态:     docker-compose ps"
echo ""
echo "✅ 验证完成！"
