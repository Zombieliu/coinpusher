# 🧪 测试指南

本文档介绍如何运行 Rust + Node 混合架构的各类测试。

## 📋 测试类型

### 1. Rust 单元测试

测试 Rust Room Service 的核心功能：
- 物理引擎（Rapier 3D）
- 房间管理
- 硬币生成与移除
- 推板运动
- 事件系统

**运行方式：**

```bash
cd room-service
cargo test
```

**预期输出：**

```
running 16 tests
test room::physics::tests::test_physics_world_creation ... ok
test room::physics::tests::test_spawn_coin ... ok
test room::physics::tests::test_multiple_coins ... ok
test room::physics::tests::test_physics_step ... ok
test room::physics::tests::test_push_platform_movement ... ok
test room::physics::tests::test_coin_removal ... ok
test room::physics::tests::test_coin_collection ... ok
test room::physics::tests::test_push_platform_boundary ... ok
test room::tests::test_room_manager_creation ... ok
test room::tests::test_create_room ... ok
test room::tests::test_destroy_room ... ok
test room::tests::test_multiple_rooms ... ok
test room::tests::test_player_join ... ok
test room::tests::test_drop_coin ... ok
test room::tests::test_tick_generates_snapshots ... ok
test room::tests::test_tick_increments ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**覆盖的测试场景：**

| 测试名称 | 测试内容 |
|---------|---------|
| `test_physics_world_creation` | 物理世界初始化 |
| `test_spawn_coin` | 生成单个硬币 |
| `test_multiple_coins` | 生成多个硬币 |
| `test_physics_step` | 物理步进（重力效果） |
| `test_push_platform_movement` | 推板运动 |
| `test_coin_removal` | 硬币掉落移除 |
| `test_coin_collection` | 硬币收集检测 |
| `test_push_platform_boundary` | 推板边界约束 |
| `test_room_manager_creation` | 房间管理器初始化 |
| `test_create_room` | 创建房间 |
| `test_destroy_room` | 销毁房间 |
| `test_multiple_rooms` | 多房间管理 |
| `test_player_join` | 玩家加入 |
| `test_drop_coin` | 投币流程 |
| `test_tick_generates_snapshots` | 快照生成 |
| `test_tick_increments` | Tick 计数器 |

---

### 2. Node 集成测试

测试 Node.js 与 Rust Room Service 的 TCP 通信。

**前提条件：**

先启动 Rust Room Service：

```bash
cd room-service
cargo run --release
```

**运行测试：**

```bash
cd tsrpc_server
npm test -- test/RustRoomClient.test.ts
```

**覆盖的测试场景：**

- TCP 连接建立
- 创建房间
- 玩家加入/离开
- 投币请求
- 快照接收
- 多硬币测试
- 房间销毁

**预期输出：**

```
  RustRoomClient 集成测试
✅ 连接成功
    ✓ 应该能够连接到 Rust Room Service
✅ 收到快照 tick=1
    ✓ 应该能够创建房间
    ✓ 应该能够通知玩家加入
✅ 硬币已生成: ID=1, Y=9.87
    ✓ 应该能够投币
  快照 1/5: tick=10, coins=1, pushZ=-8.75
  快照 2/5: tick=11, coins=1, pushZ=-8.70
  ...
    ✓ 应该能够接收多个快照
✅ 多个硬币已生成: 4个
    ✓ 应该能够投多个硬币
    ✓ 应该能够通知玩家离开
    ✓ 应该能够销毁房间

  8 passing (3s)
```

---

### 3. 端到端测试（自动化）

一键运行所有测试。

**运行方式：**

```bash
chmod +x test-e2e.sh
./test-e2e.sh
```

**测试流程：**

1. ✅ 检查依赖（Rust、Node.js）
2. 🔨 编译 Rust Room Service
3. 🎯 启动 Rust 服务（后台）
4. 🧪 运行 Rust 单元测试
5. 🧪 运行 Node 集成测试
6. 🧹 清理测试环境

**预期输出：**

```
🚀 开始端到端测试

📦 检查依赖...
✅ 依赖检查通过

🔨 编译 Rust Room Service...
✅ Rust 编译成功

🎯 启动 Rust Room Service...
Rust PID: 12345
✅ Rust Room Service 已启动 (PID: 12345)

🧪 运行 Rust 单元测试...
✅ Rust 单元测试通过 (16/16)

🧪 运行 Node 集成测试...
✅ Node 集成测试通过

🧹 清理测试环境...
✅ 测试环境已清理

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 所有测试通过！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

