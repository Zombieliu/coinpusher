# Railway 自动化链路设计

本文描述如何利用 Railway CLI + npm 脚本实现“本地验证 → 自动化测试 → 一键部署 → 远端数据初始化”的完整流水线。所有命令默认在项目根目录执行。

## 1. 目录结构

```
.railway/           # 环境变量模板 (.env.local -> Railway 变量)
scripts/            # Railway 脚本 (部署/种子数据)
  railway-deploy-all.sh
  railway-seed.sh
package.json        # 根级 npm scripts，封装常用 CLI 调用
```

## 2. 先决条件

1. 安装并登录 Railway CLI：`npm i -g railway`、`railway login`
2. 在项目根执行 `railway link`，绑定到目标 Railway Project
3. 确保仓库已推送到 Git（Railway 构建需要远端仓库）

## 3. 环境变量管理

1. 按 `.railway/env.example` 复制生成 `.railway/env.local`
2. 修改 Gate/Match/Room/Admin 需要的实际地址、密钥
3. 通过脚本注入：`npm run railway:env:push`
4. 如需回写远端配置：`npm run railway:env:pull`（输出到 `.railway/env.sync`）

> Railway 在同一 Project 内共享变量；脚本中 `NEXT_PUBLIC_API_URL`、`MATCH_URL` 等将被 Gate/Room/Admin 共同读取。

## 4. 部署流程

### 4.1 单服务部署

```
npm run railway:deploy:gate
npm run railway:deploy:match
npm run railway:deploy:room
npm run railway:deploy:admin
```

每条命令都会调用 `scripts/railway-deploy-all.sh`，传入相应服务名，并使用 `railway up --service <name> --root <path> --detach` 触发构建与发布。

### 4.2 全量部署

```
npm run railway:deploy:all
```

按 Gate → Match → Room → Admin 顺序依次执行，保证依赖链正确。

### 4.3 本地预检

1. `cd tsrpc_server && npm run build`
2. `cd admin-dashboard && npm run build`
3. 运行核心测试（示例）：`npx tsx test-admin-dashboard.ts`

确保构建与测试通过后再触发部署，可减少远端失败。

## 5. 远端脚本执行

`npm run railway:seed` 会调用 `scripts/railway-seed.sh`，在 Gate 服务容器中执行：

```
npx ts-node initialize-game-data.ts
npx ts-node seed-admin-demo.ts
```

该命令复用远端的 MongoDB 连接配置，用于首轮初始化或演示数据刷新。如需拆分流程，可手动编辑脚本命令串。

## 6. 自动化测试接口

Railway CLI 支持在远端执行任意命令，可用下列方式在部署后回归测试：

```
railway run --service gate --command "cd tsrpc_server && npm run test"
railway run --service gate --command \"cd tsrpc_server && npx tsx test-admin-dashboard.ts\"
```

也可以在 CI 中复用 `npm run test:admin`（示例命令，按需添加到 `package.json`）。

## 7. CI/CD 嵌入示例（GitHub Actions）

```yaml
name: Deploy to Railway
on:
  push:
    branches: [ main ]
    paths:
      - 'tsrpc_server/**'
      - 'admin-dashboard/**'
      - 'scripts/railway-*.sh'
      - 'RAILWAY_AUTOMATION.md'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g railway
      - run: npm run railway:deploy:all
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

> 在 CI 环境中执行脚本前，需要将 `RAILWAY_TOKEN` / `RAILWAY_PROJECT_ID` 写入仓库 Secrets，并提前用 `railway link` 将项目绑定。

## 8. 常见操作速查

| 操作 | 命令 |
| --- | --- |
| 绑定项目 | `npm run railway:link` |
| 上传环境变量 | `npm run railway:env:push` |
| 下载环境变量 | `npm run railway:env:pull` |
| 部署 Gate/Match/Room/Admin | `npm run railway:deploy:<svc>` |
| 部署全部 | `npm run railway:deploy:all` |
| 远端执行初始化脚本 | `npm run railway:seed` |
| 远端运行测试 | `railway run --service gate --command "cd tsrpc_server && npm run test"` |

---
完成上述配置后，Railway CLI + npm 脚本即可覆盖手动部署、远端初始化及 CI/CD 场景，实现“命令行一致、流程可重复”的自动化链路。若未来需要新增服务，只需在 `scripts/railway-deploy-all.sh` 的 `SERVICE_ROOTS` 中追加映射，并补充对应的 npm script 即可。 
