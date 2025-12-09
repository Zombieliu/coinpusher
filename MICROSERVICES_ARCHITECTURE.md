# 🏗️ 微服务架构设计方案

**设计日期**: 2025-12-01
**目标**: 将物理计算分离，实现可水平扩展的微服务架构

---

## 📊 当前架构 vs 新架构

### 当前架构（单体）
```
客户端
  ↓
Gateway + Room (物理计算在同一进程)
  ↓
DragonflyDB / MongoDB
```

**问题**:
- ❌ 物理计算阻塞网络I/O
- ❌ 单个 Room 服务器崩溃影响所有房间
- ❌ 无法独立扩展物理计算能力
- ❌ 最大容量 ~80 CCU per server

### 新架构（微服务）
```
客户端
  ↓
[负载均衡器]
  ↓
Gateway Service (无状态，纯转发)
  ↓
Message Queue (DragonflyDB Stream)
  ↓
Physics Worker Pool (多实例，物理计算)
  ↓
State Manager (房间状态管理)
  ↓
DragonflyDB / MongoDB
```

**优势**:
- ✅ 物理计算与网络I/O分离
- ✅ 可独立扩展每个服务
- ✅ 故障隔离（单个 Worker 挂掉不影响整体）
- ✅ 容量可达 **5,000-10,000 CCU**

---

## 🎯 微服务划分

### 1. Gateway Service (网关服务)
**职责**:
- 接收客户端连接（WebSocket / HTTP）
- 用户认证和会话管理
- 请求路由和转发
- 限流和安全防护
- 响应聚合

**特点**:
- ✅ **无状态**，可水平扩展
- ✅ 不执行业务逻辑
- ✅ 纯转发，低延迟

**容量**: 单实例 5,000-10,000 连接

**技术栈**:
- Node.js + TSRPC
- DragonflyDB (限流 + 会话存储)
- WebSocket (实时通信)

---

### 2. Physics Worker Service (物理计算服务)
**职责**:
- 执行物理模拟计算（Rapier3D）
- 处理投币、碰撞、收集逻辑
- 生成物理帧数据

**特点**:
- ✅ **有状态**（每个 Worker 管理多个房间）
- ✅ CPU 密集型
- ✅ 可根据负载动态扩展

**容量**: 单实例 20-30 个房间（80-120 CCU）

**技术栈**:
- Node.js + Rapier3D
- Worker Threads (多线程)
- 消息队列通信

---

### 3. Room State Manager (房间状态管理)
**职责**:
- 维护房间元数据（玩家列表、房间配置）
- 房间创建/销毁
- 玩家加入/离开
- 房间数据持久化

**特点**:
- ✅ 轻量级，无物理计算
- ✅ 可水平扩展
- ✅ 与 Physics Worker 协同工作

**容量**: 单实例管理 1,000+ 房间

---

### 4. Match Service (匹配服务)
**职责**:
- 玩家匹配逻辑
- 房间分配
- 负载均衡

**特点**:
- ✅ 独立服务
- ✅ 可选（如果不需要匹配可省略）

---

### 5. User Service (用户服务)
**职责**:
- 用户数据管理
- 钱包/积分/道具
- 欺诈检测和设备指纹

**特点**:
- ✅ 独立数据库
- ✅ 可水平扩展

---

## 🔄 通信协议设计

### 消息队列（基于 DragonflyDB Stream）

#### 1. 客户端请求流
```
Client → Gateway → Queue(physics:requests) → Physics Worker
                                                ↓
Client ← Gateway ← Queue(physics:results) ←─────┘
```

#### 2. 消息格式
```typescript
// 请求消息
interface PhysicsRequest {
    requestId: string;      // 请求ID
    roomId: string;         // 房间ID
    userId: string;         // 用户ID
    action: string;         // 操作类型: drop_coin / collect / etc
    payload: any;           // 操作参数
    timestamp: number;      // 时间戳
}

// 响应消息
interface PhysicsResponse {
    requestId: string;      // 对应的请求ID
    roomId: string;
    success: boolean;
    data?: any;             // 结果数据
    error?: string;         // 错误信息
    timestamp: number;
}

// 物理帧广播
interface PhysicsFrame {
    roomId: string;
    frameId: number;
    timestamp: number;
    coins: Array<{
        id: number;
        x: number;
        y: number;
        z: number;
        rotation?: Quaternion;
    }>;
    collected: number[];    // 被收集的硬币ID
    removed: number[];      // 被移除的硬币ID
}
```

#### 3. Redis Stream 配置
```typescript
// 请求队列
const REQUEST_STREAM = 'physics:requests';

// 结果队列（按房间分组）
const RESULT_STREAM_PREFIX = 'physics:results:';

// 广播流（房间状态更新）
const BROADCAST_STREAM = 'physics:broadcast';
```

