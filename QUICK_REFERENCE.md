# Phase 1-3 快速参考

## 📂 新创建的文件清单

### 业务逻辑系统 (7个)
```
tsrpc_server/src/server/gate/bll/
├── ItemSystem.ts          (15K) - 道具系统
├── BuffSystem.ts          (12K) - Buff效果系统
├── InventorySystem.ts     (13K) - 背包系统
├── ShopSystem.ts          (17K) - 商城系统
├── PaymentSystem.ts       (18K) - 支付系统
├── InviteSystem.ts        (12K) - 邀请系统
└── ShareSystem.ts         (14K) - 分享系统
```

### API处理器 (10个)
```
tsrpc_server/src/server/gate/api/
├── ApiUseItem.ts             - 使用道具
├── ApiGetBuffs.ts            - 获取Buff列表
├── ApiExpandInventory.ts     - 扩展背包
├── ApiGetShopProducts.ts     - 获取商品列表
├── ApiPurchaseProduct.ts     - 购买商品
├── ApiCreatePaymentOrder.ts  - 创建支付订单
├── ApiGetInviteInfo.ts       - 获取邀请信息
├── ApiAcceptInvite.ts        - 接受邀请
├── ApiShare.ts               - 创建分享
└── ApiGetShareStats.ts       - 获取分享统计
```

### API协议定义 (12个)
```
tsrpc_server/src/tsrpc/protocols/gate/
├── PtlUseItem.ts
├── PtlGetBuffs.ts
├── PtlExpandInventory.ts
├── PtlGetShopProducts.ts
├── PtlPurchaseProduct.ts
├── PtlCreatePaymentOrder.ts
├── PtlGetInviteInfo.ts
├── PtlAcceptInvite.ts
├── PtlShare.ts
└── PtlGetShareStats.ts
```

### 初始化脚本 (2个)
```
tsrpc_server/src/server/gate/
├── data/InitIndexes.ts   - 数据库索引初始化
└── InitSystems.ts        - 系统启动初始化
```

### 文档 (3个)
```
项目根目录/
├── PHASE_1_3_IMPLEMENTATION.md    (17K) - 详细实现文档
├── DEPLOYMENT_GUIDE.md            (15K) - 部署指南
├── PHASE_1_3_COMPLETION_SUMMARY.md(13K) - 完成总结
└── QUICK_REFERENCE.md              - 本文档
```

---

## 🚀 快速启动

### 1. 初始化数据库索引
```bash
cd tsrpc_server
npx ts-node src/server/gate/data/InitIndexes.ts
```

### 2. 启动服务器
```bash
# 开发模式
npm run dev:gate

# 生产模式
npm run build && npm start
```

### 3. 测试API
```bash
# 测试道具系统
curl -X POST http://localhost:3000/UseItem \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","itemId":"hammer"}'

# 测试商城系统
curl -X POST http://localhost:3000/GetShopProducts \
  -H "Content-Type: application/json" \
  -d '{"userId":"test"}'

# 测试邀请系统
curl -X POST http://localhost:3000/GetInviteInfo \
  -H "Content-Type: application/json" \
  -d '{"userId":"test"}'
```

---

## 📊 系统速查

### 道具系统 (ItemSystem)
**5种道具：**
- `hammer` - 砸落器（5x推力，60s冷却）
- `multiplier_x2` - 2倍卡（30s，120s冷却）
- `multiplier_x3` - 3倍卡（60s，180s冷却）
- `magnet` - 磁铁卡（60s，180s冷却）
- `lucky_charm` - 幸运符（600s，600s冷却）
- `super_pusher` - 超级推进器（100币，300s冷却）

**API：** `POST /UseItem`

### Buff系统 (BuffSystem)
**5种Buff：**
- `reward_multiplier` - 奖励倍率
- `magnet` - 磁铁效果
- `lucky_charm` - 幸运加成
- `hammer_push` - 砸落推力
- `super_push` - 超级推力

**API：** `POST /GetBuffs`

**定时任务：** 每分钟清理过期Buff

### 背包系统 (InventorySystem)
**容量：** 初始50格，最大200格
**扩展成本：** 100/200/300/500/1000/2000金币（每次+10格）

**API：** `POST /ExpandInventory`

### 商城系统 (ShopSystem)
**8种商品类型：**
1. 金币包（小/中/大/超大）
2. 彩票包（20/50/100张）
3. 道具包
4. 限时礼包
5. 战斗通行证
6. VIP会员
7. 皮肤
8. 特殊道具

**API：**
- `POST /GetShopProducts` - 获取商品列表
- `POST /PurchaseProduct` - 购买商品

### 支付系统 (PaymentSystem)
**5种支付渠道：**
1. 微信支付
2. 支付宝
3. PayPal
4. Stripe
5. Sui区块链

**API：** `POST /CreatePaymentOrder`

**订单状态：** Pending → Paid → Delivered / Cancelled / Refunded

### 邀请系统 (InviteSystem)
**邀请码格式：** `INV` + 8位大写字母数字（如：INV12AB3C4D）

**奖励机制：**
1. 注册奖励：双方各得5金币
2. 首充返利：邀请者获得10%
3. 等级奖励：
   - Lv10: 50金币
   - Lv20: 100金币
   - Lv30: 200金币

**API：**
- `POST /GetInviteInfo` - 获取邀请码和统计
- `POST /AcceptInvite` - 接受邀请

