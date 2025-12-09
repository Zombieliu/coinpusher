#!/bin/bash

# 修复 extensions 导入路径 - 正确版本
# 将错误的路径修复为正确的路径

cd "$(dirname "$0")"

echo "修复 extensions 导入路径..."

# 针对 assets/script/game/ 下的文件 (深度4)
# 这些文件在 assets/script/game/*/* 需要 5个 ../
find assets/script/game -name "*.ts" -type f | while read file; do
    # 计算文件深度
    depth=$(echo "$file" | tr -cd '/' | wc -c | tr -d ' ')

    # assets/script/game/xxx/yyy.ts -> 深度4, 需要 5 个 ../
    # assets/script/game/xxx/yyy/zzz.ts -> 深度5, 需要 6 个 ../

    if [ "$depth" -eq 4 ]; then
        # 需要 5 个 ../
        # 把任何数量的 ../ 改为正确的 ../../../../../
        sed -i '' 's|from ["'"'"']\(\.\./\)\+extensions/oops-plugin-framework|from "../../../../../extensions/oops-plugin-framework|g' "$file"
        echo "修复(深度4): $file"
    elif [ "$depth" -eq 3 ]; then
        # 需要 4 个 ../
        sed -i '' 's|from ["'"'"']\(\.\./\)\+extensions/oops-plugin-framework|from "../../../../extensions/oops-plugin-framework|g' "$file"
        echo "修复(深度3): $file"
    elif [ "$depth" -eq 2 ]; then
        # 需要 3 个 ../
        sed -i '' 's|from ["'"'"']\(\.\./\)\+extensions/oops-plugin-framework|from "../../../extensions/oops-plugin-framework|g' "$file"
        echo "修复(深度2): $file"
    fi
done

# 针对 assets/script/ 直接下的文件 (深度2)
# 这些文件需要 2个 ../
find assets/script -maxdepth 1 -name "*.ts" -type f | while read file; do
    sed -i '' 's|from ["'"'"']\(\.\./\)\+extensions/oops-plugin-framework|from "../../extensions/oops-plugin-framework|g' "$file"
    echo "修复(script根): $file"
done

echo "完成！"