---

## 🏛️ 详细架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端                               │
│                  (Web / Native App)                         │
└────────────┬────────────────────────────────────────────────┘
             │ WebSocket / HTTP
             ↓
┌────────────────────────────────────────────────────────────┐
│               Nginx / Traefik (负载均衡)                    │
└────────────┬───────────────────────────────────────────────┘
             │
    ┌────────┼────────┬────────┐
    ↓        ↓        ↓        ↓
┌─────────────────────────────────────────┐
│     Gateway Service (多实例)            │
│  ┌─────────────────────────────────┐   │
│  │ • 认证                           │   │
│  │ • 限流 (DragonflyRateLimiter)   │   │
│  │ • 请求路由                       │   │
│  │ • WebSocket 管理                 │   │
│  └─────────────────────────────────┘   │
└──────────┬──────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│     DragonflyDB (消息队列 + 缓存)        │
│  ┌──────────────────────────────────┐   │
│  │ • Stream (消息队列)               │   │
│  │ • Pub/Sub (广播)                 │   │
│  │ • Hash (会话/房间状态)           │   │
│  │ • Sorted Set (排行榜)            │   │
│  └──────────────────────────────────┘   │
└──────────┬───────────────────────────────┘
           │
    ┌──────┼──────┬──────┬──────┐
    ↓      ↓      ↓      ↓      ↓
┌─────────────────────────────────────────┐
│   Physics Worker Pool (多实例)          │
│  ┌─────────────────────────────────┐   │
│  │ Worker 1: Room 1-20             │   │
│  │ Worker 2: Room 21-40            │   │
│  │ Worker 3: Room 41-60            │   │
│  │ ...                             │   │
│  │                                 │   │
│  │ 每个 Worker:                    │   │
│  │ • Rapier3D 物理引擎             │   │
│  │ • 30 FPS 更新循环               │   │
│  │ • 处理投币/碰撞/收集            │   │
│  └─────────────────────────────────┘   │
└──────────┬──────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│    State Manager (房间状态)              │
│  ┌──────────────────────────────────┐   │
│  │ • 房间元数据                     │   │
│  │ • 玩家列表                       │   │
│  │ • 房间分配                       │   │
│  └──────────────────────────────────┘   │
└──────────┬──────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│         MongoDB (持久化存储)             │
│  • 用户数据                              │
│  • 交易记录                              │
│  • 设备指纹                              │
└──────────────────────────────────────────┘
```

---

## 🔀 核心流程

### 流程1: 玩家投币

```
1. Client: 点击"投币"按钮
   ↓
2. Gateway:
   - 验证会话
   - 限流检查 (DragonflyRateLimiter)
   - 生成 requestId
   ↓
3. Gateway → DragonflyDB Stream:
   XADD physics:requests *
     requestId=xxx
     roomId=room_123
     userId=user_456
     action=drop_coin
     payload={x:0}
   ↓
4. Physics Worker:
   - XREADGROUP 获取消息
   - 执行物理计算: world.dropCoin(x)
   - 获取硬币ID和初始位置
   ↓
5. Physics Worker → DragonflyDB:
   XADD physics:results:room_123 *
     requestId=xxx
     success=true
     data={coinId:789, x:0, y:5, z:-6}
   ↓
6. Gateway:
   - 订阅 physics:results:room_123
   - 收到响应
   ↓
7. Client ← Gateway:
   WebSocket 推送: {coinId:789, position:{x,y,z}}
```

**延迟分析**:
- Gateway → Stream: ~1ms
- Worker 处理: ~2ms
- Stream → Gateway: ~1ms
- **总延迟: ~4-5ms** ✅

### 流程2: 物理帧同步

```
Physics Worker (每33ms):
1. world.step(1/30)  // 物理更新
2. 收集变化的硬币状态
3. XADD physics:broadcast *
     roomId=room_123
     frameId=1234
     coins=[{id,x,y,z}...]
     collected=[coinId1, coinId2]

Gateway (订阅广播):
1. XREAD BLOCK 100 STREAMS physics:broadcast $
2. 解析帧数据
3. 向该房间的所有客户端广播:
   WebSocket.broadcast(roomId, frameData)
```

**频率**: 30 FPS = 每33ms一次

---

## 📦 服务部署配置

### Docker Compose 配置

```yaml
version: '3.8'

