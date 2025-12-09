#!/bin/bash

# Git Pre-commit Hook
# 自动检查提交的代码质量
# 安装方式: ln -s ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit

echo "🔍 运行 pre-commit 检查..."

# 获取暂存的 .ts 文件
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$' || true)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ 没有 TypeScript 文件需要检查"
    exit 0
fi

echo "检查以下文件:"
echo "$STAGED_FILES"
echo ""

# 临时保存未暂存的更改
git stash -q --keep-index

# 运行检查
./scripts/format-code.sh check
CHECK_RESULT=$?

# 恢复未暂存的更改
git stash pop -q || true

if [ $CHECK_RESULT -ne 0 ]; then
    echo ""
    echo "❌ Pre-commit 检查失败"
    echo "请运行 './scripts/format-code.sh fix' 修复问题后再提交"
    exit 1
fi

echo "✅ Pre-commit 检查通过"
exit 0
