# 批量操作功能指南

## 概述

管理后台支持批量操作功能，可以同时对多个用户执行相同的操作，提高运营效率。

## 已实现的批量操作API

### 1. 批量封禁用户 (ApiBatchBanUsers)

**接口**: `POST /admin/BatchBanUsers`

**权限**: `BanUsers`

**请求参数**:
```typescript
{
  userIds: string[];     // 用户ID列表，最多100个
  reason: string;        // 封禁原因
  duration: number;      // 封禁时长（毫秒）
}
```

**响应**:
```typescript
{
  success: boolean;
  successCount: number;  // 成功数量
  failedCount: number;   // 失败数量
  details: Array<{
    userId: string;
    success: boolean;
    message?: string;
  }>;
}
```

**使用示例**:
```typescript
const result = await callAPI('admin/BatchBanUsers', {
  userIds: ['user1', 'user2', 'user3'],
  reason: '违规操作',
  duration: 7 * 24 * 60 * 60 * 1000, // 7天
});
```

### 2. 批量发送邮件 (ApiBatchSendMail)

**接口**: `POST /admin/BatchSendMail`

**权限**: `SendMail`

**请求参数**:
```typescript
{
  userIds: string[];     // 用户ID列表，最多1000个
  title: string;         // 邮件标题
  content: string;       // 邮件内容
  rewards?: {            // 可选奖励
    gold?: number;
    tickets?: number;
    exp?: number;
    items?: Array<{ itemId: string; quantity: number }>;
    skins?: string[];
  };
  expireAt?: number;     // 过期时间，默认7天
}
```

**响应**:
```typescript
{
  success: boolean;
  successCount: number;
  failedCount: number;
  details?: Array<{      // 仅在有失败时返回
    userId: string;
    success: boolean;
    message?: string;
  }>;
}
```

## 前端集成方式

### 在用户管理页面添加批量操作

**步骤1: 添加复选框**

```tsx
// 在用户列表表格中添加复选框列
const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

// 表头复选框 - 全选/取消全选
<th className="px-6 py-3">
  <input
    type="checkbox"
    checked={selectedUsers.length === users.length}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedUsers(users.map(u => u.userId));
      } else {
        setSelectedUsers([]);
      }
    }}
  />
</th>

// 数据行复选框
<td className="px-6 py-4">
  <input
    type="checkbox"
    checked={selectedUsers.includes(user.userId)}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedUsers([...selectedUsers, user.userId]);
      } else {
        setSelectedUsers(selectedUsers.filter(id => id !== user.userId));
      }
    }}
  />
</td>
```

**步骤2: 添加批量操作按钮**

```tsx
{selectedUsers.length > 0 && (
  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-6 py-4 flex items-center gap-4">
    <span className="text-sm text-gray-600">
      已选择 {selectedUsers.length} 个用户
    </span>
    <button
      onClick={() => handleBatchBan()}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
    >
      批量封禁
    </button>
    <button
      onClick={() => handleBatchMail()}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      批量发送邮件
    </button>
    <button
      onClick={() => setSelectedUsers([])}
      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
    >
      取消选择
    </button>
  </div>
)}
```

**步骤3: 实现批量操作函数**

```tsx
async function handleBatchBan() {
  const reason = prompt('请输入封禁原因:');
  if (!reason) return;

  const days = prompt('请输入封禁天数:', '7');
  if (!days) return;

  const duration = parseInt(days) * 24 * 60 * 60 * 1000;

  if (!confirm(`确定要封禁 ${selectedUsers.length} 个用户吗？`)) return;

  try {
    const result = await callAPI('admin/BatchBanUsers', {
      userIds: selectedUsers,
      reason,
      duration,
    });

    if (result.isSucc && result.res?.success) {
      alert(`操作完成！成功: ${result.res.successCount}, 失败: ${result.res.failedCount}`);
      setSelectedUsers([]);
      loadUsers(); // 刷新列表
    } else {
      alert('操作失败');
    }
  } catch (error: any) {
    alert(error.message || '操作失败');
  }
}

async function handleBatchMail() {
  // 显示邮件发送对话框
  setShowBatchMailModal(true);
}
```

**步骤4: 批量邮件模态框**

