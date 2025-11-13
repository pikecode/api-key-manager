# 📖 README - 首先阅读此文件

> 如果您是第一次使用此项目，请先阅读本文件。

---

## 🎯 项目状态

✅ **项目改造完成**
✅ **文件夹重命名完成**
✅ **Git 清理说明已准备**
⏳ **等待推送到 GitHub**

---

## 📋 项目信息

| 项 | 值 |
|----|-----|
| **项目名称** | API Key Manager |
| **版本** | 2.0.0 |
| **命令工具** | `akm` (替代 `cc`) |
| **配置文件** | `~/.akm-config.json` |
| **GitHub 仓库** | https://github.com/pikecode/api-key-manager |
| **位置** | `/Users/peakom/work/api-key-manager` |

---

## 🚀 快速开始

### 第一步：清理 Git 并初始化新仓库

在项目目录执行以下命令：

```bash
cd /Users/peakom/work/api-key-manager

# 执行清理脚本（最简单）
bash clean-and-init-git.sh

# 或者手动执行（详见下方）
```

### 第二步：推送到 GitHub

```bash
git push -u origin master
```

### 第三步：验证

访问：https://github.com/pikecode/api-key-manager

---

## 📚 重要文档清单

阅读顺序：

1. **📖 本文件（README_FIRST.md）** ← 您在这里
   - 项目概览和快速开始

2. **⚡ EXECUTION_CHECKLIST.md**
   - 逐步执行清单（推荐新手使用）

3. **🧹 GIT_CLEAN_AND_PUSH.md**
   - Git 清理和推送的完整指南

4. **📝 CLEAN_GIT_INSTRUCTIONS.md**
   - 详细的清理说明和故障排除

5. **📊 FINAL_SUMMARY.md**
   - 项目的最终总结

6. **📋 REFACTOR_SUMMARY.md**
   - 改造内容的详细记录

---

## 🧹 Git 清理步骤概览

### 简化版（推荐）

```bash
cd /Users/peakom/work/api-key-manager
bash clean-and-init-git.sh
```

### 完整版（分步）

```bash
# 1. 进入目录
cd /Users/peakom/work/api-key-manager

# 2. 删除旧的 Git 信息
rm -rf .git

# 3. 初始化新的 Git 仓库
git init

# 4. 配置用户信息
git config user.name "API Key Manager Developer"
git config user.email "dev@pikecode.com"

# 5. 添加所有文件
git add .

# 6. 创建初始提交
git commit -m "initial: API Key Manager 初始提交"

# 7. 添加远程仓库
git remote add origin git@github.com:pikecode/api-key-manager.git

# 8. 推送到 GitHub
git push -u origin master
```

---

## ✅ 验证清单

执行完上述命令后，检查以下内容：

### 本地验证
- [ ] Git 分支正确（应该是 master）
  ```bash
  git branch
  ```

- [ ] 提交历史正确（应该是 1 个初始提交）
  ```bash
  git log --oneline
  ```

- [ ] 远程仓库正确
  ```bash
  git remote -v
  ```

### GitHub 验证
- [ ] 仓库存在：https://github.com/pikecode/api-key-manager
- [ ] 代码已上传（能看到所有文件）
- [ ] 提交历史正确（1 个初始提交）

---

## 🔧 项目改造概览

### 包含的改造
- ✅ 项目重命名：Claude Code Switcher → API Key Manager
- ✅ 文件夹重命名：claude-code-switcher → api-key-manager
- ✅ 命令更新：cc → akm
- ✅ 包名更新：@pikecode/api-key-manager
- ✅ API 支持扩展：支持 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN
- ✅ GitHub 信息：pikecode/api-key-manager
- ✅ 配置文件：~/.akm-config.json

### 关键特性
- 通用 API 密钥管理工具
- 支持多个 API 提供商快速切换
- 支持两种 Token 类型（ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN）
- 完整的命令行界面

---

## 🎯 接下来做什么

### 立即执行
1. [ ] 根据上面的步骤清理 Git 并推送

### 推送后
1. [ ] 访问 GitHub 验证推送成功
2. [ ] （可选）删除临时脚本文件
3. [ ] 开始开发新功能

### 后续计划
1. [ ] 在 GitHub 上更新仓库设置
2. [ ] 创建 Release 和 Changelog
3. [ ] 发布到 npm
4. [ ] 为用户提供迁移指南

---

## 📞 常见问题

### Q: 旧的提交历史会丢失吗？
**A**: 是的。执行 `rm -rf .git` 后，旧的提交历史将无法恢复。这是清理的目的。

### Q: 如何恢复误删的 .git 目录？
**A**: 无法恢复。如果担心，请先备份：
```bash
cp -r .git .git.backup
```

### Q: 需要在 GitHub 上预先创建仓库吗？
**A**: 不需要。`git push -u origin master` 会自动创建。

### Q: SSH 密钥设置有问题？
**A**: 运行 `ssh -T git@github.com` 测试连接。

---

## 🔗 重要链接

- **GitHub 仓库**: https://github.com/pikecode/api-key-manager
- **GitHub Issues**: https://github.com/pikecode/api-key-manager/issues
- **项目主页**: https://github.com/pikecode/api-key-manager#readme

---

## 📝 文件结构

```
api-key-manager/
├── README_FIRST.md                 ← 您在这里
├── EXECUTION_CHECKLIST.md          ← 执行清单
├── GIT_CLEAN_AND_PUSH.md           ← Git 指南
├── CLEAN_GIT_INSTRUCTIONS.md       ← 清理说明
├── FINAL_SUMMARY.md                ← 最终总结
├── REFACTOR_SUMMARY.md             ← 改造记录
│
├── clean-and-init-git.sh           ← 清理脚本
├── INIT_GIT.sh                     ← 初始化脚本
├── QUICK_PUSH.sh                   ← 推送脚本
│
├── package.json                    ← 已更新
├── bin/
│   └── akm.js                      ← 新命令工具
├── src/
│   ├── commands/
│   ├── utils/
│   ├── config.js
│   └── index.js
└── README.md                       ← 项目文档
```

---

## ⚡ 最快的开始方式

**只需 2 个命令**：

```bash
cd /Users/peakom/work/api-key-manager && bash clean-and-init-git.sh
```

完成后查看结果：
```bash
git log --oneline
git remote -v
```

---

## 🎉 准备好了吗？

现在您可以：

1. **立即开始**：按照上面的步骤执行
2. **详细了解**：阅读 EXECUTION_CHECKLIST.md
3. **需要帮助**：查看 GIT_CLEAN_AND_PUSH.md

---

**下一步**：打开您的终端，执行第一个命令！ 🚀

```bash
cd /Users/peakom/work/api-key-manager
```

然后根据 EXECUTION_CHECKLIST.md 逐步执行。

---

**祝您成功！** ✨
