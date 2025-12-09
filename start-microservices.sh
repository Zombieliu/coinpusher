#!/bin/bash

# 🚀 微服务架构快速启动脚本

set -e

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║       🚀 Starting Microservices Architecture            ║
║                                                          ║
║   • Gateway × 2                                         ║
║   • Physics Worker × 3                                  ║
║   • DragonflyDB (Message Queue)                         ║
║   • MongoDB                                             ║
║   • Prometheus + Grafana                                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${COLOR_RESET}"

# ============ 步骤 1: 检查环境 ============
echo -e "\n${COLOR_YELLOW}[1/4] Checking environment...${COLOR_RESET}"

if ! command -v docker &> /dev/null; then
    echo -e "  ❌ Docker not found"
    exit 1
fi
echo -e "  ✅ Docker found"

if ! command -v docker-compose &> /dev/null; then
    echo -e "  ❌ Docker Compose not found"
    exit 1
fi
echo -e "  ✅ Docker Compose found"

# ============ 步骤 2: 启动 DragonflyDB ============
echo -e "\n${COLOR_YELLOW}[2/4] Starting DragonflyDB...${COLOR_RESET}"

if ! docker ps | grep -q oops-dragonfly; then
    docker-compose -f docker-compose.security.yml up -d dragonfly
    echo "  ⏳ Waiting for DragonflyDB..."
    sleep 3
fi

if docker exec oops-dragonfly redis-cli ping &> /dev/null; then
    echo -e "  ${COLOR_GREEN}✅ DragonflyDB running${COLOR_RESET}"
else
    echo -e "  ❌ DragonflyDB failed to start"
    exit 1
fi

# ============ 步骤 3: 运行测试 ============
echo -e "\n${COLOR_YELLOW}[3/4] Running integration test...${COLOR_RESET}"

echo "  Running microservices test..."
npx ts-node test-microservices.ts

if [ $? -eq 0 ]; then
    echo -e "  ${COLOR_GREEN}✅ Integration test passed${COLOR_RESET}"
else
    echo -e "  ❌ Integration test failed"
    exit 1
fi

# ============ 步骤 4: 启动完整集群（可选） ============
echo -e "\n${COLOR_YELLOW}[4/4] Starting full cluster (optional)...${COLOR_RESET}"

read -p "Do you want to start the full Docker cluster? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  Starting Docker Compose cluster..."
    docker-compose -f docker-compose.microservices.yml up -d

    echo "  ⏳ Waiting for services to start..."
    sleep 10

    echo -e "\n${COLOR_GREEN}✅ All services started!${COLOR_RESET}"
    echo ""
    echo "  📊 Access services:"
    echo "    • Gateway:     http://localhost:80"
    echo "    • Prometheus:  http://localhost:9090"
    echo "    • Grafana:     http://localhost:3001 (admin/admin)"
    echo ""
    echo "  🔍 Check logs:"
    echo "    docker-compose -f docker-compose.microservices.yml logs -f [service_name]"
    echo ""
    echo "  ⏹️  Stop services:"
    echo "    docker-compose -f docker-compose.microservices.yml down"
else
    echo "  Skipped full cluster startup"
fi

echo -e "\n${COLOR_BLUE}════════════════════════════════════════════════════════${COLOR_RESET}"
echo -e "${COLOR_GREEN}"
cat << EOF

  ✅ Microservices architecture ready!

  📚 Documentation:
    • MICROSERVICES_ARCHITECTURE.md - Architecture design
    • Test script: ./test-microservices.ts

  🎯 Next Steps:
    1. Integrate with actual PhysicsWorld implementation
    2. Add WebSocket support to Gateway
    3. Deploy to production

EOF
echo -e "${COLOR_RESET}"
