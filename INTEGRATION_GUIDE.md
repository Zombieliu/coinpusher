# 🔗 新系统集成指南

本指南帮助你将新增的7个系统集成到现有项目中。

---

## ✅ 任务1：创建数据库索引（已完成）

数据库索引已添加到 `InitIndexes.ts`，包含：

- ✅ 签到系统索引（5个）
- ✅ 等级系统索引（5个）
- ✅ 邮件系统索引（8个）
- ✅ VIP系统索引（5个）
- ✅ 赛季通行证索引（5个）
- ✅ 皮肤系统索引（2个）
- ✅ 活动系统索引（7个）

**执行命令：**
```bash
cd tsrpc_server
npx ts-node src/server/gate/data/InitIndexes.ts
```

---

## ✅ 任务2：集成到现有系统（已完成）

### 2.1 启动定时任务

在 `InitSystems.ts` 中已添加：
- ✅ BuffSystem.startCleanupTimer() - 清理过期Buff
- ✅ MailSystem.startCleanupTimer() - 清理过期邮件

### 2.2 需要手动集成的地方

#### A. 任务系统 → 等级系统

在 `TaskSystem.ts` 中，任务完成时添加经验：

```typescript
import { LevelSystem, ExpSource } from './LevelSystem';

// 任务完成时
await LevelSystem.addExp(userId, 100, ExpSource.Task);
```

**文件位置：** `tsrpc_server/src/server/gate/bll/TaskSystem.ts`

**修改位置：** 任务完成奖励发放的地方

**示例：**
```typescript
async completeTask(userId: string, taskId: string) {
    // 原有逻辑：发放任务奖励
    await this.giveTaskReward(userId, reward);

    // 新增：发放经验
    await LevelSystem.addExp(userId, 100, ExpSource.Task);
}
```

---

#### B. 成就系统 → 等级系统

在 `AchievementSystem.ts` 中，成就完成时添加经验：

```typescript
import { LevelSystem, ExpSource } from './LevelSystem';

// 成就完成时
await LevelSystem.addExp(userId, 200, ExpSource.Achievement);
```

**文件位置：** `tsrpc_server/src/server/gate/bll/AchievementSystem.ts`

---

#### C. 用户注册 → 欢迎邮件

在用户注册API中发送欢迎邮件：

```typescript
import { MailSystem } from './bll/MailSystem';

// 用户注册成功后
await MailSystem.sendMailFromTemplate(userId, 'welcome');
```

**文件位置：** `tsrpc_server/src/server/gate/api/ApiRegister.ts`

**修改示例：**
```typescript
export async function ApiRegister(call: ApiCall<ReqRegister, ResRegister>) {
    // 原有注册逻辑
    const user = await UserDB.createUser(...);

    // 新增：发送欢迎邮件
    await MailSystem.sendMailFromTemplate(user.userId, 'welcome');

    call.succ({ userId: user.userId });
}
```

---

#### D. 支付系统 → VIP系统

在 `PaymentSystem.ts` 的支付回调中更新VIP：

```typescript
import { VIPSystem } from './VIPSystem';

// 支付成功后
await VIPSystem.updateTotalRecharge(userId, amount);
```

**文件位置：** `tsrpc_server/src/server/gate/bll/PaymentSystem.ts`

**修改位置：** `handlePaymentCallback` 方法

**示例：**
```typescript
static async handlePaymentCallback(callback: PaymentCallback) {
    // 原有逻辑：更新订单状态
    await this.updateOrderStatus(orderId, 'Paid');

    // 原有逻辑：发放商品
    await this.deliverOrder(orderId);

    // 新增：更新VIP累计充值
    const order = await this.getOrder(orderId);
    await VIPSystem.updateTotalRecharge(order.userId, order.amount);
}
```

---

#### E. 签到系统 → 等级系统

在签到时也可以给经验：

```typescript
// 在 SignInSystem.ts 的 signIn 方法中
await LevelSystem.addExp(userId, 50, ExpSource.SignIn);
```

**文件位置：** `tsrpc_server/src/server/gate/bll/SignInSystem.ts:161`

**修改示例：**
```typescript
static async signIn(userId: string): Promise<...> {
    // ... 原有签到逻辑

    // 发放签到奖励
    await this.giveSignInReward(userId, reward);

    // 新增：发放经验
    await LevelSystem.addExp(userId, 50, ExpSource.SignIn);

    return { success: true, reward, consecutiveDays, totalDays };
}
```

---

#### F. 邀请系统 → 等级系统

被邀请人注册时给邀请人经验：

```typescript
// 在 InviteSystem.ts 中
await LevelSystem.addExp(inviterId, 100, ExpSource.Invite);
```

