# 管理后台权限系统 (RBAC)

## 概述

管理后台采用基于角色的访问控制(Role-Based Access Control, RBAC)系统，支持细粒度的权限管理。

## 角色定义

### 1. Super Admin (超级管理员)
- **权限**: 所有权限
- **职责**: 系统配置、管理员管理、所有业务操作
- **默认账号**: admin / admin123

### 2. Operator (运营人员)
- **权限**:
  - 查看用户信息
  - 发送邮件(包括全服广播)
  - 查看和编辑配置
  - 查看和编辑活动
  - 查看统计数据
  - 查看日志
- **职责**: 日常运营、活动配置、邮件发送

### 3. Customer Service (客服)
- **权限**:
  - 查看用户信息
  - 封禁/解封用户
  - 发放奖励
  - 发送单人邮件
  - 查看日志
- **职责**: 用户支持、投诉处理、补偿发放

### 4. Analyst (数据分析)
- **权限**:
  - 查看用户信息(只读)
  - 查看配置(只读)
  - 查看活动(只读)
  - 查看统计数据
  - 查看日志
- **职责**: 数据分析、报表生成

## 权限列表

### 用户管理权限
- `view_users`: 查看用户列表和详情
- `ban_users`: 封禁/解封用户
- `grant_rewards`: 发放奖励给用户

### 邮件权限
- `send_mail`: 发送单人/批量邮件
- `send_broadcast_mail`: 发送全服广播邮件

### 配置权限
- `view_config`: 查看游戏配置
- `edit_config`: 编辑游戏配置

### 活动权限
- `view_events`: 查看活动列表
- `edit_events`: 创建/编辑/删除活动

### 统计权限
- `view_statistics`: 查看统计数据和报表

### 日志权限
- `view_logs`: 查看操作日志

### 系统权限
- `manage_admins`: 管理管理员账号
- `system_config`: 系统配置管理

## API使用示例

### 管理员登录

```typescript
POST /admin/AdminLogin
{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "isSucc": true,
  "res": {
    "success": true,
    "token": "abc123...",
    "admin": {
      "adminId": "admin_123",
      "username": "admin",
      "role": "super_admin",
      "email": "admin@example.com"
    }
  }
}
```

### 使用Token调用API

所有管理员API都需要在请求中包含`__ssoToken`字段:

```typescript
POST /admin/GetStatistics
{
  "__ssoToken": "abc123..."
}
```

### 后端权限验证

在API实现中使用中间件验证权限:

```typescript
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetUsers(call: ApiCall<ReqGetUsers, ResGetUsers>) {
  // 验证权限 - 需要ViewUsers权限
  const auth = await AdminAuthMiddleware.requirePermission(
    call,
    AdminPermission.ViewUsers
  );
  if (!auth.authorized) return;

  // 继续处理请求...
  // auth.adminId - 当前管理员ID
  // auth.username - 当前管理员用户名
  // auth.role - 当前管理员角色
}
```

### 创建管理员账号

只有超级管理员可以创建其他管理员账号:

```typescript
// 在服务器端代码中
import { AdminUserSystem, AdminRole } from './bll/AdminUserSystem';

const result = await AdminUserSystem.createAdmin(
  'operator1',
  'password123',
  AdminRole.Operator,
  'operator@example.com'
);
```

## 安全建议

### 1. 密码策略
- 初始密码: 系统默认密码为 `admin123`
- 首次登录后应立即修改密码
- 密码要求: 至少8位，包含字母和数字
- 密码存储: SHA256加密+盐值

### 2. Session管理
- Token有效期: 24小时
- 自动过期: 过期Token自动从数据库清除
- 单点登录: 修改密码后所有Session失效，需重新登录

### 3. 操作审计
- 所有管理员操作都记录到`admin_logs`集合
- 记录内容包括:
  - 管理员ID和用户名
  - 操作类型和详情
  - 目标用户(如果适用)
  - 操作时间和IP地址

### 4. 权限检查
- 每个API调用都进行权限验证
- 不同角色的权限在服务端强制执行
- 前端界面根据权限隐藏/显示功能

## 初始化

在服务器启动时自动初始化管理员系统:

```typescript
import { AdminUserSystem } from './bll/AdminUserSystem';

// 在GateServer启动时调用
await AdminUserSystem.initialize();
```

这会:
1. 创建默认超级管理员账号(如果不存在)
2. 创建必要的数据库索引
3. 设置Session自动过期

## 数据库集合

### admin_users
```typescript
{
  adminId: string;          // 管理员ID
  username: string;         // 用户名(唯一)
  passwordHash: string;     // 密码哈希
  role: AdminRole;          // 角色
  email?: string;           // 邮箱
  status: 'active' | 'disabled';  // 状态
  createdAt: number;        // 创建时间
  lastLoginAt?: number;     // 最后登录时间
  lastLoginIp?: string;     // 最后登录IP
}
```

### admin_sessions
```typescript
{
  adminId: string;      // 管理员ID
  username: string;     // 用户名
  role: AdminRole;      // 角色
  token: string;        // 会话Token(唯一)
  createdAt: number;    // 创建时间
  expiresAt: number;    // 过期时间(TTL索引)
  ip?: string;          // 登录IP
}
```

### admin_logs
```typescript
{
  adminId: string;      // 操作的管理员ID
  action: string;       // 操作类型
  targetUserId?: string; // 目标用户ID
  details: any;         // 操作详情
  timestamp: number;    // 时间戳
  ip?: string;          // IP地址
}
```

## 前端集成

### 1. 登录页面
位于: `/admin-dashboard/app/login/page.tsx`

### 2. 权限检查
在Dashboard Layout中自动检查登录状态:
```typescript
useEffect(() => {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    router.push('/login')
  }
}, [])
```

### 3. API调用
使用统一的API客户端自动附加Token:
```typescript
import { callAPI } from '@/lib/api'

// Token会自动从localStorage获取并附加到请求中
const result = await callAPI('admin/GetStatistics', {})
```

## 故障排除

### 问题: 登录后立即跳转回登录页
- 检查localStorage是否正确保存了token
- 检查浏览器控制台是否有JavaScript错误
- 确认后端TSRPC服务正在运行

### 问题: API返回 "Unauthorized"
- 确认Token未过期(24小时有效期)
- 检查管理员账号是否被禁用
- 确认API调用时传递了`__ssoToken`参数

### 问题: 权限不足
- 检查当前管理员的角色
- 确认该角色是否有执行此操作的权限
- 查看权限映射表: `RolePermissions`

## 扩展开发

### 添加新权限

1. 在`AdminPermission`枚举中添加新权限:
```typescript
export enum AdminPermission {
  // ... 现有权限
  NewFeature = 'new_feature',
}
```

2. 更新角色权限映射:
```typescript
const RolePermissions: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.Operator]: [
    // ... 现有权限
    AdminPermission.NewFeature,
  ],
}
```

3. 在API中使用新权限:
```typescript
const auth = await AdminAuthMiddleware.requirePermission(
  call,
  AdminPermission.NewFeature
);
```

### 添加新角色

1. 在`AdminRole`枚举中添加:
```typescript
export enum AdminRole {
  // ... 现有角色
  NewRole = 'new_role',
}
```

2. 定义该角色的权限:
```typescript
const RolePermissions: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.NewRole]: [
    AdminPermission.ViewUsers,
    // ... 其他权限
  ],
}
```