### 分享系统 (ShareSystem)
**6种分享类型：**
1. `invite` - 邀请好友
2. `achievement` - 成就分享
3. `big_prize` - 大奖分享
4. `jackpot` - Jackpot分享
5. `rank` - 排行榜分享
6. `season` - 赛季分享

**6个分享渠道：**
微信、朋友圈、QQ、微博、Twitter、Facebook

**奖励：**
- 分享奖励：5金币/次
- 点击奖励：1金币/次
- 转化奖励：10金币/次
- 每日上限：50金币

**API：**
- `POST /Share` - 创建分享
- `POST /GetShareStats` - 获取统计

---

## 🗄️ 数据库速查

### MongoDB集合

| 集合 | 用途 | 关键字段 |
|------|------|----------|
| items | 道具配置 | itemId, itemType, cooldown |
| item_ownership | 道具所有权 | userId, itemId, quantity |
| item_cooldowns | 冷却记录 | userId, itemId, nextAvailableAt |
| buffs | Buff记录 | buffId, userId, buffType, endTime |
| inventories | 背包 | userId, maxSlots, expandCount |
| shop_products | 商品 | productId, category, price |
| purchase_history | 购买历史 | orderId, userId, productId |
| purchase_limits | 购买限制 | userId, productId, period |
| payment_orders | 支付订单 | orderId, userId, status |
| payment_callbacks | 支付回调 | orderId, callbackTime |
| invite_relations | 邀请关系 | inviterId, inviteeId |
| invite_stats | 邀请统计 | userId, totalInvites |
| share_records | 分享记录 | shareId, userId, shareType |
| share_stats | 分享统计 | userId, totalShares |

### DragonflyDB键

```
buff:{userId}                    - 用户Buff列表
shop:products:{category}         - 商品列表缓存
cooldown:{userId}:{itemId}       - 道具冷却
invite:stats:{userId}            - 邀请统计
share:stats:{userId}             - 分享统计
share:daily:{userId}             - 每日分享奖励计数
```

---

## ⚙️ 配置速查

### 环境变量 (.env)
```bash
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=coin_pusher_game

# DragonflyDB
DRAGONFLY_HOST=localhost
DRAGONFLY_PORT=6379
DRAGONFLY_PASSWORD=

# 服务器
PORT=3000
NODE_ENV=production

# 支付（生产环境必填）
WECHAT_APP_ID=
WECHAT_MCH_ID=
WECHAT_API_KEY=
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
STRIPE_SECRET_KEY=
SUI_WALLET_ADDRESS=
```

### 服务器集成
在 `tsrpc_server/src/server/gate/index.ts` 中添加：

```typescript
import { InitSystems } from './InitSystems';

// 服务器启动时调用
await InitSystems.initRuntime();
```

---

## 🔧 常用命令

### 开发
```bash
# 编译
npm run build

# 启动开发服务器
npm run dev:gate

# 类型检查
npx tsc --noEmit

# 运行测试
npm test
```

### 数据库
```bash
# 初始化索引
npx ts-node src/server/gate/data/InitIndexes.ts

# 连接MongoDB
mongo mongodb://localhost:27017/coin_pusher_game

# 查看集合
show collections

# 查看索引
db.buffs.getIndexes()
```

### 部署
```bash
# 生产构建
npm run build

# 启动生产服务器
npm start

# 使用PM2
pm2 start ecosystem.config.js
pm2 status
pm2 logs
```

---

## 📋 检查清单

### 部署前
- [ ] 配置所有环境变量
- [ ] 运行 InitIndexes.ts 创建数据库索引
- [ ] 配置支付渠道API密钥（生产环境）
- [ ] 修改商品配置（ShopSystem.ts）
- [ ] 配置道具效果（ItemSystem.ts）

### 部署后
- [ ] 测试所有API端点
- [ ] 验证支付流程
- [ ] 检查Buff清理任务日志
- [ ] 监控数据库性能
- [ ] 检查DragonflyDB缓存命中率

### 监控项
- [ ] API响应时间 < 100ms
- [ ] 数据库慢查询 < 100ms
- [ ] 支付成功率 > 99%
- [ ] Buff清理任务正常运行
- [ ] 缓存命中率 > 80%

---

## 🆘 常见问题

### Q: Buff没有自动清理？
**A:** 检查 `InitSystems.initRuntime()` 是否在服务器启动时被调用。

### Q: 支付回调失败？
**A:**
1. 检查回调URL是否正确配置
2. 验证签名密钥是否正确
3. 查看 payment_callbacks 集合确认回调记录

### Q: 邀请码无效？
**A:**
1. 确认邀请码格式（INV + 8位大写）
2. 检查用户是否已接受过其他邀请
3. 查看 invite_relations 集合

### Q: 购买限制不生效？
**A:**
1. 检查 purchase_limits 集合
2. 确认 resetTime 字段
3. 手动清理过期限制记录

### Q: 数据库查询慢？
**A:**
1. 使用 explain() 分析查询计划
2. 检查索引是否创建成功
3. 考虑增加复合索引

---

## 📞 获取帮助

**详细文档：**
- `PHASE_1_3_IMPLEMENTATION.md` - 完整实现文档
- `DEPLOYMENT_GUIDE.md` - 详细部署指南
- `PHASE_1_3_COMPLETION_SUMMARY.md` - 功能总结

**系统代码：**
- 业务逻辑：`tsrpc_server/src/server/gate/bll/`
- API处理器：`tsrpc_server/src/server/gate/api/`
- 初始化脚本：`tsrpc_server/src/server/gate/InitSystems.ts`

---

*最后更新：2025-12-03*
*版本：Phase 1-3 完成版*
