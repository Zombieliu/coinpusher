#!/bin/bash

echo "======================================================"
echo "🐳 OOPS-MOBA Docker 部署验证脚本"
echo "======================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 已安装"
        return 0
    else
        echo -e "${RED}✗${NC} $1 未安装"
        return 1
    fi
}

# 1. 检查依赖
echo "📋 [1/5] 检查系统依赖..."
check_command docker
DOCKER_OK=$?
check_command docker-compose
COMPOSE_OK=$?
echo ""

if [ $DOCKER_OK -ne 0 ] || [ $COMPOSE_OK -ne 0 ]; then
    echo -e "${RED}❌ 缺少必要依赖，请先安装 Docker 和 Docker Compose${NC}"
    exit 1
fi

# 2. 验证 Docker 配置
echo "🔍 [2/5] 验证 Docker Compose 配置..."
if docker-compose config --quiet 2>&1 | grep -q "error"; then
    echo -e "${RED}✗ Docker Compose 配置无效${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Docker Compose 配置有效${NC}"
fi
echo ""

# 3. 检查 Dockerfiles
echo "📝 [3/5] 检查 Dockerfile 文件..."
DOCKERFILES=(
    "tsrpc_server/Dockerfile.gate"
    "tsrpc_server/Dockerfile.match"
    "tsrpc_server/Dockerfile.room"
    "admin-dashboard/Dockerfile"
)

ALL_FILES_EXIST=true
for file in "${DOCKERFILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file 存在"
    else
        echo -e "${RED}✗${NC} $file 缺失"
        ALL_FILES_EXIST=false
    fi
done
echo ""

if [ "$ALL_FILES_EXIST" = false ]; then
    echo -e "${RED}❌ 部分 Dockerfile 文件缺失${NC}"
    exit 1
fi

# 4. 检查环境变量文件
echo "🔐 [4/5] 检查环境配置..."
if [ -f "admin-dashboard/.env.local" ]; then
    echo -e "${GREEN}✓${NC} admin-dashboard/.env.local 存在"
else
    echo -e "${YELLOW}⚠${NC}  admin-dashboard/.env.local 缺失（可选）"
fi
echo ""

# 5. 测试 MongoDB 连接
echo "🗄️  [5/5] 检查 MongoDB 可用性..."
if docker ps | grep -q mongo; then
    echo -e "${GREEN}✓${NC} MongoDB 容器正在运行"
elif pgrep -x mongod > /dev/null; then
    echo -e "${GREEN}✓${NC} MongoDB 本地实例正在运行"
else
    echo -e "${YELLOW}⚠${NC}  MongoDB 未运行（Docker 将启动新实例）"
fi
echo ""

# 总结
echo "======================================================"
echo "✅ Docker 部署配置验证完成！"
echo "======================================================"
echo ""
echo "📦 可用的服务："
echo "  • mongodb       - MongoDB 数据库 (27017)"
echo "  • gate-server   - Gate 服务器 (2000)"
echo "  • match-server  - Match 服务器 (3001)"
echo "  • room-server   - Room 服务器 (3002)"
echo "  • admin-dashboard - 管理后台 (3003)"
echo ""
echo "🚀 启动命令："
echo "  docker-compose up -d          # 后台启动所有服务"
echo "  docker-compose up mongodb     # 仅启动 MongoDB"
echo "  docker-compose logs -f        # 查看日志"
echo "  docker-compose down           # 停止所有服务"
echo ""
echo "📊 监控命令："
echo "  docker-compose ps             # 查看服务状态"
echo "  docker-compose top            # 查看进程资源使用"
echo ""
echo "⚠️  注意事项："
echo "  1. 首次启动需要构建镜像，可能需要几分钟"
echo "  2. MongoDB 数据将持久化到 Docker volume"
echo "  3. 确保端口 2000, 3001, 3002, 3003, 27017 未被占用"
echo "  4. 生产环境建议配置环境变量和安全认证"
echo ""
