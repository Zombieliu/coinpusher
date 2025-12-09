# 本地启动指南

由于项目代码存在一些 TypeScript 类型错误，暂时建议使用本地开发模式启动，而不是 Docker。

## 前置条件

确保已安装：
- Node.js 20+
- MongoDB (本地或远程)
- Redis/DragonflyDB (本地或远程)

## 快速启动

### 1. 启动 MongoDB（如果使用 Docker）

```bash
docker run -d --name mongodb -p 27017:27017 mongo:7.0.0
```

### 2. 启动 DragonflyDB（如果使用 Docker）

```bash
docker run -d --name dragonflydb -p 6379:6379 docker.dragonflydb.io/dragonflydb/dragonfly
```

### 3. 启动游戏服务器

在三个终端中分别运行：

**终端 1 - Gate Server:**
```bash
npm run dev:gate
```

**终端 2 - Match Server:**
```bash
npm run dev:match
```

**终端 3 - Room Server:**
```bash
npm run dev:room
```

## 监控栈启动（可选）

如果需要 Prometheus + Grafana 监控：

```bash
cd monitoring
docker-compose up -d
```

访问：
- Grafana: http://localhost:3001 (admin/admin123)
- Prometheus: http://localhost:9093

## 生产部署

待代码类型错误修复后，可使用：

### 方案 1: PM2
```bash
pm2 start ecosystem.config.js --env production
```

### 方案 2: Docker Compose
```bash
docker-compose up -d --build
```

## 注意事项

⚠️ **当前 Docker 构建失败的原因**：
- 代码中存在约 100+ 个 TypeScript 类型错误
- 主要涉及业务逻辑、API、数据模型等
- 需要先修复类型错误才能成功构建 Docker 镜像

建议先使用本地开发模式运行和测试功能，类型错误不影响运行时。
