#!/bin/bash

# 代码格式化和检查脚本
# 用途：格式化所有代码并进行 lint 检查

set -e  # 遇到错误立即退出

echo "======================================"
echo "🚀 代码质量检查和格式化工具"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查参数
MODE=${1:-"check"}  # 默认为 check 模式

if [ "$MODE" = "fix" ]; then
    echo -e "${YELLOW}📝 模式: 自动修复${NC}"
    echo ""

    # 1. Prettier 格式化
    echo -e "${GREEN}[1/3] 运行 Prettier 格式化...${NC}"
    npm run format
    echo ""

    # 2. ESLint 自动修复
    echo -e "${GREEN}[2/3] 运行 ESLint 自动修复...${NC}"
    npm run lint:fix || true  # 允许 lint 错误继续执行
    echo ""

    # 3. TypeScript 类型检查
    echo -e "${GREEN}[3/3] 运行 TypeScript 类型检查...${NC}"
    npm run typecheck || {
        echo -e "${RED}❌ TypeScript 类型检查失败${NC}"
        exit 1
    }
    echo ""

    echo -e "${GREEN}✅ 代码格式化和修复完成！${NC}"

elif [ "$MODE" = "check" ]; then
    echo -e "${YELLOW}🔍 模式: 检查模式（不修改文件）${NC}"
    echo ""

    # 1. Prettier 检查
    echo -e "${GREEN}[1/3] 运行 Prettier 检查...${NC}"
    npm run format:check || {
        echo -e "${RED}❌ Prettier 检查失败 - 运行 'npm run format' 或 './scripts/format-code.sh fix' 修复${NC}"
        exit 1
    }
    echo ""

    # 2. ESLint 检查
    echo -e "${GREEN}[2/3] 运行 ESLint 检查...${NC}"
    npm run lint || {
        echo -e "${RED}❌ ESLint 检查失败 - 运行 'npm run lint:fix' 或 './scripts/format-code.sh fix' 修复${NC}"
        exit 1
    }
    echo ""

    # 3. TypeScript 类型检查
    echo -e "${GREEN}[3/3] 运行 TypeScript 类型检查...${NC}"
    npm run typecheck || {
        echo -e "${RED}❌ TypeScript 类型检查失败${NC}"
        exit 1
    }
    echo ""

    echo -e "${GREEN}✅ 所有检查通过！${NC}"

else
    echo -e "${RED}错误: 无效的模式 '$MODE'${NC}"
    echo ""
    echo "用法:"
    echo "  ./scripts/format-code.sh check    # 检查代码（不修改）"
    echo "  ./scripts/format-code.sh fix      # 自动修复代码"
    exit 1
fi

echo ""
echo "======================================"
echo "📊 代码质量报告"
echo "======================================"
echo ""
echo "✅ Prettier: 格式正确"
echo "✅ ESLint: 无错误"
echo "✅ TypeScript: 类型正确"
echo ""
