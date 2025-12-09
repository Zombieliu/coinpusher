# 剩余未实现的系统

根据游戏设计文档 (le.md) 对比当前实现，以下是还未完成的系统。

---

## ✅ 已完成的系统 (15个)

| 系统 | 文件 | 状态 |
|------|------|------|
| 抽奖系统 | LotterySystem.ts | ✅ 完成 |
| 奖励系统 | RewardSystem.ts | ✅ 完成 |
| 任务系统 | TaskSystem.ts | ✅ 完成 |
| 成就系统 | AchievementSystem.ts | ✅ 完成 |
| 排行榜系统 | LeaderboardSystem.ts | ✅ 完成 |
| 赛季系统 | SeasonSystem.ts | ✅ 完成 |
| 好友系统 | SocialSystem.ts | ✅ 完成 |
| 公会系统 | GuildSystem.ts | ✅ 完成 |
| 道具系统 | ItemSystem.ts | ✅ Phase 1 |
| Buff系统 | BuffSystem.ts | ✅ Phase 1 |
| 背包系统 | InventorySystem.ts | ✅ Phase 1 |
| 商城系统 | ShopSystem.ts | ✅ Phase 2 |
| 支付系统 | PaymentSystem.ts | ✅ Phase 2 |
| 邀请系统 | InviteSystem.ts | ✅ Phase 3 |
| 分享系统 | ShareSystem.ts | ✅ Phase 3 |

---

## ❌ 未实现的系统 (8个)

### 1. 签到系统 (Sign-in System)
**设计文档位置：** 4.1 7日签到

**功能需求：**
- 每日签到奖励
- 连续签到累计奖励
- 第7天奖励翻倍
- 第14/30天送限定皮肤
- 补签功能

**预估工作量：** 1-2天

**优先级：** ⭐⭐⭐ 高（用户留存核心功能）

---

### 2. 等级系统 (Level System)
**设计文档位置：** 4.3 等级系统

**功能需求：**
- 经验值累计
- 等级提升
- 等级奖励：
  - 解锁倍率（1x → 1.2x → 1.5x → 2x）
  - 解锁新皮肤
  - 提升掉落概率
- 等级排行榜

**预估工作量：** 2-3天

**优先级：** ⭐⭐⭐ 高（成长体系核心）

**注意：** 当前部分系统已有level字段，需要整合

---

### 3. 皮肤系统 (Skin System)
**设计文档位置：** 4.5 皮肤（外观自定义）

**功能需求：**
- 皮肤类型：
  - 推币机皮肤
  - 金币皮肤
  - 投币动画皮肤
- 皮肤商店
- 皮肤装备/切换
- 稀有度分级
- 限定皮肤

**预估工作量：** 3-4天

**优先级：** ⭐⭐ 中（商业化相关）

---

### 4. VIP系统 (VIP/Membership System)
**设计文档位置：** 9. 商业化设计 → ToC（玩家）

**功能需求：**
- VIP等级
- VIP特权：
  - 每日额外奖励
  - 经验加成
  - 掉落概率提升
  - 专属皮肤
  - 道具折扣
- 订阅/续费
- VIP到期提醒

**预估工作量：** 2-3天

**优先级：** ⭐⭐⭐ 高（重要收入来源）

---

### 5. 赛季通行证 (Battle Pass System)
**设计文档位置：** 9. 商业化设计 → ToC（玩家）

**功能需求：**
- 免费通行证
- 付费通行证
- 通行证等级
- 奖励轨道：
  - 免费奖励
  - 付费奖励
- 赛季任务
- 经验加速

**预估工作量：** 3-4天

**优先级：** ⭐⭐⭐ 高（长期留存+收入）

**注意：** 需要与SeasonSystem集成

---

### 6. 邮件系统 (Mail System)
**设计文档位置：** 未明确提及，但商业化和运营必需

**功能需求：**
- 系统邮件
- 奖励邮件
- 道具发放
- 公告推送
- 邮件过期
- 一键领取

**预估工作量：** 2天

**优先级：** ⭐⭐⭐ 高（运营必需）

---

### 7. 活动系统 (Event System)
**设计文档位置：** 未明确提及，但LiveOps运营必需

**功能需求：**
- 限时活动配置
- 活动类型：
  - 充值活动
  - 消费活动
  - 登陆活动
  - 推币活动
- 活动奖励
- 活动排行榜
- 活动进度跟踪

**预估工作量：** 3-4天

**优先级：** ⭐⭐ 中（运营增长）

---

### 8. Web3集成系统 (Web3 Integration)
**设计文档位置：** 13. 技术架构 → Sui + Dubhe Engine

**功能需求：**
- Sui钱包连接
- NFT铸造
- NFT展示
- Token兑换
- 链上资产查询
- 奖池提取
- Gas费管理

**预估工作量：** 5-7天

**优先级：** ⭐⭐⭐⭐ 最高（项目核心特色）

---

## 📊 总体对比

### 系统完成度

| 分类 | 已完成 | 未完成 | 完成率 |
|------|--------|--------|--------|
| 核心玩法 | 8/8 | 0/8 | 100% |
| 单人模式 | 3/6 | 3/6 | 50% |
| 社交系统 | 4/4 | 0/4 | 100% |
| 商业化 | 3/6 | 3/6 | 50% |
| Web3 | 0/1 | 1/1 | 0% |
| **总计** | **15/23** | **8/23** | **65%** |

