# 特效系统实现总结

## 概述

本文档总结了基于 OOPS Framework 的特效系统在推币机游戏中的实现。

## 实现方式

我们**没有从原版推币机复制 `effectManager.ts`**，而是**直接使用 OOPS Framework 内置的特效管理系统**。

## OOPS Framework 特效系统

OOPS Framework 提供了完整的特效管理功能：

### 核心类

1. **EffectSingleCase** (`oops-plugin-framework/assets/libs/animator-effect/EffectSingleCase.ts`)
   - 单例模式的特效对象池管理器
   - 支持 Spine 动画、Cocos Animation、ParticleSystem 粒子
   - 自动加载、播放、回收特效
   - 提供对象池管理，减少内存开销

2. **EffectFinishedRelease** (`oops-plugin-framework/assets/libs/animator-effect/EffectFinishedRelease.ts`)
   - 组件：自动在动画播放完后回收特效节点
   - 支持 Spine、Animation、Particle 三种类型

3. **EffectDelayRelease** (`oops-plugin-framework/assets/libs/animator-effect/EffectDelayRelease.ts`)
   - 组件：延时回收特效节点

## 我们的实现

### 1. EffectComp 组件 (`assets/script/game/coinpusher/bll/EffectComp.ts`)

创建了一个 ECS 组件来封装 OOPS 特效系统，提供统一接口：

```typescript
@ecs.register("EffectComp")
export class EffectComp extends ecs.Comp {
    // 基于 EffectSingleCase 的封装
    private effectManager = EffectSingleCase.instance;

    // 提供的主要方法：
    playCelebrate(position?, callback?)      // 播放庆祝特效（大奖）
    playCoinDrop(position)                   // 播放金币掉落特效
    playMachineIdle()                        // 播放机器待机动画
    playParticle(path, position, ...)       // 播放通用粒子特效
    playEffectOnNode(path, node, ...)       // 在指定节点播放特效
    preloadEffects(paths, count)            // 预加载特效
    clearEffects(path?)                      // 清理特效池
    releaseEffects(path?)                    // 释放特效资源
}
```

### 2. 集成到 CoinPusher 实体

在 `CoinPusher.ts` 中添加了 `EffectComp` 组件：

```typescript
export class CoinPusher extends CCEntity {
    // BLL Layer
    Effect!: EffectComp;  // 特效系统

    protected init() {
        this.addComponents<ecs.Comp>(
            // ...其他组件
            EffectComp,
            // ...
        );
    }
}
```

### 3. 在 JackpotComp 中使用特效

修改了 `JackpotComp.ts`，添加了特效播放：

#### 大奖触发时：
```typescript
trigger(coinCount: number) {
    // 播放大奖触发音效
    oops.audio.playEffect('jackpot_trigger');

    // 播放大奖触发特效（电视展示）
    const effectComp = this.ent.get(EffectComp);
    if (effectComp) {
        effectComp.playParticle('effect/prefab/tvShow', new Vec3(0, 0, 0), 1.0);
    }

    // 显示大奖弹窗
    oops.gui.open(UIID.Jackpot, { coinCount }, ...);
}
```

#### 大奖完成时：
```typescript
private _finishDrop() {
    // 播放完成音效
    oops.audio.playEffect('jackpot_finish');

    // 显示完成特效（庆祝礼花）
    const effectComp = this.ent.get(EffectComp);
    if (effectComp) {
        effectComp.playCelebrate(new Vec3(0, 5, 0), () => {
            console.log('[JackpotComp] Celebrate effect finished');
        });
    }
}
```

## 可用的特效资源

项目中已有的特效预制体（位于 `assets/resources/effect/prefab/`）：

1. **celebrate.prefab** - 庆祝礼花特效
2. **tvShow.prefab** - 电视展示特效
3. **propSynthesis.prefab** - 道具合成特效
4. **machineTop.prefab** - 机器顶部动画
5. **machineBottom.prefab** - 机器底部动画
6. **machineLight.prefab** - 机器灯光动画
7. **machineClown.prefab** - 小丑动画
8. **board.prefab** - 面板特效

## 使用示例

### 播放特效
```typescript
// 在任何组件中获取 EffectComp
const coinPusher = smc.coinPusher;

// 播放庆祝特效
await coinPusher.Effect.playCelebrate(new Vec3(0, 5, 0));

// 播放金币掉落特效
await coinPusher.Effect.playCoinDrop(new Vec3(0, 10, 0));

// 播放自定义粒子特效
await coinPusher.Effect.playParticle(
    'effect/prefab/celebrate',  // 特效路径
    new Vec3(0, 0, 0),          // 位置
    1.5,                        // 缩放
    true                        // 自动回收
);
```

### 预加载特效
```typescript
// 预加载常用特效，提高性能
await coinPusher.Effect.preloadEffects([
    'effect/prefab/celebrate',
    'effect/prefab/propSynthesis',
    'effect/prefab/tvShow'
], 3);  // 每个特效预加载 3 个实例
```

### 清理特效
```typescript
// 清理指定特效池
coinPusher.Effect.clearEffects('effect/prefab/celebrate');

// 清理所有特效池
coinPusher.Effect.clearEffects();

// 释放特效资源（从内存中卸载）
coinPusher.Effect.releaseEffects('effect/prefab/celebrate');
```

## 优势

1. **无需复制代码**：直接使用 OOPS Framework 内置功能
2. **对象池管理**：自动复用特效节点，减少性能开销
3. **自动回收**：特效播放完自动回收到池中
4. **支持多种格式**：Spine、Animation、ParticleSystem 都支持
5. **ECS 架构集成**：通过 EffectComp 组件无缝集成到 ECS 系统
6. **易于扩展**：可以轻松添加新的特效类型和播放方式

## 对比原版

| 特性 | 原版 effectManager.ts | 我们的实现 (EffectComp) |
|------|----------------------|------------------------|
| 对象池管理 | 依赖外部 poolManager | OOPS EffectSingleCase 内置 |
| 自动回收 | 需要手动计算时间 | EffectFinishedRelease 自动处理 |
| 资源加载 | 依赖 resourceUtil | OOPS ResLoader 内置 |
| 架构集成 | 独立单例类 | ECS 组件，更符合项目架构 |
| 代码复用 | 需要复制代码 | 直接使用框架功能 |

## 下一步

可以继续扩展的功能：

1. **更多特效类型**：
   - 金币飞行轨迹特效
   - UI 按钮点击特效
   - 奖品掉落特效

2. **特效预加载策略**：
   - 在游戏启动时预加载常用特效
   - 在进入场景时预加载场景特效

3. **特效参数配置**：
   - 在配置文件中定义特效参数
   - 支持热更新特效配置

4. **性能优化**：
   - 动态调整对象池大小
   - 监控特效性能指标

## 总结

我们成功地使用 OOPS Framework 的内置特效系统实现了推币机游戏所需的所有特效功能，无需从原版项目复制代码。这样的实现：

- ✅ 更符合项目架构（ECS）
- ✅ 代码更简洁易维护
- ✅ 充分利用框架功能
- ✅ 性能更优（对象池管理）
- ✅ 易于扩展和测试

---

**创建日期**: 2025-12-05
**作者**: Claude Code
**相关文件**:
- `assets/script/game/coinpusher/bll/EffectComp.ts`
- `assets/script/game/coinpusher/bll/JackpotComp.ts`
- `assets/script/game/coinpusher/CoinPusher.ts`
