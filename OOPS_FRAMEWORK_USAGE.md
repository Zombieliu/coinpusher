# OOPS Framework 使用指南

## 概述

本文档总结了 OOPS Framework 的正确使用方式，特别是资源加载和场景初始化。

## 资源加载系统

### 核心类：ResLoader

位置：`extensions/oops-plugin-framework/assets/core/common/loader/ResLoader.ts`

#### 主要方法：

1. **load / loadAsync** - 加载单个资源
2. **loadDir** - 加载文件夹中的资源
3. **preload / preloadAsync** - 预加载资源
4. **get** - 从缓存中获取已加载的资源
5. **release / releaseDir** - 释放资源

#### ⚠️ 重要：ResLoader 没有 `instantiate` 方法！

ResLoader 只负责**加载资源**，不负责**实例化节点**。

### 正确的预制体实例化方式

#### 方式一：ViewUtil.createPrefabNodeAsync（推荐）

```typescript
import { ViewUtil } from 'oops-plugin-framework/assets/core/utils/ViewUtil';

// 加载并实例化预制体（一步到位）
const node = await ViewUtil.createPrefabNodeAsync("path/to/prefab");
node.parent = parentNode;
```

#### 方式二：手动加载 + instantiate

```typescript
import { instantiate, Prefab } from 'cc';
import { oops } from 'oops-plugin-framework/assets/core/Oops';

// 1. 加载预制体资源
const prefab = await oops.res.loadAsync<Prefab>("path/to/prefab", Prefab);

// 2. 使用 Cocos 的 instantiate 实例化
const node = instantiate(prefab);
node.parent = parentNode;
```

#### 方式三：从缓存获取 + instantiate

```typescript
import { instantiate, Prefab } from 'cc';
import { ViewUtil } from 'oops-plugin-framework/assets/core/utils/ViewUtil';

// 从缓存中获取已加载的预制体并实例化
const node = ViewUtil.createPrefabNode("path/to/prefab");
node.parent = parentNode;
```

### GameManager 的 open 方法

`GameManager` 提供了更高级的封装：

```typescript
// 使用 GameManager 打开游戏元素
const node = await oops.game.open(
    parentNode,           // 父节点
    "path/to/prefab",     // 预制体路径
    {
        bundle: "resources",  // 资源包名（可选）
        siblingIndex: 0       // 排序索引（可选）
    }
);
```

## Main.ts 场景加载示例

### ❌ 错误写法

```typescript
// 错误：oops.res 没有 instantiate 方法
oops.res.load("gui/prefab/coinpusher/game", (err, prefab) => {
    const sceneNode = oops.res.instantiate(prefab);  // ❌ 错误！
});
```

### ✅ 正确写法（当前实现）

```typescript
import { ViewUtil } from 'oops-plugin-framework/assets/core/utils/ViewUtil';

private async loadGameScene() {
    const gameNode = this.game;
    if (!gameNode) {
        console.error("[Main] Game node not found!");
        return;
    }

    try {
        // 使用 ViewUtil.createPrefabNodeAsync 加载并实例化
        const sceneNode = await ViewUtil.createPrefabNodeAsync("gui/prefab/coinpusher/game");

        if (!sceneNode) {
            console.error("[Main] Failed to load game scene prefab");
            return;
        }

        // 添加到场景
        gameNode.addChild(sceneNode);

        // 初始化游戏逻辑
        smc.coinPusher.initScene(sceneNode);
        smc.coinPusher.startGame();
    } catch (error) {
        console.error("[Main] Error loading game scene:", error);
    }
}
```

## 资源加载最佳实践

### 1. 使用默认资源包

```typescript
// 从默认 resources 包加载
const node = await ViewUtil.createPrefabNodeAsync("path/to/prefab");
```

### 2. 指定资源包

```typescript
// 从指定资源包加载
const node = await ViewUtil.createPrefabNodeAsync("path/to/prefab", "bundle-name");
```

### 3. 预加载资源

```typescript
// 预加载（不实例化）
await oops.res.preloadAsync("path/to/prefab", Prefab);

// 之后从缓存快速创建
const node = ViewUtil.createPrefabNode("path/to/prefab");
```

### 4. 资源释放

```typescript
// 释放单个资源
oops.res.release("path/to/prefab");

// 释放文件夹资源
oops.res.releaseDir("path/to/folder");

// 释放整个资源包
oops.res.removeBundle("bundle-name");
```

## 内存管理

### GameComponent 自动内存管理

如果父节点是 `GameComponent` 实例，可以使用自动内存管理：

```typescript
export class MyComponent extends GameComponent {
    async loadPrefab() {
        // 自动管理内存，组件销毁时自动释放
        const node = await this.createPrefabNodeAsync("path/to/prefab");
        node.parent = this.node;
    }
}
```

### 手动内存管理

使用 `ViewUtil` 时需要手动管理内存：

```typescript
// 加载
const node = await ViewUtil.createPrefabNodeAsync("path/to/prefab");

// 使用完后手动释放
node.destroy();
oops.res.release("path/to/prefab");
```

## 特效系统集成

特效系统使用相同的加载方式：

```typescript
// EffectComp.ts 中使用 EffectSingleCase
private effectManager = EffectSingleCase.instance;

async playCelebrate(position?: Vec3) {
    // EffectSingleCase 内部使用 ViewUtil.createPrefabNode
    await this.effectManager.loadAndShow(
        "effect/prefab/celebrate",
        parent,
        {
            worldPos: position,
            isPlayFinishedRelease: true,
            bundleName: "resources"
        }
    );
}
```

## 常见错误

### 1. ❌ 使用不存在的方法

```typescript
// 错误：ResLoader 没有 instantiate 方法
oops.res.instantiate(prefab);
```

**解决方案**：使用 Cocos 的 `instantiate()` 或 `ViewUtil.createPrefabNode()`

### 2. ❌ 忘记指定资源类型

```typescript
// 错误：未指定 Prefab 类型
const asset = await oops.res.loadAsync("path/to/prefab");
```

**解决方案**：
```typescript
// 正确：指定类型
const prefab = await oops.res.loadAsync<Prefab>("path/to/prefab", Prefab);
```

### 3. ❌ 资源路径错误

```typescript
// 错误：包含 .prefab 后缀
await ViewUtil.createPrefabNodeAsync("path/to/prefab.prefab");
```

**解决方案**：
```typescript
// 正确：不包含后缀
await ViewUtil.createPrefabNodeAsync("path/to/prefab");
```

## 总结

| 需求 | 推荐方法 | 说明 |
|------|---------|------|
| 加载并实例化预制体 | `ViewUtil.createPrefabNodeAsync()` | 一步到位，最简单 |
| 预加载资源 | `oops.res.preloadAsync()` | 提前加载，加快后续使用 |
| 从缓存实例化 | `ViewUtil.createPrefabNode()` | 需要先加载资源 |
| 自动内存管理 | `GameComponent.createPrefabNodeAsync()` | 组件销毁时自动释放 |
| 打开游戏元素 | `oops.game.open()` | 高级封装，支持参数 |

## 参考

- [OOPS Framework Wiki](https://gitee.com/dgflash/oops-framework/wikis/pages)
- ResLoader: `extensions/oops-plugin-framework/assets/core/common/loader/ResLoader.ts`
- ViewUtil: `extensions/oops-plugin-framework/assets/core/utils/ViewUtil.ts`
- GameManager: `extensions/oops-plugin-framework/assets/core/game/GameManager.ts`

---

**更新日期**: 2025-12-05
**作者**: Claude Code
