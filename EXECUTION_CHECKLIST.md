# ✅ Git 清理和推送 - 执行清单

> **建议您复制下面的命令，逐个在终端中执行**

---

## 🎯 目标
- ✅ 清理旧的 Git 历史记录
- ✅ 初始化新的干净 Git 仓库
- ✅ 推送到 GitHub (pikecode/api-key-manager)

---

## 🚀 执行步骤

### ① 进入项目目录

```bash
cd /Users/peakom/work/api-key-manager
```

**验证**：应该显示当前目录为 api-key-manager

---

### ② 查看当前状态（可选）

```bash
ls -la | head -20
```

**说明**：查看项目结构，应该能看到 package.json、README.md 等文件

---

### ③ 删除旧的 Git 目录 ⚠️

```bash
rm -rf .git
```

**警告**：此操作将删除所有旧的 Git 历史。无法恢复！

---

### ④ 初始化新的 Git 仓库

```bash
git init
```

**预期输出**：
```
Initialized empty Git repository in /Users/peakom/work/api-key-manager/.git/
```

---

### ⑤ 配置 Git 用户信息

```bash
git config user.name "API Key Manager Developer"
git config user.email "dev@pikecode.com"
```

**验证**（可选）：
```bash
git config --list | grep user
```

---

### ⑥ 添加所有文件

```bash
git add .
```

**验证**：
```bash
git status
```

应该显示多个 "new file" 文件

---

### ⑦ 创建初始提交

**简化版本**：
```bash
git commit -m "initial: API Key Manager 初始提交"
```

**详细版本**（推荐）：
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

**预期输出**：
```
[master (root-commit) abc1234] initial: API Key Manager 初始提交
 XX files changed, XXXX insertions(+)
 create mode 100644 ...
```

---

### ⑧ 添加远程仓库

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

---

### ⑨ 推送到 GitHub 🚀

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

## ✅ 验证完成

执行以下命令验证一切是否成功：

### 本地验证

```bash
# 查看分支
git branch
# 应该输出: * master

# 查看日志
git log --oneline
# 应该输出: abc1234 initial: API Key Manager 初始提交

# 查看远程
git remote -v
# 应该输出: origin  git@github.com:pikecode/api-key-manager.git (fetch)
```

### GitHub 验证

1. 打开浏览器访问：https://github.com/pikecode/api-key-manager
2. 应该能看到所有项目文件
3. 应该显示 1 个提交（initial: API Key Manager 初始提交）

---

## 📊 完成后的状态

| 项目 | 状态 |
|------|------|
| Git 仓库 | ✅ 干净的初始化仓库 |
| 提交历史 | ✅ 单个初始提交 |
| 远程仓库 | ✅ git@github.com:pikecode/api-key-manager.git |
| GitHub 仓库 | ✅ 所有代码已推送 |
| 用户信息 | ✅ API Key Manager Developer |

---

## 🔍 故障排除

### 问题：Permission denied (publickey)

**解决**：
```bash
# 测试 SSH 连接
ssh -T git@github.com

# 如果失败，检查 SSH 密钥
ls ~/.ssh/id_rsa

# 添加 SSH 密钥到 ssh-agent
ssh-add ~/.ssh/id_rsa
```

### 问题：fatal: 不是一个 git 仓库

**解决**：确保您在正确的目录中
```bash
pwd  # 应该显示 /Users/peakom/work/api-key-manager
ls .git  # 应该能看到 Git 配置文件
```

### 问题：Repository not found

**解决**：
1. 确保 GitHub 仓库已创建（或让 GitHub 自动创建）
2. 确保仓库名称正确：`api-key-manager`
3. 确保 GitHub 用户名正确：`pikecode`

### 问题：everything up-to-date

**说明**：这表示已经推送过了，不是错误

---

## 🎯 快速参考

### 一行命令执行全部

```bash
cd /Users/peakom/work/api-key-manager && rm -rf .git && git init && git config user.name "API Key Manager Developer" && git config user.email "dev@pikecode.com" && git add . && git commit -m "initial: API Key Manager 初始提交" && git remote add origin git@github.com:pikecode/api-key-manager.git && git push -u origin master
```

### 使用脚本执行

```bash
cd /Users/peakom/work/api-key-manager
bash clean-and-init-git.sh
```

---

## 📌 完成标志

✅ 当您看到以下输出时，说明推送成功：
```
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

✅ 当您访问 GitHub 仓库能看到所有文件时，说明完全成功！

---

**现在就开始执行吧！** 🚀

下一个命令是：
```bash
cd /Users/peakom/work/api-key-manager
```

然后按照上面的步骤逐个执行命令。
