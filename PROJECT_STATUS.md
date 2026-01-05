# 项目现状（更新：2026-01-03）

路径：`/Users/henryliu/cocos/numeron-world/oops-coinpusher`  
引擎：Cocos Creator 3.8.7 / 后端：TSRPC + Node.js / 缓存：DragonflyDB / DB：MongoDB

## 已完成
- 全量测试（含外部）通过：`SKIP_EXTERNAL=0 node -r ts-node/register ./test/run.ts`（需 Dragonfly 6379、Room 39000 运行中）；Mocha 结束强制退出不再挂住。
- Admin API 自动加载：递归扫描 `src/server/gate/api/admin`，子目录文件自动挂载。
- 排行榜接口接入 Dragonfly：`ApiGetLeaderboard`、`ApiGetUserRank` 读写 `LeaderboardSystemV2`（Sorted Set），返回真实榜单/排名/统计。
- 排行榜分页与奖励发放：支持 page/pageSize 查询，奖励发放落库去重（leaderboard_rewards 索引）。
- 赛季与通行证：`ApiGetSeasonInfo`、`ApiClaimSeasonReward`、`ApiPurchaseBattlePass` 调用 SeasonSystem；加经验 `ApiAddExp` 接入 LevelSystem。
- 商城：热门商品返回列表前3，避免空数组。
- 安全开关：`SecurityMonitor`、`SecurityHeaders` 支持 `*_ENABLED` 环境开关；测试缺省密钥时自动生成临时 `INTERNAL_SECRET_KEY`。
- 前端入口：Main.ts 仅在 DEBUG 清空本地存储并暴露全局单例。
- 新文档快照：`PROJECT_STATUS_2026-01-03.md`。

## 未完成 / 占位
- 工会、好友、签到、任务、成就等接口仍为占位返回，未持久化、未发奖。
- 支付通道（微信/支付宝/PayPal/Sui）尚未对接，仍 TODO。
- 安全告警未接入外部渠道（Slack/PagerDuty/Sentry）；仅本地日志。

## 运行与测试
- 内部用例：`npm run test:internal`（SKIP_EXTERNAL=1）。
- 全量含外部：`npm run test:external`，需本机可访问 Dragonfly `127.0.0.1:6379` 与 Room Service `127.0.0.1:39000`（容器内 9000）；若环境阻止本地 TCP 会报 `EPERM`，请在允许网络的上下文或 docker 网络内运行。
- Dragonfly 性能测试可通过 `RATE_LIMIT_BENCH_CONCURRENCY` 调整，并输出 `tsrpc_server/test-results/dragonfly.json`。
- 测试默认使用临时 `INTERNAL_SECRET_KEY`，**生产/预发必须显式配置强随机密钥**。

## 待改进（建议顺序）
1. 落地工会/好友/签到/任务/成就：存 Mongo/Dragonfly，或在路由层关闭入口。
2. 支付通道对接并加 feature flag，区分未开通与异常。
3. 安全告警接入外部渠道；生产环境设置强随机 `INTERNAL_SECRET_KEY`。
4. 为外部测试增加 teardown（Dragonfly flush、Room destroyRoom）。
5. 同步部署/测试文档到 2026-01-03（端口：Dragonfly 6379，Room 39000）。
