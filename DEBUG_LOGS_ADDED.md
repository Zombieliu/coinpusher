# 调试日志已添加

## 📋 添加的调试日志位置

### 1. Main.ts
**位置**: `assets/script/Main.ts`

**新增日志**:
```
Line 71-72: [Main] ========== Loading game scene prefab ==========
Line 72: [Main] Prefab path: gui/prefab/coinpusher/game
Line 76: [Main] Calling ViewUtil.createPrefabNodeAsync...
Line 78: [Main] ViewUtil.createPrefabNodeAsync returned: true/false
Line 86: [Main] ✅ Game scene prefab loaded and instantiated
Line 87: [Main] Scene node name: ...
Line 89-91: [Main] ========== Initializing CoinPusher scene ==========
Line 90: [Main] Scene node: ...
Line 91: [Main] Scene node children: ...
Line 93: [Main] ✅ CoinPusher scene initialized
Line 96: [Main] ========== Starting CoinPusher game ==========
Line 98: [Main] ✅ CoinPusher game started
```

---

### 2. GameViewComp.ts
**位置**: `assets/script/game/coinpusher/view/GameViewComp.ts`

**新增日志**:
```
Line 55: [GameViewComp] ========== initSceneNodes START ==========
Line 113: [GameViewComp] Setting PhysicsComp nodes...
Line 118: [GameViewComp] ✅ PhysicsComp nodes set successfully
Line 121: [GameViewComp] Starting to load coin prefab...
Line 124: [GameViewComp] ❌ PhysicsComp not found!
Line 127: [GameViewComp] ❌ Cannot set PhysicsComp: pushNode or coinParent is null
Line 128-129: [GameViewComp]   - pushNode: true/false
              [GameViewComp]   - coinParent: true/false
```

---

### 3. PhysicsComp.ts
**位置**: `assets/script/game/coinpusher/bll/PhysicsComp.ts`

**新增日志** (已注释，需要时取消注释):
```
Line 80: // console.log('[PhysicsComp] Running in local mode');
Line 397: // console.log('[PhysicsComp] ⏳ Waiting for coinParent...');
Line 401: // console.log('[PhysicsComp] ⏳ Waiting for pushNode...');
Line 405: // console.log('[PhysicsComp] ⏳ Waiting for coinPrefab to load...');
```

**激活状态日志**:
```
Line 411: [PhysicsComp] ========== INITIALIZING LOCAL MODE ==========
Line 412: [PhysicsComp] coinParent: ...
Line 413: [PhysicsComp] pushNode: ...
Line 414: [PhysicsComp] coinPrefab: true/false
Line 418: [PhysicsComp] ✅ Local mode initialized with initial coins
```

---

## 🔍 完整的预期日志流程

如果一切正常，你应该看到以下日志顺序：

```
1️⃣ [Main] ========== Loading game scene prefab ==========
2️⃣ [Main] Prefab path: gui/prefab/coinpusher/game
3️⃣ [Main] Calling ViewUtil.createPrefabNodeAsync...
4️⃣ [Main] ViewUtil.createPrefabNodeAsync returned: true
5️⃣ [Main] ✅ Game scene prefab loaded and instantiated
6️⃣ [Main] Scene node name: game
7️⃣ [Main] Game scene added to game node
8️⃣ [Main] ========== Initializing CoinPusher scene ==========
9️⃣ [Main] Scene node: game
🔟 [Main] Scene node children: X
1️⃣1️⃣ [CoinPusher] Initializing scene...
1️⃣2️⃣ [GameViewComp] ========== initSceneNodes START ==========
1️⃣3️⃣ [GameViewComp] Scene root name: game
1️⃣4️⃣ [GameViewComp] Scene root children count: X
1️⃣5️⃣ [GameViewComp] Child 0: ...
1️⃣6️⃣ [GameViewComp] Child 1: ...
1️⃣7️⃣ ... (所有子节点)
1️⃣8️⃣ [GameViewComp] ✓ Push node found: pushBox
1️⃣9️⃣ [GameViewComp] ✓ Coin parent found: coinParent
2️⃣0️⃣ [GameViewComp] Scene nodes initialized
2️⃣1️⃣ [GameViewComp] Setting PhysicsComp nodes...
2️⃣2️⃣ [GameViewComp] ✅ PhysicsComp nodes set successfully
2️⃣3️⃣ [GameViewComp] Starting to load coin prefab...
2️⃣4️⃣ [GameViewComp] Loading coin prefab...
2️⃣5️⃣ [GameViewComp] ✓ Coin prefab loaded successfully
2️⃣6️⃣ [Main] ✅ CoinPusher scene initialized
2️⃣7️⃣ [Main] ========== Starting CoinPusher game ==========
2️⃣8️⃣ [CoinPusher] Starting game...
2️⃣9️⃣ [Main] ✅ CoinPusher game started

--- 随后在 update() 循环中 ---
3️⃣0️⃣ [PhysicsComp] ========== INITIALIZING LOCAL MODE ==========
3️⃣1️⃣ [PhysicsComp] coinParent: coinParent
3️⃣2️⃣ [PhysicsComp] pushNode: pushBox
3️⃣3️⃣ [PhysicsComp] coinPrefab: true
3️⃣4️⃣ [PhysicsComp] Created XX initial coins (local mode)
3️⃣5️⃣ [PhysicsComp] ✅ Local mode initialized with initial coins
```

