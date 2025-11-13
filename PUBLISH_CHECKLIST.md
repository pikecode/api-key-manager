# 🚀 npm 发布快速检查清单

## 📋 一句话总结

**发布 npm 包只需要 3 个命令：**

```bash
npm login                    # 第一次需要登录
npm version patch            # 更新版本号（或 minor/major）
npm publish --access public  # 发布到 npm
```

---

## ✅ 发布前 5 分钟检查

### 1️⃣ 检查 npm 登录状态（30 秒）

```bash
# 检查是否已登录
npm whoami

# 应该输出你的 npm 用户名: pikecode
```

**如果未登录，运行：**
```bash
npm login
# 输入用户名、密码、邮箱
```

### 2️⃣ 检查 package.json（1 分钟）

```bash
# 查看关键字段
npm view @pikecode/api-key-manager

# 本地查看
cat package.json | head -20
```

**确认以下内容：**
- ✅ `"name": "@pikecode/api-key-manager"`
- ✅ `"version": "2.0.0"` (或新版本号)
- ✅ `"license": "MIT"`
- ✅ `"repository": "git+https://github.com/pikecode/api-key-manager.git"`

### 3️⃣ 检查 Git 状态（1 分钟）

```bash
# 确保所有改动都已提交
git status
# 应该显示: working tree clean

# 检查最新提交
git log -1 --oneline
```

### 4️⃣ 检查 .npmignore（30 秒）

```bash
# 查看将要发布的文件
npm pack

# 检查包含的文件
tar -tzf pikecode-api-key-manager-2.0.0.tgz | head -20
```

**应该包含：**
- ✅ bin/akm.js
- ✅ src/
- ✅ README.md
- ✅ LICENSE

**不应该包含：**
- ❌ node_modules/
- ❌ .git/
- ❌ tests/
- ❌ .gitignore
- ❌ 临时文档文件

### 5️⃣ 运行测试（1 分钟）

```bash
# 如果有测试
npm test

# 或者手动测试命令行工具
npm run start
# 或
node bin/akm.js --version
```

---

## 🎬 发布流程（3 步）

### 步骤 1：更新版本号

```bash
# 选择一个：

# 修复 bug (2.0.0 → 2.0.1)
npm version patch

# 添加功能 (2.0.0 → 2.1.0)
npm version minor

# 破坏性改动 (2.0.0 → 3.0.0)
npm version major
```

这会：
- ✅ 自动更新 package.json 的版本号
- ✅ 创建 Git tag
- ✅ 创建 Git commit

### 步骤 2：发布到 npm

```bash
npm publish --access public
```

**输出示例：**
```
npm notice Publishing to https://registry.npmjs.org/ with tag latest and default access
npm notice Packfile:
npm notice  "name":"@pikecode/api-key-manager",
npm notice  "version":"2.0.1",
npm notice  ...
npm notice 📦 @pikecode/api-key-manager@2.0.1
```

### 步骤 3：推送 Git tag（可选）

```bash
# 推送版本 tag 到 GitHub
git push origin --tags
```

---

## ✅ 发布后验证（2 分钟）

### 1️⃣ 在 npm 官网检查

访问：https://www.npmjs.com/package/@pikecode/api-key-manager

应该能看到：
- ✅ 最新版本号
- ✅ 发布时间
- ✅ 下载统计
- ✅ README 内容

### 2️⃣ 通过命令行验证

```bash
# 查看发布的版本
npm view @pikecode/api-key-manager version
# 应该显示: 2.0.1

# 查看所有版本
npm view @pikecode/api-key-manager versions
```

### 3️⃣ 尝试安装

```bash
# 全局安装（或在新目录测试）
npm install -g @pikecode/api-key-manager

# 验证命令
akm --version
# 应该显示: 2.0.1
```

---

## 📋 完整发布检查清单

在运行发布命令前，请确认以下所有项目都已完成：

### 代码准备
- [ ] 所有功能已实现并测试
- [ ] 代码已 review
- [ ] 没有 console.log 或调试代码
- [ ] 没有 TODO 注释

### Git 准备
- [ ] 所有改动已提交
- [ ] Git 分支是 master 或 main
- [ ] 没有未提交的改动
- [ ] 最新代码已推送到 GitHub

