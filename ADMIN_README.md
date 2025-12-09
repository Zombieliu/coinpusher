# 管理后台 - 快速开始

## 🎯 三步启动

### 1. 启动MongoDB

```bash
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

### 2. 创建管理员账号

```bash
npx tsx create-admin.ts
```

会创建账号:
- **用户名**: `admin`
- **密码**: `admin123`

### 3. 启动服务

```bash
# 终端1 - 启动后端
cd tsrpc_server
npm run dev:gate

# 终端2 - 启动前端
cd admin-dashboard
npm run dev
```

### 4. 访问

打开浏览器访问: **http://localhost:3001/login**

### 5. 注入演示数据（可选）

为了让统计图、日志、客服模块快速展示效果，可以在仓库根目录执行：

```bash
pnpm ts-node seed-admin-demo.ts
```

脚本会读取 `test-env.ts` 中的 Mongo URI，自动创建 `admin / admin123` 管理员并写入示例用户、充值订单、在线 Session、审计日志与客服工单。

---

## ✅ 完成情况

### 后端 (19个API)

- ✅ AdminLogin - 管理员登录
- ✅ GetStatistics - 统计数据
- ✅ GetUsers - 用户列表
- ✅ GetUserDetail - 用户详情
- ✅ BanUser - 封禁用户
- ✅ UnbanUser - 解封用户
- ✅ GrantReward - 发放奖励
- ✅ SendMail - 发送邮件
- ✅ GetEvents - 活动列表
- ✅ CreateEvent - 创建活动
- ✅ UpdateEvent - 更新活动
- ✅ DeleteEvent - 删除活动
- ✅ GetConfig - 获取配置
- ✅ UpdateConfig - 更新配置
- ✅ GetConfigHistory - 配置历史
- ✅ RollbackConfig - 回滚配置
- ✅ GetLogs - 日志查询
- ✅ GetNotifications - 获取通知
- ✅ GetLogAnalytics - 日志分析

### 前端 (8个页面)

- ✅ Login - 登录页
- ✅ Dashboard - 数据看板
- ✅ Users - 用户管理
- ✅ Config - 配置管理
- ✅ Events - 活动管理
- ✅ Mails - 邮件系统
- ✅ Logs - 日志查询
- ✅ Analytics - 审计分析

### 业务系统 (4个)

- ✅ AdminUserSystem - RBAC权限系统
- ✅ NotificationSystem - 实时通知
- ✅ MailSystem - 邮件系统
- ✅ MongoDBService - 数据库服务

---

## 🧪 测试

运行完整测试：

```bash
npx tsx test-admin-complete.ts
```

测试会验证所有19个API接口。

---

## 📚 详细文档

- **[启动指南](./ADMIN_START_GUIDE.md)** - 完整的启动说明
- **[功能总结](./ADMIN_COMPLETE_SUMMARY.md)** - 所有功能详情
- **[批量操作](./admin-dashboard/BATCH_OPERATIONS_GUIDE.md)** - 批量操作指南
- **[移动适配](./admin-dashboard/MOBILE_RESPONSIVE_GUIDE.md)** - 移动端适配
- **[审计分析](./admin-dashboard/ANALYTICS_GUIDE.md)** - 日志分析功能

---

## ⚙️ 配置说明

### 后端配置

文件: `tsrpc_server/src/tsrpc/models/ShareConfig.ts`

```typescript
static https = false;      // 开发环境使用HTTP
static security = false;   // 开发环境禁用加密
static json = true;        // 使用JSON协议
```

### 前端配置

文件: `admin-dashboard/lib/api.ts`

```typescript
const API_BASE = 'http://localhost:2000'  // 后端API地址
```

### API 监控埋点

所有新开发的管理后台 API 建议使用 `ApiTimer` + `recordApiError` 记录时延和错误。示例：

```ts
import { ApiTimer, recordApiError } from '../utils/MetricsCollector';

const ENDPOINT = 'admin/MyApi';

export async function ApiMyApi(call: ApiCall<Req, Res>) {
  const timer = new ApiTimer('POST', ENDPOINT);
  let success = false;
  try {
    // ...业务逻辑
    call.succ({ success: true });
    success = true;
  } catch (err: any) {
    recordApiError('POST', ENDPOINT, err?.message || 'unknown');
    call.error(err?.message || 'Internal server error');
  } finally {
    timer.end(success ? 'success' : 'error');
  }
}
```

这样 `/metrics` 中的 `api_response_time_seconds`、`api_errors_total` 指标就会自动包含该接口，方便 Prometheus/Grafana 监控。

---

## 🔧 常见问题

### MongoDB连接失败

```bash
# 检查MongoDB是否运行
docker ps | grep mongodb

# 如果没有，启动它
docker start mongodb
```

### 端口被占用

Gate Server默认端口2000，如需修改:

```typescript
// tsrpc_server/src/module/config/Config.ts
export const Config = {
    gate: {
        port: "2000"  // 改为其他端口
    }
}
```

### 登录失败

确保已创建管理员账号:

```bash
npx tsx create-admin.ts
```

---

## 📊 技术栈

### 后端
- TSRPC 3.4.5
- MongoDB 7.0
- Node.js 18+
- TypeScript 4.7

### 前端
- Next.js 15
- React 18
- Tailwind CSS
- Lucide React

---

## 🎉 快速验证

启动所有服务后，在浏览器开发者工具Console中运行：

```javascript
// 测试登录API
fetch('http://localhost:2000/admin/AdminLogin', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'admin', password: 'admin123'})
})
.then(r => r.json())
.then(console.log)
```

如果返回 `{isSucc: true, res: {...}}` 说明API工作正常！

---

**现在开始使用管理后台吧！** 🚀
