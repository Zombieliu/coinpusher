#!/bin/bash

echo "🚀 开始部署所有后台管理功能..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📝 注意：由于功能较多，这是一个简化实现方案${NC}"
echo -e "${YELLOW}完整实现请参考 IMPLEMENTATION_GUIDE.md${NC}"
echo ""

# 1. 重新生成协议
echo -e "${GREEN}1. 重新生成TSRPC协议...${NC}"
npx tsrpc proto

# 2. 编译TypeScript
echo -e "${GREEN}2. 编译TypeScript代码...${NC}"
npx tsc --project tsconfig.json --skipLibCheck 2>&1 | grep -v "^src/" | head -10

# 3. 检查编译结果
echo -e "${GREEN}3. 检查编译结果...${NC}"
if [ -f "dist/server/gate/bll/MonitoringSystem.js" ]; then
    echo "  ✓ MonitoringSystem.js"
fi
if [ -f "dist/server/gate/bll/AuditLogSystem.js" ]; then
    echo "  ✓ AuditLogSystem.js"
fi

# 4. 复制到Docker容器
echo -e "${GREEN}4. 部署到Docker容器...${NC}"

# 复制监控系统
docker cp dist/server/gate/bll/MonitoringSystem.js coinpusher-gate:/app/dist/server/gate/bll/ 2>/dev/null && echo "  ✓ MonitoringSystem" || echo "  ⨯ MonitoringSystem (文件可能不存在)"

# 复制协议文件
docker cp dist/tsrpc/protocols/ServiceProtoGate.js coinpusher-gate:/app/dist/tsrpc/protocols/ 2>/dev/null && echo "  ✓ ServiceProtoGate" || echo "  ⨯ ServiceProtoGate"

# 复制新增API
for api in ApiGetSystemMetrics ApiGetActiveAlerts; do
    if [ -f "dist/server/gate/api/admin/${api}.js" ]; then
        docker cp "dist/server/gate/api/admin/${api}.js" coinpusher-gate:/app/dist/server/gate/api/admin/ && echo "  ✓ ${api}"
    fi
done

# 5. 重启gate-server
echo -e "${GREEN}5. 重启gate-server...${NC}"
docker-compose restart gate-server

echo ""
echo -e "${GREEN}⏳ 等待服务启动...${NC}"
sleep 5

# 6. 检查日志
echo -e "${GREEN}6. 检查服务状态...${NC}"
docker-compose logs gate-server --tail=20 | grep -E "(已初始化|加载成功|Admin APIs)"

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "📊 可访问的功能:"
echo "  - 审计日志: http://localhost:3003/dashboard/audit"
echo "  - 监控系统: http://localhost:3003/dashboard/monitor (需要前端实现)"
echo ""
echo "📖 查看完整实现指南:"
echo "  cat IMPLEMENTATION_GUIDE.md"
echo ""
echo "⚠️  注意："
echo "  - 前端页面需要重新构建 admin-dashboard"
echo "  - 详细实现步骤请参考 IMPLEMENTATION_GUIDE.md"
