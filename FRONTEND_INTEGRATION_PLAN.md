# 🎨 前端UI对接实施计划

**项目**: OOPS-MOBA
**当前状态**: 后端100%完成，前端架构90%完成
**待完成**: UI界面开发和API对接（约5%工作量）
**更新时间**: 2025-12-04

---

## 📊 现状分析

### ✅ 已完成（可直接使用）

1. **后端服务** - 100%
   - 47个游戏API完整实现
   - 23个管理API完整实现
   - 所有业务逻辑已完成
   - 服务器运行稳定（Gate:2000, Match:3001, Room:3002）

2. **前端网络层** - 100%
   - `NetworkManager` - 网络管理器
   - `GateService` - Gate服务器通信
   - `MatchService` - 匹配服务通信
   - `RoomService` - 房间服务通信
   - 104个协议定义（与后端同步）

3. **基础资源** - 80%
   - 48个UI Prefab组件
   - 23个UI脚本
   - 56张图片资源
   - 15个音效文件

### ⚠️ 需要完成

- **UI界面开发**: 创建游戏界面和交互逻辑
- **API调用对接**: 在UI中调用已有的网络API
- **数据展示**: 将服务器返回数据渲染到UI

---

## 🎯 对接优先级顺序

我将对接工作分为4个阶段，按照依赖关系和重要性排序：

---

## 第一阶段：核心流程（必须完成）⭐⭐⭐

### 目标：让玩家能进入游戏并开始对局

#### 1.1 登录注册系统 🔐

**优先级**: P0（最高）
**预计时间**: 2-3小时
**依赖**: 无

**需要对接的API**:
- `Login` - 用户登录
- `Register` - 用户注册

**UI界面**:
```
登录界面 (LoginView)
├── 用户名输入框
├── 登录按钮
├── 注册按钮
└── 错误提示

注册界面 (RegisterView)
├── 用户名输入框
├── 确认按钮
└── 返回按钮
```

**实现步骤**:
1. 创建 `LoginView.ts` 和 UI Prefab
2. 调用 `NetworkManager.instance.gate.login(username)`
3. 保存返回的 token 和用户信息
4. 跳转到主界面

**参考代码**:
```typescript
// LoginView.ts
async onLoginClick() {
    try {
        const res = await NetworkManager.instance.gate.login(this.username);
        // 保存用户数据
        GameDataManager.instance.setUserData(res);
        // 跳转主界面
        SceneManager.loadScene("MainScene");
    } catch (error) {
        this.showError(error.message);
    }
}
```

---

#### 1.2 主界面/大厅 🏠

**优先级**: P0
**预计时间**: 3-4小时
**依赖**: 登录系统

**需要对接的API**:
- `GetLevelInfo` - 获取等级信息
- `GetSignInInfo` - 获取签到信息
- `GetMailList` - 获取邮件列表（未读提示）

**UI界面**:
```
主界面 (MainView)
├── 用户信息面板
│   ├── 头像
│   ├── 昵称
│   ├── 等级/经验条
│   ├── 金币数量
│   └── VIP状态
├── 功能按钮区
│   ├── 开始游戏（匹配）按钮
│   ├── 任务按钮
│   ├── 商城按钮
│   ├── 背包按钮
│   ├── 好友按钮
│   └── 设置按钮
└── 邮件通知（红点）
```

**实现步骤**:
1. 创建主界面布局
2. 加载用户基础信息
3. 显示金币、等级、VIP等状态
4. 检查邮件未读数（红点提示）

---

#### 1.3 匹配系统 🎮

**优先级**: P0
**预计时间**: 2-3小时
**依赖**: 主界面

**需要对接的API**:
- Match服务器的匹配API（通过MatchService）

**UI界面**:
```
匹配界面 (MatchView)
├── 匹配动画
├── 匹配进度提示
├── 取消按钮
└── 匹配成功提示
```

**实现步骤**:
1. 点击"开始游戏"进入匹配
2. 连接 Match 服务器
3. 显示匹配动画和等待状态
4. 匹配成功后跳转游戏房间

---

#### 1.4 游戏房间 🎲

**优先级**: P0
**预计时间**: 4-5小时
**依赖**: 匹配系统

**需要对接的API**:
- Room服务器的房间API（通过RoomService）

**UI界面**:
```
游戏房间界面 (RoomView)
├── 玩家列表
├── 房间状态
├── 游戏战斗界面
└── 退出按钮
```

