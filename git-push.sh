#!/bin/bash

# 进入项目目录
cd "$(dirname "$0")"

echo "=== Git 推送脚本 ==="
echo ""

# 检查 Git 状态
echo "1. 检查 Git 状态..."
git status

echo ""
echo "2. 添加所有改变的文件..."
git add .

echo ""
echo "3. 创建 Git 提交..."
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

echo ""
echo "4. 推送到远程仓库..."
git push -u origin master

echo ""
echo "✅ Git 推送完成！"
echo ""
echo "远程仓库: $(git config --get remote.origin.url)"
echo "分支: $(git rev-parse --abbrev-ref HEAD)"
echo "最新提交: $(git log -1 --format='%h - %s')"
