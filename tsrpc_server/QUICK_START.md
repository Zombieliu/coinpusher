# ⚡ 快速开始指南

**5 分钟内启动完整的 Coin Pusher 游戏服务器**

---

## 🎯 前置要求

确保已安装以下工具：

```bash
# 检查 Docker 和 Docker Compose
docker --version          # >= 20.10.0
docker-compose --version  # >= 1.29.0

# 检查 Node.js（仅开发模式需要）
node --version            # >= 20.0.0
npm --version             # >= 9.0.0
```

---

## 🚀 方式一：Docker Compose（推荐）

### 1. 克隆并进入项目

```bash
cd oops-coinpusher/tsrpc_server
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（必须修改的项）
vim .env
```

**必须修改的配置**:
```bash
# 修改内部通信密钥（至少32字符）
INTERNAL_SECRET_KEY=your-super-secret-key-at-least-32-characters-long

# 修改 MongoDB 密码
MONGODB_PASSWORD=your-mongodb-strong-password

# 可选：修改 Redis 密码
REDIS_PASSWORD=your-redis-password
```

### 3. 启动所有服务

```bash
# 一键启动所有服务（数据库、应用、监控）
docker-compose up -d

# 等待服务启动（约15秒）
docker-compose ps
```

**预期输出**:
```
NAME                        STATUS              PORTS
coinpusher-gate             Up (healthy)        0.0.0.0:3000->3000/tcp, 0.0.0.0:9090->9090/tcp
coinpusher-match            Up (healthy)        0.0.0.0:3002->3002/tcp, 0.0.0.0:9091->9091/tcp
coinpusher-room             Up (healthy)        0.0.0.0:3001->3001/tcp, 0.0.0.0:9092->9092/tcp
coinpusher-mongodb          Up (healthy)        0.0.0.0:27017->27017/tcp
coinpusher-dragonflydb      Up (healthy)        0.0.0.0:6379->6379/tcp
coinpusher-prometheus       Up (healthy)        0.0.0.0:9093->9090/tcp
coinpusher-grafana          Up (healthy)        0.0.0.0:3001->3000/tcp
coinpusher-alertmanager     Up (healthy)        0.0.0.0:9094->9093/tcp
```

### 4. 验证服务

```bash
# 检查 Gate Server 健康状态
curl http://localhost:9090/health

# 检查 Match Server
curl http://localhost:9091/health

# 检查 Room Server
curl http://localhost:9092/health
```

### 5. 访问监控面板

**Grafana 仪表板**:
```bash
open http://localhost:3001
# 用户名: admin
# 密码: admin123
```

**Prometheus**:
```bash
open http://localhost:9093
```

### 6. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f gate-server
docker-compose logs -f match-server
docker-compose logs -f room-server
```

---

## 🖥️ 方式二：本地开发模式

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 MongoDB 和 Redis

```bash
# 使用 Docker Compose 只启动数据库
docker-compose up -d mongodb dragonflydb

# 或使用本地安装的服务
# MongoDB: mongod --dbpath ./data
# Redis: redis-server
```

### 3. 配置环境变量

```bash
cp .env.example .env
vim .env
```

### 4. 启动服务器

```bash
# 启动 Gate Server（开发模式）
npm run dev:gate

# 在新终端启动 Match Server
npm run dev:match

# 在新终端启动 Room Server
npm run dev:room
```

### 5. 访问监控端点

```bash
# Gate Server 监控
open http://localhost:9090

# Match Server 监控
open http://localhost:9091

# Room Server 监控
open http://localhost:9092
```

---

## 🧪 验证部署

### 1. 健康检查

```bash
# Gate Server
curl http://localhost:9090/live    # 存活检查
curl http://localhost:9090/ready   # 就绪检查
curl http://localhost:9090/health  # 完整健康检查

# 预期输出（健康）:
{
  "status": "healthy",
  "timestamp": 1733625600000,
  "uptime": 12345,
  "checks": {
    "process": { "status": "up" },
    "memory": { "status": "healthy" },
    "mongodb": { "status": "connected" },
    "dragonflydb": { "status": "connected" }
  }
}
```

### 2. Prometheus 指标

```bash
# 查看所有指标
curl http://localhost:9090/metrics

# 查看特定指标
curl http://localhost:9090/metrics | grep api_requests_total
curl http://localhost:9090/metrics | grep db_queries_total
curl http://localhost:9090/metrics | grep cache_hits_total
```

### 3. 系统信息

```bash
curl http://localhost:9090/info | jq

