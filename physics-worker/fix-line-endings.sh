#!/bin/bash

# 🔧 修复所有脚本文件的换行符问题
# 将 Windows 格式(CRLF)转换为 Unix 格式(LF)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 修复脚本文件换行符...${NC}"
echo ""

# 修复所有 .sh 文件
for file in *.sh; do
    if [ -f "$file" ]; then
        sed -i '' 's/\r$//' "$file" 2>/dev/null && echo "✓ 修复: $file"
    fi
done

# 修复所有 .py 文件
for file in *.py; do
    if [ -f "$file" ]; then
        sed -i '' 's/\r$//' "$file" 2>/dev/null && echo "✓ 修复: $file"
    fi
done

echo ""
echo -e "${GREEN}✅ 所有脚本文件已修复！${NC}"
echo ""
echo "现在可以运行:"
echo "  ./perf-test-cloud-sim.sh all"
echo "  ./stress-test.sh"
echo "  python3 analyze-perf.py"
