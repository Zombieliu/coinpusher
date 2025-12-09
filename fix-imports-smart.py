#!/usr/bin/env python3
"""
智能修复 extensions 导入路径
根据文件层级自动计算正确的相对路径数量
"""

import os
import re
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent
ASSETS_DIR = PROJECT_ROOT / "assets"
EXTENSIONS_DIR = PROJECT_ROOT / "extensions"

def calculate_relative_path(file_path: Path) -> str:
    """计算从文件到 extensions 目录的相对路径（仅返回 ../ 部分）"""
    file_dir = file_path.parent
    rel_path = os.path.relpath(EXTENSIONS_DIR, file_dir)
    # 只返回 ../ 的部分，例如 "../../../../extensions" -> "../../../../"
    parts = rel_path.split('/')
    # 计算有多少个 ..
    up_count = sum(1 for p in parts if p == '..')
    return '../' * up_count

def fix_imports_in_file(file_path: Path):
    """修复单个文件中的 imports"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找所有 extensions 导入
    pattern = r'''(import\s+.*?from\s+['"])(\.\./)+extensions/(oops-plugin-framework/[^'"]+)(['"])'''

    def replace_import(match):
        prefix = match.group(1)  # import ... from '
        # old_path = match.group(2)  # ../../ or ../../../ etc
        extension_path = match.group(3)  # oops-plugin-framework/...
        suffix = match.group(4)  # '

        # 计算正确的相对路径
        correct_rel_path = calculate_relative_path(file_path)

        # 构建完整导入路径
        new_import = f"{prefix}{correct_rel_path}extensions/{extension_path}{suffix}"
        return new_import

    new_content = re.sub(pattern, replace_import, content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    print("智能修复 extensions 导入路径...")
    print(f"项目根目录: {PROJECT_ROOT}")
    print()

    fixed_count = 0
    checked_count = 0

    # 遍历所有 TypeScript 文件
    for ts_file in ASSETS_DIR.rglob("*.ts"):
        checked_count += 1
        if fix_imports_in_file(ts_file):
            rel_path = ts_file.relative_to(PROJECT_ROOT)
            print(f"✓ 修复: {rel_path}")
            fixed_count += 1

    print()
    print(f"检查了 {checked_count} 个文件")
    print(f"修复了 {fixed_count} 个文件")

if __name__ == "__main__":
    main()
