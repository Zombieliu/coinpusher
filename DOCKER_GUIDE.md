# 🐳 Docker 部署指南

本指南提供了使用 Docker 部署 OOPS-MOBA 项目的完整说明。

## ✅ 验证结果

**Docker 配置状态**: ✓ 已验证
**最后验证时间**: 2025-12-04
**配置文件版本**: Docker Compose v2

### 已验证的组件

- ✅ Docker Compose 配置文件有效
- ✅ 所有 Dockerfile 文件完整
  - `tsrpc_server/Dockerfile.gate` - Gate 服务器
  - `tsrpc_server/Dockerfile.match` - Match 服务器
  - `tsrpc_server/Dockerfile.room` - Room 服务器
  - `admin-dashboard/Dockerfile` - 管理后台
- ✅ 网络配置正确
- ✅ 数据卷配置正确
- ✅ 健康检查配置完整

## 📦 服务架构

```
┌─────────────────────────────────────────┐
│         管理后台 (3003)                  │
│       admin-dashboard                    │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│        Gate 服务器 (2000)                │
│         gate-server                      │
└────────────┬────────────────────────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
┌──────────┐  ┌──────────────┐
│  Match   │  │    Room      │
│ (3001)   │  │   (3002)     │
└────┬─────┘  └──────┬───────┘
     │               │
     └───────┬───────┘
             ↓
    ┌─────────────────┐
    │    MongoDB      │
    │    (27017)      │
    └─────────────────┘
```

## 🚀 快速开始

### 1. 启动所有服务

```bash
# 后台启动所有服务
docker-compose up -d

# 查看启动日志
docker-compose logs -f
```

### 2. 仅启动特定服务

```bash
# 仅启动 MongoDB
docker-compose up -d mongodb

# 启动 Gate 服务器（会自动启动 MongoDB）
docker-compose up -d gate-server

# 启动管理后台（会自动启动依赖服务）
docker-compose up -d admin-dashboard
```

### 3. 查看服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs -f gate-server
docker-compose logs -f mongodb

# 查看资源使用情况
docker-compose top
```

### 4. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（慎用！）
docker-compose down -v
```

## 🔧 服务详情

### MongoDB (数据库)

- **端口**: 27017
- **容器名**: oops-moba-mongodb
- **镜像**: mongo:7.0
- **数据持久化**:
  - `mongodb_data` - 数据库文件
  - `mongodb_config` - 配置文件
- **健康检查**: 每10秒检查一次

**连接方式**:
```bash
# 从宿主机连接
mongosh mongodb://localhost:27017/oops-framework

# 从容器内连接
docker exec -it oops-moba-mongodb mongosh
```

### Gate 服务器 (网关)

- **端口**: 2000
- **容器名**: oops-moba-gate
- **功能**:
  - 用户认证
  - 70+ 游戏 API
  - 23 个管理 API
  - 业务逻辑处理
- **依赖**: MongoDB
- **健康检查**: HTTP GET /health

### Match 服务器 (匹配)

- **端口**: 3001
- **容器名**: oops-moba-match
- **功能**: 玩家匹配逻辑
- **依赖**: Gate 服务器, MongoDB

### Room 服务器 (房间)

- **端口**: 3002
- **容器名**: oops-moba-room
- **功能**: 游戏房间管理和战斗逻辑
- **依赖**: Match 服务器, MongoDB

### Admin Dashboard (管理后台)

- **端口**: 3003
- **容器名**: oops-moba-admin
- **框架**: Next.js 15
- **功能**: 游戏管理后台
- **依赖**: Gate 服务器
- **访问**: http://localhost:3003

## ⚙️ 环境变量配置

### 通用配置

所有服务都支持以下环境变量：

```yaml
NODE_ENV=production          # 运行环境
MONGODB_URI=mongodb://...    # MongoDB 连接字符串
PORT=xxxx                    # 服务端口
```

### 自定义配置

创建 `.env` 文件来覆盖默认配置：

```bash
# .env 文件示例
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/oops-framework
ADMIN_SECRET=your-secret-key
```

