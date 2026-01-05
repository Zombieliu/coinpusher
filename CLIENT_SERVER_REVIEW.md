# Client & Server Code Review (snapshot 2026-01-04)

> 说明：本次在有限时间内重点抽查了关键路径文件，未逐行覆盖全部源码。以下结论基于现有可见实现与日志；如需全量逐行审阅，请留更长时间窗口。

## 客户端（assets）
- **初始化 / 语言**
  - 默认语言已改为 `en`（InitRes），避免加载中文包；语言存储仍依赖 localStorage，可按需改为显式环境变量。
  - Loading / Login / Payment 文案已英文化。
- **UI / 触摸**
  - `touchPlane` 缺失时现自动创建并套兜底材质；如需特定贴图请在场景补回节点。
  - 投币交互增加 1 秒 10 次节流；仍依赖金数量同步标记 `_goldSynced`，必要时可在进入房间后强制同步一次金币。
- **材质 / 资源**
  - 金币 prefab 原引用 `mat_lowFriction` 缺失，已替换为 `assets/resources/material.mtl` 并运行时兜底；若需真实低摩擦材质请提供正确 material 并更新 UUID。
- **安全 / 指纹**
  - `DeviceFingerprintCollector` 补齐 cocosVersion 采集并缓存；新增 `SecurityUtil` 统一生成 `fingerprintId + nonce + timestamp`。
  - Gate Login、Room DropCoin、支付创建/确认均携带上述安全字段；需服务端放行额外参数。
- **网络配置**
  - `NetworkConfig.ts` 中测试/生产 matchUrl 仍有 TODO 注释；需按环境落地。
- **支付**
  - Stripe 成功/取消回跳通过 query 参数，支持自动恢复 pending；支付按钮有点击禁用逻辑，建议继续配合服务端速率限制。
- **待办与风险**
  - `GoodsComp` TODO（收集特效、对象池回收）未完成，可能导致实例积累。
  - 设备指纹仅客户端采集，未见与后端联动策略；需服务端校验/风控策略配合。

## 服务端（tsrpc_server）概览
> 仅结构与关键入口快速检查，未逐文件深读。
- **结构**：`ServerGate.ts` / `ServerMatch.ts` / `ServerRoom.ts` 三大入口；`module/` 下为业务模块，`types/` / `tsrpc/` 为协议定义。
- **部署**：多份 Dockerfile（gate/match/room）与 docker-compose；monitoring、logs 目录存在，说明有基础观测集成。
- **安全**：有 `Security` 模块与 TLS 证书文件（nginx.crt/key）；需确认生产是否使用环境注入而非仓库内证书。
- **测试**：`test/` 与 `test-results` 存在；之前提及 `test:internal 20/20`、`test:external 40/40`，但当前未复跑。
- **待确认风险**
  - 协议已补充接受 `fingerprintId/nonce/timestamp`（BaseRequest 与 Login/DropCoin/支付相关协议更新），但服务端尚未消费，可考虑落入风控/日志。
  - 日志与监控：存在 monitoring 目录，但未核实是否接入外部告警（用户提醒“安全告警尚未接入外部渠道”）。
  - 支付、房间 teardown：需确保 Dragonfly flush / Room destroyRoom 在集成测试后执行（先前 TODO）。

## 快速行动清单
1) 后端协议放行：在 Gate / Room / Payment 接口接受并记录 `fingerprintId/nonce/timestamp`，至少做到“忽略未知字段不报错”。
2) NetworkConfig 落地真实测试/生产端点，避免自动登录指向错误环境。
3) 提供正式金币材质（若需低摩擦效果），更新 UUID，移除兜底警告。
4) 完成 `GoodsComp` 的特效/对象池回收，防止长时间运行内存占用。
5) 补充触摸平面资源（如需要特定视觉），避免每次动态创建。
6) 视需要启用服务端速率限制与重放防护（利用客户端 nonce/timestamp；协议已接受字段，可直接落服务端逻辑）。

## 备注
- 未全量逐行审阅；若需精细到文件/行的完整评审，请分阶段（如按模块：登录、支付、物理、房间、监控）安排更长时间窗口。 
