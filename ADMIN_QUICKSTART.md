# 管理后台快速启动指南

## 前置要求

- Node.js 18+
- MongoDB (运行中)
- DragonflyDB/Redis (运行中)
- TSRPC Gate Server (已配置)

## 第一步: 初始化管理员系统

### 1. 在GateServer启动代码中添加初始化

编辑 `/tsrpc_server/src/server/gate/GateServer.ts` (或者你的主入口文件):

```typescript
import { AdminUserSystem } from './bll/AdminUserSystem';

// 在服务器启动后添加
export class GateServer {
  async start() {
    // ... 现有的启动代码 ...

    // 初始化管理员系统
    console.log('[GateServer] Initializing admin system...');
    await AdminUserSystem.initialize();
    console.log('[GateServer] Admin system initialized');

    // ... 其他初始化代码 ...
  }
}
```

### 2. 启动TSRPC服务器

```bash
cd tsrpc_server
npm run dev
```

你应该看到以下日志:
```
[GateServer] Initializing admin system...
[AdminUserSystem] Default super admin created: admin/admin123
[GateServer] Admin system initialized
```

## 第二步: 启动管理后台前端

### 1. 安装依赖 (如果还未安装)

```bash
cd admin-dashboard
npm install
```

### 2. 配置环境变量 (可选)

创建 `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. 启动开发服务器

```bash
npm run dev
```

前端将在 `http://localhost:3001` 启动

## 第三步: 登录管理后台

1. 打开浏览器访问: `http://localhost:3001/login`

2. 使用默认管理员账号登录:
   - **用户名**: `admin`
   - **密码**: `admin123`

3. 登录成功后将自动跳转到 Dashboard

## 第四步: 修改默认密码 (推荐)

首次登录后，建议立即修改默认密码。

### 方法1: 通过MongoDB直接修改

```javascript
// 连接到MongoDB
use your_database_name

// 修改密码 (这里演示修改为 "newpassword123")
const crypto = require('crypto');
const newPassword = 'newpassword123';
const passwordHash = crypto
  .createHash('sha256')
  .update(newPassword + 'moba_admin_salt')
  .digest('hex');

db.admin_users.updateOne(
  { username: 'admin' },
  { $set: { passwordHash: passwordHash } }
)
```

### 方法2: 使用API (需要先实现修改密码API)

```typescript
import { AdminUserSystem } from './bll/AdminUserSystem';

await AdminUserSystem.changePassword(
  'admin_id',
  'admin123',  // 旧密码
  'newpassword123'  // 新密码
);
```

## 第五步: 创建其他管理员账号

只有超级管理员可以创建其他管理员。在服务器端执行:

```typescript
import { AdminUserSystem, AdminRole } from './bll/AdminUserSystem';

// 创建运营人员账号
await AdminUserSystem.createAdmin(
  'operator1',
  'password123',
  AdminRole.Operator,
  'operator@example.com'
);

// 创建客服账号
await AdminUserSystem.createAdmin(
  'cs1',
  'password123',
  AdminRole.CustomerService,
  'cs@example.com'
);

// 创建数据分析账号
await AdminUserSystem.createAdmin(
  'analyst1',
  'password123',
  AdminRole.Analyst,
  'analyst@example.com'
);
```

或者在MongoDB中直接插入:

```javascript
db.admin_users.insertOne({
  adminId: 'admin_' + Date.now(),
  username: 'operator1',
  passwordHash: '...', // 使用SHA256计算
  role: 'operator',
  email: 'operator@example.com',
  status: 'active',
  createdAt: Date.now()
})
```

## 常见问题

### Q1: 登录后立即跳转回登录页

**原因**: Token未正确保存或页面刷新过快

**解决**:
1. 打开浏览器开发者工具 → Application → Local Storage
2. 检查是否有 `admin_token` 和 `admin_user`
3. 清除浏览器缓存后重试
4. 检查浏览器控制台是否有JavaScript错误

### Q2: API返回 "Unauthorized"

**原因**: Token无效或已过期

**解决**:
1. 重新登录获取新Token
2. 检查Token是否超过24小时
3. 检查MongoDB中的 `admin_sessions` 集合
4. 确认服务器时间正确

### Q3: 找不到默认管理员

**原因**: AdminUserSystem.initialize() 未被调用

**解决**:
1. 检查GateServer启动日志
2. 确认 `AdminUserSystem.initialize()` 被调用
3. 手动在MongoDB中创建管理员账号:

```javascript
db.admin_users.insertOne({
  adminId: 'admin_' + Date.now(),
  username: 'admin',
  passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  role: 'super_admin',
  email: 'admin@example.com',
  status: 'active',
  createdAt: Date.now()
})
```

