## OOPS CoinPusher

OOPS CoinPusher 是一个基于 **Cocos Creator + oops-framework + TSRPC** 打造的推币机游戏整体解决方案。仓库同时包含客户端、TSRPC 网关/匹配/房间服务、Next.js 管理后台、Docker/监控配置以及 Railway 自动化脚本，开箱即可用于学习或二次开发。

## 技术与环境

| 模块 | 技术栈 |
| --- | --- |
| 客户端 | Cocos Creator 3.8.7、TypeScript、oops-framework |
| 服务器 | TSRPC、Node.js 20、MongoDB、DragonflyDB/Redis |
| 房间物理 | Rust + Rapier3D |
| 管理后台 | Next.js 15、React 18、Tailwind、Zustand |
| 运维 | Docker Compose、Prometheus + Grafana + Alertmanager、Railway 部署脚本 |

## 项目结构（节选）

```
oops-coinpusher/
├── assets/                     # 客户端资源与脚本（玩法、UI、Web3/Discord 集成等）
├── tsrpc_server/               # 网关/匹配/房间 Node 服务（TSRPC）
│   ├── src/server/gate/api     # 游戏与 Admin API
│   ├── src/server/utils        # 监控、安全、日志、Session 管理
│   └── scripts                 # 协议、部署、数据初始化脚本
├── room-service/               # Rust 房间逻辑（Rapier3D）
├── admin-dashboard/            # Next.js 管理后台（统计/运营/财务/审计）
├── docker-compose*.yml         # 本地 Docker 与监控栈
├── scripts/railway-*.sh        # Railway 自动化部署/种子脚本
└── RAILWAY_AUTOMATION.md       # Railway 链路说明
```

更多细节可参见 `PROJECT_STATUS.md`、`PROJECT_COMPLETENESS_LATEST.md`、`FINAL_COMPLETION_REPORT.md` 等文档。

## 核心特性

- **玩法系统**：推币物理模拟、投币节奏控制、奖励掉落、Jackpot、签到、任务、成就、背包、离线奖励、区块链/Discord 扩展等，全部封装在共享 ECS 架构中。
- **后端微服务**：Gate（认证/业务）、Match（匹配调度）、Room（实时房间）三段式，支持 HTTPS/WSS、限流、请求签名、风控、审计日志，Prometheus 自动暴露 API 指标。
- **管理后台**：RBAC 权限、审计、公告、邮件、配置热更新、财务报表、CDK、活动、批量操作等 20+ 模块，已完成 UI 与 API；`npm run build` 即可产出。
- **运维/监控**：提供 Docker Compose、Prometheus/Grafana/Alertmanager 配置及 `ApiTimer`、`recordApiError` 封装，可快速接入自定义指标；`prometheus/grafana-dashboard.json` 为预置看板。
- **自动化**：根目录新增 Railway 脚本和 `RAILWAY_AUTOMATION.md`，可一键推送环境变量、部署 Gate/Match/Room/Admin、在远端运行数据脚本、嵌入 CI/CD。

## 快速开始

1. **安装依赖**
   ```bash
   npm install
   cd tsrpc_server && npm install
   cd ../admin-dashboard && npm install
   ```

2. **本地启动**
   ```bash
   # MongoDB / Dragonfly / Prometheus 等
   docker-compose up -d

   # 网关 / 匹配 / 房间
   cd tsrpc_server
   npm run dev:gate
   npm run dev:match
   npm run dev:room

   # 管理后台
   cd ../admin-dashboard
   npm run dev
   ```

3. **初始化演示数据**
   ```bash
   pnpm ts-node seed-admin-demo.ts
   ```
   该脚本会读取 `test-env.ts` 指定的 Mongo URI，创建 `admin/admin123` 管理员并写入演示数据，方便在管理后台查看统计/日志等模块。

## Railway 自动化（可选）

- `npm run railway:login` / `npm run railway:link`：绑定 Railway 项目
- `npm run railway:env:push` / `npm run railway:env:pull`：批量同步环境变量（模板见 `.railway/env.example`）
- `npm run railway:deploy:<gate|match|room|admin|all>`：调用 `scripts/railway-deploy-all.sh` 依次 `railway service <name> && railway up --detach .`
- `npm run railway:seed`：在远端 Gate 容器执行 `initialize-game-data.ts + seed-admin-demo.ts`

完整说明见 `RAILWAY_AUTOMATION.md`，包含 CI 集成示例和常用命令速查。

### Docker / Railway 部署提示

- `tsrpc_server/Dockerfile` 采用多阶段构建，默认启动 `ServerGate.js`，并委托 `docker/entrypoint.sh` 根据 `SERVER_ENTRY` 环境变量选择入口文件。在部署 Match/Room 服务时，只需设置 `SERVER_ENTRY=ServerMatch` 或 `SERVER_ENTRY=ServerRoom` 即可复用同一镜像。
- 默认对外端口 `2000`，可通过 `PORT` 环境变量覆盖（Railway/容器平台会自动映射）。
- 构建时自动执行 `npm install && npm run build && npm prune --production`，无需额外步骤；若需要自定义 Node 版本，可传入 build arg `NODE_VERSION`。

## 监控指标扩展

在任意 TSRPC API 中引入 `ApiTimer`、`recordApiError`，即可自动把延迟/错误率写入 `/metrics`。Grafana 预置板位于 `prometheus/grafana-dashboard.json`，导入后可查看 Gate/Match/Room 全链路指标。若需要更多业务监控，可参考 `tsrpc_server/src/server/utils/MetricsCollector.ts` 扩展自定义 Gauge/Counter。
