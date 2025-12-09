# GameManager 功能对比

## 概述

对比原版推币机的 `gameManager.ts` (457行) 和我们基于 OOPS Framework + ECS 架构的实现。

## 原版 gameManager.ts 的核心功能

### 1. **初始化功能**
```typescript
// 原版 gameManager.ts
class gameManager extends Component {
    @property(Node) ndPush: Node;           // 推动层
    @property(Node) ndCoinParent: Node;     // 金币父节点
    @property(Prefab) preCoin: Prefab;      // 金币预制体
    @property(Node) ndTouchPlane: Node;     // 触摸平面
    @property(NumFont) scriptGoldNumFont;   // 金币数字显示

    onLoad() {
        frameworkInit.init();
        this._initLanguage();
        this._checkPlatform();
        this._initGame();
    }
}
```

### 2. **核心系统**

#### A. 金币创建系统
- `_createCoin()` - 创建单个金币
- `_createInitCoin()` - 创建初始台面金币
- 金币掉落判断和回收

#### B. 推动台物理系统
```typescript
update() {
    // 推动台来回移动
    const pushPos = this.ndPush.getPosition();
    if (pushPos.z <= MIN_POS_Z) {
        linearVelocity.z = PUSH_VELOCITY_Z;
    } else if (pushPos.z >= MAX_POS_Z) {
        linearVelocity.z = -PUSH_VELOCITY_Z;
    }
    this.ndPush.getComponent(RigidBody).setLinearVelocity(linearVelocity);
}
```

#### C. 礼物系统
- `_createPresent()` - 创建礼物
- `_waitCreatePresent()` - 等待生成礼物
- 礼物随机选择逻辑

#### D. 金币掉落检测
```typescript
update() {
    // 分帧检测所有金币状态
    for (let i = 0; i < this.ndCoinParent.children.length; i++) {
        this._checkAGoodsState(frame, this.ndCoinParent.children[i]);
    }
}
```

#### E. 事件系统
```typescript
private _initEvent() {
    clientEvent.on(EVENT_LIST.TOUCH_CREATE_GOLD, this._createCoin, this);
    clientEvent.on(EVENT_LIST.TOUCH_HIDE_TOUCHPLANE, this._hideTouchPlane, this);
    clientEvent.on(EVENT_LIST.GOLD_SHOW_UPDATE, this._updateGoldNum, this);
}
```

#### F. 数据存储
- 保存台面金币数据
- 保存礼物数据
- 离线数据恢复

## 我们的实现（OOPS + ECS）

### 架构对比

| 原版 (单体类) | 我们的实现 (ECS) |
|--------------|-----------------|
| 1个 gameManager 类 (457行) | 多个组件分层设计 |
| 所有功能耦合在一起 | 职责分离，易于维护 |

### 组件映射

#### 1. **CoinPusher.ts** - 主实体（类似 gameManager）
```typescript
@ecs.register("CoinPusher")
export class CoinPusher extends CCEntity {
    // Model Layer
    CoinModel!: CoinModelComp;      // 金币数据
    GameState!: GameStateComp;       // 游戏状态

    // BLL Layer
    Physics!: PhysicsComp;           // 物理系统 ← 对应推动台和金币创建
    Reward!: RewardComp;             // 奖励系统 ← 对应金币收集
    Jackpot!: JackpotComp;           // 大奖系统 ← 对应礼物系统
    Effect!: EffectComp;             // 特效系统 ← 新增

    // View Layer
    GameView!: GameViewComp;         // 视图管理 ← 对应节点引用
}
```

#### 2. **PhysicsComp.ts** - 物理系统
**对应原版功能**：
- ✅ `_createCoin()` → `PhysicsComp.createCoin()`
- ✅ `_createInitCoin()` → `PhysicsComp.createInitialCoins()`
- ✅ 推动台移动逻辑
- ✅ 金币掉落检测

**示例**：
```typescript
@ecs.register("PhysicsComp")
export class PhysicsComp extends ecs.Comp {
    /** 推动台节点 */
    pushNode: Node | null = null;

    /** 金币父节点 */
    coinParent: Node | null = null;

    /** 创建金币 */
    createCoin(pos: Vec3, eul?: Vec3) {
        // 实现金币创建逻辑
    }

    /** 创建初始金币 */
    createInitialCoins() {
        // 实现台面铺币逻辑
    }
}
```

#### 3. **JackpotComp.ts** - 大奖系统
**对应原版功能**：
- ✅ `_createPresent()` → `JackpotComp.trigger()`
- ✅ `_waitCreatePresent()` → `JackpotComp._startDrop()`
- ✅ 礼物掉落逻辑

#### 4. **RewardComp.ts** - 奖励系统
**对应原版功能**：
- ✅ `_updateGoldNum()` → `RewardComp.collectCoin()`
- ✅ 金币数据管理
- ✅ 链上同步（新增）

#### 5. **EffectComp.ts** - 特效系统
**对应原版功能**：
- ✅ 使用 `EffectManager.playIdle()` → `EffectComp.playMachineIdle()`
- ✅ 使用 `EffectManager.playCelebrate()` → `EffectComp.playCelebrate()`

#### 6. **GameViewComp.ts** - 视图管理
**对应原版功能**：
- ✅ `@property` 节点引用 → `GameViewComp.sceneRoot/pushNode/coinParent...`
- ✅ `_hideTouchPlane()` → `GameViewComp.setTouchPlaneVisible()`

#### 7. **CoinModelComp.ts** - 金币数据模型
**对应原版功能**：
- ✅ `playerData.instance.playerInfo.gold` → `CoinModelComp.totalGold`
- ✅ 台面金币数据管理

#### 8. **GameStateComp.ts** - 游戏状态
**对应原版功能**：
- ✅ 游戏状态管理（Playing, Paused, JackpotTriggered）

