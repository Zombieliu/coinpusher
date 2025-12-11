# 管理后台端到端测试体系

## 目标
- 覆盖核心管理员操作（认证、关键业务流程）确保跨浏览器稳定。
- 提供可重复执行的本地/CI 测试脚本，减少上线前的手工回归成本。
- 为后续扩展（更多场景、数据准备、可观察性）预留清晰结构。

## 技术栈
- **Playwright**：`@playwright/test`，内置多浏览器执行与断言能力。
- **Next.js Dev Server**：由 Playwright `webServer` 钩子自动启动 `npm run dev`。
- **TypeScript**：通过 `playwright.config.ts` 和 `tests/e2e/*.spec.ts` 书写测试。

## 目录结构
```
admin-dashboard/
├─ tests/
│  └─ e2e/
│     ├─ login.spec.ts          # 认证
│     ├─ dashboard.spec.ts      # 总览卡片
│     ├─ analytics.spec.ts      # 基础/高级分析
│     ├─ announcements.spec.ts  # 公告管理
│     └─ finance-refund.spec.ts # 退款处理
├─ playwright.config.ts       # 基础配置、项目列表、webServer
├─ package.json (test:e2e)    # npm run test:e2e
└─ E2E_TEST_PLAN.md           # 本文件
```

## 运行方式
1. 安装依赖：`pnpm install`（或 `npm install`，已包含 `@playwright/test`）。
2. 运行全量：`npm run test:e2e`
   - 默认启动 dev server（端口 3003）。若已有外部环境，可设置 `E2E_BASE_URL=https://...` 以复用并跳过本地监听。
   - 生成 `playwright-report/`，可用 `npx playwright show-report`.
3. 指定浏览器或单测示例：
   - `npx playwright test tests/e2e/login.spec.ts --project=chromium`
   - `E2E_BASE_URL=https://admin.xxx.com npx playwright test`
4. CI 建议：
   - 预装浏览器：`npx playwright install --with-deps`.
   - 设 `CI=1`，启用重试与禁用 server 复用。
   - 已在 `.github/workflows/playwright-e2e.yml` 中配置 GitHub Actions：自动 `pnpm install`、安装浏览器并运行 `pnpm run test:e2e`，失败时上传 `playwright-report/`。

## 当前覆盖
| 测试文件 | 场景 |
| --- | --- |
| `login.spec.ts` | 表单登录、token 落地与跳转 |
| `dashboard.spec.ts` | 核心指标卡片正常渲染 |
| `analytics.spec.ts` | 基础审计与高级运营 Tab 数据展示 |
| `announcements.spec.ts` | 公告列表加载、发布、上下架/删除 |
| `batch-mail.spec.ts` | 批量邮件/奖励下发（文件上传 + 确认流程） |
| `batch-ban.spec.ts` | 批量封禁（文本解析 + 原因/时长配置） |
| `finance-orders.spec.ts` | 财务订单列表筛选、状态切换 |
| `finance-refund.spec.ts` | 退款列表展示 + 批准流程（含确认对话） |
| `support.spec.ts` | 客服工单回复、关闭 |
| `auth-guard.spec.ts` | 未登录访问敏感页面时的重定向 |
| `cdk.spec.ts` | CDK 生成弹窗、结果展示与禁用操作 |

## 编写规范
### 网络拦截
- 避免真实写操作，建议使用 `page.route` mock 掉关键接口（示例见 `login.spec.ts`）。
- 如果必须访问后端，使用专门的测试环境并通过 `E2E_BASE_URL` 指定。

### 选择器与可维护性
- 使用 `getByRole`/`getByLabel` 等语义化 API，减少由于 DOM 改动导致的失效。
- 将常用交互封装为 helper（后续可在 `tests/e2e/utils.ts` 中扩展）。

### 数据准备
- 复杂流程可在测试前调用后端「测试专用 API」或脚本（未来可扩展 seed hooks）。
- 暂无数据库自动回滚能力，CI 场景需使用独立环境或隔离账号。

## 后续路线
| 优先级 | 工作项 | 说明 |
| --- | --- | --- |
| P0 | 登录 / 公告 / 财务退款全链路用例 | 覆盖最常用的后台操作按钮 |
| P1 | 数据构造辅助工具 | 例如创建测试公告、订单的 API wrapper |
| P1 | CI 集成 | 在主仓库 pipeline 中执行 `npm run test:e2e` 并归档报告 |
| P2 | 视觉回归 / 截图 diff | 依赖 Playwright trace + snapshot |

通过以上体系，可以在保持开发速度的同时保证基础体验稳定。如果需要进一步自动化（如多租户测试、mock 网关等），可在 `tests/e2e` 下引入自定义 fixtures。***
