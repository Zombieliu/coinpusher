#!/usr/bin/env zsh

# 🧹 清理和重置测试环境
# 用于解决 502、端口占用、容器残留等问题

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧹 清理和重置测试环境${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. 停止所有 room-service 相关容器
echo -e "${YELLOW}1️⃣ 停止所有 room-service 容器...${NC}"
docker ps -a --filter "name=room-service" --format "{{.Names}}" | while read container; do
    if [ -n "$container" ]; then
        echo "   停止容器: $container"
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    fi
done

# 2. 清理 docker-compose 资源
echo -e "${YELLOW}2️⃣ 清理 docker-compose 资源...${NC}"
docker-compose down 2>/dev/null || true
docker-compose --profile 2c4g down 2>/dev/null || true
docker-compose --profile 4c8g down 2>/dev/null || true
docker-compose --profile 8c16g down 2>/dev/null || true
docker-compose --profile network-test down 2>/dev/null || true

# 3. 检查端口占用
echo -e "${YELLOW}3️⃣ 检查端口占用...${NC}"
PORTS=(9000 9001 9002 9003 9020)
for port in "${PORTS[@]}"; do
    PID=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$PID" ]; then
        echo -e "   ${RED}⚠️  端口 $port 被占用 (PID: $PID)${NC}"
        echo -e "   进程信息:"
        ps -p $PID -o pid,command 2>/dev/null || true
        read -q "REPLY?   是否终止该进程? (y/n) "
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill $PID 2>/dev/null && echo -e "   ${GREEN}✓ 已终止${NC}" || echo -e "   ${RED}✗ 终止失败${NC}"
        fi
    else
        echo -e "   ${GREEN}✓ 端口 $port 空闲${NC}"
    fi
done

# 4. 清理测试结果（可选）
echo ""
read -q "REPLY?4️⃣ 是否清理测试结果目录? (y/n) "
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}   清理 perf-results/ 和 perf-results-network/${NC}"
    rm -rf perf-results/ perf-results-network/
    echo -e "${GREEN}   ✓ 已清理${NC}"
else
    echo -e "${BLUE}   保留测试结果${NC}"
fi

# 5. 清理 Docker 资源（可选）
echo ""
read -q "REPLY?5️⃣ 是否清理未使用的 Docker 镜像和网络? (y/n) "
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}   清理 Docker 资源...${NC}"
    docker network prune -f 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    echo -e "${GREEN}   ✓ 已清理${NC}"
else
    echo -e "${BLUE}   保留 Docker 资源${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 清理完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "现在可以重新运行测试："
echo "  ./perf-test-cloud-sim.sh 4c8g"
echo "  ./perf-test-with-network.sh --preset china-telecom-5m"
echo ""
