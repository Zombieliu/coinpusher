# 管理后台启动指南

## ✅ 准备工作已完成

所有必要的文件和配置已经创建完毕：

- ✅ 19个协议文件 (Ptl*.ts)
- ✅ ServiceProto已生成
- ✅ API实现文件 (23个)
- ✅ 前端页面 (8个)
- ✅ 测试脚本
- ✅ 配置文件已更新

## 🚀 启动步骤

### 第一步：启动MongoDB

```bash
# 使用Docker启动MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:7.0

# 验证MongoDB是否运行
docker ps | grep mongodb
```

### 第二步：启动Gate Server

```bash
cd /Users/henryliu/cocos/numeron-world/oops-moba/tsrpc_server
npm run dev:gate
```

你应该看到：
```
✔ 启动本地服务: node -r ts-node/register src/ServerGate.ts
[UserDB] Connected to MongoDB successfully!
Server started at 2000.
[网关服务器] 成功启动
```

### 第三步：启动前端

打开新的终端窗口：

```bash
cd /Users/henryliu/cocos/numeron-world/oops-moba/admin-dashboard
npm run dev
```

访问: http://localhost:3001/login

### 第五步：注入演示数据（可选）

为了让统计图、日志、客服等页面快速有数据展示，可在仓库根目录执行：

```bash
pnpm ts-node seed-admin-demo.ts
```

脚本会读取 `test-env.ts` 中的 Mongo URI（默认 `mongodb://127.0.0.1:27018/coinpusher_game`），自动创建 `admin / admin123` 管理员并写入示例用户、充值订单、在线 Session、审计日志与客服工单。

### 第四步：运行测试（可选）

打开第三个终端窗口：

```bash
cd /Users/henryliu/cocos/numeron-world/oops-moba
npx tsx test-admin-complete.ts
```

## 📋 默认登录信息

**用户名**: `admin`
**密码**: `admin123`

> ⚠️ 注意：首次登录可能会失败，因为数据库中还没有管理员账号。请先创建管理员账号。

## 🔧 创建管理员账号

### 方法1: 使用MongoDB直接插入

```bash
# 连接MongoDB
docker exec -it mongodb mongosh

# 使用数据库
use coin_pusher

# 创建管理员账号
db.admin_users.insertOne({
  adminId: "admin_1",
  username: "admin",
  passwordHash: "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa",  // admin123
  role: "SuperAdmin",
  permissions: ["ViewDashboard", "ViewUsers", "BanUsers", "SendMail", "ManageEvents", "ViewConfig", "UpdateConfig", "ViewLogs", "GrantRewards", "ManageAdmins", "ViewReports", "SystemSettings"],
  status: "active",
  createdAt: Date.now(),
  lastLoginAt: null
})

# 创建会话索引
db.admin_sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })

# 退出
exit
```

### 方法2: 使用API创建（推荐）

创建一个临时脚本：

```typescript
// create-admin.ts
import { MongoClient } from 'mongodb';
import { AdminUserSystem } from './tsrpc_server/src/server/gate/bll/AdminUserSystem';

async function createAdmin() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('coin_pusher');

    const result = await AdminUserSystem.createAdmin(
        'admin',
        'admin123',
        'SuperAdmin'
    );

    console.log('管理员创建成功:', result);
    await client.close();
}

createAdmin();
```

运行：
```bash
npx tsx create-admin.ts
```

## 📱 访问管理后台

### 页面列表

1. **登录页** - http://localhost:3001/login
2. **数据看板** - http://localhost:3001/dashboard
3. **用户管理** - http://localhost:3001/dashboard/users
4. **配置管理** - http://localhost:3001/dashboard/config
5. **活动管理** - http://localhost:3001/dashboard/events
6. **邮件系统** - http://localhost:3001/dashboard/mails
7. **日志查询** - http://localhost:3001/dashboard/logs
8. **审计分析** - http://localhost:3001/dashboard/analytics

## 🧪 测试API

### 使用curl测试

```bash
# 1. 登录
curl -X POST http://localhost:2000/admin/AdminLogin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. 获取统计数据（替换TOKEN）
curl -X POST http://localhost:2000/admin/GetStatistics \
  -H "Content-Type: application/json" \
  -d '{"__ssoToken":"YOUR_TOKEN_HERE"}'
```

### 使用测试脚本

```bash
npx tsx test-admin-complete.ts
```

## ❓ 常见问题

### 1. 后端启动失败 - MongoDB连接错误

**问题**: `connect ECONNREFUSED 127.0.0.1:27017`

**解决**:
```bash
# 启动MongoDB
docker start mongodb
# 或
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

### 2. 前端请求失败 - CORS错误

**问题**: `Access to fetch blocked by CORS policy`

**解决**: 已在 `ShareConfig.ts` 中配置了CORS，确保：
- `ShareConfig.https = false`
- `ShareConfig.json = true`
- `CommonFactory` 中有 `cors: '*'`

### 3. 登录失败 - 管理员不存在

**问题**: `用户名或密码错误`

**解决**: 按照上面"创建管理员账号"部分创建账号

### 4. API路径错误 - Invalid URL path

**问题**: `Invalid URL path: /admin/AdminLogin`

**解决**:
1. 确认协议文件已创建
2. 运行 `npm run proto` 重新生成ServiceProto
3. 重启Gate Server

## 📊 服务状态检查

### 检查MongoDB
```bash
docker ps | grep mongodb
# 应该看到运行中的mongodb容器
```

### 检查Gate Server
```bash
curl http://localhost:2000
# 应该返回数据（即使是错误也说明服务在运行）
```

### 检查前端
```bash
curl http://localhost:3001
# 应该返回HTML内容
```

## 🔄 重启服务

如果遇到问题，按此顺序重启：

```bash
# 1. 停止所有服务
# Gate Server: Ctrl+C
# 前端: Ctrl+C

# 2. 清理（可选）
cd tsrpc_server
rm -rf dist/

# 3. 重新生成协议
npm run proto

# 4. 重新启动
npm run dev:gate

# 5. 启动前端（新终端）
cd ../admin-dashboard
npm run dev
```

## 📈 API 监控接入

服务器会在 `MONITORING_PORT`（默认 9090/9091/9092）暴露 `/metrics`、`/live`、`/ready` 端点。若想让新增 API 出现在 Prometheus 指标中，可在 handler 中引入 `ApiTimer` 与 `recordApiError`：

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

保持 endpoint 命名一致后，`/metrics` 中的 `api_response_time_seconds`、`api_errors_total` 就会自动记录该接口的延迟与错误率。

## 📚 相关文档

- [完整功能总结](./ADMIN_COMPLETE_SUMMARY.md)
- [批量操作指南](./admin-dashboard/BATCH_OPERATIONS_GUIDE.md)
- [移动端适配](./admin-dashboard/MOBILE_RESPONSIVE_GUIDE.md)
- [审计分析指南](./admin-dashboard/ANALYTICS_GUIDE.md)

## 🎉 成功标志

当你看到以下情况时，说明一切正常：

1. ✅ Gate Server显示 "成功启动"
2. ✅ 前端可以访问 http://localhost:3001
3. ✅ 可以打开登录页面
4. ✅ 可以成功登录（创建管理员后）
5. ✅ 可以看到Dashboard数据
6. ✅ 测试脚本全部通过

---

**现在你可以开始使用管理后台了！** 🚀

如有任何问题，请检查上面的常见问题部分或查看日志输出。
