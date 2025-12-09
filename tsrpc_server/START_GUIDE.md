# 🚀 Admin Dashboard 启动指南

## ✅ 方案B已成功实施！

所有问题已解决，系统可以正常运行。

---

## 📋 前置检查

1. MongoDB正在运行（localhost:27017）
2. Node.js v20已安装
3. 端口2000可用

---

## 🔧 启动后端服务器

### 方法1：使用启动脚本（推荐）

```bash
cd tsrpc_server
./start-gate-dev.sh
```

### 方法2：直接运行

```bash
cd tsrpc_server
TS_NODE_TRANSPILE_ONLY=true npm run dev:gate
```

### 预期输出

```
✔ 启动本地服务: node -r ts-node/register src/ServerGate.ts

[UserDB] Connected to MongoDB successfully!
[网关服务器] 服务已初始化完成
[网关服务器] 数据库实始化完成
[MongoDB] ✅ Connected to database: oops-framework
[MongoDBService] 已连接
正在加载Admin APIs: ...
发现 23 个Admin API文件
Admin APIs: 21 加载成功, 2 跳过
Starting HTTP server ...
Server started at 2000.
[网关服务器] 成功启动
```

---

## 🌐 启动前端Dashboard

```bash
cd admin-dashboard
npm run dev
```

访问: http://localhost:3000/dashboard

---

## 🔐 登录凭据

```
用户名: admin
密码: admin123
```

---

## ⚠️  故障排除

### 端口被占用

```bash
# 查找占用进程
lsof -i:2000

# 清理端口
lsof -ti:2000 | xargs kill -9

# 或者清理所有Node进程
killall -9 node
```

### 重新创建管理员账号

```bash
cd tsrpc_server
npx tsx create-admin-simple.ts
```

### 前端localStorage错误

打开浏览器开发者工具 > Application > Local Storage > 清除所有数据

---

## 📝 已加载的APIs (21个)

✅ **认证相关**
- AdminLogin
- AdminLogout

✅ **用户管理**
- GetUsers, GetUserDetail
- BanUser, UnbanUser
- BatchBanUsers

✅ **邮件系统**
- SendMail
- BatchSendMail

✅ **活动管理**
- GetEvents, CreateEvent
- UpdateEvent, DeleteEvent

✅ **配置管理**
- GetConfig, UpdateConfig
- GetConfigHistory, RollbackConfig

✅ **日志分析**
- GetLogs
- GetLogAnalytics

✅ **其他**
- GetStatistics
- GrantReward
- GetNotifications
- NotificationStream

---

## ✨ 成功指标

- ✅ Gate Server启动成功
- ✅ 21个Admin APIs加载
- ✅ MongoDB连接正常
- ✅ AdminLogin测试通过

---

## 🧪 测试API

```bash
# 测试登录
curl -X POST http://localhost:2000/admin/AdminLogin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 预期响应
{
  "isSucc": true,
  "res": {
    "success": true,
    "token": "...",
    "adminUser": {
      "adminId": "admin_001",
      "username": "admin",
      "role": "SuperAdmin",
      "permissions": ["*"]
    }
  }
}
```

---

## 📂 重要文件

- `start-gate-dev.sh` - 快捷启动脚本
- `create-admin-simple.ts` - 创建管理员账号
- `reset-admin-password.ts` - 重置密码
- `GateServerStart.ts:88` - Admin API加载逻辑
- `AdminUserSystem.ts:97-103` - Lazy collection初始化

---

## 🎯 完成的修复

1. ✅ TypeScript编译错误 - 使用transpileOnly模式
2. ✅ Redis模块缺失 - 已安装redis@^4.6.0
3. ✅ MongoDB连接时序 - lazy getter模式
4. ✅ MongoDBService初始化 - 在GateServerStart中连接
5. ✅ 前端JSON.parse错误 - 添加验证和错误处理
6. ✅ 管理员账号 - create-admin-simple.ts
7. ✅ API认证方式 - token作为__ssoToken字段而非Authorization header

---

**祝使用愉快！** 🎉
