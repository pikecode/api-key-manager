#!/bin/bash
set -e

cd /Users/peakom/work/api-key-manager

echo "=========================================="
echo "📦 npm 发布: @pikecode/api-key-manager"
echo "=========================================="
echo ""

# 检查登录
echo "1️⃣ 检查 npm 登录状态..."
npm whoami
echo ""

# 显示包信息
echo "2️⃣ package.json 配置："
grep -E '"name"|"version"' package.json
echo ""

# 显示 Git 状态
echo "3️⃣ Git 状态："
git status --short
echo ""

# 发布
echo "4️⃣ 开始发布..."
echo ""
npm publish --access public

echo ""
echo "=========================================="
echo "✅ 发布完成！"
echo "=========================================="
echo ""
echo "验证已发布："
sleep 2
npm view @pikecode/api-key-manager version
echo ""
echo "📦 包页面："
echo "https://www.npmjs.com/package/@pikecode/api-key-manager"
echo ""