# 预期输出:
{
  "service": "coin-pusher-gate",
  "version": "1.0.0",
  "uptime": 12345,
  "node": "v20.x.x",
  "environment": "production",
  "memory": { "used": 123456789, "total": 2147483648 },
  "pid": 1
}
```

---

## 🎮 测试游戏功能

### 1. 用户注册/登录

```bash
# 使用 HTTP 客户端测试 API
curl -X POST http://localhost:3000/api/gate/Register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpassword"
  }'
```

### 2. 查看商店商品

```bash
curl -X POST http://localhost:3000/api/gate/GetShopProducts \
  -H "Content-Type: application/json" \
  -d '{ "userId": "user123" }'
```

### 3. 签到

```bash
curl -X POST http://localhost:3000/api/gate/GetSignInInfo \
  -H "Content-Type: application/json" \
  -d '{ "userId": "user123" }'
```

---

## 📊 查看监控数据

### Grafana 仪表板

1. 访问 http://localhost:3001
2. 登录（admin/admin123）
3. 导入仪表板：
   - 点击 `+` → `Import`
   - 上传 `monitoring/grafana-dashboard.json`
   - 选择 Prometheus 数据源

**仪表板包含**:
- API 请求总数（QPS）
- API 响应时间（P50/P95/P99）
- API 错误率
- 数据库查询性能
- 缓存命中率
- 内存使用情况
- 事件循环延迟
- 在线用户数
- 活跃房间数

### Prometheus 查询

访问 http://localhost:9093，尝试以下查询：

```promql
# API 请求速率
rate(api_requests_total[5m])

# P95 响应时间
histogram_quantile(0.95, rate(api_response_time_seconds_bucket[5m]))

# 缓存命中率
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# 在线用户数
online_users

# 数据库 QPS
rate(db_queries_total[5m])
```

---

## 🛑 停止服务

### Docker Compose

```bash
# 停止所有服务（保留数据）
docker-compose stop

# 停止并删除容器（保留数据）
docker-compose down

# 停止并删除所有数据
docker-compose down -v
```

### 本地开发模式

```bash
# 按 Ctrl+C 停止各个服务
# 或使用 PM2
pm2 stop all
```

---

## ⚠️ 常见问题

### Q1: 端口冲突

**问题**: `Error: address already in use`

**解决**:
```bash
# 检查端口占用
lsof -i :3000
lsof -i :9090

# 修改 .env 文件中的端口
GATE_PORT=3100
MONITORING_PORT=9190

# 重启服务
docker-compose down
docker-compose up -d
```

### Q2: MongoDB 连接失败

**问题**: `MongoServerError: Authentication failed`

**解决**:
```bash
# 1. 检查 .env 中的 MongoDB 配置
MONGODB_USER=coinpusher_app
MONGODB_PASSWORD=your-password

# 2. 重建容器
docker-compose down -v
docker-compose up -d
```

### Q3: 健康检查失败

**问题**: 容器状态为 `unhealthy`

**解决**:
```bash
# 查看容器日志
docker-compose logs gate-server

# 检查依赖服务是否正常
docker-compose ps

# 重启服务
docker-compose restart gate-server
```

### Q4: Grafana 无数据

**问题**: 仪表板显示 "No Data"

**解决**:
```bash
# 1. 检查 Prometheus 是否正常
curl http://localhost:9093/-/healthy

# 2. 检查 Prometheus targets
open http://localhost:9093/targets

# 3. 验证服务是否暴露 metrics
curl http://localhost:9090/metrics

# 4. 重新配置 Grafana 数据源
# Grafana → Configuration → Data Sources → Prometheus
# URL: http://prometheus:9090
```

---

## 📚 下一步

- 📖 阅读 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 了解详细部署选项
- 📊 阅读 [MONITORING_GUIDE.md](./MONITORING_GUIDE.md) 了解监控系统详情
- 💾 阅读 [CACHE_USAGE_GUIDE.md](./CACHE_USAGE_GUIDE.md) 了解缓存最佳实践
- 🔧 查看 [DEPLOYMENT_COMPLETED.md](./DEPLOYMENT_COMPLETED.md) 了解完整的优化列表

---

## 🆘 获取帮助

如果遇到问题：

1. 查看日志: `docker-compose logs -f`
2. 检查健康状态: `docker-compose ps`
3. 查看文档: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
4. 提交 Issue: https://github.com/your-repo/issues

---

**祝你使用愉快！ Happy Coding! 🎉**
