#!/bin/bash

# 🛡️ 一键启动安全模块

set -e

echo "🚀 Starting OOPS MOBA Security Stack..."

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# 创建必要的目录
mkdir -p prometheus grafana/dashboards grafana/datasources alertmanager

# 启动服务
echo "📦 Starting DragonflyDB + Prometheus + Grafana..."
docker-compose -f docker-compose.security.yml up -d

# 等待服务就绪
echo "⏳ Waiting for services to be ready..."
sleep 10

# 健康检查
echo "🔍 Health check..."

# 检查DragonflyDB
if docker exec oops-dragonfly redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ DragonflyDB is running"
else
    echo "  ❌ DragonflyDB failed to start"
fi

# 检查Prometheus
if curl -s http://localhost:9090/-/ready > /dev/null 2>&1; then
    echo "  ✅ Prometheus is running"
else
    echo "  ⚠️  Prometheus not ready yet (may take a few more seconds)"
fi

# 检查Grafana
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "  ✅ Grafana is running"
else
    echo "  ⚠️  Grafana not ready yet (may take a few more seconds)"
fi

echo ""
echo "🎉 Security stack started successfully!"
echo ""
echo "📍 Access URLs:"
echo "  - DragonflyDB:  redis://localhost:6379"
echo "  - Prometheus:   http://localhost:9090"
echo "  - Grafana:      http://localhost:3001 (admin/admin123)"
echo "  - Alertmanager: http://localhost:9093"
echo ""
echo "📚 Next steps:"
echo "  1. Start your application servers (Gate, Room, Match)"
echo "  2. Open Grafana and import dashboards"
echo "  3. Check Prometheus targets: http://localhost:9090/targets"
echo ""
echo "🛑 To stop: docker-compose -f docker-compose.security.yml down"
