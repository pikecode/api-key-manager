#!/bin/bash

# API Key Manager - Git 初始化脚本
# 这个脚本会清理旧的 Git 信息并重新初始化一个干净的仓库

set -e

echo "=========================================="
echo "API Key Manager - Git 初始化脚本"
echo "=========================================="
echo ""

# 进入项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 项目目录: $PROJECT_DIR"
echo ""

# 1. 检查是否存在 .git 目录
if [ -d ".git" ]; then
    echo "⚠️  检测到现有的 .git 目录"
    read -p "是否删除现有的 Git 历史? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  删除旧的 .git 目录..."
        rm -rf .git
        echo "✅ 旧的 .git 目录已删除"
    else
        echo "❌ 已取消操作"
        exit 1
    fi
else
    echo "✅ 未检测到现有的 Git 仓库"
fi

echo ""

# 2. 重新初始化 Git
echo "🔄 重新初始化 Git 仓库..."
git init
echo "✅ Git 仓库已初始化"
echo ""

# 3. 配置 Git 用户信息（可选）
echo "👤 配置 Git 用户信息（如果需要）..."
echo ""
echo "当前 Git 配置："
git config --list | grep -E "^user\." || echo "尚未配置用户信息"
echo ""

read -p "是否配置 Git 用户名和邮箱? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入用户名 [API Key Manager Developer]: " USERNAME
    USERNAME="${USERNAME:-API Key Manager Developer}"

    read -p "请输入邮箱 [dev@pikecode.com]: " EMAIL
    EMAIL="${EMAIL:-dev@pikecode.com}"

    git config user.name "$USERNAME"
    git config user.email "$EMAIL"
    echo "✅ Git 用户信息已配置"
    echo "  用户名: $USERNAME"
    echo "  邮箱: $EMAIL"
else
    echo "⏭️  跳过用户配置"
fi

echo ""

# 4. 添加所有文件
echo "📝 添加所有文件..."
git add .
echo "✅ 所有文件已添加"
echo ""

# 5. 创建初始提交
echo "💾 创建初始提交..."
git commit -m "initial: API Key Manager 初始提交

项目特性:
- 通用 API 密钥管理工具
- 支持 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN
- 支持多个 API 提供商快速切换
- 完整的命令行界面

项目信息:
- 名称: API Key Manager
- 版本: 2.0.0
- 命令: akm
- 配置文件: ~/.akm-config.json

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ 初始提交已创建"
echo ""

# 6. 配置远程仓库
echo "🔗 配置远程仓库..."
git remote add origin git@github.com:pikecode/api-key-manager.git
echo "✅ 远程仓库已配置"
echo "  地址: git@github.com:pikecode/api-key-manager.git"
echo ""

# 7. 显示最终状态
echo "=========================================="
echo "✅ Git 初始化完成!"
echo "=========================================="
echo ""
echo "📊 当前状态:"
echo "  分支: $(git rev-parse --abbrev-ref HEAD)"
echo "  最新提交: $(git log -1 --format='%h - %s')"
echo "  远程仓库: $(git remote get-url origin)"
echo ""
echo "🚀 下一步:"
echo "  执行命令推送到 GitHub: git push -u origin master"
echo ""