---

## 🎯 推荐实施顺序

### 阶段1 - 用户体系完善 (1周)
优先级：⭐⭐⭐⭐⭐

1. **签到系统** (1-2天)
2. **等级系统** (2-3天)
3. **邮件系统** (2天)

**理由：** 这三个系统是留存和运营的基础设施，必须优先完成。

---

### 阶段2 - 商业化增强 (1.5周)
优先级：⭐⭐⭐⭐

4. **VIP系统** (2-3天)
5. **赛季通行证** (3-4天)
6. **皮肤系统** (3-4天)

**理由：** 商业化系统是收入来源，应尽快上线以验证商业模式。

---

### 阶段3 - 运营增长 (1周)
优先级：⭐⭐⭐

7. **活动系统** (3-4天)
8. 活动数据分析和优化 (2-3天)

**理由：** 活动系统用于长期运营和用户增长。

---

### 阶段4 - Web3核心 (1-2周)
优先级：⭐⭐⭐⭐⭐

9. **Web3集成系统** (5-7天)
10. NFT铸造和交易 (3-5天)

**理由：** Web3是项目的核心差异化特性，但可以在前面基础系统稳定后再集成。

---

## 📋 每个系统的详细规划

### 1. 签到系统实现计划

**数据库设计：**
```typescript
// MongoDB集合
sign_in_records: {
    userId: string;
    signInDate: number;        // 签到日期
    consecutiveDays: number;   // 连续天数
    totalDays: number;         // 总签到天数
    lastSignInTime: number;
    rewards: any[];
}

sign_in_configs: {
    day: number;               // 第几天
    rewards: {
        gold: number;
        tickets: number;
        items: string[];
        multiplier: number;    // 第7天翻倍
    };
}
```

**API设计：**
- `POST /SignIn` - 签到
- `POST /GetSignInInfo` - 获取签到状态
- `POST /GetSignInRewards` - 获取签到奖励配置

---

### 2. 等级系统实现计划

**数据库设计：**
```typescript
// 扩展users集合
{
    level: number;
    exp: number;
    expToNext: number;
    levelRewards: {
        multiplier: number;
        dropRate: number;
        unlockedSkins: string[];
    };
}

level_configs: {
    level: number;
    requiredExp: number;
    rewards: any;
}
```

**API设计：**
- `POST /GetLevelInfo` - 获取等级信息
- `POST /ClaimLevelReward` - 领取等级奖励

**集成点：**
- TaskSystem → 完成任务给经验
- RewardSystem → 奖励经验
- InviteSystem → 邀请给经验

---

### 3. VIP系统实现计划

**数据库设计：**
```typescript
vip_users: {
    userId: string;
    vipLevel: number;
    vipExpireAt: number;
    totalRecharge: number;
    privileges: {
        dailyGoldBonus: number;
        expMultiplier: number;
        dropRateBonus: number;
        shopDiscount: number;
    };
}

vip_orders: {
    orderId: string;
    userId: string;
    vipLevel: number;
    duration: number;          // 天数
    price: number;
    status: string;
}
```

**API设计：**
- `POST /GetVIPInfo` - 获取VIP信息
- `POST /PurchaseVIP` - 购买VIP
- `POST /RenewVIP` - 续费VIP
- `POST /GetVIPPrivileges` - 获取特权

---

### 4. 赛季通行证实现计划

**数据库设计：**
```typescript
battle_pass: {
    userId: string;
    seasonId: string;
    level: number;
    exp: number;
    isPremium: boolean;        // 是否购买付费版
    claimedRewards: number[];  // 已领取的等级
    purchasedAt?: number;
}

battle_pass_configs: {
    seasonId: string;
    level: number;
    requiredExp: number;
    freeRewards: any[];
    premiumRewards: any[];
}
```

**API设计：**
- `POST /GetBattlePassInfo` - 获取通行证信息
- `POST /PurchaseBattlePass` - 购买通行证
- `POST /ClaimBattlePassReward` - 领取奖励
- `POST /GetBattlePassLevels` - 获取所有等级奖励

**集成点：**
- SeasonSystem → 赛季开始/结束
- TaskSystem → 任务给通行证经验
- PaymentSystem → 购买通行证

---

## 🔧 快速开始某个系统

如果你想开始实现某个系统，告诉我系统名称，我会：

1. ✅ 创建完整的业务逻辑代码 (XXXSystem.ts)
2. ✅ 创建API处理器 (ApiXXX.ts)
3. ✅ 创建API协议 (PtlXXX.ts)
4. ✅ 设计数据库集合和索引
5. ✅ 提供集成指南
6. ✅ 编写测试用例

---

## 💡 建议

根据项目当前状态，建议优先实现：

### 最紧急（本周完成）
1. **签到系统** - 提升日活和留存
2. **等级系统** - 完善成长体系
3. **邮件系统** - 运营必需工具

### 次紧急（下周完成）
4. **VIP系统** - 重要收入来源
5. **赛季通行证** - 长期留存+收入

### 中期规划（2-4周）
6. **皮肤系统** - 个性化和收入
7. **活动系统** - 运营增长
8. **Web3集成** - 核心差异化

---

## 📞 下一步

请告诉我：
1. 你想先做哪个系统？
2. 还是按推荐顺序（签到→等级→邮件）依次实现？
3. 还是有其他优先级考虑？

我会立即开始实现！