### package.json 准备
- [ ] `name` 字段正确：`@pikecode/api-key-manager`
- [ ] `version` 字段已更新
- [ ] `description` 清晰
- [ ] `main` 字段指向正确文件
- [ ] `bin` 字段配置正确
- [ ] `repository` 指向正确的 GitHub 仓库
- [ ] `license` 字段已设置
- [ ] 所有依赖版本都合理

### 文件准备
- [ ] README.md 已完整编写
- [ ] LICENSE 文件存在
- [ ] .npmignore 已配置
- [ ] 不包含 node_modules
- [ ] 不包含测试文件（如果想排除的话）

### npm 账户准备
- [ ] 已在 npm 官网创建账户
- [ ] 已验证邮箱
- [ ] 已在本地运行 `npm login`
- [ ] `npm whoami` 返回正确的用户名

### 最终检查
- [ ] `npm test` 通过（如果有测试）
- [ ] `npm pack` 生成的包体积合理
- [ ] 本地可以运行命令：`node bin/akm.js`

---

## 🚀 一键发布脚本

你可以创建一个 shell 脚本来自动化发布流程：

### 创建发布脚本 (publish.sh)

```bash
#!/bin/bash

echo "=========================================="
echo "NPM 发布脚本 - @pikecode/api-key-manager"
echo "=========================================="
echo ""

# 1. 检查登录状态
echo "检查 npm 登录状态..."
npm whoami || (echo "未登录，正在登录..." && npm login)

# 2. 检查 Git 状态
echo ""
echo "检查 Git 状态..."
if [ -z "$(git status --short)" ]; then
    echo "✅ Git 状态正常"
else
    echo "❌ 有未提交的改动，请先提交"
    exit 1
fi

# 3. 选择版本更新类型
echo ""
echo "选择版本更新类型："
echo "1) patch (修复 bug) - 2.0.0 → 2.0.1"
echo "2) minor (添加功能) - 2.0.0 → 2.1.0"
echo "3) major (破坏性改动) - 2.0.0 → 3.0.0"
read -p "请选择 (1-3): " choice

case $choice in
    1) npm version patch ;;
    2) npm version minor ;;
    3) npm version major ;;
    *) echo "无效选择"; exit 1 ;;
esac

# 4. 发布到 npm
echo ""
echo "正在发布到 npm..."
npm publish --access public

# 5. 推送 tag
echo ""
echo "正在推送 tag 到 GitHub..."
git push origin --tags

# 6. 完成
echo ""
echo "=========================================="
echo "✅ 发布完成！"
echo "=========================================="
```

### 使用脚本

```bash
# 使脚本可执行
chmod +x publish.sh

# 运行脚本
./publish.sh
```

---

## 📊 版本号规划

针对 API Key Manager 的版本规划示例：

```
v2.0.0   - 初始发布（从 cc 迁移到 akm）
v2.0.1   - 修复初始 bug
v2.1.0   - 添加新的 Token 类型支持
v2.2.0   - 添加更多供应商支持
v3.0.0   - 完全重写（如果有破坏性改动）
```

---

## 🔒 npm 账户安全

### 设置 2FA（双因素认证）

1. 登录 npm 官网
2. 进入 Account Settings
3. 启用 2FA
4. 使用 Authenticator 应用扫描 QR 码

### 发布时使用 2FA

如果启用了 2FA，发布时需要提供一次性密码：

```bash
npm publish --access public --otp 123456
# 将 123456 替换为你的 Authenticator 应用生成的码
```

---

## ❓ 常见问题

### Q: 如何修改已发布的包内容？

**A:** 创建新版本发布：
```bash
npm version patch
# 修改相关文件
git add .
git commit -m "fix: 修复问题"
npm publish --access public
```

### Q: 如何撤销已发布的版本？

**A:** 24 小时内可以撤销：
```bash
npm unpublish @pikecode/api-key-manager@2.0.1
```

### Q: 如何查看发布历史？

**A:**
```bash
npm view @pikecode/api-key-manager time
npm view @pikecode/api-key-manager versions
```

### Q: 包发布到 npm 需要多久更新搜索？

**A:** 通常需要 5-10 分钟，可以立即通过 url 访问

---

## 🎉 发布成功！

发布后，用户可以通过以下方式安装你的包：

```bash
# 全局安装
npm install -g @pikecode/api-key-manager

# 项目内安装
npm install @pikecode/api-key-manager

# 使用命令
akm --version
```

---

**准备好发布了吗？按照上面的步骤，3 个命令即可完成！** 🚀