然后在 docker-compose.yml 中引用：

```yaml
services:
  gate-server:
    env_file:
      - .env
```

## 📊 监控和维护

### 查看日志

```bash
# 实时查看所有服务日志
docker-compose logs -f

# 查看特定服务的最近100行日志
docker-compose logs --tail=100 gate-server

# 仅显示错误日志
docker-compose logs | grep -i error
```

### 重启服务

```bash
# 重启单个服务
docker-compose restart gate-server

# 重启所有服务
docker-compose restart
```

### 进入容器调试

```bash
# 进入 Gate 服务器容器
docker exec -it oops-moba-gate sh

# 进入 MongoDB 容器
docker exec -it oops-moba-mongodb sh
```

### 清理和重建

```bash
# 停止并删除所有容器
docker-compose down

# 删除镜像并重新构建
docker-compose build --no-cache

# 完全清理（包括数据卷）
docker-compose down -v
docker system prune -a
```

## 🔍 故障排查

### 问题 1: 端口被占用

**错误**: `Error: bind: address already in use`

**解决**:
```bash
# 查找占用端口的进程
lsof -i:2000
lsof -i:3001

# 终止进程
kill -9 <PID>
```

### 问题 2: MongoDB 连接失败

**错误**: `MongoServerError: connection refused`

**解决**:
```bash
# 检查 MongoDB 是否启动
docker-compose ps mongodb

# 查看 MongoDB 日志
docker-compose logs mongodb

# 重启 MongoDB
docker-compose restart mongodb
```

### 问题 3: 服务构建失败

**错误**: `Error: failed to build`

**解决**:
```bash
# 清理缓存重新构建
docker-compose build --no-cache gate-server

# 检查 Dockerfile 语法
docker-compose config
```

### 问题 4: 内存不足

**错误**: `Error: JavaScript heap out of memory`

**解决**: 在 docker-compose.yml 中增加内存限制：

```yaml
services:
  gate-server:
    deploy:
      resources:
        limits:
          memory: 2G
```

## 🔒 生产环境建议

### 1. 安全配置

```yaml
# 使用环境变量文件存储敏感信息
# 不要将 .env 文件提交到版本控制
services:
  mongodb:
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
```

### 2. 数据备份

```bash
# 备份 MongoDB 数据
docker exec oops-moba-mongodb mongodump --out /backup

# 复制备份到宿主机
docker cp oops-moba-mongodb:/backup ./mongodb-backup
```

### 3. 日志管理

```yaml
services:
  gate-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 资源限制

```yaml
services:
  gate-server:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 5. 使用外部 MongoDB

对于生产环境，建议使用独立的 MongoDB 实例：

```yaml
services:
  gate-server:
    environment:
      MONGODB_URI: mongodb://production-mongodb:27017/oops-framework
    # 移除 depends_on mongodb
```

## 📈 性能优化

### 1. 使用多阶段构建

已在 Dockerfile 中实现，分离构建和运行环境。

### 2. 启用健康检查

Gate 服务器已配置健康检查，确保服务正常运行。

### 3. 网络优化

所有服务在同一个 Docker 网络中，内部通信延迟低。

## 🎯 下一步

1. **初始化数据库**
   ```bash
   # 等待服务启动后
   npm run init-data
   ```

2. **创建管理员账号**
   ```bash
   npm run create-admin
   ```

3. **访问管理后台**
   - 打开浏览器访问: http://localhost:3003
   - 使用创建的管理员账号登录

4. **集成监控系统**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

## 📚 相关文档

- [项目主文档](README.md)
- [快速开始指南](QUICK_REFERENCE.md)
- [微服务架构](MICROSERVICES_ARCHITECTURE.md)
- [管理后台指南](ADMIN_QUICKSTART.md)

## 🆘 获取帮助

- 查看日志: `docker-compose logs -f`
- 检查状态: `docker-compose ps`
- 验证配置: `docker-compose config`

---

**最后更新**: 2025-12-04
**验证状态**: ✅ 已通过验证
**Docker 版本**: 27.5.1
**Docker Compose 版本**: 2.37.3