**实现步骤**:
1. 连接 Room 服务器
2. 同步游戏状态
3. 实现战斗逻辑显示
4. 游戏结束返回主界面

---

**第一阶段总结**:
- **总耗时**: 11-15小时
- **完成后**: 玩家可以完整体验 登录→大厅→匹配→游戏 的核心流程
- **测试要点**: 两个客户端能否正常匹配并进行对局

---

## 第二阶段：基础游戏系统（核心玩法）⭐⭐

### 目标：增加玩家粘性，提供基础养成内容

#### 2.1 任务系统 📋

**优先级**: P1
**预计时间**: 3-4小时

**需要对接的API**:
- `GetUserTasks` - 获取用户任务列表
- `ClaimTaskReward` - 领取任务奖励

**UI界面**:
```
任务面板 (TaskView)
├── 每日任务列表
│   ├── 任务名称
│   ├── 任务描述
│   ├── 进度条 (3/10)
│   └── 领取按钮
├── 成就任务列表
└── 奖励提示动画
```

**实现步骤**:
1. 从服务器获取任务列表
2. 显示任务进度
3. 完成任务后显示"可领取"状态
4. 点击领取，调用API并播放奖励动画
5. 更新用户金币/经验

---

#### 2.2 成就系统 🏆

**优先级**: P1
**预计时间**: 3-4小时

**需要对接的API**:
- `GetUserAchievements` - 获取成就列表
- `ClaimAchievementReward` - 领取成就奖励

**UI界面**:
```
成就面板 (AchievementView)
├── 成就分类标签
│   ├── 新手
│   ├── 战斗
│   └── 社交
├── 成就列表
│   ├── 成就图标
│   ├── 成就名称
│   ├── 完成进度
│   └── 奖励预览
└── 总成就点数
```

---

#### 2.3 等级&经验系统 ⬆️

**优先级**: P1
**预计时间**: 2-3小时

**需要对接的API**:
- `GetLevelInfo` - 获取等级信息
- `AddExp` - 增加经验（测试用）

**UI界面**:
```
等级信息（嵌入主界面）
├── 当前等级显示
├── 经验进度条
├── 升级动画
└── 升级奖励提示
```

**特殊处理**:
- 在完成任务、对局后自动更新经验
- 升级时播放特效和奖励提示
- 各界面都要同步等级显示

---

#### 2.4 签到系统 ✅

**优先级**: P1
**预计时间**: 2-3小时

**需要对接的API**:
- `GetSignInInfo` - 获取签到信息
- `SignIn` - 每日签到

**UI界面**:
```
签到面板 (CheckinView)
├── 本月日历
├── 每日奖励预览
├── 签到按钮
├── 连续签到天数
└── 补签功能（可选）
```

---

**第二阶段总结**:
- **总耗时**: 10-14小时
- **完成后**: 游戏有了基础的养成循环（做任务→获得奖励→升级）
- **测试要点**: 任务进度是否正确更新，奖励是否正确发放

---

## 第三阶段：商业化系统（变现）⭐⭐

### 目标：构建完整的游戏经济系统

#### 3.1 商城系统 🛒

**优先级**: P2
**预计时间**: 4-5小时

**需要对接的API**:
- `GetShopProducts` - 获取商品列表
- `PurchaseProduct` - 购买商品
- `CreatePaymentOrder` - 创建支付订单

**UI界面**:
```
商城面板 (ShopView)
├── 商品分类标签
│   ├── 货币
│   ├── 道具
│   └── 礼包
├── 商品列表
│   ├── 商品图标
│   ├── 商品名称
│   ├── 价格
│   ├── 折扣标签
│   └── 购买按钮
└── 购买确认弹窗
```

---

#### 3.2 背包系统 🎒

**优先级**: P2
**预计时间**: 3-4小时

**需要对接的API**:
- `GetInventory` - 获取背包物品
- `UseItem` - 使用道具
- `ExpandInventory` - 扩展背包

**UI界面**:
```
背包面板 (InventoryView)
├── 物品分类
│   ├── 全部
│   ├── 消耗品
│   └── 永久道具
├── 物品列表（格子）
│   ├── 物品图标
│   ├── 数量
│   └── 过期时间
├── 物品详情弹窗
│   ├── 物品说明
│   └── 使用/丢弃按钮
└── 背包容量 (20/50)
```

---

#### 3.3 VIP系统 👑

