# 游戏客户端当前状态（截至 2026-01-04）

## 总览
- 语言：前端运行时可见文案已统一为英文；日志仍可能带少量中文注释。
- 登录与会话：支持本地存储自动登录（localStorage + oops.storage）；支付回跳会保留会话。
- 支付：Stripe 成功/取消回跳改为查询参数，`PaymentService` 允许金币商品并可自动恢复 pending。
- 网络端点：默认 Gate `http://localhost:32000`，Match 回落 `http://localhost:3001`，Room 以服务器返回 URL 为准。

## 最近修复
- **金币不可见**：`mat_lowFriction` 材质缺失导致金币不渲染，已将 `prefab/model/coin.prefab` 与缓存 JSON 替换为现有 `assets/resources/material.mtl`，并在 `GameViewComp` 中添加运行时材质兜底（缺失则 fallback 内置材质）。
- **投币被阻塞**：`_goldSynced` 初始为 false 导致触摸 return，已调整为初始化时同步数值并解锁点击。
- **英文化**：Loading/Login/支付/提示 Toast 等可见文本改为英文；“Buy Coins” 按钮兜底创建。

## 仍在监控 / 待处理
- **Touch plane 缺失日志**：控制台提示 `Touch plane (touchPlane) not found`，当前被设为 inactive，不影响投币。如需可视化触摸提示，需在场景 prefab 补回 touchPlane 节点并启用。
- **浏览器缓存**：若仍出现 `mat_lowFriction` missing，请清除浏览器缓存/重新构建前端，确保新 prefab 生效。
- **材质来源**：当前统一使用 `assets/resources/material.mtl`；若需物理低摩擦效果，可另行提供正确材质后更新引用。

## 操作建议
1. 清缓存后重新构建或热重载前端，再次进场确认铺币与投币落币可见。
2. 触摸平面缺失时会在运行时自动创建并降级为提示日志；如需自定义材质/贴图，可在场景预制补回 `touchPlane` 或替换 `_ensureTouchPlaneAppearance` 的材质。
3. 支付回跳测试：使用 `stripe-success` / `stripe-cancel` 查询参数，确认回跳后能自动确认或取消订单，金币数同步更新。

## 运行日志提示
- 仍看到 `mat_lowFriction` 报错：说明旧 prefab 被缓存；清缓存并重新加载。
- “Offline reward available” 属于信息日志，不弹窗。

## Assets 目录代码问题与待办（核心摘录）
- **缺失节点**：touchPlane 不在 prefab 时已运行时自动创建并应用材质兜底；如需定制，请在场景补回。
- **语言默认值**：默认语言已改为 `en`（InitRes 中设置），避免加载中文资源；如需切换可覆盖 storage `language`。
- **安全附加信息**：登录、投币、支付请求现附带 `fingerprintId + nonce + timestamp`；投币增加 1 秒 10 次的前端节流。
- **网络配置 TODO**：`assets/script/game/config/NetworkConfig.ts` 中 matchUrl 仍标注 “TODO: 替换为真实测试/生产地址”，需按实际环境落地。
- **支付/会话兜底**：`PaymentService` 和自动登录已支持本地存储，但 Room/Gate 端点依赖返回值；在多环境发布前需校验配置。
- **材质依赖**：金币 prefab 现改为 `assets/resources/material.mtl`，如需真实低摩擦材质应提供正确 material 并更新 UUID。
- **特效/性能待办**：`GoodsComp` 留有 TODO（收集特效、对象池回收），需补充以减少实例泄漏。
- **安全/指纹**：`DeviceFingerprintCollector` 的 `cocosVersion` 字段仍 TODO 未填，若要上报设备指纹需补完。
- **完整性校验协议**：`tsrpc/protocols/gate/PtlValidateIntegrity.ts` 中 `missingFiles` 等字段存在但未全量使用；若要做资产完整性校验需在客户端侧调用并补齐上报。
