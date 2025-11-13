#!/bin/bash

# API Key Manager - 快速推送脚本
# 这个脚本会自动执行 Git 提交和推送

set -e  # 任何错误都会停止脚本

echo "=========================================="
echo "API Key Manager - Git 推送脚本"
echo "=========================================="
echo ""

# 进入项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 项目目录: $PROJECT_DIR"
echo ""

# 1. 检查 Git 状态
echo "📊 检查 Git 状态..."
echo "---"
git status --short
echo "---"
echo ""

# 2. 确认是否继续
read -p "是否继续推送? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 3. 添加文件
echo ""
echo "📝 添加所有改变的文件..."
git add .
echo "✅ 文件已添加"
echo ""

# 4. 创建提交
echo "💾 创建 Git 提交..."
git commit -m "feat: 项目迁移到 API Key Manager

- 重命名项目为 API Key Manager (原 Claude Code Switcher)
- 文件夹改名: claude-code-switcher → api-key-manager
- 包名更新: @pikecode/api-key-manager
- 命令工具更新: cc → akm
- 版本更新: 2.0.0
- GitHub 仓库: github.com/pikecode/api-key-manager
- 扩展 api_key 模式支持两种 Token 类型
- 添加完整的改造和迁移文档

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

if [ $? -eq 0 ]; then
    echo "✅ 提交创建成功"
else
    echo "⚠️  没有新的改变需要提交"
fi

echo ""

# 5. 推送到远程
echo "🚀 推送到远程仓库..."
echo "远程仓库: git@github.com:pikecode/api-key-manager.git"
echo "分支: master"
echo ""

git push -u origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 推送成功!"
    echo "=========================================="
    echo ""
    echo "🔗 仓库地址: https://github.com/pikecode/api-key-manager"
    echo "📝 最新提交: $(git log -1 --format='%h - %s')"
    echo "👁️  分支: $(git rev-parse --abbrev-ref HEAD)"
    echo ""
    echo "✨ 项目已成功推送到 GitHub!"
    echo ""
else
    echo ""
    echo "❌ 推送失败!"
    echo "请检查网络连接和 SSH 密钥配置"
    echo ""
    exit 1
fi