services:
  # 负载均衡器
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - gateway1
      - gateway2

  # Gateway 服务 (多实例)
  gateway1:
    build: ./gateway
    environment:
      - PORT=3000
      - DRAGONFLY_HOST=dragonfly
      - REDIS_URL=redis://dragonfly:6379
    depends_on:
      - dragonfly

  gateway2:
    build: ./gateway
    environment:
      - PORT=3000
      - DRAGONFLY_HOST=dragonfly
      - REDIS_URL=redis://dragonfly:6379
    depends_on:
      - dragonfly

  # Physics Worker (多实例)
  physics-worker1:
    build: ./physics-worker
    environment:
      - WORKER_ID=worker1
      - DRAGONFLY_HOST=dragonfly
      - MAX_ROOMS=20
    depends_on:
      - dragonfly

  physics-worker2:
    build: ./physics-worker
    environment:
      - WORKER_ID=worker2
      - DRAGONFLY_HOST=dragonfly
      - MAX_ROOMS=20
    depends_on:
      - dragonfly

  physics-worker3:
    build: ./physics-worker
    environment:
      - WORKER_ID=worker3
      - DRAGONFLY_HOST=dragonfly
      - MAX_ROOMS=20
    depends_on:
      - dragonfly

  # State Manager
  state-manager:
    build: ./state-manager
    environment:
      - DRAGONFLY_HOST=dragonfly
      - MONGODB_URL=mongodb://mongo:27017/game
    depends_on:
      - dragonfly
      - mongo

  # DragonflyDB (消息队列 + 缓存)
  dragonfly:
    image: docker.dragonflydb.io/dragonflydb/dragonfly
    ports:
      - "6379:6379"
    command:
      - --maxmemory=8gb
      - --snapshot_cron=0 */6 * * *
    volumes:
      - dragonfly_data:/data

  # MongoDB (持久化)
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  # Prometheus (监控)
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  # Grafana (可视化)
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - prometheus

volumes:
  dragonfly_data:
  mongo_data:
```

---

## 📈 容量规划

### 单集群配置

| 服务 | 实例数 | 单实例容量 | 总容量 |
|-----|--------|-----------|--------|
| Gateway | 3 | 5,000 连接 | 15,000 连接 |
| Physics Worker | 10 | 20 房间 | 200 房间 |
| State Manager | 2 | 1,000 房间 | 冗余 |
| DragonflyDB | 1 | 100K ops/s | 充足 |

**总容量**: 200房间 × 4人 = **800 CCU**

### 扩展方案

**目标 5,000 CCU**:
- Gateway: 10 实例
- Physics Worker: 60 实例 (1,250房间)
- State Manager: 3 实例
- DragonflyDB: 3节点集群（Sentinel）

---

## 🔒 高可用设计

### 1. 服务故障转移
```
Physics Worker 挂掉:
  → State Manager 检测到心跳丢失
  → 将该 Worker 的房间重新分配给其他 Worker
  → 从 DragonflyDB 恢复房间状态
  → 继续游戏（玩家无感知）
```

### 2. 消息队列持久化
```typescript
// 使用 Redis Stream 的 MAXLEN 控制内存
XADD physics:requests MAXLEN ~ 10000 * ...

// 消费组保证消息至少被处理一次
XREADGROUP GROUP workers consumer1 ...
XACK physics:requests workers msgId
```

### 3. 状态快照
```typescript
// 每分钟保存房间状态到 DragonflyDB
setInterval(() => {
    const snapshot = room.serialize();
    redis.hset(`room:${roomId}:snapshot`, snapshot);
}, 60000);
```

---

## 🎯 实施步骤

### 阶段1: 基础架构 (1周)
- [x] 设计架构方案
- [ ] 实现 Physics Worker 独立服务
- [ ] 实现消息队列通信
- [ ] 本地测试验证

### 阶段2: Gateway 改造 (1周)
- [ ] 将 Gateway 改为无状态
- [ ] 实现请求转发逻辑
- [ ] 实现 WebSocket 广播

### 阶段3: 服务发现和负载均衡 (3天)
- [ ] 实现 Worker 注册/注销
- [ ] 实现房间分配算法
- [ ] 负载均衡策略

### 阶段4: 部署和测试 (1周)
- [ ] Docker 镜像构建
- [ ] K8s / Docker Compose 部署
- [ ] 压力测试
- [ ] 监控和告警

---

## 🚀 预期收益

| 指标 | 当前 | 优化后 | 提升 |
|-----|------|--------|------|
| 单服务器容量 | 80 CCU | 不适用 | - |
| 集群容量 | 800 CCU (10台) | **5,000 CCU** (60 Worker) | 6.25x |
| 故障影响范围 | 整个服务器 | 单个 Worker (20房间) | 隔离度提升 |
| 扩展灵活性 | 需重启 | 动态扩缩容 | ∞ |
| 延迟 | 0ms (本地) | ~5ms (队列) | 可接受 |

---

**下一步**: 开始实现 Physics Worker Service

