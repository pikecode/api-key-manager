# 📦 npm 发布指南 - @pikecode/api-key-manager

## 📋 发布前检查清单

在发布到 npm 之前，请确保以下条件都已满足：

### ✅ 本地准备工作

- [ ] 已安装 Node.js 和 npm
- [ ] 已在本地测试应用程序
- [ ] 所有代码已提交到 Git
- [ ] Git 仓库已推送到 GitHub
- [ ] package.json 版本号已更新
- [ ] README.md 已完整编写
- [ ] LICENSE 文件已添加
- [ ] .npmignore 已配置（排除不必要的文件）

### ✅ npm 账户准备

- [ ] 已在 [npm 官网](https://www.npmjs.com) 创建账户 (pikecode)
- [ ] 已验证邮箱
- [ ] 已启用 2FA 安全认证（可选但推荐）
- [ ] 已在本地登录 npm 账户

---

## 🚀 发布步骤详解

### 第一步：在 npm 官网创建账户

1. 访问 [https://www.npmjs.com/signup](https://www.npmjs.com/signup)
2. 填写用户名（pikecode）、邮箱和密码
3. 验证邮箱
4. 创建成功

### 第二步：在本地登录 npm 账户

在项目目录运行：

```bash
npm login
```

输入你的信息：
```
npm notice Log in on https://registry.npmjs.org/
Username: pikecode
Password: ****
Email: (this IS public) your-email@example.com
Logged in as pikecode on https://registry.npmjs.org/.
```

验证登录成功：
```bash
npm whoami
# 输出应该是: pikecode
```

### 第三步：检查 package.json

确保以下字段正确：

```json
{
  "name": "@pikecode/api-key-manager",
  "version": "2.0.0",
  "description": "API密钥管理工具 - A powerful CLI tool for managing and switching multiple API provider configurations",
  "main": "src/index.js",
  "bin": {
    "akm": "bin/akm.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/pikecode/api-key-manager.git"
  },
  "bugs": {
    "url": "https://github.com/pikecode/api-key-manager/issues"
  },
  "homepage": "https://github.com/pikecode/api-key-manager#readme",
  "license": "MIT",
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### 第四步：确保 Git 分支正确

```bash
# 检查当前分支
git branch

# 应该显示: * master

# 检查是否有未提交的改动
git status

# 应该显示: working tree clean
```

### 第五步：发布到 npm

#### 方式一：标准发布（公开包）

```bash
npm publish --access public
```

输出应该类似于：
```
npm notice Publishing to https://registry.npmjs.org/ with tag latest and default access
npm notice Packfile:
npm notice  "name":"@pikecode/api-key-manager",
npm notice  "version":"2.0.0",
...
npm notice 📦 @pikecode/api-key-manager@2.0.0
```

#### 方式二：使用发布脚本

package.json 中已配置了发布脚本：

```bash
npm run release
```

这会自动：
1. 运行测试
2. 更新版本号
3. 发布到 npm

### 第六步：验证发布

发布成功后，可以通过以下方式验证：

#### 方式一：在 npm 官网查看
- 访问: https://www.npmjs.com/package/@pikecode/api-key-manager
- 应该能看到 v2.0.0 版本

#### 方式二：通过命令行查看
```bash
npm view @pikecode/api-key-manager

# 输出应该显示包信息
```

#### 方式三：尝试安装
```bash
# 全局安装
npm install -g @pikecode/api-key-manager

# 测试命令
akm --version

# 应该显示: 2.0.0
```

---

## 🔄 后续更新发布流程

当代码有更新时，按照以下步骤发布新版本：

### 步骤 1：更新代码

```bash
# 修改代码
# 测试功能

# 提交到 Git
git add .
git commit -m "feat: 添加新功能"
git push origin master
```

### 步骤 2：更新版本号

有三种版本号更新方式：

#### 补丁版本 (patch) - 修复 bug
```bash
# 从 2.0.0 → 2.0.1
npm version patch
```

#### 次版本 (minor) - 添加功能
```bash
# 从 2.0.0 → 2.1.0
npm version minor
```

#### 主版本 (major) - 破坏性改动
```bash
# 从 2.0.0 → 3.0.0
npm version major
```

### 步骤 3：发布到 npm

```bash
npm publish --access public
```

### 步骤 4：创建 Git Tag（可选但推荐）

```bash
# 查看已创建的 tag
git tag

# 推送 tag 到 GitHub
git push origin --tags
```

---

## 📊 版本管理规范

### 语义化版本 (Semantic Versioning)

遵循 MAJOR.MINOR.PATCH 格式：

| 版本号 | 说明 | 示例 |
|--------|------|------|
| MAJOR | 破坏性改动，不向后兼容 | 1.0.0 → 2.0.0 |
| MINOR | 新功能，向后兼容 | 2.0.0 → 2.1.0 |
| PATCH | bug 修复，向后兼容 | 2.0.0 → 2.0.1 |

### 版本更新示例

```
v1.0.0 - 初始发布
v1.0.1 - 修复 bug
v1.1.0 - 添加新功能 A
v2.0.0 - 重大重构（破坏性改动）
v2.0.1 - 修复 v2.0.0 的问题
v2.1.0 - 添加新功能 B
```

---

## ⚠️ 发布常见问题

### 问题 1：包名已被占用

**错误信息**：
```
403 Forbidden - You do not have permission to publish "api-key-manager"
```

**解决方案**：
- 使用 scoped package: `@pikecode/api-key-manager` ✅ (已使用)
- 或者使用唯一的包名

### 问题 2：没有登录 npm

**错误信息**：
```
403 Forbidden - In order to publish to npm, you must be logged in
```

**解决方案**：
```bash
npm login
# 输入用户名、密码、邮箱
```

### 问题 3：2FA 验证失败

**错误信息**：
```
401 Unauthorized - Need a one-time password
```

**解决方案**：
```bash
npm publish --access public --otp 123456
# 将 123456 替换为你的 2FA 应用生成的码
```

### 问题 4：版本已存在

**错误信息**：
```
403 Forbidden - cannot publish over existing version: 2.0.0
```

**解决方案**：
- 更新 package.json 中的版本号到新版本
- 或者使用 npm unpublish 删除已发布的版本（24小时内可用）

### 问题 5：包体积过大

**错误信息**：
```
413 Payload Too Large - File too large
```

**解决方案**：
- 检查 .npmignore，确保排除了不必要的文件
- 删除 node_modules, .git, tests 等

---

## 🔒 安全建议

### 1. 启用 2FA（双因素认证）

在 npm 官网账户设置中启用 2FA：
- 使用 Authenticator 应用（Google Authenticator、Microsoft Authenticator 等）
- 生成一次性密码用于登录和发布

### 2. 使用令牌发布

创建 npm 访问令牌以提高安全性：

```bash
# 在 npm 官网生成 token（Access Token）
# 然后在 ~/.npmrc 中配置
npm token create

# 或者设置环境变量
export NPM_TOKEN=your-token-here
```

### 3. 定期更新依赖

```bash
npm outdated      # 查看过期依赖
npm update        # 更新依赖
npm audit         # 检查安全问题
npm audit fix     # 修复安全问题
```

---

## 📝 发布前检查清单（完整版）

```bash
# 1. 检查 npm 登录状态
npm whoami

# 2. 检查包信息
npm view @pikecode/api-key-manager

# 3. 检查 package.json
cat package.json | grep -E '"name"|"version"'

# 4. 检查 Git 状态
git status
git log -1 --oneline

# 5. 运行测试（如果有）
npm test

# 6. 预览将要发布的文件
npm pack

# 7. 发布
npm publish --access public
```

---

## 🎉 发布完成后

### 1. 在 GitHub 上创建 Release

```bash
# 使用 gh CLI
gh release create v2.0.0 --title "v2.0.0 - API Key Manager Release"

# 或者在 GitHub 网页上手动创建：
# 访问: https://github.com/pikecode/api-key-manager/releases/new
```

### 2. 更新项目文档

在 README.md 中添加：
```markdown
## 📦 安装

```bash
npm install -g @pikecode/api-key-manager
```

### 3. 宣传新版本

- 发布在社交媒体
- 发布在论坛/博客
- 通知相关用户

---

## 🔗 相关资源

- **npm 官网**: https://www.npmjs.com
- **包页面**: https://www.npmjs.com/package/@pikecode/api-key-manager
- **npm 文档**: https://docs.npmjs.com
- **GitHub 项目**: https://github.com/pikecode/api-key-manager

---

## 📋 快速参考

### 首次发布
```bash
npm login                    # 登录 npm
npm publish --access public  # 发布公开包
```

### 更新发布
```bash
# 修改代码
git add .
git commit -m "feat: 新功能"
git push origin master

# 更新版本并发布
npm version minor            # 更新版本号
npm publish --access public  # 发布
git push origin --tags       # 推送 tag
```

### 创建发布脚本
在 package.json 中已配置：
```json
{
  "scripts": {
    "release": "npm version patch && npm publish --access public"
  }
}
```

使用脚本：
```bash
npm run release
```

---

## ✅ 发布状态跟踪

发布后可以检查状态：

```bash
# 查看发布历史
npm view @pikecode/api-key-manager time

# 查看所有版本
npm view @pikecode/api-key-manager versions

# 查看最新版本
npm view @pikecode/api-key-manager version
```

---

**准备好发布了吗？** 🚀

按照本指南步骤操作，你的包就能成功发布到 npm！
