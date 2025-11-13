#!/bin/bash

echo "=========================================="
echo "📦 发布 @pikecode/api-key-manager 到 npm"
echo "=========================================="
echo ""

# 1. 检查 npm 登录状态
echo "✓ 检查 npm 登录状态..."
npm whoami
if [ $? -ne 0 ]; then
    echo "❌ 未登录，请先运行 npm login"
    exit 1
fi

echo ""
echo "✓ npm 登录用户验证成功"
echo ""

# 2. 检查 package.json
echo "✓ 检查 package.json..."
cat package.json | grep -E '"name"|"version"'
echo ""

# 3. 检查 Git 状态
echo "✓ 检查 Git 状态..."
git status
echo ""

# 4. 发布到 npm
echo "=========================================="
echo "🚀 开始发布到 npm..."
echo "=========================================="
echo ""

npm publish --access public

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 发布成功！"
    echo "=========================================="
    echo ""
    echo "📦 包信息："
    npm view @pikecode/api-key-manager
    echo ""
    echo "🌐 访问链接："
    echo "https://www.npmjs.com/package/@pikecode/api-key-manager"
    echo ""
else
    echo ""
    echo "❌ 发布失败，请检查错误信息"
    exit 1
fi
