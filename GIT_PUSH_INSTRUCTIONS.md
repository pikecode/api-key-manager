# Git 推送说明

## 快速推送命令

请在项目目录中执行以下命令来推送代码到新的 GitHub 仓库：

```bash
cd /Users/peakom/work/api-key-manager

# 1. 查看 Git 状态
git status

# 2. 添加所有改变
git add .

# 3. 创建提交
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

# 4. 推送到远程仓库
git push -u origin master
```

## 详细步骤

### 第一步：检查状态
```bash
git status
```

预期输出应该显示多个修改的文件：
- package.json
- README.md
- CLAUDE.md
- REFACTOR_SUMMARY.md
- MIGRATION_COMPLETE.md
- bin/akm.js
- src/commands/*.js
- src/config.js
- src/utils/env-launcher.js
- .git/config (修改)

### 第二步：暂存所有文件
```bash
git add .
```

### 第三步：创建提交
```bash
git commit -m "feat: 项目迁移到 API Key Manager"
```

### 第四步：推送到远程
```bash
git push -u origin master
```

这会：
- 将代码推送到 `git@github.com:pikecode/api-key-manager.git`
- 设置本地 `master` 分支跟踪远程 `origin/master`

## 验证推送成功

推送成功后，您应该能看到类似的输出：
```
Enumerating objects: 25, done.
Counting objects: 100% (25/25), done.
Delta compression using up to 8 threads
Compressing objects: 100% (15/15), done.
Writing objects: 100% (15/15), ... done.
Total 15 (delta 10), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (10/10), done.
To github.com:pikecode/api-key-manager.git
 * [new branch]      master -> master
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

## 推送后检查

推送成功后，验证：

1. **检查远程仓库URL**
   ```bash
   git remote -v
   ```
   应该显示：
   ```
   origin  git@github.com:pikecode/api-key-manager.git (fetch)
   origin  git@github.com:pikecode/api-key-manager.git (push)
   ```

2. **检查日志**
   ```bash
   git log --oneline -5
   ```
   最新的提交应该是关于项目迁移的

3. **查看 GitHub 仓库**
   访问：https://github.com/pikecode/api-key-manager
   应该能看到所有推送的代码和提交历史

## 相关配置信息

当前配置已更新为：

- **Git 远程 URL**: `git@github.com:pikecode/api-key-manager.git`
- **GitHub 仓库**: https://github.com/pikecode/api-key-manager
- **Issues 链接**: https://github.com/pikecode/api-key-manager/issues
- **项目主页**: https://github.com/pikecode/api-key-manager#readme

---

**注意**: 确保您的 SSH 密钥已配置，以便能够推送到 GitHub 仓库。