**优先级**: P2
**预计时间**: 3-4小时

**需要对接的API**:
- `GetVIPInfo` - 获取VIP信息
- `PurchaseVIP` - 购买VIP

**UI界面**:
```
VIP面板 (VIPView)
├── VIP等级展示
├── VIP特权列表
│   ├── 经验加成 +20%
│   ├── 金币加成 +20%
│   └── 每日奖励
├── VIP到期时间
└── 购买/续费按钮
```

---

#### 3.4 邮件系统 📧

**优先级**: P2
**预计时间**: 3-4小时

**需要对接的API**:
- `GetMailList` - 获取邮件列表
- `ClaimMailReward` - 领取邮件奖励

**UI界面**:
```
邮件面板 (MailView)
├── 邮件列表
│   ├── 发件人
│   ├── 邮件标题
│   ├── 未读标记
│   ├── 时间
│   └── 附件图标
├── 邮件详情
│   ├── 邮件内容
│   ├── 附件奖励
│   └── 领取按钮
└── 一键领取按钮
```

---

**第三阶段总结**:
- **总耗时**: 13-17小时
- **完成后**: 完整的游戏经济循环（商城购买→背包使用→VIP特权）
- **测试要点**: 购买流程是否顺畅，道具使用是否生效

---

## 第四阶段：社交&进阶系统（长期留存）⭐

### 目标：增强社交互动，提升游戏深度

#### 4.1 排行榜系统 📊

**优先级**: P3
**预计时间**: 2-3小时

**需要对接的API**:
- `GetLeaderboard` - 获取排行榜
- `GetUserRank` - 获取个人排名

**UI界面**:
```
排行榜面板 (LeaderboardView)
├── 排行榜类型切换
│   ├── 等级榜
│   ├── 战力榜
│   └── 赛季榜
├── 排名列表
│   ├── 排名
│   ├── 玩家头像
│   ├── 玩家昵称
│   └── 分数
└── 我的排名
```

---

#### 4.2 好友系统 👥

**优先级**: P3
**预计时间**: 4-5小时

**需要对接的API**:
- `GetFriendList` - 获取好友列表
- `SendFriendRequest` - 发送好友请求
- `HandleFriendRequest` - 处理好友请求
- `SendFriendGift` - 赠送好友礼物

**UI界面**:
```
好友面板 (FriendView)
├── 好友列表
│   ├── 头像
│   ├── 昵称
│   ├── 在线状态
│   └── 操作按钮
├── 好友申请
├── 添加好友
└── 赠送礼物
```

---

#### 4.3 公会系统 🏰

**优先级**: P3
**预计时间**: 5-6小时

**需要对接的API**:
- `GetGuildInfo` - 获取公会信息
- `CreateGuild` - 创建公会
- `ApplyToGuild` - 申请加入公会
- `GuildDonate` - 公会捐献

**UI界面**:
```
公会面板 (GuildView)
├── 公会信息
│   ├── 公会名称
│   ├── 公会等级
│   ├── 成员数量
│   └── 公会公告
├── 成员列表
├── 公会捐献
└── 退出/解散公会
```

---

#### 4.4 赛季通行证 🎫

**优先级**: P3
**预计时间**: 4-5小时

**需要对接的API**:
- `GetSeasonInfo` - 获取赛季信息
- `PurchaseBattlePass` - 购买通行证
- `ClaimSeasonReward` - 领取赛季奖励

**UI界面**:
```
赛季通行证面板 (BattlePassView)
├── 赛季进度条
├── 免费奖励轨道
├── 付费奖励轨道
├── 等级展示
└── 购买通行证按钮
```

---

#### 4.5 抽奖系统 🎰

**优先级**: P3
**预计时间**: 3-4小时

**需要对接的API**:
- `DrawLottery` - 进行抽奖
- `GetJackpotProgress` - 获取奖池进度（可选）

**UI界面**:
```
抽奖面板 (LotteryView)
├── 抽奖转盘/机器
├── 奖品展示
├── 抽奖按钮
│   ├── 单抽
│   └── 十连抽
├── 抽奖记录
└── 抽奖结果动画
```

---

#### 4.6 分享&邀请系统 📱

**优先级**: P3
**预计时间**: 2-3小时

**需要对接的API**:
- `Share` - 分享游戏
- `GetShareStats` - 获取分享统计
- `AcceptInvite` - 接受邀请
- `GetInviteInfo` - 获取邀请信息

