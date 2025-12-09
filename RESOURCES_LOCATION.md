# 金币资源文件位置说明

## 已复制的资源文件

### 1. 金币预制体
**位置**: `assets/resources/prefab/model/coin.prefab`

这是金币的场景节点配置文件，包含：
- 节点层级结构
- 组件配置
- 对模型和材质的引用

### 2. 金币 3D 模型
**位置**: `assets/res/model/coin01.FBX`

金币的 3D 网格数据（FBX 格式）

### 3. 金币材质
**位置**: `assets/res/model/coin01.mtl`

材质配置文件，定义了：
- 光照属性
- 纹理映射
- 渲染参数

### 4. 金币纹理
**位置**: `assets/res/model/coin01.jpg`

金币的贴图纹理图片

## 在代码中的加载路径

### GameViewComp.ts
```typescript
// 加载金币预制体
const prefab = await oops.res.loadAsync('prefab/model/coin', Prefab);
```

**说明**:
- 路径是相对于 `assets/resources/` 目录
- 不需要写 `.prefab` 后缀
- 完整路径：`assets/resources/prefab/model/coin.prefab`

### 预制体引用的资源
金币预制体内部会自动引用：
- `assets/res/model/coin01.FBX` (通过 UUID)
- `assets/res/model/coin01.mtl` (通过 UUID)
- `assets/res/model/coin01.jpg` (通过 UUID)

这些引用是在 Cocos Creator 编辑器中配置的，已经保存在 `.prefab` 和 `.meta` 文件中。

## 文件结构

```
oops-moba/assets/
├── resources/
│   └── prefab/
│       └── model/
│           ├── coin.prefab          ← 金币预制体
│           └── coin.prefab.meta     ← 元数据
└── res/
    └── model/
        ├── coin01.FBX               ← 3D模型
        ├── coin01.FBX.meta          ← 模型元数据
        ├── coin01.jpg               ← 纹理贴图
        ├── coin01.jpg.meta          ← 纹理元数据
        ├── coin01.mtl               ← 材质
        └── coin01.mtl.meta          ← 材质元数据
```

## 复制命令记录

以下是从原版游戏复制资源的命令：

```bash
# 1. 复制预制体文件夹
cp -r "/Users/henryliu/cocos/numeron-world/金币推推推/assets/resources/prefab" \
      "/Users/henryliu/cocos/numeron-world/oops-moba/assets/resources/"

# 2. 复制模型文件夹
mkdir -p /Users/henryliu/cocos/numeron-world/oops-moba/assets/res
cp -r "/Users/henryliu/cocos/numeron-world/金币推推推/assets/res/model" \
      "/Users/henryliu/cocos/numeron-world/oops-moba/assets/res/"
```

## 验证清单

在 Cocos Creator 中打开项目后，请确认：

- [ ] `resources/prefab/model/coin` 可以在资源管理器中看到
- [ ] 双击 `coin.prefab` 可以在场景编辑器中预览
- [ ] 金币模型显示正常（金色圆柱体）
- [ ] 没有丢失材质或纹理的警告

## 运行时加载流程

1. `GameViewComp._loadCoinPrefab()` 被调用
2. `oops.res.loadAsync('prefab/model/coin', Prefab)` 加载预制体
3. Cocos Creator 自动加载预制体依赖的资源：
   - `coin01.FBX` (模型网格)
   - `coin01.mtl` (材质)
   - `coin01.jpg` (纹理)
4. 预制体加载完成，赋值给 `PhysicsComp.coinPrefab`
5. 后续调用 `instantiate(coinPrefab)` 创建金币实例

## 注意事项

1. **不要手动修改 .meta 文件**
   - `.meta` 文件包含 UUID 和资源引用关系
   - 由 Cocos Creator 自动生成和管理

2. **资源路径大小写敏感**
   - macOS 文件系统默认不区分大小写，但打包后会区分
   - 确保代码中的路径与实际文件名大小写完全一致

3. **如果资源丢失**
   - 检查 Cocos Creator 控制台是否有 "Asset not found" 错误
   - 重新导入资源：右键点击 `assets` 文件夹 → "重新导入资源"

## 现在可以运行了！

所有资源已就位：
- ✅ 金币预制体 (`coin.prefab`)
- ✅ 3D 模型 (`coin01.FBX`)
- ✅ 材质 (`coin01.mtl`)
- ✅ 纹理 (`coin01.jpg`)

**请重新在 Cocos Creator 中运行项目，应该能看到金币了！** 🎉
