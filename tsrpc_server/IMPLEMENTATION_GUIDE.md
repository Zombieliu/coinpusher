# 后台管理系统功能实现指南

本文档提供所有待实现功能的完整代码框架和实现步骤。

## ✅ 已完成功能

### 1. 操作审计日志系统
- ✅ 后端：AuditLogSystem.ts
- ✅ API：GetAuditLogs, GetAuditStatistics
- ✅ 前端：/dashboard/audit
- ✅ 自动记录所有敏感操作

---

## 🚀 待实现功能

### 2. 实时监控与告警系统

#### 后端文件

**MonitoringSystem.ts** (已创建基础框架)
```typescript
// 位置: src/server/gate/bll/MonitoringSystem.ts
// 功能: 实时监控CPU、内存、QPS、业务指标
// 关键方法:
- getServerMetrics(): 获取服务器指标
- getBusinessMetrics(): 获取业务指标
- checkAlerts(): 检查并触发告警
- getActiveAlerts(): 获取未解决告警
```

**API文件需创建:**

```typescript
// src/tsrpc/protocols/gate/admin/PtlGetSystemMetrics.ts
export interface ReqGetSystemMetrics {
    __ssoToken?: string;
}

export interface ResGetSystemMetrics {
    success: boolean;
    server?: {
        cpu: { usage: number; cores: number };
        memory: { total: number; used: number; usage: number };
        requests: { qps: number; avgResponseTime: number; errorRate: number };
    };
    business?: {
        users: { online: number; newToday: number };
        revenue: { todayRevenue: number; orderCount: number };
    };
    error?: string;
}

// src/server/gate/api/admin/ApiGetSystemMetrics.ts
import { MonitoringSystem } from "../../bll/MonitoringSystem";

export async function ApiGetSystemMetrics(call: ApiCall<ReqGetSystemMetrics, ResGetSystemMetrics>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewDashboard);
    if (!auth.authorized) return;

    const server = MonitoringSystem.getServerMetrics();
    const business = await MonitoringSystem.getBusinessMetrics();

    call.succ({ success: true, server, business });
}
```

**前端页面:**

```typescript
// admin-dashboard/app/dashboard/monitor/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { fetchSystemMetrics, fetchActiveAlerts } from '@/lib/api'

export default function MonitorPage() {
  const [metrics, setMetrics] = useState(null)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const interval = setInterval(() => {
      loadMetrics()
      loadAlerts()
    }, 5000) // 每5秒刷新

    return () => clearInterval(interval)
  }, [])

  async function loadMetrics() {
    const result = await fetchSystemMetrics()
    if (result.isSucc) setMetrics(result.res)
  }

  return (
    <div className="space-y-6">
      {/* CPU、内存、QPS实时图表 */}
      {/* 告警列表 */}
      {/* 业务指标卡片 */}
    </div>
  )
}
```

---

### 3. 财务与支付管理

#### 后端System

```typescript
// src/server/gate/bll/FinancialSystem.ts
export class FinancialSystem {
    // 获取订单列表
    static async getOrders(params: {
        status?: string;
        userId?: string;
        startTime?: number;
        endTime?: number;
        page: number;
        limit: number;
    }) {
        const query: any = {};
        if (params.status) query.status = params.status;
        if (params.userId) query.userId = params.userId;
        if (params.startTime || params.endTime) {
            query.createdAt = {};
            if (params.startTime) query.createdAt.$gte = params.startTime;
            if (params.endTime) query.createdAt.$lte = params.endTime;
        }

        const orders = await this.db.collection('payment_orders')
            .find(query)
            .sort({ createdAt: -1 })
            .skip((params.page - 1) * params.limit)
            .limit(params.limit)
            .toArray();

        const total = await this.db.collection('payment_orders').countDocuments(query);

        return { orders, total };
    }

    // 获取财务报表
    static async getFinancialReport(startTime: number, endTime: number) {
        // 收入统计
        const revenue = await this.db.collection('payment_orders').aggregate([
            {
                $match: {
                    status: 'completed',
                    completedAt: { $gte: startTime, $lte: endTime }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$completedAt" } } },
                    totalRevenue: { $sum: '$amount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // ARPU计算
        const activeUsers = await this.db.collection('users').countDocuments({
            lastLoginAt: { $gte: startTime, $lte: endTime }
        });

        const totalRevenue = revenue.reduce((sum, day) => sum + day.totalRevenue, 0);
        const arpu = activeUsers > 0 ? totalRevenue / activeUsers : 0;

        return { revenue, arpu, activeUsers };
    }

    // 手动退款
    static async refundOrder(orderId: string, reason: string, adminId: string) {
        const order = await this.db.collection('payment_orders').findOne({ orderId });
        if (!order || order.status !== 'completed') {
            return { success: false, error: '订单状态不正确' };
        }

        // 更新订单状态
        await this.db.collection('payment_orders').updateOne(
            { orderId },
            {
                $set: {
                    status: 'refunded',
                    refundReason: reason,
                    refundBy: adminId,
                    refundAt: Date.now()
                }
            }
        );

        // 扣除用户货币（TODO: 调用RewardSystem）

        return { success: true };
    }
}
```

