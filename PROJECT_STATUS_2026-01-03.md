# 项目现状快照（2026-01-03）
路径：`/Users/henryliu/cocos/numeron-world/oops-coinpusher`

## 已完成 / 最近落地
- ✅ 外部集成测试全部通过：`SKIP_EXTERNAL=0 node -r ts-node/register ./test/run.ts`（Dragonfly 6379 & Room 39000 正在运行）。
- ✅ 测试退出问题修复：Mocha 结束直接 `process.exit`，不再卡死；缺省 `INTERNAL_SECRET_KEY` 时自动生成临时值。
- ✅ Rust 房间默认端口调整：默认 39000（宿主连接容器映射），日志提示；测试用例同步。
- ✅ 未实现 API 改为可控返回或接入真实逻辑：赛季信息/领奖、赛季通行证购买、加经验、商城热门商品、占位接口全部返回结构化结果（不再抛 5xx）。
- ✅ 排行榜接口已对接 Dragonfly Sorted Set，返回真实榜单/排名/统计；分页完备（page/pageSize/hasNext/total）。
- ✅ 排行榜发奖落地：`leaderboard_rewards` 去重记录，Gate 启动自动 ensureIndexes；新增脚本 `tsrpc_server/scripts/schedule-leaderboard-rewards.ts` 支持 daily/weekly 批量定时创建（env: CRON_MODE/RUN_AT/TOP_N/DB_NAME/MONGO_URI）。
- ✅ 公会/好友/签到/任务/成就接入业务逻辑；好友、任务、签到、成就数据持久化到 Mongo。
- ✅ 灰度与风控强化：Guild/Friend/Task/Achievement/Checkin/Reward 接入 RiskGuard，支持 IP/设备黑名单与 Dragonfly 窗口限流，错误码统一 `risk_blocked_*`/`too_many_requests`；保留 FEATURE_*_ENABLED/PCT 灰度。
- ✅ 安全开关：`SecurityMonitor`、`SecurityHeaders` 增加 `*_ENABLED` 环境开关，便于明确开启/关闭。
- ✅ 商城热门商品：简单按列表前 3 返回，避免空数组。
- ✅ 测试脚本别名：`npm run test:internal`（无外部依赖）、`npm run test:external`（需 Dragonfly + Room）。
- ✅ 索引脚本：`scripts/ensure-mongo-indexes.ts` 为社交/任务/签到/成就/好友申请集合创建索引；Gate 启动自动执行 ensureIndexes。
- ✅ 支付通道开关与错误码收敛：`PAYMENT_*_ENABLED` feature flag，未实现渠道统一返回 `channel_disabled`/`channel_unimplemented`；Stripe 配置校验 + 汇率抓取失败兜底。
- ✅ Admin API 自动发现：递归加载常态化，统计 TS 编译失败与命名警告（当前日志 65 成功/0 失败/1 命名警告），缺失导出将告警。
- ✅ 文档/运营：README_TESTS 说明 CI 产出 `test-results/*.log`；旧日志已清理，仅保留最新运行工件。Gate Docker 镜像重建并重启为最新代码。

## 未完成 / 待完善
- 排行榜：调度脚本已具备，仍需在生产配置 cron/运营档位（多档奖励、前端分页适配、运营配置入口）。
- 风控深化：IP/设备限流已接；仍缺风险分级提示、异常兜底文案、设备指纹/地理指标等高级策略。
- 支付通道（微信/支付宝/PayPal/Sui）：未接真实网关，仍为占位/feature flag。
- 安全告警：未接入外部渠道（Slack/PagerDuty/Sentry 等），仅本地日志。
- Admin API 自动发现：已有失败统计与命名告警，尚未将失败计数上报/告警或阻断 CI。

## 风险与改进建议
1) **排行榜运营**：生产环境需配置 cron/档位，避免与手动发奖重复；奖励配置可按多档拆分并在前端展示分页状态。  
2) **风控深化**：在现有 IP/设备限流基础上增加风险分级提示、设备指纹/地区指标与异常兜底文案；关键动作可接入安全告警。  
3) **支付对接**：按渠道接入沙箱/生产网关，保持 feature flag 与统一错误码；完善 webhook 验证、退款链路。  
4) **安全与告警**：为 SecurityMonitor/SecurityHeaders/风控/支付接入 Slack/PagerDuty/Sentry 告警，生产必须设置强随机 `INTERNAL_SECRET_KEY`。  
5) **Admin API 加载**：将 TS 编译失败/命名告警写入 CI 结果并触发报警，必要时阻断发布。  

## 测试现状
- 快速内测：`npm run test:internal`（SKIP_EXTERNAL=1）20/20 通过。  
- 全量含外部：`npm run test:external` 40/40 通过（需 Dragonfly 6379、Room 39000 可访问）。  
- Dragonfly 性能指标写入 `tsrpc_server/test-results/dragonfly.json`，并发可由 `RATE_LIMIT_BENCH_CONCURRENCY` 调整；RateLimiter 用例已修复断开顺序（先 `flushdb` 后断开）。

## 运行前提（外部测试）
- DragonflyDB 容器：`oops-coinpusher-dragonfly` 暴露 6379，测试环境需允许本机 TCP 访问（避免 `EPERM`）。  
- Room Service 容器：`oops-coinpusher-physics` 暴露 39000→内部 9000，需允许本机 TCP 访问。  
- 生产/预发必须在 `.env` 配置强随机 `INTERNAL_SECRET_KEY`，勿使用默认测试值；避免生产环境清空本地存储（已限制为 DEBUG 执行）。 

## 下一步优先级（建议）
1. 排行榜：在生产落地定时任务（daily/weekly topN），完善运营档位与前端分页展示，避免重复发奖。  
2. 支付：逐渠道接入真实/沙箱网关（微信/支付宝/PayPal/Sui），完善 webhook/退款，并通过 feature flag 控制。  
3. 安全告警：为风控/支付/安全头/Admin Loader 接入 Slack/PagerDuty/Sentry 告警链路。  
4. 风控高级版：增加风险分级提示、设备指纹与异常兜底路径，必要时增加手动审批/验证码。  
5. Admin Loader：将 TS 失败/命名警告计数输出到 CI 并触发报警或阻断发布。  
6. 文档与日志：继续同步渠道开关、错误码与调度脚本用法，在 CI 上传最新 `test-results/*.log`。  
