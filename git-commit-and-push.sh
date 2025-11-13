#!/bin/bash
set -e

cd /Users/peakom/work/api-key-manager

echo "=========================================="
echo "🔀 Git 提交和推送"
echo "=========================================="
echo ""

# 1. 检查 Git 状态
echo "1️⃣ 检查 Git 状态..."
git status
echo ""

# 2. 添加所有文件
echo "2️⃣ 添加所有改动..."
git add .
echo "✓ 已暂存所有文件"
echo ""

# 3. 检查远程配置
echo "3️⃣ 检查远程仓库配置..."
git remote -v
echo ""

# 4. 创建提交
echo "4️⃣ 创建提交..."
git commit -m "feat: npm 发布前最终更新

- 添加发布脚本
- 完成所有文件检查
- 准备发布到 @pikecode/api-key-manager

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "✓ 提交成功"
echo ""

# 5. 推送到远程
echo "5️⃣ 推送到远程仓库..."
git push -u origin master

echo ""
echo "=========================================="
echo "✅ Git 提交和推送完成！"
echo "=========================================="
echo ""

# 6. 验证
echo "📋 提交历史："
git log --oneline -3
echo ""

echo "🔗 远程仓库："
git remote -v
echo ""
