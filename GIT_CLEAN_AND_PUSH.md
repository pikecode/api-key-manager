# 🧹 Git 清理和推送 - 完整指南

## 📌 概述

这份指南将帮助您：
1. 清理旧的 Git 历史记录
2. 初始化一个干净的 Git 仓库
3. 推送到新的 GitHub 仓库 (pikecode/api-key-manager)

---

## ⚡ 快速方式（推荐）

### 一行命令完成所有操作

```bash
cd /Users/peakom/work/api-key-manager && \
rm -rf .git && \
git init && \
git config user.name "API Key Manager Developer" && \
git config user.email "dev@pikecode.com" && \
git add . && \
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
Co-Authored-By: Claude <noreply@anthropic.com>" && \
git remote add origin git@github.com:pikecode/api-key-manager.git && \
git push -u origin master && \
echo "✅ 完成! 访问: https://github.com/pikecode/api-key-manager"
```

---

## 📝 分步骤方式

### 步骤 1️⃣：进入项目目录

```bash
cd /Users/peakom/work/api-key-manager
```

### 步骤 2️⃣：删除旧的 Git 目录

```bash
rm -rf .git
```

**说明**：这会删除所有旧的 Git 历史记录。一旦执行，旧的提交历史将无法恢复。

### 步骤 3️⃣：初始化新的 Git 仓库

```bash
git init
```

**输出**：
```
Initialized empty Git repository in /Users/peakom/work/api-key-manager/.git/
```

### 步骤 4️⃣：配置 Git 用户信息

```bash
git config user.name "API Key Manager Developer"
git config user.email "dev@pikecode.com"
```

### 步骤 5️⃣：添加所有文件

```bash
git add .
```

**验证**：
```bash
git status
```

应该显示所有文件为 "new file"。

### 步骤 6️⃣：创建初始提交

```bash
git commit -m "initial: API Key Manager 初始提交"
```

或者使用详细的提交信息：

```bash
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
```

### 步骤 7️⃣：配置远程仓库

```bash
git remote add origin git@github.com:pikecode/api-key-manager.git
```

**验证**：
```bash
git remote -v
```

应该显示：
```
origin  git@github.com:pikecode/api-key-manager.git (fetch)
origin  git@github.com:pikecode/api-key-manager.git (push)
```

### 步骤 8️⃣：推送到 GitHub

```bash
git push -u origin master
```

**预期输出**：
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to 8 threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), done.
Total XX (delta X), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (X/X), done.
To github.com:pikecode/api-key-manager.git
 * [new branch]      master -> master
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

---

## ✅ 完成验证

### 检查本地 Git

```bash
# 查看分支
git branch

# 输出应该为: * master

# 查看日志
git log --oneline

# 输出应该为: abc1234 initial: API Key Manager 初始提交
```

### 检查远程配置

```bash
git remote -v

# 输出应该为:
# origin  git@github.com:pikecode/api-key-manager.git (fetch)
# origin  git@github.com:pikecode/api-key-manager.git (push)
```

### 在 GitHub 上验证

1. 访问 https://github.com/pikecode/api-key-manager
2. 应该能看到所有项目文件
3. 应该显示一个初始提交

---

## 🎯 清理前后对比

| 项目 | 清理前 | 清理后 |
|------|--------|--------|
| 远程仓库 | `wcldyx/api-key-manager` | `pikecode/api-key-manager` |
| 提交历史 | 多个旧提交 | 单个初始提交 |
| .git 大小 | 较大（包含历史） | 较小（全新仓库） |
| 用户信息 | 旧配置 | 新配置 |

---

## 🚨 重要警告

⚠️ **执行 `rm -rf .git` 后无法恢复旧的提交历史！**

如果您需要保留旧的提交历史，请：
1. 先备份当前的 .git 目录
2. 或者使用 `git filter-branch` 来重写历史

```bash
# 备份（如需要）
cp -r .git .git.backup
```

---

## 🔧 常见问题

### Q: 如何验证 SSH 连接？

```bash
ssh -T git@github.com
```

应该输出：
```
Hi pikecode! You've successfully authenticated, but GitHub does not provide shell access.
```

### Q: GitHub 仓库需要预先创建吗？

可以，但也可以让 `git push` 自动创建。如果想手动创建：
1. 登录 GitHub
2. 点击 "New repository"
3. 仓库名称：`api-key-manager`
4. 其他设置保持默认或按需配置

### Q: 如何恢复旧的提交历史？

如果您执行了 `rm -rf .git` 但事后后悔了：

```bash
# 如果有备份
cp -r .git.backup .git
```

否则，旧的历史将无法恢复。

### Q: 推送时提示权限拒绝？

确保：
1. SSH 密钥已配置在 GitHub 上
2. 仓库 URL 是 SSH 格式（`git@github.com:...`）
3. 运行 `ssh -T git@github.com` 验证连接

### Q: 如何更改提交者信息？

```bash
# 全局配置
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 仅本仓库配置
git config user.name "Your Name"
git config user.email "your@email.com"
```

---

## 📚 相关文档

- `CLEAN_GIT_INSTRUCTIONS.md` - 详细的清理说明
- `FINAL_SUMMARY.md` - 项目最终总结
- `REFACTOR_SUMMARY.md` - 改造内容详述

---

## 🎉 完成！

清理和推送完成后，您的项目就准备好在新的 GitHub 仓库中继续开发了！

- 🌐 GitHub: https://github.com/pikecode/api-key-manager
- 📝 提交历史: 干净的初始提交
- 🚀 准备就绪

---

**下次提交时，您的新提交会基于这个干净的初始提交！** ✨
