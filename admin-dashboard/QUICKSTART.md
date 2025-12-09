# 🚀 运营后台快速启动指南

## 一、环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

## 二、安装步骤

### 1. 安装依赖
```bash
cd admin-dashboard
npm install
```

预计安装时间：2-3分钟

### 2. 配置环境变量（可选）
创建 `.env.local` 文件：
```bash
# 后端API地址（默认localhost:3000）
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. 启动开发服务器
```bash
npm run dev
```

服务将运行在：**http://localhost:3001**

## 三、访问后台

打开浏览器访问：
```
http://localhost:3001
```

自动跳转到：`http://localhost:3001/dashboard`

## 四、功能说明

### ✅ 已实现功能
1. **数据看板** `/dashboard`
   - 实时统计数据展示
   - DAU/MAU/收入等关键指标

2. **用户管理** `/dashboard/users`
   - 用户列表（分页、搜索）
   - 封禁/解封
   - 发放奖励

3. **邮件系统** `/dashboard/mails`
   - 单人/批量/全服邮件
   - 邮件模板
   - 奖励附件

4. **配置管理** `/dashboard/config`
   - 游戏参数配置（待完善）

5. **活动管理** `/dashboard/events`
   - 活动列表（待完善）

6. **日志查询** `/dashboard/logs`
   - 日志筛选查询（待完善）

### 🔄 页面状态说明

- ✅ **完整功能**: 数据看板、用户管理、邮件系统
- 🚧 **基础框架**: 配置管理、活动管理、日志查询（UI完成，逻辑待实现）

## 五、后端对接

### 方式一：自动代理（推荐）
后台已配置自动代理到 `http://localhost:3000`

无需额外配置，只需确保TSRPC服务器运行在3000端口

### 方式二：修改API地址
在 `.env.local` 中修改：
```bash
NEXT_PUBLIC_API_URL=http://your-server:port
```

## 六、需要实现的后端API

后台会调用以下管理员API（需要在TSRPC服务器中实现）：

### 1. 统计数据
```typescript
POST /admin/GetStatistics
返回: { dau, mau, newUsers, totalRevenue, arpu, ... }
```

### 2. 用户管理
```typescript
POST /admin/GetUsers
参数: { page, limit, search, status }

POST /admin/BanUser
参数: { userId, reason, duration }

POST /admin/UnbanUser
参数: { userId }

POST /admin/GrantReward
参数: { userId, rewards: { gold, tickets, ... } }
```

### 3. 邮件系统
```typescript
POST /admin/SendMail
参数: {
  type: 'single' | 'batch' | 'broadcast',
  userIds?: string[],
  title: string,
  content: string,
  rewards?: any,
  expireAt?: number
}
```

### 4. 配置管理
```typescript
POST /admin/GetConfig
POST /admin/UpdateConfig
```

### 5. 活动管理
```typescript
POST /admin/GetEvents
POST /admin/CreateEvent
POST /admin/UpdateEvent
POST /admin/DeleteEvent
```

### 6. 日志查询
```typescript
POST /admin/GetLogs
参数: { type, startTime, endTime, userId, page, limit }
```

## 七、后端API实现示例

在 `tsrpc_server/src/server/gate/api/admin/` 目录下创建管理员API：

```typescript
// ApiGetStatistics.ts
import { ApiCall } from "tsrpc";

export async function ApiGetStatistics(call: ApiCall<any, any>) {
  // 验证管理员权限
  if (!isAdmin(call.req.__ssoToken)) {
    call.error('Unauthorized');
    return;
  }

  // 返回统计数据
  call.succ({
    dau: 1234,
    mau: 12345,
    newUsers: 123,
    totalRevenue: 50000,
    arpu: 4.05,
    payRate: 0.08,
    onlinePlayers: 234,
    totalMatches: 5678,
  });
}
```

## 八、开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

## 九、目录结构

```
admin-dashboard/
├── app/                      # Next.js 15 App Router
│   ├── dashboard/           # 后台页面
│   │   ├── layout.tsx       # 主布局（侧边栏+顶栏）
│   │   ├── page.tsx         # 数据看板
│   │   ├── users/           # 用户管理
│   │   ├── mails/           # 邮件系统
│   │   ├── config/          # 配置管理
│   │   ├── events/          # 活动管理
│   │   └── logs/            # 日志查询
│   ├── layout.tsx           # 根布局
│   └── globals.css          # 全局样式
├── lib/
│   ├── api.ts               # API客户端
│   └── utils.ts             # 工具函数
├── components/ui/           # UI组件
├── package.json
└── README.md
```

## 十、常见问题

### Q1: 无法连接到后端？
**A:** 检查TSRPC服务器是否运行在3000端口
```bash
cd tsrpc_server
npm run dev:gate
```

### Q2: 页面样式错乱？
**A:** 清除缓存重启
```bash
rm -rf .next
npm run dev
```

### Q3: 用户数据不显示？
**A:** 确保后端已实现 `admin/GetUsers` API

### Q4: 邮件发送失败？
**A:** 确保后端已实现 `admin/SendMail` API 和 `MailSystem`

## 十一、下一步计划

- [ ] 完善配置管理逻辑
- [ ] 完善活动管理逻辑
- [ ] 完善日志查询逻辑
- [ ] 添加图表库（Recharts）
- [ ] 实现实时推送
- [ ] 添加权限系统
- [ ] 移动端适配

## 十二、技术支持

遇到问题？
1. 查看控制台错误信息
2. 检查网络请求
3. 查看后端日志

---

**享受你的运营后台！** 🎉