**UI界面**:
```
分享面板 (ShareView)
├── 分享按钮
├── 邀请码生成
├── 邀请奖励说明
└── 已邀请好友列表
```

---

**第四阶段总结**:
- **总耗时**: 20-26小时
- **完成后**: 游戏社交系统完整，具备长期运营能力
- **测试要点**: 好友互动、公会功能、分享机制

---

## 📅 完整时间规划

| 阶段 | 内容 | 预计时间 | 优先级 | 状态 |
|------|------|---------|--------|------|
| **阶段一** | 核心流程 | 11-15小时 | P0 | ⏳ 待开始 |
| **阶段二** | 基础系统 | 10-14小时 | P1 | ⏳ 待开始 |
| **阶段三** | 商业化 | 13-17小时 | P2 | ⏳ 待开始 |
| **阶段四** | 社交进阶 | 20-26小时 | P3 | ⏳ 待开始 |
| **总计** | - | **54-72小时** | - | - |

按每天8小时计算：**7-9个工作日**可以完成全部对接

---

## 🔧 技术实施建议

### 1. 代码结构建议

```
assets/script/game/
├── ui/                      # UI界面目录
│   ├── login/              # 登录相关
│   │   ├── LoginView.ts
│   │   └── RegisterView.ts
│   ├── main/               # 主界面
│   │   └── MainView.ts
│   ├── task/               # 任务系统
│   │   └── TaskView.ts
│   ├── shop/               # 商城
│   │   └── ShopView.ts
│   └── ...
├── manager/                 # 管理器
│   ├── GameDataManager.ts  # 游戏数据管理
│   ├── UIManager.ts        # UI管理器
│   └── EventManager.ts     # 事件管理器
└── common/                  # 公共组件
    ├── UIBase.ts           # UI基类
    ├── ListItem.ts         # 列表项基类
    └── PopupManager.ts     # 弹窗管理
```

### 2. 网络调用模板

```typescript
// 标准API调用模板
export class TaskView extends UIBase {
    async loadTasks() {
        try {
            // 显示加载中
            this.showLoading();

            // 调用API
            const res = await NetworkManager.instance.gate.client!.callApi(
                'GetUserTasks',
                {}
            );

            // 检查结果
            if (!res.isSucc) {
                throw new Error(res.err.message);
            }

            // 更新UI
            this.updateTaskList(res.res.tasks);

        } catch (error) {
            // 错误处理
            this.showError(error.message);
        } finally {
            // 隐藏加载中
            this.hideLoading();
        }
    }
}
```

### 3. 数据管理建议

```typescript
// GameDataManager.ts - 统一管理用户数据
export class GameDataManager {
    private static _instance: GameDataManager;
    static get instance() { return this._instance || (this._instance = new GameDataManager()); }

    // 用户基础信息
    userId: string = '';
    username: string = '';
    level: number = 1;
    exp: number = 0;
    gold: number = 0;
    vipLevel: number = 0;

    // 更新金币（自动刷新所有显示金币的UI）
    updateGold(newGold: number) {
        this.gold = newGold;
        EventManager.emit('GOLD_CHANGED', newGold);
    }

    // 更新经验（自动检查升级）
    updateExp(newExp: number) {
        this.exp = newExp;
        this.checkLevelUp();
        EventManager.emit('EXP_CHANGED', newExp);
    }
}
```

### 4. 事件系统建议

使用事件解耦UI更新：

```typescript
// 在各个UI中监听数据变化
export class MainView extends UIBase {
    onLoad() {
        // 监听金币变化
        EventManager.on('GOLD_CHANGED', this.onGoldChanged, this);
        EventManager.on('EXP_CHANGED', this.onExpChanged, this);
    }

    onGoldChanged(gold: number) {
        this.goldLabel.string = gold.toString();
    }

    onDestroy() {
        EventManager.off('GOLD_CHANGED', this.onGoldChanged, this);
    }
}
```

---

## 🎯 快速启动指南

### 立即开始第一阶段

1. **创建登录界面**（最优先）
```bash
# 创建文件
touch assets/script/game/ui/login/LoginView.ts
touch assets/script/game/ui/login/RegisterView.ts
```

2. **实现登录逻辑**
- 参考 `assets/script/game/network/GateService.ts`
- 调用已有的 `login()` 方法
- 保存返回的用户信息