**前端页面框架:**

```typescript
// admin-dashboard/app/dashboard/finance/page.tsx
export default function FinancePage() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // 订单列表（带筛选、分页）
  // 收入图表（日收入、周收入、月收入）
  // ARPU、ARPPU统计卡片
  // 付费转化漏斗
  // 订单详情模态框（支持退款）
}
```

---

### 4. 用户详情页增强

```typescript
// admin-dashboard/app/dashboard/users/[userId]/page.tsx
export default function UserDetailPage({ params }: { params: { userId: string } }) {
  const [user, setUser] = useState(null)
  const [history, setHistory] = useState({
    payments: [],
    games: [],
    rewards: [],
    auditLogs: []
  })

  return (
    <div className="space-y-6">
      {/* 用户基本信息卡片 */}
      <UserInfoCard user={user} />

      {/* 快捷操作面板 */}
      <QuickActionsPanel userId={params.userId} />

      {/* Tabs: 充值记录 | 游戏历史 | 奖励记录 | 操作日志 */}
      <Tabs>
        <Tab label="充值记录">{/* PaymentHistory */}</Tab>
        <Tab label="游戏历史">{/* GameHistory */}</Tab>
        <Tab label="奖励记录">{/* RewardHistory */}</Tab>
        <Tab label="操作日志">{/* AuditLogs filtered by targetId */}</Tab>
      </Tabs>
    </div>
  )
}

// 快捷操作组件
function QuickActionsPanel({ userId }: { userId: string }) {
  async function handleQuickBan() {
    if (!confirm('确定封禁该用户？')) return;
    await banUser(userId, '违规操作', 7 * 24 * 3600);
    alert('封禁成功');
  }

  async function handleQuickReward() {
    const amount = prompt('输入金币数量:');
    if (!amount) return;
    await grantReward(userId, { gold: parseInt(amount) });
    alert('发放成功');
  }

  async function handleResetPassword() {
    // ...
  }

  return (
    <div className="flex gap-2">
      <button onClick={handleQuickBan}>快速封禁</button>
      <button onClick={handleQuickReward}>发放奖励</button>
      <button onClick={handleResetPassword}>重置密码</button>
    </div>
  )
}
```

---

### 5. 批量操作优化

#### 后端支持

