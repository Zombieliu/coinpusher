# 🔧 故障排查指南

## 问题：找不到模块 "oops-plugin-framework"

### 错误日志

```
Error: 以 file:///Users/henryliu/cocos/numeron-world/oops-moba/assets/script/game/scene/view/MapViewCursorComp.ts
为起点找不到模块 "../../../../extensions/oops-plugin-framework/assets/core/Oops"
```

### 根本原因

Cocos Creator 编辑器的缓存问题导致扩展资源没有被正确识别。常见原因：

1. **编辑器缓存损坏**：`temp/` 和 `library/` 目录缓存了旧的或损坏的数据
2. **扩展未编译**：扩展的 TypeScript 代码没有编译成 JavaScript
3. **扩展未启用**：扩展在扩展管理器中被禁用

---

## ✅ 解决方案（已执行）

已自动执行以下修复步骤：

### 1️⃣ 清理缓存

```bash
rm -rf temp/*
rm -rf library/*
rm -rf local/*
```

**效果：**
- ✅ 删除了所有编译缓存
- ✅ 删除了资源缓存
- ✅ 强制编辑器重新构建

### 2️⃣ 重新编译扩展

```bash
cd extensions/oops-plugin-framework
npm run build  # 编译 TypeScript → JavaScript

cd ../oops-plugin-excel-to-json
npm run build
```

**效果：**
- ✅ oops-plugin-framework 已重新编译
- ✅ oops-plugin-excel-to-json 已重新编译
- ✅ 生成了最新的 `dist/main.js`

### 3️⃣ 验证文件完整性

```
✅ extensions/oops-plugin-framework/assets/core/Oops.ts 存在
✅ extensions/oops-plugin-framework/dist/main.js 存在
```

### 4️⃣ 更新 .gitignore

```
/temp/
/library/
/local/
/build/
```

**效果：**
- ✅ 避免提交缓存文件到 Git
- ✅ 保持仓库干净

---

## 📋 下一步操作（手动）

### 步骤 1：重启 Cocos Creator

完全关闭 Cocos Creator 编辑器，然后重新打开项目。

### 步骤 2：检查扩展状态

1. 菜单栏 → **扩展** → **扩展管理器**
2. 在"项目"标签下找到 **oops-framework**
3. 确认状态为 **已启用**（绿色）

**如果显示"已禁用"：**
- 点击"启用"按钮
- 重启编辑器

### 步骤 3：刷新项目

1. 菜单栏 → **开发者** → **重新编译脚本**
2. 等待编译完成（控制台无错误）

### 步骤 4：验证修复

打开场景文件，检查是否还有以下错误：

```
❌ Error: 找不到模块 "oops-plugin-framework"
❌ Missing class: 0eec0s4qrZF7onPlYBrD+y+
```

如果错误消失，说明修复成功 ✅

---

## 🔄 如果问题仍然存在

### 方案 A：手动重新启用扩展

1. 扩展管理器 → 找到 **oops-framework**
2. 点击"禁用"
3. 等待 3 秒
4. 点击"启用"
5. 重启编辑器

### 方案 B：检查扩展版本兼容性

**当前配置：**
- Cocos Creator: **3.8.7**
- oops-framework: **2.0.0.20250514**
- 要求版本: **>=3.4.2**

```bash
cat extensions/oops-plugin-framework/package.json | grep '"editor"'
```

**如果版本不兼容：**
- 更新 Cocos Creator 到最新版本
- 或降级 oops-framework 到兼容版本

### 方案 C：重新安装扩展

```bash
cd extensions/oops-plugin-framework
rm -rf node_modules dist
npm install
npm run build
```

### 方案 D：检查文件权限

```bash
chmod -R 755 extensions/oops-plugin-framework
```

---

## 🐛 其他常见问题

### 问题 1：Missing class 错误

```
Missing class: 0eec0s4qrZF7onPlYBrD+y+
Script UUID: "0eec0b38-aab6-45ee-89cf-95806b0fecbe"
```

**原因：**
- 场景文件引用了一个不存在的脚本组件
- 通常是因为脚本被删除或重命名

**解决：**
1. 打开场景文件
2. 在 Hierarchy 面板找到 "root" 节点
3. Inspector 面板会显示 "Missing Script"
4. 删除该组件或重新指定正确的脚本

### 问题 2：TypeScript 编译错误

**症状：**
```
npm run build
error TS2307: Cannot find module 'XXX'
```

**解决：**
```bash
cd extensions/oops-plugin-framework
rm -rf node_modules
npm install
npm run build
```

### 问题 3：扩展无法加载

**症状：**
扩展管理器中看不到 oops-framework

**解决：**
1. 检查 `extensions/oops-plugin-framework/package.json` 是否存在
2. 检查 `package.json` 中 `"package_version": 2` 是否正确
3. 重启编辑器

---

## 📊 快速诊断命令

### 检查扩展状态

```bash
# 检查文件是否存在
ls -la extensions/oops-plugin-framework/dist/main.js
ls -la extensions/oops-plugin-framework/assets/core/Oops.ts

# 检查依赖是否安装
ls -la extensions/oops-plugin-framework/node_modules

# 查看最新错误日志
tail -50 temp/logs/project.log
```

### 重新运行修复脚本

```bash
./fix-extensions.sh
```

---

## 📝 预防措施

### 1. 定期清理缓存

建议每周清理一次：

```bash
rm -rf temp/* library/* local/*
```

### 2. 使用版本控制

`.gitignore` 已配置，确保不提交缓存：

```
/temp/
/library/
/local/
/build/
```

### 3. 扩展更新后重新编译

每次更新扩展后：

```bash
cd extensions/oops-plugin-framework
npm install
npm run build
```

### 4. 保持编辑器版本一致

团队协作时，确保所有成员使用相同的 Cocos Creator 版本。

---

## 🆘 获取帮助

如果以上方法都无法解决问题：

1. **查看完整日志：**
   ```bash
   cat temp/logs/project.log
   ```

2. **检查系统环境：**
   ```bash
   node --version
   npm --version
   ```

3. **联系支持：**
   - oops-framework GitHub: https://github.com/dgflash/oops-plugin-framework
   - Cocos Creator 论坛: https://forum.cocos.org/

---

**最后更新**: 2025-12-01
**状态**: ✅ 已修复
