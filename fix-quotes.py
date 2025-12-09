#!/usr/bin/env python3
"""
修复 TypeScript 文件中引号不匹配的问题
将 "..." 改为统一的双引号格式
"""

import os
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
ASSETS_DIR = PROJECT_ROOT / "assets"

def fix_quotes_in_file(file_path: Path) -> bool:
    """修复单个文件中的引号不匹配问题"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # 修复模式1: "xxx' -> "xxx"
        content = re.sub(r'"([^"\']*?)\'', r'"\1"', content)

        # 修复模式2: 'xxx" -> "xxx"
        content = re.sub(r'\'([^"\']*?)"', r'"\1"', content)

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    print("修复 TypeScript 文件中的引号不匹配问题...")
    print()

    fixed_count = 0
    checked_count = 0

    # 遍历所有 TypeScript 文件
    for ts_file in ASSETS_DIR.rglob("*.ts"):
        checked_count += 1
        if fix_quotes_in_file(ts_file):
            rel_path = ts_file.relative_to(PROJECT_ROOT)
            print(f"✓ 修复: {rel_path}")
            fixed_count += 1

    print()
    print(f"检查了 {checked_count} 个文件")
    print(f"修复了 {fixed_count} 个文件")

if __name__ == "__main__":
    main()