```typescript
// src/server/gate/bll/BatchOperationSystem.ts
export class BatchOperationSystem {
    private static db: Db;
    private static jobs: Map<string, BatchJob> = new Map();

    // 创建批量任务
    static async createBatchJob(params: {
        type: 'ban_users' | 'grant_rewards' | 'send_mails';
        targets: string[];  // userId列表
        data: any;
        createdBy: string;
    }): Promise<string> {
        const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const job: BatchJob = {
            jobId,
            ...params,
            status: 'pending',
            total: params.targets.length,
            processed: 0,
            succeeded: 0,
            failed: 0,
            createdAt: Date.now(),
        };

        this.jobs.set(jobId, job);

        // 异步执行
        this.executeBatchJob(jobId);

        return jobId;
    }

    // 执行批量任务
    private static async executeBatchJob(jobId: string) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.status = 'processing';

        for (const userId of job.targets) {
            try {
                switch (job.type) {
                    case 'ban_users':
                        // 调用BanUser逻辑
                        break;
                    case 'grant_rewards':
                        // 调用GrantReward逻辑
                        break;
                    case 'send_mails':
                        // 调用SendMail逻辑
                        break;
                }
                job.succeeded++;
            } catch (error) {
                job.failed++;
            }
            job.processed++;
        }

        job.status = 'completed';
        job.completedAt = Date.now();
    }

    // 获取任务状态
    static getBatchJobStatus(jobId: string) {
        return this.jobs.get(jobId);
    }
}
```

**前端: Excel批量导入**

```typescript
// admin-dashboard/components/BatchImport.tsx
import * as XLSX from 'xlsx';

export function BatchImportButton({ onImport }: { onImport: (data: any[]) => void }) {
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      onImport(jsonData);
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
    </div>
  );
}

// 使用示例
function BatchRewardPage() {
  async function handleBatchReward(users: { userId: string; amount: number }[]) {
    const jobId = await createBatchJob({
      type: 'grant_rewards',
      targets: users.map(u => u.userId),
      data: users.map(u => ({ gold: u.amount }))
    });

    // 轮询任务状态
    const interval = setInterval(async () => {
      const status = await getBatchJobStatus(jobId);
      setProgress(status.processed / status.total);
      if (status.status === 'completed') {
        clearInterval(interval);
        alert(`完成！成功: ${status.succeeded}, 失败: ${status.failed}`);
      }
    }, 1000);
  }

  return (
    <div>
      <BatchImportButton onImport={handleBatchReward} />
      <ProgressBar progress={progress} />
    </div>
  );
}
```

---

### 6. 公告与推送系统

```typescript
// src/server/gate/bll/AnnouncementSystem.ts
export interface Announcement {
    id: string;
    type: 'system' | 'event' | 'maintenance';
    title: string;
    content: string;
    startTime: number;
    endTime: number;
    priority: number;  // 1-10，数字越大优先级越高
    target: 'all' | 'new_users' | 'vip' | 'custom';
    targetUserIds?: string[];
    status: 'draft' | 'active' | 'expired';
    createdBy: string;
    createdAt: number;
}

export class AnnouncementSystem {
    static async createAnnouncement(params: Omit<Announcement, 'id' | 'createdAt' | 'status'>) {
        const announcement: Announcement = {
            ...params,
            id: `announcement_${Date.now()}`,
            status: 'draft',
            createdAt: Date.now(),
        };

        await this.db.collection('announcements').insertOne(announcement);
        return announcement;
    }

    static async publishAnnouncement(id: string) {
        await this.db.collection('announcements').updateOne(
            { id },
            { $set: { status: 'active' } }
        );

        // 发送推送通知给目标用户
        const announcement = await this.db.collection('announcements').findOne({ id });
        if (announcement) {
            await this.sendPushNotification(announcement);
        }
    }

    private static async sendPushNotification(announcement: Announcement) {
        // TODO: 集成推送服务（极光推送、Firebase等）
        console.log(`发送推送: ${announcement.title} to ${announcement.target}`);
    }

    // 获取用户应该看到的公告
    static async getActiveAnnouncements(userId?: string) {
        const now = Date.now();
        const query: any = {
            status: 'active',
            startTime: { $lte: now },
            endTime: { $gte: now },
        };

        if (userId) {
            query.$or = [
                { target: 'all' },
                { target: 'custom', targetUserIds: userId },
            ];
        }

        return await this.db.collection('announcements')
            .find(query)
            .sort({ priority: -1, createdAt: -1 })
            .toArray();
    }
}
```

**前端页面:**