### Q4: 无法连接到API服务器

**原因**: TSRPC服务器未启动或端口不匹配

**解决**:
1. 确认TSRPC服务器运行在正确端口
2. 检查 `.env.local` 中的 `NEXT_PUBLIC_API_URL`
3. 检查网络防火墙设置
4. 确认CORS配置正确

### Q5: 权限不足错误

**原因**: 当前管理员角色没有该操作权限

**解决**:
1. 查看 `/admin-dashboard/ADMIN_RBAC.md` 了解权限映射
2. 使用超级管理员账号
3. 或修改该管理员的角色:

```javascript
db.admin_users.updateOne(
  { username: 'operator1' },
  { $set: { role: 'super_admin' } }
)
```

## 快速测试

### 测试管理员登录

```bash
curl -X POST http://localhost:3000/admin/AdminLogin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

预期响应:
```json
{
  "isSucc": true,
  "res": {
    "success": true,
    "token": "abc123...",
    "admin": {
      "adminId": "admin_...",
      "username": "admin",
      "role": "super_admin"
    }
  }
}
```

### 测试获取统计数据

```bash
curl -X POST http://localhost:3000/admin/GetStatistics \
  -H "Content-Type: application/json" \
  -d '{
    "__ssoToken": "your_token_here"
  }'
```

### 测试权限控制

尝试用客服账号调用需要超级管理员权限的API，应该返回权限错误。

## 数据库查询

### 查看所有管理员

```javascript
db.admin_users.find({}).pretty()
```

### 查看活跃会话

```javascript
db.admin_sessions.find({
  expiresAt: { $gt: Date.now() }
}).pretty()
```

### 查看最近操作日志

```javascript
db.admin_logs.find()
  .sort({ timestamp: -1 })
  .limit(20)
  .pretty()
```

### 统计各角色管理员数量

```javascript
db.admin_users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
])
```

## 生产环境部署

### 1. 环境变量配置

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
ADMIN_SECRET=your_super_secret_key_here
MONGODB_URI=mongodb://user:pass@host:port/database
```

### 2. 构建前端

```bash
cd admin-dashboard
npm run build
npm run start
```

### 3. 使用PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动TSRPC服务器
cd tsrpc_server
pm2 start npm --name "tsrpc-gate" -- run start

# 启动管理后台
cd admin-dashboard
pm2 start npm --name "admin-dashboard" -- run start

# 保存配置
pm2 save
pm2 startup
```

### 4. Nginx反向代理

```nginx
# API服务器
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 管理后台
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL证书 (推荐)

使用Let's Encrypt免费SSL证书:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.yourdomain.com -d api.yourdomain.com
```

## 监控和日志

### 查看PM2日志

```bash
pm2 logs tsrpc-gate
pm2 logs admin-dashboard
```

### 监控进程状态

```bash
pm2 monit
pm2 status
```

### 数据库监控

```javascript
// MongoDB操作统计
db.admin_logs.aggregate([
  {
    $match: {
      timestamp: { $gte: Date.now() - 24*60*60*1000 }
    }
  },
  {
    $group: {
      _id: "$action",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

## 备份和恢复

### 备份管理员数据

```bash
# 备份admin相关集合
mongodump --db=your_database \
  --collection=admin_users \
  --out=/backup/$(date +%Y%m%d)

mongodump --db=your_database \
  --collection=admin_logs \
  --out=/backup/$(date +%Y%m%d)
```

### 恢复数据

```bash
mongorestore --db=your_database \
  /backup/20250101/your_database/admin_users.bson
```

## 下一步

完成基础设置后，可以:

1. 📊 查看Dashboard统计数据
2. 👥 管理游戏用户
3. 📧 发送系统邮件
4. 📝 查看操作日志
5. 👨‍💼 创建其他管理员账号
6. ⚙️ 配置游戏参数 (待开发)
7. 🎯 管理游戏活动 (待开发)

## 获取帮助

- 权限系统文档: `/admin-dashboard/ADMIN_RBAC.md`
- Phase 1完成总结: `/ADMIN_SYSTEM_PHASE1_COMPLETE.md`
- 问题反馈: 在项目仓库提Issue

## 安全提醒

⚠️ **生产环境安全checklist**:

- [ ] 修改默认管理员密码
- [ ] 使用HTTPS加密传输
- [ ] 设置强密码策略
- [ ] 限制管理后台访问IP
- [ ] 定期审计操作日志
- [ ] 定期备份数据库
- [ ] 启用MongoDB认证
- [ ] 配置防火墙规则
- [ ] 监控异常登录
- [ ] 定期更新依赖包
