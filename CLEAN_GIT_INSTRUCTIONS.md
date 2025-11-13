# 🧹 Git 清理和重新初始化说明

## 概述

本说明用于清理旧的 Git 历史记录，建立一个干净的 Git 仓库并推送到新的 GitHub 仓库。

---

## 🚀 快速方法（推荐）

### 一键执行清理和初始化

在项目目录中运行以下命令：

```bash
cd /Users/peakom/work/api-key-manager

# 执行自动脚本
bash clean-and-init-git.sh

# 然后推送到 GitHub
git push -u origin master
```

这个脚本会自动：
1. ✅ 删除旧的 `.git` 目录
2. ✅ 初始化新的 Git 仓库
3. ✅ 配置 Git 用户信息
4. ✅ 添加所有文件
5. ✅ 创建初始提交
6. ✅ 配置远程仓库

---

## 📋 手动方法（分步骤）

如果您想手动操作，请按以下步骤执行：

### 第一步：清理旧的 Git 信息

```bash
cd /Users/peakom/work/api-key-manager

# 删除旧的 .git 目录
rm -rf .git

echo "✅ 旧的 .git 目录已删除"
```

### 第二步：初始化新的 Git 仓库

```bash
# 初始化 Git
git init

echo "✅ Git 仓库已初始化"
```

### 第三步：配置 Git 用户信息（可选）

```bash
# 配置用户名
git config user.name "API Key Manager Developer"

# 配置邮箱
git config user.email "dev@pikecode.com"

echo "✅ Git 用户信息已配置"
```

### 第四步：添加所有文件到暂存区

```bash
# 添加所有文件
git add .

# 验证
git status

echo "✅ 所有文件已添加"
```

### 第五步：创建初始提交

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

echo "✅ 初始提交已创建"
```

### 第六步：配置远程仓库

```bash
# 添加远程仓库
git remote add origin git@github.com:pikecode/api-key-manager.git

# 验证
git remote -v

echo "✅ 远程仓库已配置"
```

### 第七步：推送到 GitHub

```bash
# 推送到远程仓库
git push -u origin master

echo "✅ 代码已推送到 GitHub"
```

---

## ✅ 验证清理结果

### 检查本地 Git 状态

```bash
# 检查当前分支
git branch -v

# 检查提交历史（应该只有一个初始提交）
git log --oneline

# 输出应该类似于:
# abc1234 initial: API Key Manager 初始提交
```

### 检查远程仓库配置

```bash
# 显示远程仓库
git remote -v

# 输出应该为:
# origin  git@github.com:pikecode/api-key-manager.git (fetch)
# origin  git@github.com:pikecode/api-key-manager.git (push)
```

### 检查 GitHub 仓库

推送成功后，访问：https://github.com/pikecode/api-key-manager

您应该能看到：
- ✅ 所有项目文件
- ✅ 一个初始提交
- ✅ 干净的提交历史

---

## 🧹 清理后的文件清单

清理完成后，项目目录中应该有：

```
api-key-manager/
├── .git/                          # ✨ 新的 Git 仓库
├── bin/
│   └── akm.js
├── src/
│   ├── commands/
│   ├── utils/
│   ├── config.js
│   └── index.js
├── package.json
├── README.md
├── CLAUDE.md
├── REFACTOR_SUMMARY.md
├── MIGRATION_COMPLETE.md
├── FINAL_SUMMARY.md
├── GIT_PUSH_INSTRUCTIONS.md
├── INIT_GIT.sh
├── QUICK_PUSH.sh
├── clean-and-init-git.sh           # ✨ 清理脚本
├── CLEAN_GIT_INSTRUCTIONS.md       # ✨ 本文件
└── 其他文件...
```

**新增内容**：
- ✨ 新的 `.git/` 目录（干净的 Git 仓库）
- ✨ 清理和初始化脚本

**删除内容**：
- ❌ 旧的 Git 历史记录
- ❌ 旧的远程仓库信息（wcldyx）

---

## 📊 清理前后对比

### 清理前
```
远程仓库: git@github.com:wcldyx/api-key-manager.git
提交历史: 多个旧的 Claude Code Switcher 相关的提交
分支: master（但可能有旧的配置信息）
```

### 清理后
```
远程仓库: git@github.com:pikecode/api-key-manager.git
提交历史: 单个干净的初始提交
分支: master（全新开始）
```

---

## 🔍 故障排除

### 问题：无法删除 .git 目录

**解决方案**：
```bash
# 强制删除
sudo rm -rf .git
```

### 问题：git init 失败

**解决方案**：
```bash
# 检查目录权限
ls -la | grep "^d"

# 如果权限有问题，修改权限
chmod 755 .
```

### 问题：远程仓库已存在

**解决方案**：
```bash
# 列出现有的远程仓库
git remote -v

# 删除现有的远程仓库
git remote remove origin

# 重新添加
git remote add origin git@github.com:pikecode/api-key-manager.git
```

### 问题：推送时出现拒绝错误

**解决方案**：
1. 确保 SSH 密钥已配置
2. 确保 GitHub 仓库已创建
3. 检查 GitHub 仓库是否为空

```bash
# 测试 SSH 连接
ssh -T git@github.com

# 应该输出: Hi pikecode! You've successfully authenticated...
```

---

## 📝 完整的一行命令

如果您想在一个命令中完成所有操作：

```bash
cd /Users/peakom/work/api-key-manager && \
rm -rf .git && \
git init && \
git config user.name "API Key Manager Developer" && \
git config user.email "dev@pikecode.com" && \
git add . && \
git commit -m "initial: API Key Manager 初始提交" && \
git remote add origin git@github.com:pikecode/api-key-manager.git && \
git push -u origin master && \
echo "✅ 完成!"
```

---

## 🚀 下一步

完成清理和初始化后：

1. ✅ 访问 GitHub 仓库：https://github.com/pikecode/api-key-manager
2. ✅ 验证代码已成功推送
3. ✅ 删除本地的临时脚本文件（如需要）
4. ✅ 开始使用新的干净仓库

---

## 📞 参考

- GitHub: https://github.com/pikecode/api-key-manager
- 项目名称: API Key Manager
- 版本: 2.0.0
- 配置文件: ~/.akm-config.json

---

**清理完成后，您的 Git 仓库将是全新的，所有旧的历史记录都会被清除！** ✨
