# 🐳 Docker 部署指南

## 快速开始

### 前提条件

- Docker >= 20.10
- Docker Compose >= 2.0
- 8GB+ 可用内存

### 一键启动

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

### 预填演示数据

管理后台的统计图、日志、客服模块需要一定数据才能完整展示。完成容器启动后，可在宿主机执行：

```bash
pnpm ts-node seed-admin-demo.ts
```

脚本会读取 `test-env.ts` 中的 Mongo URI（默认 `mongodb://127.0.0.1:27018/coinpusher_game`），自动创建 `admin / admin123` 管理员并插入示例用户、充值订单、在线 Session、审计日志与客服工单。执行完成后访问 `http://localhost:3003` 即可看到完整演示。

## 服务说明

### 容器列表

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| MongoDB | oops-moba-mongodb | 27017 | 数据库 |
| Gate服务器 | oops-moba-gate | 2000 | 网关和业务逻辑 |
| Match服务器 | oops-moba-match | 3001 | 匹配服务 |
| Room服务器 | oops-moba-room | 3002 | 房间服务 |
| 管理后台 | oops-moba-admin | 3003 | Next.js 管理面板 |

### 健康检查

```bash
# 检查所有服务状态
docker-compose ps

# 检查特定服务健康状态
docker inspect --format='{{.State.Health.Status}}' oops-moba-mongodb
docker inspect --format='{{.State.Health.Status}}' oops-moba-gate

# 访问健康检查端点
curl http://localhost:2000/health
```

所有容器还会在 `MONITORING_PORT` (`9090/9091/9092`) 暴露 `http://localhost:<port>/{live,ready,metrics}`。Prometheus 可直接抓取指标。如果要让新的业务 API 纳入监控，只需在 handler 中引入 `ApiTimer` 与 `recordApiError`（详见 README“监控指标接入”），即会自动在 `/metrics` 下生成对应的延迟与错误率曲线。

## 构建镜像

### 单独构建

```bash
# 构建 Gate 服务器
docker build -f tsrpc_server/Dockerfile.gate -t oops-moba-gate ./tsrpc_server

# 构建管理后台
docker build -f admin-dashboard/Dockerfile -t oops-moba-admin ./admin-dashboard
```

### 使用 Docker Compose 构建

```bash
# 构建所有镜像
docker-compose build

# 强制重新构建
docker-compose build --no-cache

# 构建特定服务
docker-compose build gate-server
```

> 如果只需要更新单个服务，可先在对应目录（如 `admin-dashboard`）执行 `pnpm install && pnpm run build`，再用 `docker-compose build admin-dashboard` 生成新镜像。

## 环境变量

### Gate 服务器

```env
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017
PORT=2000
```

### 管理后台

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://gate-server:2000
PORT=3003
```

## 数据持久化

### 数据卷

- `mongodb_data` - MongoDB 数据
- `mongodb_config` - MongoDB 配置

### 备份数据

```bash
# 备份 MongoDB
docker exec oops-moba-mongodb mongodump --db oops-framework --out /data/backup

# 导出备份
docker cp oops-moba-mongodb:/data/backup ./mongodb-backup

# 恢复数据
docker cp ./mongodb-backup oops-moba-mongodb:/data/backup
docker exec oops-moba-mongodb mongorestore /data/backup
```

## 日志管理

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 实时跟踪日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs gate-server

# 查看最近100行
docker-compose logs --tail=100 gate-server
```

### 日志配置

在 `docker-compose.yml` 中配置日志驱动：

```yaml
services:
  gate-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 扩展服务

### 水平扩展 Room 服务器

```bash
# 启动多个 Room 服务器实例
docker-compose up -d --scale room-server=3

# 查看实例
docker-compose ps room-server
```

## 监控和调试

### 进入容器

```bash
# 进入 Gate 服务器容器
docker exec -it oops-moba-gate sh

# 进入 MongoDB 容器
docker exec -it oops-moba-mongodb mongosh oops-framework
```

### 资源使用

```bash
# 查看资源使用情况
docker stats

# 查看特定容器
docker stats oops-moba-gate
```

## 生产环境配置

### 优化建议

1. **资源限制**

```yaml
services:
  gate-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

2. **重启策略**

```yaml
services:
  gate-server:
    restart: always
    # or
    restart: on-failure:3
```

3. **网络配置**

```yaml
networks:
  oops-moba-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 故障排查

### 常见问题

#### 1. 端口冲突

```bash
# 检查端口占用
lsof -i :2000
lsof -i :3001

# 修改 docker-compose.yml 中的端口映射
ports:
  - "2001:2000"  # 使用其他宿主机端口
```

#### 2. MongoDB 连接失败

```bash
# 检查 MongoDB 容器状态
docker-compose ps mongodb

# 查看 MongoDB 日志
docker-compose logs mongodb

# 测试连接
docker exec oops-moba-mongodb mongosh --eval "db.adminCommand('ping')"
```

#### 3. 服务启动顺序

使用 `depends_on` 和 健康检查：

```yaml
services:
  gate-server:
    depends_on:
      mongodb:
        condition: service_healthy
```

## 更新和维护

### 更新服务

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker-compose build

# 3. 重启服务
docker-compose up -d

# 4. 清理旧镜像
docker image prune -f
```

### 零停机更新

```bash
# 1. 构建新镜像
docker-compose build gate-server

# 2. 滚动更新（需要多实例）
docker-compose up -d --no-deps --build gate-server
```

## 安全建议

1. **不要在生产环境暴露数据库端口**
2. **使用环境变量文件 (.env) 管理敏感信息**
3. **定期更新基础镜像**
4. **使用非 root 用户运行容器**
5. **启用 TLS/SSL**

## 测试脚本

创建测试脚本 `test-docker.sh`:

```bash
#!/bin/bash

echo "🧪 测试 Docker 部署..."

# 启动服务
docker-compose up -d

# 等待服务启动
sleep 30

# 测试 MongoDB
docker exec oops-moba-mongodb mongosh --eval "db.adminCommand('ping')" || exit 1
echo "✓ MongoDB 正常"

# 测试 Gate 服务器
curl -f http://localhost:2000/health || exit 1
echo "✓ Gate 服务器正常"

# 测试管理后台
curl -f http://localhost:3003 || exit 1
echo "✓ 管理后台正常"

echo "🎉 所有服务运行正常！"
```

## 性能优化

### 构建优化

1. **多阶段构建** - 减小镜像大小
2. **层缓存** - 优化构建速度
3. **.dockerignore** - 排除不必要的文件

### 运行优化

1. **使用生产模式** - `NODE_ENV=production`
2. **资源限制** - 防止资源耗尽
3. **健康检查** - 自动重启异常容器

---

**文档版本**: 1.0.0
**最后更新**: 2025-12-03
