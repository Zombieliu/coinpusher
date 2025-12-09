# 🎮 Oops MOBA 运营后台

基于 **Next.js 15** + **shadcn/ui** + **TypeScript** 构建的游戏运营管理系统

---

## 📋 功能模块

### ✅ 已实现
1. **数据统计看板** - 实时数据监控
   - 用户统计（DAU/MAU/新增/流失）
   - 收入统计（总收入/ARPU/付费率）
   - 游戏数据（在线人数/对局数/热力图）

2. **用户管理** - 完整的用户CRUD
   - 用户列表（分页/搜索/筛选）
   - 用户详情（基本信息/游戏数据/充值记录）
   - 用户操作（封禁/解封/重置密码/发放奖励）

3. **游戏配置管理** - 游戏参数配置
   - 抽奖配置（概率/奖池/保底）
   - 商城配置（商品/价格/限购）
   - 等级配置（经验曲线/奖励）
   - 活动配置（时间/条件/奖励）

4. **邮件系统** - 邮件发送工具
   - 单人邮件
   - 批量邮件
   - 全服邮件
   - 邮件模板
   - 奖励发放

5. **活动管理** - 运营活动
   - 活动列表
   - 创建/编辑活动
   - 活动数据统计
   - 活动开关控制

6. **日志查询** - 系统日志
   - 操作日志
   - 登录日志
   - 交易日志
   - 异常日志

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd admin-dashboard
npm install
```

### 2. 配置环境变量
创建 `.env.local` 文件：
```bash
# 后端API地址
NEXT_PUBLIC_API_URL=http://localhost:3000

# 管理员密钥
ADMIN_SECRET=your-admin-secret-key
```

### 3. 启动开发服务器
```bash
npm run dev
```

访问：http://localhost:3001

### 4. 构建生产版本
```bash
npm run build
npm start
```

---

## 📁 项目结构

```
admin-dashboard/
├── app/                    # Next.js 15 App Router
│   ├── dashboard/         # 主面板页面
│   │   ├── page.tsx      # 数据统计
│   │   ├── users/        # 用户管理
│   │   ├── config/       # 配置管理
│   │   ├── events/       # 活动管理
│   │   ├── mails/        # 邮件系统
│   │   └── logs/         # 日志查询
│   ├── layout.tsx         # 根布局
│   └── globals.css        # 全局样式
├── components/            # React组件
│   ├── ui/               # shadcn/ui组件
│   ├── dashboard/        # Dashboard组件
│   └── layout/           # 布局组件
├── lib/                   # 工具函数
│   ├── utils.ts          # 通用工具
│   └── api.ts            # API客户端
├── hooks/                 # 自定义Hooks
├── types/                 # TypeScript类型
└── public/                # 静态资源
```

---

## 🎨 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5
- **UI库**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS 3
- **图表**: Recharts
- **状态管理**: Zustand
- **日期**: date-fns
- **图标**: lucide-react

---

## 🔌 API对接

后台通过以下方式对接TSRPC服务器：

### 方式一：Next.js API Route代理
```typescript
// next.config.mjs
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3000/:path*',
    },
  ]
}
```

### 方式二：直接调用
```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL

async function callAPI(method: string, data: any) {
  const response = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAdminToken()}`
    },
    body: JSON.stringify(data)
  })
  return response.json()
}
```

---

## 📊 功能详情

### 1. 数据统计看板
实时展示关键指标：
- **用户指标**: DAU, MAU, 新增用户, 留存率
- **收入指标**: 总收入, ARPU, ARPPU, 付费率
- **游戏指标**: 在线人数, 对局数, 平均游戏时长
- **图表**: 收入趋势, 用户增长, 热力图

### 2. 用户管理
功能包括：
- 用户列表（支持分页、搜索、筛选）
- 用户详情（个人信息、游戏数据、充值记录）
- 用户操作：
  - 🚫 封禁用户
  - ✅ 解封用户
  - 🔑 重置密码
  - 🎁 发放奖励（金币、彩票、道具、VIP）
  - 📧 发送邮件

### 3. 游戏配置管理
配置项：
- **抽奖系统**: 概率、奖池、保底机制
- **商城系统**: 商品列表、价格、限购
- **等级系统**: 经验曲线、等级奖励
- **任务系统**: 任务类型、目标、奖励
- **活动系统**: 活动参数、时间、条件

### 4. 邮件系统
支持：
- **单人邮件**: 指定用户ID
- **批量邮件**: 上传用户列表
- **全服邮件**: 所有在线/所有用户
- **邮件模板**: 预设常用模板
- **奖励附件**: 金币、彩票、道具等

### 5. 活动管理
创建活动：
- 活动类型（充值、消费、登录、推币）
- 活动时间
- 参与条件
- 奖励配置
- 活动开关

### 6. 日志查询
查看：
- 操作日志（GM操作记录）
- 登录日志（用户登录历史）
- 交易日志（充值、消费记录）
- 异常日志（错误、警告）

---

## 🔐 权限系统

### 管理员角色
1. **超级管理员** - 所有权限
2. **运营人员** - 用户管理、活动管理、邮件发送
3. **客服人员** - 用户查询、邮件发送
4. **数据分析** - 仅查看数据统计

### 权限验证
```typescript
// 后端API需要验证管理员token
headers: {
  'Authorization': `Bearer ${adminToken}`,
  'X-Admin-Role': 'super_admin'
}
```

---

## 🛠️ 开发指南

### 添加新页面
```typescript
// app/dashboard/new-page/page.tsx
export default function NewPage() {
  return <div>新页面</div>
}
```

### 添加新API
```typescript
// lib/api.ts
export async function fetchNewData() {
  return callAPI('admin/GetNewData', {})
}
```

### 添加新组件
```typescript
// components/dashboard/new-component.tsx
export function NewComponent() {
  return <div>新组件</div>
}
```

---

## 📝 待实现功能

- [ ] 实时推送通知
- [ ] 数据导出（Excel/CSV）
- [ ] 高级筛选和搜索
- [ ] 批量操作
- [ ] 操作审计日志
- [ ] 数据可视化增强
- [ ] 移动端适配

---

## 🐛 故障排查

### 无法连接到后端
检查：
1. TSRPC服务器是否启动（端口3000）
2. `.env.local` 配置是否正确
3. CORS设置是否允许

### 样式不生效
```bash
# 重新构建Tailwind CSS
npm run dev
```

### 依赖安装失败
```bash
# 清除缓存
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 支持

如有问题，请联系开发团队或提交Issue。

---

**版本**: 1.0.0
**构建时间**: 2025-12-03
**授权**: MIT License
