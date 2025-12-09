# 🚀 安全功能快速启动指南

5分钟启用所有安全防护

---

## Step 1: 配置环境变量（2分钟）

```bash
cd tsrpc_server

# 1. 复制配置模板
cp .env.example .env

# 2. 生成强密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. 编辑 .env 文件，粘贴生成的密钥
nano .env  # 或使用你喜欢的编辑器
```

**最小配置** (.env):
```bash
INTERNAL_SECRET_KEY=<粘贴刚才生成的64字符密钥>
ENABLE_REQUEST_SIGNATURE=true
DAILY_REWARD_LIMIT=1000
```

---

## Step 2: 初始化数据库（1分钟）

找到Gate Server的启动文件，添加RewardLimitDB初始化：

```typescript
// tsrpc_server/src/server/gate/index.ts（或类似文件）
import { RewardLimitDB } from './data/RewardLimitDB';

// 在MongoDB连接成功后添加：
async function initializeServer() {
    // ... 现有的MongoDB连接代码
    const mongoClient = await MongoClient.connect(MONGODB_URI);

    // 🆕 初始化RewardLimitDB
    await RewardLimitDB.init(mongoClient);

    console.log('✅ Security features initialized');

    // ... 其他初始化代码
}
```

---

## Step 3: 重启服务（1分钟）

```bash
# 重启所有服务
npm run restart  # 或你的启动命令

# 或分别重启
npm run start:gate   # Gate Server
npm run start:room   # Room Server
```

---

## Step 4: 验证配置（1分钟）

### 测试1: 投币冷却
```bash
# 连续快速投币，第二次应被拒绝
curl -X POST http://localhost:3001/api/game/DropCoin \
  -H "Content-Type: application/json" \
  -d '{"x": 0}'

# 立即重复（应返回错误）
curl -X POST http://localhost:3001/api/game/DropCoin \
  -H "Content-Type: application/json" \
  -d '{"x": 0}'

# 预期输出: "Please wait ... seconds before dropping another coin"
```

### 测试2: 每日限额
查看日志，应看到：
```
[ApiAddGold] Reward added: 1 gold for user123, balance: 100
```

当用户达到限额时（默认1000）：
```
[ApiAddGold] Daily limit exceeded for user123: 1000/1000
```

---

## 🎉 完成！

所有安全功能已启用：

✅ **投币冷却**: 500ms间隔 + 60次/分钟限制
✅ **请求签名**: HMAC-SHA256验证
✅ **时间戳防重放**: 5秒窗口
✅ **每日限额**: 1000金币/天

---

## 📊 监控命令

### 查看用户今日奖励
```typescript
const reward = await RewardLimitDB.getTodayReward('user123');
console.log(`Today's reward: ${reward}`);
```

### 查看排行榜
```typescript
const top10 = await RewardLimitDB.getTodayLeaderboard(10);
console.table(top10);
```

### 查看全局统计
```typescript
const stats = await RewardLimitDB.getGlobalTodayStats();
console.log(`Total reward: ${stats.totalReward}, Users: ${stats.totalUsers}`);
```

---

## ⚙️ 调整配置

### 修改投币冷却时间
```bash
# .env
DROP_COIN_COOLDOWN_MS=1000  # 改为1秒
```

### 修改每日限额
```bash
# .env
DAILY_REWARD_LIMIT=500  # 改为500金币/天
```

### 禁用签名验证（仅开发环境）
```bash
# .env
ENABLE_REQUEST_SIGNATURE=false
```

---

## 🐛 故障排查

### 问题1: "Unauthorized: Invalid token"
**原因**: 环境变量未加载或密钥不一致

**解决**:
```bash
# 检查环境变量
echo $INTERNAL_SECRET_KEY

# 确保所有服务使用同一个 .env 文件
```

### 问题2: "Rate limit exceeded"
**原因**: 正常的限流机制

**解决**:
```typescript
// 调整限流参数（RateLimiter构造函数）
const dropCoinCooldown = new RateLimiter('DropCoin', 200); // 改为200ms
```

### 问题3: MongoDB连接失败
**原因**: RewardLimitDB初始化失败

**解决**:
```bash
# 检查MongoDB是否运行
mongo --eval "db.version()"

# 检查连接字符串
echo $MONGODB_URI
```

---

## 📖 更多信息

- 完整文档: `SECURITY_IMPROVEMENTS.md`
- 配置模板: `.env.example`
- API文档: `README_ARCHITECTURE.md`

---

**祝顺利！如有问题请查看日志或联系开发团队。**