## 功能完整度对比

| 功能 | 原版 | 我们的实现 | 状态 |
|------|------|-----------|------|
| **核心功能** |
| 金币创建 | ✅ | ✅ PhysicsComp | 已实现 |
| 推动台移动 | ✅ | ✅ PhysicsComp | 已实现 |
| 金币掉落检测 | ✅ | ✅ PhysicsComp | 已实现 |
| 金币数量显示 | ✅ NumFont | ✅ RewardComp | 已实现 |
| **礼物/大奖系统** |
| 礼物创建 | ✅ | ✅ JackpotComp | 已实现（改为大奖） |
| 礼物等待逻辑 | ✅ | ✅ JackpotComp | 已实现 |
| 礼物随机选择 | ✅ | ⚠️ 固定金币数量 | 可扩展 |
| **特效系统** |
| 机器待机动画 | ✅ | ✅ EffectComp | 已实现 |
| 庆祝特效 | ✅ | ✅ EffectComp | 已实现 |
| 粒子特效 | ✅ | ✅ EffectComp | 已实现 |
| **数据存储** |
| 台面数据保存 | ✅ | ⚠️ | 需要实现 |
| 离线数据恢复 | ✅ | ⚠️ | 需要实现 |
| **UI系统** |
| 触摸平面 | ✅ | ✅ GameViewComp | 已实现 |
| 游戏面板 | ✅ | ✅ GamePanel | 已实现 |
| **新增功能** |
| 链上金币同步 | ❌ | ✅ RewardComp | 新功能 |
| 事务队列 | ❌ | ✅ TransactionQueue | 新功能 |
| 成就系统 | ❌ | ✅ AchievementPanel | 新功能 |
| 签到系统 | ❌ | ✅ CheckinPanel | 新功能 |

## 缺失的功能（需要补充）

### 1. ⚠️ NumFont（数字显示组件）
**原版**：
```typescript
@property(NumFont)
scriptGoldNumFont: NumFont;

private _updateGoldNum() {
    this.scriptGoldNumFont.updateShow(playerData.instance.playerInfo['gold']);
}
```

**需要实现**：在 UI 中显示金币数量的动画效果

### 2. ⚠️ 台面数据存储
**原版**：
```typescript
private _saveStandsGoodsData() {
    // 保存台面所有金币的位置和旋转
    const goldList = [];
    for (let child of this.ndCoinParent.children) {
        goldList.push({
            pos: [child.position.x, child.position.y, child.position.z],
            eul: [child.eulerAngles.x, child.eulerAngles.y, child.eulerAngles.z]
        });
    }
    playerData.instance.updatePlayerInfo({ standsData: { goldList } });
}
```

**需要实现**：在 `PhysicsComp` 或 `CoinModelComp` 中添加数据保存逻辑

### 3. ⚠️ 离线数据恢复
**原版**：
```typescript
private async _initGame() {
    if (playerData.instance.playerInfo.standsData) {
        const standsData = playerData.instance.playerInfo.standsData;
        for (let data of standsData.goldList) {
            this._createCoin(false, new Vec3(...data.pos), new Vec3(...data.eul));
        }
    }
}
```

**需要实现**：游戏启动时恢复上次的台面状态

### 4. ⚠️ 场景墙体刚体
**原版**：
```typescript
private _initSceneWall() {
    this._createAllWallRigidBody();
}
```

**需要实现**：在 `PhysicsComp` 中初始化场景碰撞体

## 优势对比

### 原版 (gameManager.ts)
✅ **优点**：
- 代码集中，易于快速开发
- 直接访问所有节点和数据

❌ **缺点**：
- 单文件 457 行，难以维护
- 功能耦合严重
- 难以测试和复用
- 缺少类型安全
- 没有模块化设计

### 我们的实现 (ECS)
✅ **优点**：
- **职责分离**：每个组件职责单一
- **易于维护**：代码分布在多个小文件中
- **易于测试**：可以单独测试每个组件
- **易于扩展**：添加新功能只需添加新组件
- **类型安全**：完整的 TypeScript 类型支持
- **更好的架构**：符合 SOLID 原则
- **新功能**：链上同步、成就系统等

❌ **缺点**：
- 学习曲线较高
- 需要理解 ECS 架构
- 初始开发时间较长

## 需要补充的功能清单

### 高优先级：
1. **NumFont 组件** - 金币数量显示动画
2. **台面数据保存** - 保存金币位置状态
3. **离线数据恢复** - 启动时恢复台面
4. **场景墙体初始化** - 碰撞边界设置

### 中优先级：
5. **礼物随机系统** - 大奖奖品多样化
6. **分帧检测优化** - 性能优化
7. **SDK 集成** - 平台 SDK 支持
8. **多语言支持** - i18n 集成

### 低优先级：
9. **测试模式** - 自动掉落金币测试
10. **摄像机动画** - 启动动画优化

## 总结

我们的实现**已经覆盖了原版 gameManager.ts 的核心功能**：

✅ **已完整实现**：
- 金币创建和物理系统
- 推动台移动逻辑
- 大奖/礼物系统
- 特效系统
- UI 面板系统

⚠️ **需要补充**：
- NumFont 数字显示组件
- 台面数据存储和恢复
- 场景碰撞体初始化

🎉 **新增功能**：
- 链上金币同步
- 成就系统
- 签到系统
- 事务队列

## 建议

1. **优先实现 NumFont** - 金币数量显示是核心功能
2. **添加数据持久化** - 保存和恢复台面状态
3. **初始化场景物理** - 确保碰撞检测正常
4. **测试核心流程** - 确保金币创建、掉落、收集流程正常

---

**创建日期**: 2025-12-05
**作者**: Claude Code