---

## 🚨 常见问题对应的日志

### 问题 1: 场景预制体加载失败
**预期日志**:
```
[Main] ========== Loading game scene prefab ==========
[Main] Calling ViewUtil.createPrefabNodeAsync...
[Main] ViewUtil.createPrefabNodeAsync returned: false
[Main] ❌ Failed to load and instantiate game scene prefab
```

**原因**: 预制体路径不正确或预制体文件不存在
**解决**: 检查 `assets/resources/gui/prefab/coinpusher/game.prefab` 是否存在

---

### 问题 2: 场景节点不存在
**预期日志**:
```
[GameViewComp] ========== initSceneNodes START ==========
[GameViewComp] Scene root children count: X
[GameViewComp] Child 0: ...
[GameViewComp] ⚠️ Push node (pushBox) not found!
[GameViewComp] ⚠️ Coin parent (coinParent) not found!
[GameViewComp] ❌ Cannot set PhysicsComp: pushNode or coinParent is null
```

**原因**: 场景预制体中缺少必要的节点
**解决**: 在 Cocos Creator 中打开场景预制体，添加 `pushBox` 和 `coinParent` 节点

---

### 问题 3: 金币预制体加载失败
**预期日志**:
```
[GameViewComp] Starting to load coin prefab...
[GameViewComp] Loading coin prefab...
[GameViewComp] Error loading coin prefab: ...
```

**原因**: 金币预制体路径错误或文件不存在
**解决**: 检查 `assets/resources/prefab/model/coin.prefab` 是否存在

---

### 问题 4: PhysicsComp 等待预制体加载
**日志** (需要取消注释 PhysicsComp.ts:405):
```
[PhysicsComp] ⏳ Waiting for coinPrefab to load...
[PhysicsComp] ⏳ Waiting for coinPrefab to load...
[PhysicsComp] ⏳ Waiting for coinPrefab to load...
... (重复多次)
```

**原因**: 金币预制体正在异步加载中
**解决**: 等待几秒，如果持续等待则检查预制体加载错误

---

## 🛠️ 如何启用更多调试日志

如果需要更详细的调试信息，可以取消注释以下代码：

### PhysicsComp.ts
```typescript
// Line 80: 每帧显示本地模式运行
console.log('[PhysicsComp] Running in local mode');

// Line 397-407: 显示等待条件
console.log('[PhysicsComp] ⏳ Waiting for coinParent...');
console.log('[PhysicsComp] ⏳ Waiting for pushNode...');
console.log('[PhysicsComp] ⏳ Waiting for coinPrefab to load...');
```

**警告**: 这些日志每帧都会打印，可能会导致控制台日志刷屏！

---

## 📊 下一步

1. **刷新浏览器页面**，重新运行游戏
2. **打开浏览器控制台** (F12)
3. **复制完整的日志**，从启动到金币应该显示的时刻
4. **查找缺失的日志**，对比上面的"预期日志流程"
5. **根据缺失的日志定位问题**

---

**创建时间**: 2025-12-06
**目的**: 排查桌面上没有金币显示的问题