测试结果：
  ✅ Rust 单元测试: 16/16 通过
  ✅ Node 集成测试: 通过
  ✅ TCP 通信: 正常
  ✅ 物理模拟: 正常

日志文件: /tmp/rust-room-service.log
```

---

### 4. 手动测试（调试用）

使用 Python 脚本直接与 Rust 服务通信。

**运行方式：**

```bash
cd room-service
chmod +x test-manual.sh
./test-manual.sh
```

**测试内容：**

1. 发送 `CreateRoom` 消息
2. 接收 `Snapshot` 快照
3. 发送 `PlayerDropCoin` 消息
4. 验证硬币是否生成

---

## 🔧 故障排查

### 问题 1：Rust 测试失败

**症状：**
```
error: test failed, to rerun pass `--bin room-service`
```

**解决：**

```bash
# 清理并重新编译
cd room-service
cargo clean
cargo test
```

### 问题 2：Node 集成测试连接失败

**症状：**
```
❌ 连接失败: ECONNREFUSED 127.0.0.1:9000
```

**解决：**

确保 Rust Room Service 已启动：

```bash
cd room-service
cargo run --release
```

检查端口是否被占用：

```bash
lsof -i :9000
```

### 问题 3：端到端测试超时

**症状：**
```
未收到快照，房间可能创建失败
```

**解决：**

查看 Rust 日志：

```bash
tail -f /tmp/rust-room-service.log
```

增加测试超时时间（tsrpc_server/test/RustRoomClient.test.ts）：

```typescript
this.timeout(10000); // 10秒
```

---

## 📊 性能基准测试

### 运行 Criterion 基准测试

```bash
cd room-service
cargo bench
```

**测试场景：**

| 基准测试 | 测试内容 |
|---------|---------|
| `physics_step_1_coin` | 单硬币物理步进 (30Hz) |
| `physics_step_multiple_coins` | 多硬币物理步进 (10/50/100/200) |
| `collect_coin_states` | 收集硬币状态序列化 |
| `room_create_destroy` | 房间创建/销毁开销 |
| `room_tick_with_coins` | 完整房间 tick (含快照生成) |
| `json_serialize_snapshot` | JSON 快照序列化 |
| `json_deserialize_drop_coin` | JSON 消息反序列化 |

**预期性能指标（Release 模式）：**

```
physics_step_1_coin          time:   [2.5 ms 3.0 ms 3.5 ms]
physics_step_50_coins        time:   [4.0 ms 5.0 ms 6.0 ms]
physics_step_100_coins       time:   [6.0 ms 8.0 ms 10.0 ms]
physics_step_200_coins       time:   [12.0 ms 15.0 ms 18.0 ms]
collect_coin_states/100      time:   [15 µs 20 µs 25 µs]
room_create_destroy          time:   [50 µs 80 µs 110 µs]
json_serialize_snapshot/100  time:   [80 µs 120 µs 160 µs]
```

**查看 HTML 报告：**

```bash
open room-service/target/criterion/report/index.html
```

---

### 压力测试（并发场景）

模拟真实游戏环境的压力测试：

```bash
cd room-service
chmod +x stress-test.sh
./stress-test.sh
```

**测试配置：**

- **5 个房间**并发运行
- 每个房间 **100 个硬币**
- 总计 **500 个硬币**同时模拟
- 持续运行 **10 秒**

**预期输出：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 压力测试统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  运行时间: 65.23s
  发送消息: 505
  接收消息: 1,523
  快照数量: 1,520
  错误次数: 0
  消息速率: 7.7 msg/s

  最近快照硬币数: 98 (平均)
  快照频率: 29.8 Hz

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 压力测试完成
```

**性能验证：**

- ✅ CPU 占用 < 30%
- ✅ 内存占用 < 200MB
- ✅ 快照频率稳定 ~30Hz
- ✅ 无消息丢失
- ✅ 无崩溃或死锁

---

## 🚀 持续集成（CI）

将 `test-e2e.sh` 集成到 CI 流程：

**GitHub Actions 示例：**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Run E2E Tests
        run: ./test-e2e.sh
```

---

## 📝 编写新测试

### 添加 Rust 单元测试

在 `room-service/src/room/physics.rs` 中：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_feature() {
        // 你的测试代码
        assert_eq!(1 + 1, 2);
    }
}
```

### 添加 Node 集成测试

在 `tsrpc_server/test/` 中创建新文件：

```typescript
import { describe, it } from 'mocha';
import * as assert from 'assert';

describe('新功能测试', () => {
    it('应该...', () => {
        assert.strictEqual(true, true);
    });
});
```

---

**最后更新**: 2025-12-01
