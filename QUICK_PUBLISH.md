# ⚡ npm 发布 - 快速参考（30秒版）

## 🎯 核心命令（复制粘贴）

### 首次发布

```bash
# 1. 登录 npm（只需一次）
npm login
# 输入：pikecode / 密码 / 邮箱

# 2. 检查版本
cat package.json | grep version
# 应该显示: "version": "2.0.0"

# 3. 发布
npm publish --access public

# 完成！可以在这里查看：
# https://www.npmjs.com/package/@pikecode/api-key-manager
```

### 后续更新发布

```bash
# 1. 修改代码并提交
git add .
git commit -m "feat: 新功能"
git push origin master

# 2. 更新版本号（自动更新）
npm version minor  # 或 patch / major

# 3. 发布
npm publish --access public

# 4. 推送 tag（可选）
git push origin --tags
```

---

## 📋 版本号选择

| 命令 | 结果 | 说明 |
|------|------|------|
| `npm version patch` | 2.0.0 → 2.0.1 | 修复 bug |
| `npm version minor` | 2.0.0 → 2.1.0 | 添加功能 |
| `npm version major` | 2.0.0 → 3.0.0 | 破坏性改动 |

---

## ✅ 发布前检查（10 秒）

```bash
# 检查登录
npm whoami

# 检查 Git
git status  # 应该显示: working tree clean

# 检查包信息
npm view @pikecode/api-key-manager
```

---

## 🚀 一键发布

```bash
# 组合命令（修复 bug 版本）
npm version patch && npm publish --access public && git push origin --tags
```

---

## 📦 发布后验证

```bash
# 查看已发布版本
npm view @pikecode/api-key-manager version

# 查看所有版本
npm view @pikecode/api-key-manager versions

# 尝试安装
npm install -g @pikecode/api-key-manager

# 测试命令
akm --version
```

---

## 🔗 发布位置

发布后访问：https://www.npmjs.com/package/@pikecode/api-key-manager

---

## ⚠️ 注意事项

1. ✅ 必须已登录 npm（`npm login`）
2. ✅ package.json 中的 name 必须是 `@pikecode/api-key-manager`
3. ✅ 发布前所有代码必须提交到 Git
4. ✅ .npmignore 已配置，不会发布不必要的文件
5. ✅ 包包含的内容：bin/, src/, README.md, LICENSE

---

## 📞 问题排查

### 未登录
```bash
npm login
```

### 版本已存在
```bash
npm version minor  # 更新版本号
npm publish --access public
```

### 2FA 验证失败
```bash
npm publish --access public --otp 123456
# 用你的 Authenticator 应用中的 6 位码替换 123456
```

### 权限问题
```bash
npm whoami  # 检查登录的用户是不是 pikecode
```

---

**就这么简单！** 🎉

完整指南见：`NPM_PUBLISH_GUIDE.md`
详细检查清单见：`PUBLISH_CHECKLIST.md`
