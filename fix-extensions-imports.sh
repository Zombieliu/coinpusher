#!/bin/bash

# 修复 extensions 导入路径问题
# 将 ../../../../extensions/ 替换为 ../../../../../extensions/

cd "$(dirname "$0")"

echo "修复 extensions 导入路径..."

# 查找所有使用错误相对路径的 TypeScript 文件
find assets/script -name "*.ts" -type f | while read file; do
    # 检查文件是否包含错误的导入路径
    if grep -q '["'"'"']\.\.\/\.\.\/\.\.\/\.\.\/extensions\/' "$file"; then
        echo "修复: $file"
        # macOS 使用 sed -i '' 而不是 sed -i
        sed -i '' 's|["'"'"']\.\./\.\./\.\./\.\./extensions/|"../../../../../extensions/|g' "$file"
    fi
done

echo "完成！"