```typescript
// admin-dashboard/app/dashboard/announcements/page.tsx
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [showEditor, setShowEditor] = useState(false)

  return (
    <div>
      <button onClick={() => setShowEditor(true)}>创建公告</button>

      {/* 公告列表 */}
      {announcements.map(ann => (
        <div key={ann.id}>
          <h3>{ann.title}</h3>
          <p>{ann.content}</p>
          <button onClick={() => publishAnnouncement(ann.id)}>发布</button>
          <button onClick={() => deleteAnnouncement(ann.id)}>删除</button>
        </div>
      ))}

      {/* 公告编辑器模态框 */}
      {showEditor && (
        <AnnouncementEditor onSave={handleSave} onClose={() => setShowEditor(false)} />
      )}
    </div>
  )
}

// 富文本编辑器组件
function AnnouncementEditor({ onSave, onClose }) {
  const [form, setForm] = useState({
    type: 'system',
    title: '',
    content: '',
    startTime: Date.now(),
    endTime: Date.now() + 7 * 24 * 3600 * 1000,
    priority: 5,
    target: 'all',
  })

  return (
    <div className="modal">
      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
      {/* 其他表单字段 */}
      <button onClick={() => onSave(form)}>保存</button>
    </div>
  )
}
```

---

### 7. CDK兑换码管理

```typescript
// src/server/gate/bll/CDKSystem.ts
export interface CDK {
    code: string;
    batchId: string;
    rewards: {
        gold?: number;
        diamond?: number;
        items?: { itemId: string; count: number }[];
    };
    maxUses: number;        // 最大使用次数（0=无限）
    usedCount: number;
    expiresAt: number;
    status: 'active' | 'disabled' | 'expired';
    createdBy: string;
    createdAt: number;
}

export class CDKSystem {
    // 批量生成CDK
    static async generateCDKBatch(params: {
        count: number;
        rewards: any;
        maxUses: number;
        expiresAt: number;
        createdBy: string;
    }): Promise<string[]> {
        const batchId = `batch_${Date.now()}`;
        const codes: string[] = [];

        for (let i = 0; i < params.count; i++) {
            const code = this.generateRandomCode();
            const cdk: CDK = {
                code,
                batchId,
                rewards: params.rewards,
                maxUses: params.maxUses,
                usedCount: 0,
                expiresAt: params.expiresAt,
                status: 'active',
                createdBy: params.createdBy,
                createdAt: Date.now(),
            };

            await this.db.collection('cdks').insertOne(cdk);
            codes.push(code);
        }

        return codes;
    }

    // 兑换CDK
    static async redeemCDK(code: string, userId: string) {
        const cdk = await this.db.collection('cdks').findOne({ code });

        if (!cdk) {
            return { success: false, error: '兑换码不存在' };
        }

        if (cdk.status !== 'active') {
            return { success: false, error: '兑换码已失效' };
        }

        if (cdk.expiresAt < Date.now()) {
            return { success: false, error: '兑换码已过期' };
        }

        if (cdk.maxUses > 0 && cdk.usedCount >= cdk.maxUses) {
            return { success: false, error: '兑换码已用完' };
        }

        // 检查用户是否已兑换
        const redemption = await this.db.collection('cdk_redemptions').findOne({ code, userId });
        if (redemption) {
            return { success: false, error: '您已兑换过此兑换码' };
        }

        // 发放奖励
        // TODO: 调用RewardSystem

        // 记录兑换
        await this.db.collection('cdk_redemptions').insertOne({
            code,
            userId,
            redeemedAt: Date.now(),
        });

        // 更新使用次数
        await this.db.collection('cdks').updateOne(
            { code },
            { $inc: { usedCount: 1 } }
        );

        return { success: true, rewards: cdk.rewards };
    }

    // 生成随机码
    private static generateRandomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
            if ((i + 1) % 4 === 0 && i < 11) code += '-';
        }
        return code;
    }

    // 获取CDK列表
    static async getCDKList(params: { batchId?: string; page: number; limit: number }) {
        const query: any = {};
        if (params.batchId) query.batchId = params.batchId;

        const cdks = await this.db.collection('cdks')
            .find(query)
            .sort({ createdAt: -1 })
            .skip((params.page - 1) * params.limit)
            .limit(params.limit)
            .toArray();

        const total = await this.db.collection('cdks').countDocuments(query);

        return { cdks, total };
    }
}
```

