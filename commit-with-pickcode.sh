#!/bin/bash
set -e

# 切换到项目目录
cd /Users/peakom/work/api-key-manager

echo "=========================================="
echo "📤 使用 pickcode@gmail.com 账号提交代码"
echo "=========================================="
echo ""

# 1. 检查当前 SSH 配置
echo "1️⃣ 检查 SSH 配置..."
echo "当前 Git 用户配置（全局或本地）："
git config --local user.email || git config --global user.email || echo "未配置"
git config --local user.name || git config --global user.name || echo "未配置"
echo ""

# 2. 设置本项目的 Git 用户为 pickcode
echo "2️⃣ 为本项目设置 Git 用户..."
git config --local user.email "pickcode@gmail.com"
git config --local user.name "pickcode"
echo "✓ 已设置："
echo "  邮箱: $(git config --local user.email)"
echo "  名称: $(git config --local user.name)"
echo ""

# 3. 检查 Git 状态
echo "3️⃣ 检查 Git 状态..."
git status
echo ""

# 4. 添加所有改动
echo "4️⃣ 添加所有改动到暂存区..."
git add .
echo "✓ 已添加所有文件"
echo ""

# 显示将要提交的文件
echo "将提交的文件："
git diff --cached --name-only | head -20
echo ""

# 5. 创建提交
echo "5️⃣ 创建提交..."
git commit -m "feat: npm 发布前最终更新

- 添加 Git 提交和推送脚本
- 完成所有文件检查
- 准备发布到 @pikecode/api-key-manager v2.0.0

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "✓ 提交成功"
echo ""

# 6. 显示提交信息
echo "6️⃣ 提交信息："
git log --oneline -1
echo ""

# 7. 检查远程仓库
echo "7️⃣ 检查远程仓库配置..."
git remote -v
echo ""

# 8. 推送到远程
echo "8️⃣ 推送到 GitHub..."
echo "使用 pickcode 账号的 SSH 密钥进行认证..."
echo ""
git push -u origin master

echo ""
echo "=========================================="
echo "✅ 提交和推送完成！"
echo "=========================================="
echo ""

# 9. 验证
echo "📋 最新 3 次提交："
git log --oneline -3
echo ""

echo "🔗 远程仓库状态："
git branch -vv
echo ""

echo "🎉 代码已推送到 GitHub！"
echo "访问: https://github.com/pikecode/api-key-manager"
echo ""
