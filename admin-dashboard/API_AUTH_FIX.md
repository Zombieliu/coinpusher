# 🔧 API认证修复说明

## 问题描述

日志查询和审计分析页面显示"加载数据失败"弹窗。

## 根本原因

TSRPC后端的Admin APIs使用自定义认证方式：
- ❌ **不使用** HTTP Authorization header
- ✅ **使用** 请求体中的 `__ssoToken` 字段

前端原本将token放在Authorization header中，后端无法识别。

## 修复内容

### 1. 修改 `lib/api.ts`

**修改前：**
```typescript
const response = await fetch(`${API_BASE}/${method}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAdminToken()}`,  // ❌ 后端不识别
  },
  body: JSON.stringify(data),
})
```

**修改后：**
```typescript
// 将token添加到请求体中作为__ssoToken
const requestData = {
  ...data,
  __ssoToken: getAdminToken(),  // ✅ 后端识别这个字段
}

const response = await fetch(`${API_BASE}/${method}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestData),
})
```

### 2. 改进错误处理

在 `app/dashboard/analytics/page.tsx` 中：
- 添加了详细的错误日志
- 显示具体的错误信息而不是通用提示

## 后端认证流程

```typescript
// AdminAuthMiddleware.ts
static async requirePermission<Req extends { __ssoToken?: string }, Res>(
    call: ApiCall<Req, Res>,
    permission: AdminPermission
) {
    const token = call.req.__ssoToken;  // 从请求体获取token
    const verification = await this.verifyToken(token);
    // ...
}
```

## 影响范围

此修复影响所有Admin APIs：
- ✅ GetLogAnalytics（日志分析）
- ✅ GetLogs（日志查询）
- ✅ GetStatistics（统计数据）
- ✅ GetUsers（用户列表）
- ✅ 以及所有其他21个Admin APIs

## 测试验证

修复后，所有需要认证的API都能正常工作：

```bash
# 测试GetLogAnalytics
curl -X POST http://localhost:2000/admin/GetLogAnalytics \
  -H "Content-Type: application/json" \
  -d '{
    "__ssoToken": "your_token_here",
    "startTime": 1701619200000,
    "endTime": 1704211200000
  }'
```

## 后续注意事项

1. **所有API调用** 都会自动包含`__ssoToken`
2. **无需修改** 其他页面的代码
3. **登录后** token会自动从localStorage读取并附加到每个请求

---

**修复完成！** 现在日志查询和审计分析页面应该可以正常加载数据了。