**前端页面:**

```typescript
// admin-dashboard/app/dashboard/cdk/page.tsx
export default function CDKPage() {
  const [cdks, setCdks] = useState([])
  const [showGenerator, setShowGenerator] = useState(false)

  async function handleGenerate(params: {
    count: number;
    rewards: any;
    maxUses: number;
    expiresAt: number;
  }) {
    const codes = await generateCDKBatch(params);

    // 导出为CSV
    const csv = codes.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cdk_${Date.now()}.csv`;
    a.click();

    alert(`成功生成 ${codes.length} 个兑换码`);
    loadCDKs();
  }

  return (
    <div>
      <button onClick={() => setShowGenerator(true)}>生成CDK</button>

      {/* CDK列表 */}
      <table>
        <thead>
          <tr>
            <th>兑换码</th>
            <th>奖励</th>
            <th>使用情况</th>
            <th>过期时间</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {cdks.map(cdk => (
            <tr key={cdk.code}>
              <td>{cdk.code}</td>
              <td>{JSON.stringify(cdk.rewards)}</td>
              <td>{cdk.usedCount} / {cdk.maxUses || '∞'}</td>
              <td>{new Date(cdk.expiresAt).toLocaleString()}</td>
              <td>{cdk.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* CDK生成器 */}
      {showGenerator && (
        <CDKGenerator onGenerate={handleGenerate} onClose={() => setShowGenerator(false)} />
      )}
    </div>
  )
}
```

---

## 📋 实施步骤

### 对于每个功能，按以下步骤实施：

1. **创建后端System文件**
   ```bash
   src/server/gate/bll/XXXSystem.ts
   ```

2. **创建Protocol定义**
   ```bash
   src/tsrpc/protocols/gate/admin/PtlXXX.ts
   ```

3. **创建API实现**
   ```bash
   src/server/gate/api/admin/ApiXXX.ts
   ```

4. **重新生成协议**
   ```bash
   npx tsrpc proto
   ```

5. **编译TypeScript**
   ```bash
   npx tsc --skipLibCheck
   ```

6. **复制到Docker容器**
   ```bash
   docker cp dist/... coinpusher-gate:/app/dist/...
   docker-compose restart gate-server
   ```

7. **创建前端页面**
   ```bash
   admin-dashboard/app/dashboard/xxx/page.tsx
   ```

8. **添加API调用函数**
   ```typescript
   // admin-dashboard/lib/api.ts
   export async function fetchXXX() {
       return callAPI('admin/XXX', {})
   }
   ```

9. **添加导航菜单**
   ```typescript
   // admin-dashboard/app/dashboard/layout.tsx
   { name: 'XXX', href: '/dashboard/xxx', icon: Icon }
   ```

10. **重新构建前端**
    ```bash
    docker-compose build --no-cache admin-dashboard
    docker-compose up -d admin-dashboard
    ```

---

## 🎯 优先级建议

1. **高优先级** (立即实现)
   - ✅ 审计日志 (已完成)
   - 📊 实时监控与告警
   - 💰 财务与支付管理

2. **中优先级** (本周完成)
   - 👤 用户详情页增强
   - 📢 公告与推送系统
   - 🎟️ CDK兑换码管理

3. **低优先级** (后续优化)
   - ⚡ 批量操作优化

---

## 📚 参考资料

- TSRPC文档: https://tsrpc.cn/
- Next.js 15文档: https://nextjs.org/docs
- MongoDB文档: https://docs.mongodb.com/

---

## ⚠️ 注意事项

1. **权限控制**: 所有API都要通过`AdminAuthMiddleware.requirePermission`检查权限
2. **审计日志**: 敏感操作要在`AuditLogMiddleware.ts`中配置自动记录
3. **错误处理**: 统一返回格式`{ success: boolean, error?: string }`
4. **性能优化**: 大量数据查询要加索引，使用分页
5. **Docker缓存**: 修改代码后要删除镜像重新构建，或手动复制文件

---

生成时间: 2025-12-09
作者: Claude Code
