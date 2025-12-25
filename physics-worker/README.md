# Rust Room Service - 推币机物理服务器

## 🏗️ 架构概览

```
Cocos Client
   │ WebSocket (TSRPC)
   ▼
Node/TSRPC ──────────────────┐
(Gateway / Match / API)      │  TCP (内部通信)
                             │  Length-Prefix + JSON
                             ▼
                    Rust Room Service
                    (Room + Rapier 3D)
```

## 📦 模块组成

### 核心模块

- **protocol.rs** - 进程间通信协议 (FromNode / ToNode)
- **room/** - 房间管理模块
  - **mod.rs** - RoomManager 管理所有房间
  - **room_state.rs** - 单个房间状态
  - **physics.rs** - Rapier 3D 物理引擎封装
  - **events.rs** - 事件系统（投币、收集等）
- **net.rs** - TCP 网络通信层
- **main.rs** - 主入口（tick 循环）

### 技术栈

- **物理引擎**: Rapier 3D (Native Rust，无 WASM 开销)
- **异步运行时**: Tokio
- **序列化**: serde + serde_json
- **日志**: tracing + tracing-subscriber
- **网络**: TCP + Length-Delimited JSON

## 🚀 运行

### 编译

```bash
cd room-service
cargo build --release
```

### 启动

```bash
# 默认配置
cargo run --release

# 自定义配置
ROOM_SERVICE_ADDR=127.0.0.1:9000 \
TICK_RATE=30 \
RUST_LOG=info \
cargo run --release
```

### 环境变量

- `ROOM_SERVICE_ADDR`: TCP 监听地址 (默认: `127.0.0.1:9000`)
- `TICK_RATE`: 物理 tick 频率 (默认: `30` Hz)
- `RUST_LOG`: 日志级别 (`trace`, `debug`, `info`, `warn`, `error`)

## 📡 协议设计

### Node → Rust (FromNode)

```typescript
type FromNode =
  | { type: 'CreateRoom', room_id, config }
  | { type: 'DestroyRoom', room_id }
  | { type: 'PlayerJoin', room_id, player_id }
  | { type: 'PlayerLeave', room_id, player_id }
  | { type: 'PlayerDropCoin', room_id, player_id, x }
  | { type: 'WalletResult', room_id, player_id, tx_id, ok }
```

### Rust → Node (ToNode)

```typescript
type ToNode =
  | { type: 'Snapshot', room_id, tick, push_z, coins, events }
  | { type: 'NeedDeductGold', room_id, player_id, tx_id, amount }
  | { type: 'RoomClosed', room_id, reason }
```

## 🎮 工作流程

### 1. 房间创建

```
Node → Rust: CreateRoom { room_id, config }
Rust: 初始化 PhysicsWorld (Rapier)
```

### 2. 玩家投币

```
Node → Rust: PlayerDropCoin { room_id, player_id, x }
Rust: 在物理世界中生成硬币（Rapier RigidBody）
```

### 3. 物理模拟 (30Hz)

```
Rust (每 33ms):
  1. 更新推板位置 (Kinematic Body)
  2. Rapier physics.step()
  3. 检测掉落 (Y < -5)
  4. 检测收集 (Z > reward_line_z)
  5. 发送 Snapshot 给 Node
```

### 4. 硬币收集

```
Rust → Node: Snapshot { events: [CoinDroppedToReward { ... }] }
Node: 调用 Gate 加币（幂等性）
Node → 客户端: 广播收集事件
```

## 🔧 性能特性

### 1. **零GC停顿**
- Rust 无垃圾回收，内存管理确定性
- 适合高频 tick (30Hz+)

### 2. **原生 Rapier**
- 无 WASM 开销（vs Node + Rapier WASM）
- 直接调用 Rust native code
- 支持 CCD (连续碰撞检测)

### 3. **固定 Tick**
- 独立于网络 I/O
- 保证物理模拟稳定性
- 支持多房间并行

### 4. **水平扩展**
- 单进程管理多房间
- 房间之间完全独立
- 可部署多个 room-service 实例

## 📊 性能基准（预期）

| 指标 | Node + Rapier WASM | Rust Native |
|------|-------------------|-------------|
| **单房间 CPU** | ~15% (GC抖动) | ~8% (稳定) |
| **200硬币延迟** | 30-50ms | 10-15ms |
| **内存占用** | 120MB | 40MB |
| **GC 停顿** | 5-10ms | 0ms |

## 🔗 Node 端对接

Node端需要实现TCP客户端连接Rust服务：

```typescript
// 伪代码
import net from 'net';

const client = net.connect({ host: '127.0.0.1', port: 9000 });

// 发送创建房间
sendToRust(client, {
  type: 'CreateRoom',
  room_id: 'room_1',
  config: { gravity: -20, ... }
});

// 接收快照
client.on('data', (buf) => {
  const msg = decodeMessage(buf); // Length-prefix + JSON
  if (msg.type === 'Snapshot') {
    // 转发给客户端
    broadcastToClients(msg);
  }
});
```

## 🐛 调试

### 查看详细日志

```bash
RUST_LOG=trace cargo run
```

### 性能分析

```bash
cargo flamegraph --release
```

## 🚧 待完成功能

- [ ] Node 端 TCP 客户端实现
- [ ] 钱包扣费流程集成
- [ ] 多房间负载均衡
- [ ] 心跳保活机制
- [ ] Graceful shutdown

## 📝 未来优化

1. **消息压缩**: JSON → Protobuf/Bincode
2. **Unix Domain Socket**: 本地部署时替换 TCP
3. **增量快照**: 只发送变化的硬币（已在 Node 版本实现）
4. **Room 预热**: 预创建物理世界减少延迟

---

**作者**: Claude Code + GPT 架构设计
**日期**: 2025-12-01
