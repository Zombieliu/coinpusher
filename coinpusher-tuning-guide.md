# Coin Pusher 调参速查（挡板、挂边、铺满台面）

> 针对当前诉求：**挡板长度/高度属于哪层？改哪里？铺满台面怎么做？为什么挂边/金币马上没了？** 下面直接给出文件位置、现用数值、原版参考以及修改建议。

## 快速回答
- **挡板（推板）行程、厚度、能不能推到前沿**：归属于 **服务器物理层**。主文件 `physics-worker/src/room/physics.rs`（默认值在 `src/protocol.rs`），备用 TS 版 `tsrpc_server/src/server/room/bll/physics/PhysicsWorld.ts`。视觉大小在 prefab，只影响外观。
- **挂边不掉 / 金币一秒消失**：由 **前缘收集判定**（同上两个物理文件）、**推板行程+深度** 决定；地板长度也会影响。
- **要改挡板**：优先改物理参数（行程、collider 深度、速度）；觉得模型尺寸不对再改 prefab `pushModel`。
- **铺满台面**：调初始铺币网格（范围/步长）＋临时放宽收集阈值，步骤见下文。

---

## 关键文件 & 作用
| 层级 | 主要文件 | 作用 |
| --- | --- | --- |
| 权威物理（Rust） | `physics-worker/src/room/physics.rs`；默认值 `physics-worker/src/protocol.rs` | 推板行程/速度、推板 collider、初始铺币、收集判定 |
| 备用 TS 物理（RUST_ROOM_ENABLED=false 时） | `tsrpc_server/src/server/room/bll/physics/PhysicsWorld.ts` | 与 Rust 同步的降级实现 |
| 前端视觉 | `assets/resources/prefab/ui/game/game.prefab`（`pushModel`/`pushBox`），`assets/script/game/coinpusher/view/GameViewComp.ts`，`bll/PhysicsComp.ts`，`view/GamePanel.ts` | 推板模型外观、金币渲染缩放、本地兜底 30 枚 |

---

## 当前参数 vs 原版参考

| 项目 | **当前值（代码已生效）** | **原版参考**<br/>`/金币推推推_1/assets/scene/main.scene` | 影响 |
| --- | --- | --- | --- |
| 推板行程 (Z) | `push_min_z=-13.97`, `push_max_z=-10.5` | 视觉 pushBox 位置 `z=-7.438`，pushModel `z=-13.93` | 物理推板停在更靠后的位置，前缘最多到 `-6.5`，推不到台前缘 |
| 推板 collider 半尺寸 | `cuboid(4.0, 1.0, 4.0)` → 深度 8 | 原版未明示，视觉板面厚 | 深度偏短，前排容易挂边 |
| 推板速度 | 2.3 m/s | 未知 | 可按体感调整 |
| 初始铺币 | X∈[-3.7,3.7]，Z∈[-6.0,0.68]，步长 1.35，Y=0.17 | 视觉约 30 枚铺满 | 步长偏大时会有空隙 |
| 前缘收集阈值 | `z > -0.3 && |x|<4.2 && y<0.8` | - | 过靠后会把前排初始币删掉 |
| 金币尺寸（渲染） | `COIN_RENDER_SCALE = 1.0` | 视觉金币较大 | 仅视觉；物理半径 0.59，高 0.18 |
| 推板视觉 | prefab `pushModel` scale `(2,2,2)`；代码不再强制缩放 | 同原版 | 视觉一致，物理不同步 |

---

## 要改挡板 / 挂边，改哪块？
1. **物理行程 & 厚度（首选）**  
   - Rust：`physics-worker/src/protocol.rs`（默认值）＋ `physics-worker/src/room/physics.rs`（collider 构建）。  
   - TS 版：`tsrpc_server/src/server/room/bll/physics/PhysicsWorld.ts`。  
   - 建议尝试：`push_min_z=-10.0`, `push_max_z=-6.0`，collider 改为 `cuboid(4.0, 1.0, 6.0)`（深度 12，前缘可到 z≈0）。
2. **前缘收集阈值**  
   - 位置：`step()` 中的 `if z > -0.3 && ...`（Rust/TS 同步）。  
   - 调小到 `-1.0` 可避免开局误删；过大则易掉落。
3. **初始铺币密度**  
   - `create_initial_coins()` 中步长 `GOLD_STEP`、X/Z 范围。步长从 1.35 ↓ 1.0 更接近铺满。
4. **视觉尺寸（只影响看上去）**  
   - 推板模型：`assets/resources/prefab/ui/game/game.prefab` → `pushModel` 缩放/位置。  
   - 金币模型：`PhysicsComp.ts` → `COIN_RENDER_SCALE`。  
   - 不改变物理结果。

---

## 铺满台面操作步骤
1. **密度**：`GOLD_STEP` 改成 1.0（或更小），必要时 X/Z 范围各加 10%。  
2. **防误删**：暂把前缘阈值改为 `z > -1.0`，确认铺满后再回收。  
3. **推得到前沿**：把 `push_max_z` 往前挪到 `-6.0` 左右，collider 半深加到 `6.0`。  
4. **重建并重启房间服务**（见下节）。  
5. **新房验证**：前端 console 看 `[RoomService] Snapshot ... coins=...` 是否 ≥30，观察是否仍挂边。

---

## 常见异常对照
- **金币瞬间没 / coins=0**：前缘阈值过靠后或推板初始就压在币上；放宽阈值或把推板行程前移。  
- **挂边不掉**：推板前缘够不到（行程短/深度浅）或阈值太靠里；加深 collider，`push_max_z` 前移。  
- **挡板看着变小**：仅视觉 prefab 缩放；物理仍按 collider。调整 `game.prefab` 的 `pushModel`。  
- **ParseServerOutputError: coins.N missing id**：服务器快照里有非法 coin；在 Rust/TS 物理打点确认 coin id，全局过滤非数字 id（`RustRoomClient.normalizeCoinState` 已可再加一层过滤）。  

---

## 重启房间服务（Docker）
```bash
# 只重启物理 + room
docker compose up -d --build physics-worker room-server

# 如果要带 gate/match 一起
# docker compose up -d --build
```
改完参数需进“新房间”才能看到效果，老房间保留旧状态。

---

需要我按你的目标数值直接改好并重启，请告诉我期望的：推板行程、推板深度、收集阈值、铺币步长或“完全按原版 pushBox(-7.438) 推到前沿”，我来改代码并帮你重启。
