#!/bin/bash

# 快速清理和初始化 Git
# 使用: bash clean-and-init-git.sh

cd "$(dirname "$0")"

echo "🧹 清理旧的 Git 信息..."
rm -rf .git

echo "🔄 初始化新的 Git 仓库..."
git init

echo "👤 配置 Git 用户..."
git config user.name "API Key Manager Developer"
git config user.email "dev@pikecode.com"

echo "📝 添加所有文件..."
git add .

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

echo "🔗 配置远程仓库..."
git remote add origin git@github.com:pikecode/api-key-manager.git

echo ""
echo "✅ Git 初始化完成!"
echo ""
echo "📊 当前状态:"
echo "  分支: $(git rev-parse --abbrev-ref HEAD)"
echo "  最新提交: $(git log -1 --format='%h - %s')"
echo "  远程仓库: $(git remote get-url origin)"
echo ""
echo "🚀 推送到 GitHub: git push -u origin master"
echo ""