```tsx
{showBatchMailModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">
          批量发送邮件 ({selectedUsers.length} 个用户)
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">邮件标题</label>
          <input
            type="text"
            value={mailTitle}
            onChange={(e) => setMailTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">邮件内容</label>
          <textarea
            value={mailContent}
            onChange={(e) => setMailContent(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">奖励 (JSON，可选)</label>
          <textarea
            value={mailRewards}
            onChange={(e) => setMailRewards(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
            rows={3}
            placeholder='{"gold": 1000, "exp": 500}'
          />
        </div>
      </div>
      <div className="p-6 border-t flex justify-end gap-3">
        <button
          onClick={() => setShowBatchMailModal(false)}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={handleSendBatchMail}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          发送
        </button>
      </div>
    </div>
  </div>
)}
```

## 性能考虑

### 批量操作限制

1. **批量封禁**: 单次最多100个用户
2. **批量邮件**: 单次最多1000个用户

### 异步处理

对于大批量操作（如全服邮件），建议：

1. 创建后台任务
2. 返回任务ID
3. 客户端轮询任务进度
4. 完成后通知管理员

**示例实现**:

```typescript
// 后端
export async function ApiBatchSendMailAsync(call: ApiCall<...>) {
  const taskId = `task_${Date.now()}`;

  // 创建后台任务
  processBatchMailInBackground(taskId, userIds, title, content);

  call.succ({
    success: true,
    taskId,
    message: '任务已创建，正在后台处理'
  });
}

// 任务进度查询
export async function ApiGetBatchTaskProgress(call: ApiCall<...>) {
  const task = await getTaskStatus(taskId);

  call.succ({
    taskId,
    status: task.status,  // 'pending', 'processing', 'completed', 'failed'
    progress: task.progress,  // 0-100
    successCount: task.successCount,
    failedCount: task.failedCount,
  });
}
```

## 安全注意事项

### 1. 权限验证

- 确保管理员有相应权限
- 批量操作需要更高权限级别
- 记录所有批量操作的审计日志

### 2. 操作确认

- 批量操作前必须二次确认
- 显示将要影响的用户数量
- 提供撤销或回滚机制（如可能）

### 3. 速率限制

```typescript
// 限制单个管理员的批量操作频率
const rateLimiter = new Map<string, number>();

function checkRateLimit(adminId: string): boolean {
  const lastOperation = rateLimiter.get(adminId) || 0;
  const now = Date.now();

  if (now - lastOperation < 60000) { // 1分钟内只能操作一次
    return false;
  }

  rateLimiter.set(adminId, now);
  return true;
}
```

### 4. 失败处理

- 记录每个失败的用户ID
- 提供失败详情
- 允许重试失败的项

## 审计日志

所有批量操作都会记录详细的审计日志：

```typescript
{
  action: 'batch_ban_users',
  adminId: 'admin_123',
  adminName: 'operator1',
  timestamp: 1234567890000,
  userCount: 50,
  successCount: 48,
  failedCount: 2,
  reason: '违规操作',
  duration: 604800000,  // 7天
}
```

## 实时通知

批量操作完成后会发送实时通知：

```typescript
NotificationSystem.sendNotification({
  type: NotificationSystem.NotificationType.SystemAlert,
  title: '批量封禁完成',
  message: `已封禁 48/50 个用户`,
  data: { successCount: 48, failedCount: 2 },
  adminName: 'operator1',
});
```

## 其他可批量操作

可以根据需求添加更多批量操作：

1. **批量解封用户**
2. **批量发放奖励**
3. **批量修改用户属性**
4. **批量删除邮件**
5. **批量导入/导出用户**

## API客户端函数

在 `/admin-dashboard/lib/api.ts` 中添加:

```typescript
/**
 * 批量封禁用户
 */
export async function batchBanUsers(userIds: string[], reason: string, duration: number) {
  return callAPI('admin/BatchBanUsers', { userIds, reason, duration });
}

/**
 * 批量发送邮件
 */
export async function batchSendMail(params: {
  userIds: string[];
  title: string;
  content: string;
  rewards?: any;
  expireAt?: number;
}) {
  return callAPI('admin/BatchSendMail', params);
}
```

## 总结

批量操作功能大大提高了运营效率，特别是在需要处理大量用户时。正确使用批量操作可以：

- ✅ 节省时间
- ✅ 减少重复工作
- ✅ 提高一致性
- ✅ 降低出错率

但也需要注意：

- ⚠️ 谨慎使用，避免误操作
- ⚠️ 始终进行二次确认
- ⚠️ 记录完整的审计日志
- ⚠️ 提供失败详情和重试机制
