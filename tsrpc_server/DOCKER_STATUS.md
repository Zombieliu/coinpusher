# Docker 容器化状态报告

**更新时间**: 2025-12-08 21:46

---

## ✅ 已完成的工作

### 1. Docker 配置文件
- ✅ `Dockerfile.gate` - Gate Server 多阶段构建
- ✅ `Dockerfile.match` - Match Server 多阶段构建
- ✅ `Dockerfile.room` - Room Server 多阶段构建
- ✅ `docker-compose.yml` - 完整服务编排
- ✅ `.env` - 环境变量配置

### 2. 问题修复历史
- ✅ 修复 `npm ci` 失败 → 改用 `npm install --omit=dev`
- ✅ 添加缺失的 `tsrpc.config.ts` 到 Docker 构建上下文
- ✅ 修复 DragonflyDB 命令行参数错误
- ✅ 增加 DragonflyDB 内存从 2GB → 3GB (满足10线程要求)
- ✅ 修复 package.json 依赖分类 - mongodb 和 ioredis 移至 dependencies
- ✅ Docker 镜像成功构建

### 3. 容器状态
| 服务 | 状态 | 端口 |
|------|------|------|
| MongoDB | ✅ Healthy | 27017 |
| DragonflyDB | ✅ Healthy | 6379 |
| Gate Server | ⚠️ 启动中，但有错误 | 3000, 9090 |
| Match Server | ❌ 重启循环 | 3002, 9091 |
| Room Server | ❌ 重启循环 | 3001, 9092 |
| Prometheus | ❌ 重启循环 | 9093 |
| Grafana | ❌ 端口冲突 | 3001 |

---

## ❌ 当前阻塞问题

### 问题 1: 环境变量命名不一致 (Gate Server)

**错误日志**:
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**根因**:
- 代码使用: `process.env.MONGO_URI`
- Docker Compose 设置: `MONGODB_URI`
- 变量名不匹配导致使用默认值 `localhost:27017`

**修复方案**:
```typescript
// src/ServerGate.ts:22
await UserDB.init(
    process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017",
    // ...
);
```

或统一 docker-compose.yml 中的变量名为 `MONGO_URI`。

---

### 问题 2: 缺少配置文件 (Room Server)

**错误日志**:
```
Error: ENOENT: no such file or directory, open '/app/dist/module/common/table/config/Skill.json'
```

**根因**:
- Room Server 运行时需要 JSON 配置文件
- Dockerfile 只复制了 `src` 目录的 TypeScript 源码
- 编译后的 `.js` 文件在 `/app/dist`，但 JSON 文件不在

**修复方案**:
在所有 Dockerfile 的 builder 阶段添加:
```dockerfile
# 复制配置文件
COPY src/module/common/table/config ./src/module/common/table/config
```

并确保 TypeScript 编译会保留 JSON 文件到 dist 目录，或者在 runner 阶段单独复制:
```dockerfile
# 从源码复制配置文件到 dist
COPY --from=builder /app/src/module/common/table/config /app/dist/module/common/table/config
```

---

### 问题 3: ESM 语法错误 (Match Server)

**错误日志**:
```
SyntaxError: Unexpected token '{'
import { RoomServerManager } from "./RoomServerManager";
       ^
```

**根因**:
- tsconfig.json 配置为 `"module": "commonjs"`
- 但编译输出包含 ESM 的 `import/export` 语法
- 可能是 tsrpc-cli 或某些文件使用了不兼容的配置

**修复方案**:
1. 检查 `tsrpc.config.ts` 的模块配置
2. 确保所有 `.ts` 文件使用 CommonJS 语法（`require/module.exports`）
3. 或者改用 ES Module 并更新 package.json 添加 `"type": "module"`

**临时绕过**:
检查具体哪些文件有问题:
```bash
grep -r "^import {" dist/server/match/
```

---

## 📋 修复步骤

### 步骤 1: 修复环境变量
```bash
# 方案 A: 修改源码
vim src/ServerGate.ts
vim src/ServerMatch.ts
vim src/ServerRoom.ts

# 方案 B: 修改 docker-compose.yml (推荐)
# 将所有 MONGODB_URI 改为 MONGO_URI
```

### 步骤 2: 复制配置文件到 Docker 镜像
```bash
# 编辑三个 Dockerfile
vim Dockerfile.gate
vim Dockerfile.match
vim Dockerfile.room

# 在 runner 阶段添加:
COPY --from=builder /app/src/module/common/table/config /app/dist/module/common/table/config
```

### 步骤 3: 修复 ESM 编译问题
```bash
# 检查 tsrpc.config.ts
cat tsrpc.config.ts

# 确保使用 CommonJS
# 或者检查是否有文件使用了 .mts 扩展名
find src -name "*.mts" -o -name "*.cts"
```

### 步骤 4: 重新构建和启动
```bash
# 停止所有容器
docker-compose down

# 重新构建
docker-compose up -d --build

# 查看日志
docker-compose logs -f gate-server
docker-compose logs -f match-server
docker-compose logs -f room-server
```

---

## 🔧 快速命令

```bash
# 查看所有容器状态
docker-compose ps

# 查看特定服务日志
docker logs coinpusher-gate -f
docker logs coinpusher-match -f
docker logs coinpusher-room -f

# 重启特定服务
docker-compose restart gate-server
docker-compose restart match-server
docker-compose restart room-server

# 完全清理并重建
docker-compose down -v
docker-compose up -d --build
```

---

## 📊 下一步计划

### 高优先级 (P0)
1. ✅ 修复 DragonflyDB 健康检查 - **已完成**
2. ✅ 修复依赖包分类问题 - **已完成**
3. ⏳ 修复环境变量命名
4. ⏳ 添加配置文件到 Docker 镜像
5. ⏳ 修复 ESM/CommonJS 编译问题

### 中优先级 (P1)
6. 验证所有服务正常启动
7. 测试服务间通信
8. 验证数据库连接
9. 验证缓存连接

### 低优先级 (P2)
10. 启动监控栈（Prometheus, Grafana）
11. 配置日志收集
12. 运行集成测试

---

**维护者**: DevOps Team
**最后更新**: 2025-12-08 21:46
