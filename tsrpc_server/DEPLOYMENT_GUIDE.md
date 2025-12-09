# 🚀 项目部署指南

## 📋 目录

- [项目状态](#项目状态)
- [本地开发启动](#本地开发启动)
- [Docker 容器化部署](#docker-容器化部署)
- [生产环境部署](#生产环境部署)
- [监控系统部署](#监控系统部署)
- [故障排查](#故障排查)

---

## 项目状态

### ✅ 已完成

- ✅ **P0**: TypeScript 编译、Logger 系统、测试框架
- ✅ **P1**: ErrorHandler、数据库优化、111+ 索引
- ✅ **P2**: ESLint/Prettier、CacheManager、API 文档
- ✅ **P3**: Prometheus Metrics、健康检查、告警系统
- ✅ **部分容器化**: 已有 Dockerfile，但缺少完整的 docker-compose

### 🔧 容器化现状

**已有的 Docker 文件**:
- ✅ `Dockerfile` - 通用 Dockerfile
- ✅ `Dockerfile.gate` - Gate Server 专用
- ✅ `Dockerfile.match` - Match Server 专用
- ✅ `Dockerfile.room` - Room Server 专用
- ✅ `monitoring/docker-compose.yml` - 监控栈（Prometheus + Grafana）

**缺少的**:
- ❌ 完整的 `docker-compose.yml` (包含所有服务 + 依赖)
- ❌ 环境变量配置文件 (`.env.example`)
- ❌ Kubernetes 部署配置
- ❌ 容器化启动脚本

---

## 本地开发启动

### 方式 1: 直接运行（推荐开发）

#### 前置条件

1. **Node.js**: v18+ 或 v20
2. **MongoDB**: 运行在 `localhost:27017`
3. **Redis/DragonflyDB**: 运行在 `localhost:6379` (可选)

#### 安装依赖

```bash
cd tsrpc_server
npm install
```

#### 启动服务

```bash
# 启动 Gate Server（网关服务器）
npm run dev:gate
# 访问: http://localhost:2000

# 启动 Match Server（匹配服务器）
npm run dev:match
# 访问: http://localhost:3000

# 启动 Room Server（房间服务器）
npm run dev:room
# 访问: http://localhost:3001

# 启动第二个 Room Server（测试分布式）
npm run dev:room2
# 访问: http://localhost:3002
```

#### 启动监控服务器

```typescript
// 在 ServerGate.ts 中添加
import { MetricsCollector } from './server/utils/MetricsCollector';
import { MonitoringServer } from './server/utils/MonitoringServer';

MetricsCollector.init();
MonitoringServer.start(9090);
```

访问监控端点:
- http://localhost:9090/ - 监控首页
- http://localhost:9090/metrics - Prometheus metrics
- http://localhost:9090/health - 健康检查

---

### 方式 2: PM2 管理（推荐生产）

#### 安装 PM2

```bash
npm install pm2@latest -g
```

#### 启动服务

```bash
# 开发环境
pm2 start ecosystem.config.js --env develop

# 生产环境
pm2 start ecosystem.config.js --env production

# 停止所有服务
pm2 delete all

# 查看日志
pm2 logs

# 查看状态
pm2 status
```

---

## Docker 容器化部署

### 当前 Dockerfile 分析

#### Dockerfile.gate

```dockerfile
FROM node:20-alpine
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 编译
COPY src ./src
COPY tsconfig.json ./
RUN npm install -g typescript && tsc

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:2000/health', ...)"

EXPOSE 2000
CMD ["node", "dist/ServerGate.js"]
```

**问题**:
1. ❌ 使用了 `npm ci --only=production`，但编译需要 devDependencies
2. ❌ 健康检查端点 `/health` 可能不存在
3. ❌ 没有配置环境变量

---

## 完整 Docker Compose 配置

我来创建一个完整的 `docker-compose.yml`，包含所有服务和依赖：

### docker-compose.yml（完整版）

```yaml
version: '3.8'

services:
  # ==================== 基础设施 ====================

  # MongoDB 数据库
  mongodb:
    image: mongo:7.0
    container_name: coin-pusher-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: coin_pusher_game
    volumes:
      - mongodb_data:/data/db
      - ./scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - coin-pusher-network
    restart: unless-stopped

  # DragonflyDB (Redis 替代)
  dragonfly:
    image: docker.dragonflydb.io/dragonflydb/dragonfly:latest
    container_name: coin-pusher-dragonfly
    ports:
      - "6379:6379"
    volumes:
      - dragonfly_data:/data
    networks:
      - coin-pusher-network
    restart: unless-stopped
    command: >
      --logtostderr
      --requirepass=dragonfly123

  # ==================== 业务服务 ====================

  # Gate Server (网关服务器)
  gate-server:
    build:
      context: .
      dockerfile: Dockerfile.gate
    container_name: coin-pusher-gate
    ports:
      - "2000:2000"    # 业务端口
      - "9090:9090"    # 监控端口
    environment:
      NODE_ENV: production
      PORT: 2000
      MONGO_URL: mongodb://admin:admin123@mongodb:27017
      MONGO_DB_NAME: coin_pusher_game
      REDIS_URL: redis://:dragonfly123@dragonfly:6379
      LOG_LEVEL: INFO
      MONITORING_PORT: 9090
    depends_on:
      - mongodb
      - dragonfly
    networks:
      - coin-pusher-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:9090/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      start_period: 40s
      retries: 3

  # Match Server (匹配服务器)
  match-server:
    build:
      context: .
      dockerfile: Dockerfile.match
    container_name: coin-pusher-match
    ports:
      - "3000:3000"
      - "9091:9091"
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGO_URL: mongodb://admin:admin123@mongodb:27017
      MONGO_DB_NAME: coin_pusher_game
      REDIS_URL: redis://:dragonfly123@dragonfly:6379
      MONITORING_PORT: 9091
    depends_on:
      - mongodb
      - dragonfly
    networks:
      - coin-pusher-network
    restart: unless-stopped

  # Room Server (房间服务器)
  room-server:
    build:
      context: .
      dockerfile: Dockerfile.room
    container_name: coin-pusher-room
    ports:
      - "3001:3001"
      - "9092:9092"
    environment:
      NODE_ENV: production
      PORT: 3001
      MONGO_URL: mongodb://admin:admin123@mongodb:27017
      MONGO_DB_NAME: coin_pusher_game
      REDIS_URL: redis://:dragonfly123@dragonfly:6379
      MONITORING_PORT: 9092
    depends_on:
      - mongodb
      - dragonfly
    networks:
      - coin-pusher-network
    restart: unless-stopped

  # ==================== 监控系统 ====================

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: coin-pusher-prometheus
    ports:
      - "9093:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    depends_on:
      - gate-server
      - match-server
      - room-server
    networks:
      - coin-pusher-network
    restart: unless-stopped

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: coin-pusher-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin123
      GF_USERS_ALLOW_SIGN_UP: false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboard.json:/etc/grafana/provisioning/dashboards/dashboard.json
    depends_on:
      - prometheus
    networks:
      - coin-pusher-network
    restart: unless-stopped

  # Alertmanager
  alertmanager:
    image: prom/alertmanager:latest
    container_name: coin-pusher-alertmanager
    ports:
      - "9094:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - coin-pusher-network
    restart: unless-stopped

# 数据卷
volumes:
  mongodb_data:
  dragonfly_data:
  prometheus_data:
  grafana_data:
  alertmanager_data:

# 网络
networks:
  coin-pusher-network:
    driver: bridge
```

---

## 优化后的 Dockerfile

### Dockerfile.gate（优化版）

```dockerfile
# ==================== 构建阶段 ====================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm ci

# 复制源代码
COPY src ./src
COPY tsrpc ./tsrpc

# 编译 TypeScript
RUN npm run build

# ==================== 运行阶段 ====================
FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 2000 9090

# 健康检查（使用新的健康检查端点）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9090/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "dist/ServerGate.js"]
```

---

## 环境变量配置

### .env.example

```bash
# ==================== 服务配置 ====================
NODE_ENV=production
PORT=2000
MONITORING_PORT=9090

# ==================== 数据库配置 ====================
MONGO_URL=mongodb://admin:admin123@localhost:27017
MONGO_DB_NAME=coin_pusher_game

# ==================== Redis 配置 ====================
REDIS_URL=redis://:dragonfly123@localhost:6379

# ==================== 日志配置 ====================
LOG_LEVEL=INFO
LOG_OUTPUT_FILE=true
LOG_FILE_PATH=./logs

# ==================== 安全配置 ====================
INTERNAL_SECRET_KEY=your-secret-key-here-min-32-chars-long

# ==================== 缓存配置 ====================
CACHE_MEMORY_MAX_SIZE=1000
CACHE_DEFAULT_TTL=300

# ==================== 监控配置 ====================
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
```

---

## 部署流程

### 1. 完整容器化部署（推荐）

```bash
# 1. 克隆代码
cd /path/to/project/tsrpc_server

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env 文件，配置环境变量

# 3. 构建并启动所有服务
docker-compose up -d --build

# 4. 查看日志
docker-compose logs -f

# 5. 检查服务状态
docker-compose ps
```

**启动后的服务**:
- Gate Server: http://localhost:2000
- Match Server: http://localhost:3000
- Room Server: http://localhost:3001
- Gate Metrics: http://localhost:9090
- Prometheus: http://localhost:9093
- Grafana: http://localhost:3001 (admin/admin123)
- Alertmanager: http://localhost:9094

### 2. 只启动监控栈

```bash
cd monitoring
docker-compose up -d
```

### 3. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

---

## 生产环境部署

### Kubernetes 部署

#### 1. 创建 Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: coin-pusher-game
```

#### 2. 创建 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coin-pusher-config
  namespace: coin-pusher-game
data:
  NODE_ENV: "production"
  LOG_LEVEL: "INFO"
  MONGO_DB_NAME: "coin_pusher_game"
```

#### 3. 创建 Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: coin-pusher-secret
  namespace: coin-pusher-game
type: Opaque
stringData:
  MONGO_URL: "mongodb://admin:admin123@mongodb:27017"
  REDIS_URL: "redis://:password@dragonfly:6379"
  INTERNAL_SECRET_KEY: "your-secret-key-here"
```

#### 4. 部署 Gate Server

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gate-server
  namespace: coin-pusher-game
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gate-server
  template:
    metadata:
      labels:
        app: gate-server
    spec:
      containers:
      - name: gate
        image: coin-pusher-gate:latest
        ports:
        - containerPort: 2000
          name: http
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: coin-pusher-config
        - secretRef:
            name: coin-pusher-secret
        livenessProbe:
          httpGet:
            path: /live
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 9090
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: gate-server
  namespace: coin-pusher-game
spec:
  selector:
    app: gate-server
  ports:
  - name: http
    port: 2000
    targetPort: 2000
  - name: metrics
    port: 9090
    targetPort: 9090
  type: LoadBalancer
```

---

## 监控系统部署

监控系统已经完全配置好，启动步骤：

```bash
# 进入监控目录
cd monitoring

# 启动监控栈
docker-compose up -d

# 查看日志
docker-compose logs -f grafana
```

**访问**:
- Grafana: http://localhost:3001 (admin/admin123)
- Prometheus: http://localhost:9093
- Alertmanager: http://localhost:9094

---

## 故障排查

### 1. 容器无法启动

```bash
# 查看日志
docker-compose logs gate-server

# 进入容器调试
docker-compose exec gate-server sh
```

### 2. MongoDB 连接失败

```bash
# 检查 MongoDB 是否运行
docker-compose ps mongodb

# 测试连接
docker-compose exec mongodb mongosh -u admin -p admin123
```

### 3. 健康检查失败

```bash
# 访问健康检查端点
curl http://localhost:9090/health

# 查看监控服务器日志
docker-compose logs gate-server | grep Monitoring
```

### 4. 端口冲突

```bash
# 查找占用端口的进程
lsof -i:2000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "2001:2000"  # 改为 2001
```

---

## 性能调优

### Docker 资源限制

```yaml
services:
  gate-server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### MongoDB 优化

```yaml
mongodb:
  command: >
    mongod
    --wiredTigerCacheSizeGB 1.5
    --maxConns 1000
```

---

## 总结

### 当前状态

| 项目 | 状态 | 说明 |
|------|------|------|
| ✅ 基础 Dockerfile | 已有 | 需要优化 |
| ⚠️ docker-compose.yml | 缺少 | 需要创建完整版 |
| ✅ 监控栈 | 完整 | 可直接使用 |
| ⚠️ 健康检查 | 部分 | Dockerfile 中配置，代码需要实现 |
| ❌ K8s 配置 | 缺少 | 需要创建 |
| ❌ .env 配置 | 缺少 | 需要创建 |

### 下一步行动

**立即可做**:
1. 创建 `.env.example` 文件
2. 创建完整的 `docker-compose.yml`
3. 优化 Dockerfile（多阶段构建）

**需要验证**:
4. 确保 MonitoringServer 在各服务中已启动
5. 测试完整的 Docker Compose 启动流程

**需要我现在创建这些缺失的文件吗？**
