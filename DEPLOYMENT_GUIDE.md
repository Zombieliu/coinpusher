# Phase 1-3 系统部署指南

## 📋 目录

1. [系统概览](#系统概览)
2. [环境要求](#环境要求)
3. [部署步骤](#部署步骤)
4. [数据库初始化](#数据库初始化)
5. [系统配置](#系统配置)
6. [启动服务](#启动服务)
7. [验证部署](#验证部署)
8. [监控和维护](#监控和维护)
9. [故障排查](#故障排查)

---

## 系统概览

Phase 1-3 实现了以下7个核心系统：

### Phase 1 - 核心玩法补全
- **ItemSystem** - 道具系统（5种道具类型）
- **BuffSystem** - Buff效果系统（自动过期和清理）
- **InventorySystem** - 背包系统（统一道具和收藏品管理）

### Phase 2 - 商业化
- **ShopSystem** - 商城系统（8种商品类型）
- **PaymentSystem** - 支付系统（5种支付渠道）

### Phase 3 - 增长裂变
- **InviteSystem** - 邀请系统（三级奖励机制）
- **ShareSystem** - 分享系统（6种分享类型）

**代码统计：**
- 7个系统文件：3,330行业务逻辑代码
- 10个API处理器：~300行
- 12个API协议定义
- 1个数据库索引初始化脚本
- 1个系统初始化脚本

---

## 环境要求

### 必需服务
- **Node.js**: >= 16.x
- **TypeScript**: >= 4.5
- **MongoDB**: >= 5.0
- **DragonflyDB**: >= 1.0 (或 Redis >= 6.0)

### 推荐配置

**开发环境：**
- CPU: 2核心
- 内存: 4GB
- 存储: 20GB

**生产环境：**
- CPU: 4核心+
- 内存: 8GB+
- 存储: 100GB+
- MongoDB: 复制集模式
- DragonflyDB: 持久化配置

---

## 部署步骤

### 1. 代码部署

```bash
# 克隆或更新代码
cd /Users/henryliu/cocos/numeron-world/oops-moba/tsrpc_server

# 安装依赖
npm install

# 编译TypeScript
npm run build
```

### 2. 环境变量配置

创建或更新 `.env` 文件：

```bash
# MongoDB配置
MONGO_URL=mongodb://localhost:27017
DB_NAME=coin_pusher_game

# DragonflyDB配置
DRAGONFLY_HOST=localhost
DRAGONFLY_PORT=6379
DRAGONFLY_PASSWORD=your_password_here

# 服务器配置
PORT=3000
NODE_ENV=production

# 支付系统配置（生产环境必填）
WECHAT_APP_ID=your_wechat_app_id
WECHAT_MCH_ID=your_wechat_mch_id
WECHAT_API_KEY=your_wechat_api_key

ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key

PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret

STRIPE_SECRET_KEY=your_stripe_secret_key

SUI_WALLET_ADDRESS=your_sui_wallet_address
```

### 3. 数据库初始化

#### 方式1：使用初始化脚本（推荐）

```bash
# 执行索引创建脚本
npx ts-node src/server/gate/data/InitIndexes.ts

# 输出示例：
# Starting index creation...
# MongoDB URL: mongodb://localhost:27017
# Database: coin_pusher_game
# [InitIndexes] Connected to MongoDB
# [InitIndexes] Creating indexes for Item System...
# [InitIndexes] Creating indexes for Buff System...
# ... (其他系统)
# [InitIndexes] All indexes created successfully!
# ✅ Index creation completed successfully!
```

#### 方式2：手动执行MongoDB命令

连接到MongoDB：
```bash
mongo mongodb://localhost:27017/coin_pusher_game
```

执行索引创建（见下一节详细命令）

### 4. 注入演示数据（可选）

在本地或测试环境中，可以运行根目录提供的 seed 脚本快速准备可视化数据：

```bash
pnpm ts-node seed-admin-demo.ts
```

脚本读取 `test-env.ts` 中的 Mongo URI（默认 `mongodb://127.0.0.1:27018/coinpusher_game`），会自动创建 `admin / admin123` 管理员并写入示例用户、充值订单、在线 Session、审计日志与客服工单，方便验证管理后台的统计图、日志、客服页面。

---

## 数据库初始化

### MongoDB 集合和索引

脚本会自动创建以下集合和索引：

#### 1. 道具系统 (ItemSystem)

**集合：items**
```javascript
db.items.createIndex({ itemId: 1 }, { unique: true })
db.items.createIndex({ itemType: 1 })
db.items.createIndex({ enabled: 1 })
```

**集合：item_ownership**
```javascript
db.item_ownership.createIndex({ userId: 1, itemId: 1 }, { unique: true })
db.item_ownership.createIndex({ userId: 1 })
db.item_ownership.createIndex({ itemId: 1 })
db.item_ownership.createIndex({ quantity: 1 })
```

**集合：item_cooldowns**
```javascript
db.item_cooldowns.createIndex({ userId: 1, itemId: 1 }, { unique: true })
db.item_cooldowns.createIndex({ lastUsedAt: 1 })
db.item_cooldowns.createIndex({ nextAvailableAt: 1 })
```

#### 2. Buff系统 (BuffSystem)

**集合：buffs**
```javascript
db.buffs.createIndex({ buffId: 1 }, { unique: true })
db.buffs.createIndex({ userId: 1 })
db.buffs.createIndex({ buffType: 1 })
db.buffs.createIndex({ userId: 1, active: 1 })
db.buffs.createIndex({ endTime: 1 })
db.buffs.createIndex({ userId: 1, buffType: 1, active: 1 })
```

#### 3. 背包系统 (InventorySystem)

**集合：inventories**
```javascript
db.inventories.createIndex({ userId: 1 }, { unique: true })
db.inventories.createIndex({ maxSlots: 1 })
db.inventories.createIndex({ expandCount: 1 })
```

#### 4. 商城系统 (ShopSystem)

**集合：shop_products**
```javascript
db.shop_products.createIndex({ productId: 1 }, { unique: true })
db.shop_products.createIndex({ category: 1 })
db.shop_products.createIndex({ available: 1 })
db.shop_products.createIndex({ category: 1, available: 1 })
```

**集合：purchase_history**
```javascript
db.purchase_history.createIndex({ orderId: 1 }, { unique: true })
db.purchase_history.createIndex({ userId: 1 })
db.purchase_history.createIndex({ userId: 1, purchaseTime: -1 })
db.purchase_history.createIndex({ userId: 1, productId: 1 })
```

**集合：purchase_limits**
```javascript
db.purchase_limits.createIndex({ userId: 1, productId: 1, period: 1 }, { unique: true })
db.purchase_limits.createIndex({ resetTime: 1 })
```

#### 5. 支付系统 (PaymentSystem)

**集合：payment_orders**
```javascript
db.payment_orders.createIndex({ orderId: 1 }, { unique: true })
db.payment_orders.createIndex({ userId: 1 })
db.payment_orders.createIndex({ status: 1 })
db.payment_orders.createIndex({ userId: 1, createdAt: -1 })
db.payment_orders.createIndex({ status: 1, createdAt: 1 })
```

**集合：payment_callbacks**
```javascript
db.payment_callbacks.createIndex({ orderId: 1 })
db.payment_callbacks.createIndex({ callbackTime: 1 })
```

#### 6. 邀请系统 (InviteSystem)

**集合：invite_relations**
```javascript
db.invite_relations.createIndex({ inviterId: 1 })
db.invite_relations.createIndex({ inviteeId: 1 }, { unique: true })
db.invite_relations.createIndex({ inviteCode: 1 })
db.invite_relations.createIndex({ inviterId: 1, invitedAt: -1 })
```

**集合：invite_stats**
```javascript
db.invite_stats.createIndex({ userId: 1 }, { unique: true })
db.invite_stats.createIndex({ totalInvites: 1 })
```

#### 7. 分享系统 (ShareSystem)

**集合：share_records**
```javascript
db.share_records.createIndex({ shareId: 1 }, { unique: true })
db.share_records.createIndex({ userId: 1 })
db.share_records.createIndex({ shareType: 1 })
db.share_records.createIndex({ userId: 1, sharedAt: -1 })
```

**集合：share_stats**
```javascript
db.share_stats.createIndex({ userId: 1 }, { unique: true })
db.share_stats.createIndex({ totalShares: 1 })
db.share_stats.createIndex({ lastShareDate: 1 })
```

---

## 系统配置

### 1. Gate服务器集成

在 `tsrpc_server/src/server/gate/index.ts` 中添加系统初始化：

```typescript
import { InitSystems } from './InitSystems';

// 在服务器启动时调用
async function startServer() {
    // ... 其他初始化代码

    // 初始化Phase 1-3系统
    await InitSystems.initRuntime();

    // ... 启动TSRPC服务器
}

startServer();
```

### 2. 商品配置

商城系统使用代码配置商品，在 `ShopSystem.ts` 中修改 `PRODUCT_CONFIGS`：

```typescript
private static readonly PRODUCT_CONFIGS = {
    'gold_pack_small': {
        productId: 'gold_pack_small',
        name: '小金币包',
        description: '100金币',
        price: 6,
        currency: CurrencyType.RMB,
        category: ProductCategory.Currency,
        content: { goldAmount: 100 }
    },
    // ... 添加更多商品
};
```

### 3. 道具配置

在 `ItemSystem.ts` 中配置道具效果：

```typescript
private static readonly ITEM_CONFIGS = {
    'hammer': {
        itemId: 'hammer',
        itemType: ItemType.Hammer,
        name: '砸落器',
        description: '砸落推币机上的金币',
        cooldown: 60,
        maxStack: 99,
        effect: {
            effectType: EffectType.PushForce,
            pushForceMultiplier: 5.0,
            duration: 0
        }
    },
    // ... 其他道具配置
};
```

---

## 启动服务

### 开发模式

```bash
# 启动Gate服务器
npm run dev:gate

# 启动Room服务器
npm run dev:room

# 启动Match服务器
npm run dev:match
```

### 生产模式

```bash
# 编译
npm run build

# 启动服务
npm start

# 使用PM2管理进程（推荐）
pm2 start ecosystem.config.js
```

### PM2配置示例

创建 `ecosystem.config.js`：

```javascript
module.exports = {
    apps: [
        {
            name: 'gate-server',
            script: 'dist/server/gate/index.js',
            instances: 2,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        },
        {
            name: 'room-server',
            script: 'dist/server/room/index.js',
            instances: 4,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            }
        }
    ]
};
```

---

## 验证部署

### 1. 检查服务状态

```bash
# 检查MongoDB连接
mongo mongodb://localhost:27017/coin_pusher_game --eval "db.stats()"

# 检查DragonflyDB
redis-cli -h localhost -p 6379 ping

# 检查服务进程
pm2 status
```

### 2. API测试

使用测试脚本验证API：

```bash
# 测试道具系统
curl -X POST http://localhost:3000/UseItem \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","itemId":"hammer"}'

# 测试商城系统
curl -X POST http://localhost:3000/GetShopProducts \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user"}'

# 测试邀请系统
curl -X POST http://localhost:3000/GetInviteInfo \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user"}'
```

### 3. 数据库验证

```javascript
// 连接MongoDB
mongo mongodb://localhost:27017/coin_pusher_game

// 检查集合
show collections

// 检查索引
db.items.getIndexes()
db.buffs.getIndexes()
db.shop_products.getIndexes()

// 检查数据
db.items.find().limit(5)
db.shop_products.find().limit(5)
```

---

## 监控和维护

### 1. 日志监控

```bash
# PM2日志
pm2 logs gate-server
pm2 logs --lines 100

# 系统日志关键字
grep "Error" logs/gate-server.log
grep "BuffSystem" logs/gate-server.log
grep "PaymentSystem" logs/gate-server.log
```

### 2. 性能监控

关键指标：
- API响应时间
- MongoDB查询性能
- DragonflyDB命中率
- Buff清理任务执行情况

```bash
# MongoDB慢查询
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ts: -1}).limit(5)

# DragonflyDB监控
redis-cli INFO stats
redis-cli INFO memory
```

### 3. 定期维护任务

**每日任务：**
- 检查BuffSystem清理日志
- 检查支付订单状态
- 清理过期的payment_orders

**每周任务：**
- 分析购买数据和趋势
- 检查邀请系统转化率
- 备份MongoDB数据

**每月任务：**
- 归档历史订单数据
- 优化数据库索引
- 更新商品配置

### 4. API 指标接入

Gate/Match/Room 服务会在 `MONITORING_PORT`(`9090/9091/9092`) 暴露 `/metrics`、`/live`、`/ready` 端点。若要让新增接口出现在 Prometheus 指标中，可在 handler 中加入以下模式：

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

保持 endpoint 命名一致后，`api_response_time_seconds`、`api_errors_total` 等指标就会自动包含该接口，可在 Grafana 中随时观测延迟、错误率。

---

## 故障排查

### 问题1：Buff未自动清理

**症状：** 过期的Buff仍然显示为激活状态

**排查：**
```bash
# 检查BuffSystem清理任务
grep "cleanupExpiredBuffs" logs/gate-server.log

# 手动触发清理
mongo <<EOF
use coin_pusher_game
db.buffs.updateMany(
    { endTime: { \$lt: Date.now() }, active: true },
    { \$set: { active: false } }
)
EOF
```

**解决：** 确保 `InitSystems.initRuntime()` 在服务器启动时被调用

### 问题2：支付回调失败

**症状：** 用户支付成功但未收到商品

**排查：**
```javascript
// 查询订单状态
db.payment_orders.find({ userId: "problem_user" }).sort({ createdAt: -1 })

// 检查回调记录
db.payment_callbacks.find({ orderId: "order_id" })
```

**解决：**
```typescript
// 手动补发订单
const result = await PaymentSystem.deliverOrder('order_id');
```

### 问题3：邀请码无效

**症状：** 用户输入邀请码提示无效

**排查：**
```javascript
// 检查邀请码是否存在
db.invite_stats.find({ inviteCode: "INV12ABC" })

// 检查是否已被使用
db.invite_relations.find({ inviteCode: "INV12ABC" })
```

**解决：**
- 确认邀请码格式正确（INV + 8位大写字母数字）
- 检查inviteeId是否已接受过其他邀请（一个用户只能接受一次邀请）

### 问题4：商品购买限制异常

**症状：** 用户无法购买已重置的限购商品

**排查：**
```javascript
// 检查购买限制记录
db.purchase_limits.find({ userId: "user_id", productId: "product_id" })

// 检查resetTime
db.purchase_limits.find({ resetTime: { $lt: Date.now() } })
```

**解决：**
```javascript
// 手动重置购买限制
db.purchase_limits.deleteMany({ resetTime: { $lt: Date.now() } })
```

### 问题5：数据库连接超时

**症状：** API响应缓慢，大量超时错误

**排查：**
```bash
# 检查MongoDB连接数
mongo --eval "db.serverStatus().connections"

# 检查慢查询
db.system.profile.find({ millis: { $gt: 100 } })
```

**解决：**
- 增加MongoDB连接池大小
- 检查未创建的索引
- 优化查询语句

---

## 性能优化建议

### 1. 数据库优化

- **索引优化：** 定期使用 `explain()` 分析查询计划
- **分片：** 当数据量超过100GB时考虑分片
- **连接池：** 生产环境设置合理的连接池大小（建议20-50）

### 2. 缓存策略

- **DragonflyDB缓存：**
  - 用户活跃Buff：TTL 5分钟
  - 商品列表：TTL 1小时
  - 邀请统计：TTL 10分钟

### 3. 系统扩展

- **水平扩展：** Gate服务器支持多实例部署
- **读写分离：** MongoDB使用从库处理读请求
- **消息队列：** 支付回调使用消息队列处理，确保可靠性

---

## 安全建议

1. **支付系统：**
   - 生产环境必须使用HTTPS
   - 验证所有支付回调签名
   - 订单金额必须在服务端验证

2. **API安全：**
   - 实现请求频率限制
   - 验证userId来源
   - 敏感操作需要二次验证

3. **数据安全：**
   - 定期备份MongoDB
   - 加密存储支付凭证
   - 日志脱敏处理

---

## 联系支持

如遇到部署问题，请提供以下信息：
- 错误日志
- 系统环境信息
- 复现步骤

祝部署顺利！🚀
