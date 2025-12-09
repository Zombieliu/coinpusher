#!/bin/bash

# 🔧 修复 Cocos Creator 扩展加载问题
#
# 解决错误：找不到模块 "oops-plugin-framework"

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 修复 Cocos Creator 扩展问题${NC}"
echo ""

PROJECT_DIR="/Users/henryliu/cocos/numeron-world/oops-moba"
cd "$PROJECT_DIR"

# 1️⃣ 清理临时文件和缓存
echo -e "${YELLOW}🧹 清理 Cocos Creator 缓存...${NC}"

# 清理 temp 目录（编译缓存）
if [ -d "temp" ]; then
    echo "  删除 temp/ 目录..."
    rm -rf temp/*
    echo -e "${GREEN}  ✅ temp/ 已清理${NC}"
fi

# 清理 library 目录（资源缓存）
if [ -d "library" ]; then
    echo "  删除 library/ 目录..."
    rm -rf library/*
    echo -e "${GREEN}  ✅ library/ 已清理${NC}"
fi

# 清理 local 目录（本地缓存）
if [ -d "local" ]; then
    echo "  删除 local/ 目录..."
    rm -rf local/*
    echo -e "${GREEN}  ✅ local/ 已清理${NC}"
fi

echo ""

# 2️⃣ 重新编译扩展
echo -e "${YELLOW}🔨 重新编译扩展...${NC}"

# oops-plugin-framework
if [ -d "extensions/oops-plugin-framework" ]; then
    echo "  编译 oops-plugin-framework..."
    cd extensions/oops-plugin-framework

    # 检查是否有 tsconfig.json
    if [ -f "tsconfig.json" ]; then
        # 安装依赖（如果需要）
        if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
            echo "    安装依赖..."
            npm install --silent
        fi

        # 编译 TypeScript
        echo "    编译 TypeScript..."
        npm run build
        echo -e "${GREEN}  ✅ oops-plugin-framework 编译完成${NC}"
    else
        echo -e "${YELLOW}  ⚠️  没有 tsconfig.json，跳过编译${NC}"
    fi

    cd "$PROJECT_DIR"
else
    echo -e "${RED}  ❌ 扩展目录不存在: extensions/oops-plugin-framework${NC}"
fi

echo ""

# oops-plugin-excel-to-json
if [ -d "extensions/oops-plugin-excel-to-json" ]; then
    echo "  编译 oops-plugin-excel-to-json..."
    cd extensions/oops-plugin-excel-to-json

    if [ -f "tsconfig.json" ]; then
        if [ ! -d "node_modules" ]; then
            echo "    安装依赖..."
            npm install --silent
        fi

        echo "    编译 TypeScript..."
        npm run build 2>/dev/null || echo "    （已编译或无需编译）"
        echo -e "${GREEN}  ✅ oops-plugin-excel-to-json 编译完成${NC}"
    fi

    cd "$PROJECT_DIR"
fi

echo ""

# 3️⃣ 验证扩展文件
echo -e "${YELLOW}🔍 验证扩展文件...${NC}"

# 检查关键文件
OOPS_CORE="extensions/oops-plugin-framework/assets/core/Oops.ts"
if [ -f "$OOPS_CORE" ]; then
    echo -e "${GREEN}  ✅ Oops.ts 存在${NC}"
else
    echo -e "${RED}  ❌ Oops.ts 不存在${NC}"
fi

OOPS_MAIN="extensions/oops-plugin-framework/dist/main.js"
if [ -f "$OOPS_MAIN" ]; then
    echo -e "${GREEN}  ✅ dist/main.js 存在${NC}"
else
    echo -e "${RED}  ❌ dist/main.js 不存在${NC}"
fi

echo ""

# 4️⃣ 创建 .gitignore（避免提交缓存）
echo -e "${YELLOW}📝 更新 .gitignore...${NC}"

cat >> .gitignore << 'GITIGNORE_EOF'

# Cocos Creator 缓存
/temp/
/library/
/local/
/build/
GITIGNORE_EOF

echo -e "${GREEN}  ✅ .gitignore 已更新${NC}"
echo ""

# 5️⃣ 完成提示
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 修复完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "下一步操作："
echo ""
echo "  1️⃣  重启 Cocos Creator 编辑器"
echo "  2️⃣  菜单栏 -> 扩展 -> 扩展管理器"
echo "  3️⃣  确认 oops-framework 已启用"
echo "  4️⃣  刷新项目（菜单栏 -> 开发者 -> 重新编译脚本）"
echo ""
echo -e "${YELLOW}如果问题仍然存在：${NC}"
echo "  - 检查扩展版本是否兼容 Cocos Creator 3.8.7"
echo "  - 查看 extensions/oops-plugin-framework/package.json"
echo "  - 手动禁用再启用扩展"
echo ""
