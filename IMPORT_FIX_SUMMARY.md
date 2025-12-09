# Extensions 导入路径修复总结

## 问题描述

项目日志显示 Cocos Creator 找不到 extensions 目录下的模块，错误信息如：
```
以 file:///Users/henryliu/cocos/numeron-world/oops-moba/assets/script/game/scene/model/MapModelComp.ts 为起点找不到模块 "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS"
```

## 根本原因

相对路径的 `../` 数量不正确。不同深度的文件需要不同数量的 `../` 来到达项目根目录的 `extensions` 文件夹。

## 路径规则

从 `assets/script/...` 下的文件到 `extensions/` 的相对路径规则：

| 文件位置示例 | 文件深度 | 需要的 `../` 数量 | 示例 |
|------------|---------|-----------------|------|
| `assets/script/Main.ts` | 2 层 | 2 个 | `../../extensions/` |
| `assets/script/game/Account.ts` | 3 层 | 3 个 | `../../../extensions/` |
| `assets/script/game/scene/Scene.ts` | 4 层 | 4 个 | `../../../../extensions/` |
| `assets/script/game/scene/model/MapModelComp.ts` | 5 层 | 5 个 | `../../../../../extensions/` |

## 修复方案

创建了智能修复脚本 `fix-imports-smart.py`，它会：
1. 遍历所有 TypeScript 文件
2. 自动计算每个文件到 extensions 目录的正确相对路径
3. 修复所有不正确的导入路径

## 修复结果

✅ 检查了 104 个使用 extensions 导入的文件
✅ 修复了 10 个文件的导入路径
✅ 所有路径现在都正确

## 验证

运行以下 Python 脚本可以验证所有路径：
```bash
python3 fix-imports-smart.py
```

## 已修复的文件

1. assets/script/game/demo/Demo.ts
2. assets/script/game/role/Role.ts
3. assets/script/game/room/Room.ts
4. assets/script/game/initialize/Initialize.ts
5. assets/script/game/camera/Camera.ts
6. assets/script/game/common/SingletonModuleComp.ts
7. assets/script/game/common/CommonNet.ts
8. assets/script/game/coinpusher/CoinPusher.ts
9. assets/script/game/account/Account.ts
10. assets/script/game/scene/Scene.ts

## 下一步

现在可以在 Cocos Creator 中重新打开项目，应该不会再出现找不到 extensions 模块的错误。
