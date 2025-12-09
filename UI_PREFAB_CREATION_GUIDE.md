# OOPS Framework UI Prefab 创建完整指南

## 📚 目录
1. [准备工作](#准备工作)
2. [创建步骤](#创建步骤)
3. [四个待创建的 UI](#四个待创建的-ui)
4. [常见问题](#常见问题)

---

## 准备工作

### 环境要求
- ✅ Cocos Creator 3.x
- ✅ OOPS Framework 已安装
- ✅ 项目已打开：`/Users/henryliu/cocos/numeron-world/oops-moba`

### 需要创建的 UI Prefab
- [ ] **AchievementPanel** - 成就面板
- [ ] **CheckinPanel** - 签到面板（已有脚本）
- [ ] **InventoryPanel** - 背包面板
- [ ] **JackpotPanel** - 大奖弹窗

---

## 创建步骤

### 通用步骤模板

以下是创建任何 UI Prefab 的标准流程：

#### **Step 1: 创建场景节点**
1. 在 Cocos Creator 中打开项目
2. 在**层级管理器**中右键
3. 选择 `创建` → `创建空节点`
4. 命名节点（例如：`achievementPanel`）

#### **Step 2: 添加基础组件**
1. 选中节点
2. 在**属性检查器**中点击 `添加组件`
3. 添加以下组件：
   - `UI Transform`
   - `Widget` (自适应布局)

#### **Step 3: 配置 UI Transform**
```
Content Size: 1920 x 1080 (全屏)
Anchor Point: (0.5, 0.5) (中心锚点)
```

#### **Step 4: 配置 Widget**
```
Align Mode: ALWAYS
Align Flags: ☑ Left ☑ Right ☑ Top ☑ Bottom
Left: 0
Right: 0
Top: 0
Bottom: 0
```

#### **Step 5: 添加子节点**
根据面板设计添加子节点，例如：
- `Background` (Sprite) - 背景
- `Title` (Label) - 标题
- `Content` (Layout) - 内容区域
- `btnClose` (Button) - 关闭按钮

#### **Step 6: 添加 TypeScript 组件**
1. 选中根节点
2. 点击 `添加组件` → `自定义脚本`
3. 选择对应的 Panel 脚本（例如：`AchievementPanel`）

#### **Step 7: 绑定属性引用**
1. 在 Panel 组件的属性中
2. 将对应的子节点拖拽到属性字段
   - 例如：将 `lbAchievements` 节点拖到 `lbAchievements` 属性

#### **Step 8: 保存为 Prefab**
1. 从**层级管理器**拖拽根节点
2. 拖到 `assets/resources/prefab/ui/[对应目录]/` 目录
3. Cocos Creator 会自动生成 `.prefab` 和 `.prefab.meta` 文件

#### **Step 9: 更新 GameUIConfig.ts**
编辑配置文件，将占位路径改为新的 Prefab 路径：
```typescript
[UIID.Achievement]: {
    layer: LayerType.PopUp,
    prefab: "prefab/ui/achievement/achievementPanel",  // 更新路径
    mask: true
},
```

---

## 四个待创建的 UI

### 1. AchievementPanel (成就面板)

#### **节点结构**
```
achievementPanel (Root)
├── Background (Sprite)
│   └── Color: rgba(30, 30, 50, 255)
├── Title (Label)
│   └── Text: "成就"
├── lbAchievements (Label)
│   └── Text: "成就系统开发中..."
└── btnClose (Button)
    └── Sprite: rgba(200, 50, 50, 255)
```

#### **组件属性**
- **Root**: UITransform (1920x1080), Widget (全屏), AchievementPanel
- **lbAchievements**: 需要绑定到 AchievementPanel.lbAchievements 属性

#### **保存路径**
```
assets/resources/prefab/ui/achievement/achievementPanel.prefab
```

#### **配置更新**
```typescript
[UIID.Achievement]: {
    layer: LayerType.PopUp,
    prefab: "prefab/ui/achievement/achievementPanel",
    mask: true
},
```

---

### 2. CheckinPanel (签到面板)

#### **节点结构**
```
checkinPanel (Root)
├── Background (Sprite)
│   └── Color: rgba(40, 40, 70, 255)
├── Title (Label)
│   └── Text: "每日签到"
├── lbStatus (Label)
│   └── Text: "点击签到"
└── btnClose (Button)
```

#### **组件属性**
- **Root**: UITransform (1920x1080), Widget (全屏), CheckinPanel
- **lbStatus**: 需要绑定到 CheckinPanel.lbStatus 属性

#### **保存路径**
```
assets/resources/prefab/ui/checkin/checkinPanel.prefab
```

#### **配置更新**
```typescript
[UIID.Checkin]: {
    layer: LayerType.PopUp,
    prefab: "prefab/ui/checkin/checkinPanel",
    mask: true
},
```

---

### 3. InventoryPanel (背包面板)

#### **节点结构**
```
inventoryPanel (Root)
├── Background (Sprite)
│   └── Color: rgba(50, 50, 80, 255)
├── Title (Label)
│   └── Text: "背包"
├── lbInventory (Label)
│   └── Text: "背包系统开发中..."
└── btnClose (Button)
```

#### **组件属性**
- **Root**: UITransform (1920x1080), Widget (全屏), InventoryPanel
- **lbInventory**: 需要绑定到 InventoryPanel.lbInventory 属性

#### **保存路径**
```
assets/resources/prefab/ui/inventory/inventoryPanel.prefab
```

#### **配置更新**
```typescript
[UIID.Inventory]: {
    layer: LayerType.PopUp,
    prefab: "prefab/ui/inventory/inventoryPanel",
    mask: true
},
```

---

### 4. JackpotPanel (大奖弹窗)

#### **节点结构**
```
jackpotPanel (Root)
├── Background (Sprite)
│   └── Color: rgba(255, 215, 0, 200) (金色半透明)
├── Title (Label)
│   └── Text: "🎉 大奖！"
│   └── Font Size: 80
├── lbJackpot (Label)
│   └── Text: "恭喜获得大奖！"
└── btnClose (Button)
```

#### **组件属性**
- **Root**: UITransform (1920x1080), Widget (全屏), JackpotPanel
- **lbJackpot**: 需要绑定到 JackpotPanel.lbJackpot 属性 (如果脚本有)

#### **保存路径**
```
assets/resources/prefab/ui/jackpot/jackpotPanel.prefab
```

#### **配置更新**
```typescript
[UIID.Jackpot]: {
    layer: LayerType.PopUp,
    prefab: "prefab/ui/jackpot/jackpotPanel",
    mask: true
},
```

---

## 常见问题

### Q1: 如何创建目录？
**A**: 在 `assets/resources/prefab/ui/` 下右键 → `新建文件夹`

### Q2: 找不到自定义脚本组件？
**A**: 确保 TypeScript 文件已编译，刷新 Cocos Creator 资源管理器

### Q3: 属性绑定无法拖拽？
**A**:
1. 确保节点类型匹配（Label 绑定到 Label 属性）
2. 确保节点在 Prefab 内部

### Q4: Prefab 创建后如何测试？
**A**:
```typescript
// 在代码中打开测试
oops.gui.open(UIID.Achievement);
```

### Q5: 如何参考现有 Prefab？
**A**:
- 打开 `assets/resources/prefab/ui/setting/settingPanel.prefab`
- 查看节点结构和组件配置
- 复制类似的结构

---

## 快速检查清单

创建每个 Prefab 时使用此清单：

- [ ] 创建了根节点并正确命名
- [ ] 添加了 UITransform 组件 (1920x1080)
- [ ] 添加了 Widget 组件 (全屏对齐)
- [ ] 添加了所有必要的子节点
- [ ] 添加了对应的 TypeScript 组件
- [ ] 绑定了所有属性引用
- [ ] 保存到正确的目录
- [ ] 生成了 .prefab 和 .prefab.meta 文件
- [ ] 更新了 GameUIConfig.ts 配置
- [ ] 测试 UI 可以正常打开

---

## 最佳实践

### 1. 命名规范
```
节点名: camelCase (例如: achievementPanel)
Prefab 文件名: camelCase (例如: achievementPanel.prefab)
目录名: lowercase (例如: achievement/)
```

### 2. 布局建议
```
全屏面板: Widget 设置全屏对齐
弹窗面板: 根节点全屏，Background 子节点设置弹窗大小
按钮位置: 统一放在右上角或底部中央
```

### 3. 颜色建议
```
背景: rgba(30-50, 30-50, 50-80, 255) (深色)
标题: rgba(255, 255, 255, 255) (白色)
按钮: rgba(200, 50, 50, 255) (红色关闭)
```

---

## 完成后验证

创建完所有 Prefab 后，运行以下验证：

```bash
# 检查文件是否存在
ls -la assets/resources/prefab/ui/achievement/
ls -la assets/resources/prefab/ui/checkin/
ls -la assets/resources/prefab/ui/inventory/
ls -la assets/resources/prefab/ui/jackpot/

# 每个目录应包含:
# - xxxPanel.prefab
# - xxxPanel.prefab.meta
```

在代码中测试：
```typescript
// 测试所有 UI 可以打开
oops.gui.open(UIID.Achievement);
oops.gui.open(UIID.Checkin);
oops.gui.open(UIID.Inventory);
oops.gui.open(UIID.Jackpot);
```

---

## 支持

如果遇到问题：
1. 查看控制台错误信息
2. 检查 Prefab 路径是否正确
3. 确认组件属性绑定是否正确
4. 参考现有的 settingPanel.prefab

---

**创建时间**: 2025-12-06
**适用版本**: Cocos Creator 3.x + OOPS Framework
**项目**: oops-moba