3. **测试登录**
- 启动 Gate 服务器（已在2000端口运行）
- 在 Cocos Creator 中运行场景
- 测试登录功能

---

## 📋 开发检查清单

每完成一个功能，检查以下项：

- [ ] API调用正确，参数完整
- [ ] 错误处理完善（网络错误、业务错误）
- [ ] 加载状态提示（loading）
- [ ] 数据更新后UI自动刷新
- [ ] 内存泄漏检查（事件监听是否移除）
- [ ] 与服务器数据同步
- [ ] 多语言支持（可选）
- [ ] 性能优化（列表虚拟滚动等）

---

## 📞 后端API参考

所有可用的47个游戏API：

### 账号系统
- `Login` - 登录
- `Register` - 注册

### 用户系统
- `GetLevelInfo` - 获取等级信息
- `AddExp` - 增加经验
- `AddGold` - 增加金币
- `ConsumeGold` - 消耗金币
- `DeductGold` - 扣除金币

### 任务系统
- `GetUserTasks` - 获取任务列表
- `ClaimTaskReward` - 领取任务奖励

### 成就系统
- `GetUserAchievements` - 获取成就列表
- `ClaimAchievementReward` - 领取成就奖励

### 签到系统
- `GetSignInInfo` - 获取签到信息
- `SignIn` - 每日签到
- `Checkin` - 签到（别名）

### 商城系统
- `GetShopProducts` - 获取商品列表
- `PurchaseProduct` - 购买商品
- `CreatePaymentOrder` - 创建支付订单

### 背包系统
- `GetInventory` - 获取背包
- `UseItem` - 使用道具
- `ExpandInventory` - 扩展背包

### VIP系统
- `GetVIPInfo` - 获取VIP信息
- `PurchaseVIP` - 购买VIP

### 邮件系统
- `GetMailList` - 获取邮件列表
- `ClaimMailReward` - 领取邮件奖励

### 排行榜系统
- `GetLeaderboard` - 获取排行榜
- `GetUserRank` - 获取个人排名

### 好友系统
- `GetFriendList` - 获取好友列表
- `SendFriendRequest` - 发送好友请求
- `HandleFriendRequest` - 处理好友请求
- `SendFriendGift` - 赠送好友礼物

### 公会系统
- `GetGuildInfo` - 获取公会信息
- `CreateGuild` - 创建公会
- `ApplyToGuild` - 申请加入公会
- `GuildDonate` - 公会捐献

### 赛季系统
- `GetSeasonInfo` - 获取赛季信息
- `PurchaseBattlePass` - 购买通行证
- `ClaimSeasonReward` - 领取赛季奖励

### 抽奖系统
- `DrawLottery` - 进行抽奖
- `GetJackpotProgress` - 获取奖池进度

### Buff系统
- `GetBuffs` - 获取Buff列表

### 分享&邀请
- `Share` - 分享
- `GetShareStats` - 获取分享统计
- `AcceptInvite` - 接受邀请
- `GetInviteInfo` - 获取邀请信息

### 其他
- `GameArea` - 游戏区域
- `CollectCoin` - 收集金币
- `CollectWithReward` - 收集并奖励

---

## 🎓 学习资源

### 相关文档
- `PROJECT_COMPLETENESS_REPORT.md` - 项目完整度报告
- `README.md` - 项目总览
- 后端API实现：`tsrpc_server/src/server/gate/api/`
- 协议定义：`assets/script/tsrpc/protocols/gate/`

### 网络层代码
- `assets/script/game/network/NetworkManager.ts` - 网络管理器
- `assets/script/game/network/GateService.ts` - Gate服务示例

---

## ✅ 总结

**核心思路**: 从核心到边缘，从必需到可选

1. **先做能玩（第一阶段）**: 登录→大厅→匹配→游戏
2. **再做好玩（第二阶段）**: 任务→成就→等级→签到
3. **然后能赚钱（第三阶段）**: 商城→VIP→背包→邮件
4. **最后能长久（第四阶段）**: 好友→公会→排行榜→通行证

**关键点**:
- 后端API都准备好了，直接调用即可
- 网络层已封装完成，只需关注UI逻辑
- 建议使用数据管理器 + 事件系统解耦
- 每个阶段完成后及时测试

**预计总工时**: 54-72小时（7-9个工作日）

祝开发顺利！🚀

---

**文档维护**: Claude Code
**最后更新**: 2025-12-04
**版本**: v1.0