**文件位置：** `tsrpc_server/src/server/gate/bll/InviteSystem.ts`

---

## ✅ 任务3：测试API端点

### 3.1 启动服务器

```bash
cd tsrpc_server
npm run dev:gate
```

### 3.2 运行测试脚本

在另一个终端：

```bash
cd /Users/henryliu/cocos/numeron-world/oops-moba
npx ts-node test-new-systems.ts
```

### 3.3 手动测试

#### 测试签到
```bash
curl -X POST http://localhost:3000/SignIn \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user"}'
```

#### 测试等级
```bash
curl -X POST http://localhost:3000/GetLevelInfo \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user"}'
```

#### 测试邮件
```bash
curl -X POST http://localhost:3000/GetMailList \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user"}'
```

#### 测试VIP
```bash
curl -X POST http://localhost:3000/GetVIPInfo \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user"}'
```

---

## 📋 集成检查清单

### 数据库
- [x] 运行 InitIndexes.ts 创建索引
- [ ] 验证索引创建成功（使用MongoDB Compass查看）

### 定时任务
- [x] BuffSystem 清理任务已启动
- [x] MailSystem 清理任务已启动

### 系统集成
- [ ] TaskSystem → LevelSystem（任务完成给经验）
- [ ] AchievementSystem → LevelSystem（成就完成给经验）
- [ ] ApiRegister → MailSystem（注册发欢迎邮件）
- [ ] PaymentSystem → VIPSystem（支付更新VIP）
- [ ] SignInSystem → LevelSystem（签到给经验）
- [ ] InviteSystem → LevelSystem（邀请给经验）

### API测试
- [ ] 签到系统API测试通过
- [ ] 等级系统API测试通过
- [ ] 邮件系统API测试通过
- [ ] VIP系统API测试通过

---

## 🎯 快速集成脚本

为了方便集成，这里提供快速修改脚本：

### 1. TaskSystem集成

在 `TaskSystem.ts` 文件顶部添加import：
```typescript
import { LevelSystem, ExpSource } from './LevelSystem';
```

找到任务完成的方法，添加：
```typescript
await LevelSystem.addExp(userId, taskReward.exp || 100, ExpSource.Task);
```

### 2. AchievementSystem集成

在 `AchievementSystem.ts` 文件顶部添加import：
```typescript
import { LevelSystem, ExpSource } from './LevelSystem';
```

找到成就完成的方法，添加：
```typescript
await LevelSystem.addExp(userId, achievementReward.exp || 200, ExpSource.Achievement);
```

### 3. ApiRegister集成

在 `ApiRegister.ts` 文件顶部添加import：
```typescript
import { MailSystem } from '../bll/MailSystem';
```

在用户创建成功后添加：
```typescript
// 发送欢迎邮件
await MailSystem.sendMailFromTemplate(userId, 'welcome');
```

### 4. PaymentSystem集成

在 `PaymentSystem.ts` 文件顶部添加import：
```typescript
import { VIPSystem } from './VIPSystem';
```

在支付回调处理成功后添加：
```typescript
// 更新VIP累计充值
await VIPSystem.updateTotalRecharge(userId, amount);
```

---

## 🚀 完成后的效果

集成完成后，系统将实现：

1. **用户注册** → 自动收到欢迎邮件（含新手礼包）
2. **完成任务** → 获得金币+经验，可能升级
3. **每日签到** → 获得奖励+经验
4. **完成成就** → 获得奖励+经验
5. **充值付费** → 自动升级VIP等级
6. **邀请好友** → 获得奖励+经验
7. **升级** → 自动解锁新内容（皮肤、道具、倍率）
8. **VIP** → 享受各种特权加成

---

## ❓ 常见问题

### Q1: 如何验证索引创建成功？
**A:** 使用MongoDB Compass连接数据库，查看各个集合的Indexes标签页。

### Q2: 定时任务没有运行？
**A:** 确保在服务器启动时调用了 `InitSystems.initRuntime()`。

### Q3: API返回404？
**A:** 确保TSRPC协议文件已正确创建，并重新启动服务器。

### Q4: 如何测试邮件发送？
**A:** 可以直接调用 `MailSystem.sendMailFromTemplate(userId, 'welcome')`，然后查看MongoDB的mails集合。

### Q5: VIP充值统计不准确？
**A:** 确保在所有支付成功的地方都调用了 `VIPSystem.updateTotalRecharge()`。

---

## 📚 相关文档

- **STAGE_1_3_COMPLETE.md** - 完成报告
- **DEPLOYMENT_GUIDE.md** - 部署指南
- **REMAINING_SYSTEMS.md** - 剩余系统

---

**集成完成后，记得运行测试验证所有功能正常！** ✅
