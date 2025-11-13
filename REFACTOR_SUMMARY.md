# 项目改造总结 - API Key Manager

## 📌 项目改造概览

本次改造将项目从 **Claude Code Switcher** (特定于 Claude Code) 改造为 **API Key Manager** (通用 API 密钥管理工具)，并扩展了 `api_key` 认证模式的功能。

### 项目文件夹名称
- **旧**：`claude-code-switcher`
- **新**：`api-key-manager`

### 改造日期
2025-11-13

### 主要改造内容

---

## 1️⃣ 项目名称与标识更新

### package.json 变化
- **项目名称**：`@wcldyx/claude-code-switcher` → `@pikecode/api-key-manager`
- **版本号**：`1.0.14` → `2.0.0` (主版本更新)
- **命令行工具**：`cc` → `akm` (API Key Manager)
- **项目描述**：更新为支持 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN
- **关键词**：添加了 `api`, `api-key`, `key-manager`, `anthropic-api-key`, `anthropic-auth-token` 等
- **GitHub 仓库**：`github.com/wcldyx/claude-code-switcher` → `github.com/pikecode/api-key-manager`

### 可执行文件变化
- **新增**：`bin/akm.js` - 新的命令行入口 (替代 `bin/cc.js`)
- **功能**：同时支持 Anthropic API 和其他 API 提供商

### Git 配置更新
- **远程仓库 URL**：`git@github.com:wcldyx/claude-code-switcher.git` → `git@github.com:pikecode/api-key-manager.git`

---

## 2️⃣ API Key 模式扩展

### 核心改造：支持两种 Token 类型

原始 `api_key` 模式仅支持 `ANTHROPIC_API_KEY`，现已扩展为支持两种：

#### 新的认证模式结构
```javascript
{
  authMode: 'api_key',
  tokenType: 'api_key' | 'auth_token'  // 新增字段
}
```

#### 三种认证模式说明
1. **🔑 通用API密钥模式** (`api_key`)
   - 支持两种 Token 类型
   - `tokenType: 'api_key'` → 设置 `ANTHROPIC_API_KEY`
   - `tokenType: 'auth_token'` → 设置 `ANTHROPIC_AUTH_TOKEN`

2. **🔐 认证令牌模式** (`auth_token`)
   - 仅设置 `ANTHROPIC_AUTH_TOKEN`

3. **🌐 OAuth令牌模式** (`oauth_token`)
   - 仅设置 `CLAUDE_CODE_OAUTH_TOKEN`

---

## 3️⃣ 配置结构更新

### 新增字段
```javascript
{
  version: '2.0.0',
  providers: {
    'provider-name': {
      // 现有字段...
      authMode: 'api_key' | 'auth_token' | 'oauth_token',
      tokenType: 'api_key' | 'auth_token',  // ✨ 新增
      authToken: 'token-value',
      baseUrl: 'https://api.example.com',
      // ...
    }
  }
}
```

### 配置文件位置
- **旧**：`~/.cc-config.json`
- **新**：`~/.akm-config.json`

---

## 4️⃣ 环境变量启动逻辑更新

### env-launcher.js 改造

**原始逻辑（仅支持 ANTHROPIC_API_KEY）**
```javascript
if (config.authMode === 'api_key') {
  env.ANTHROPIC_API_KEY = config.authToken;
}
```

**新逻辑（支持两种 Token）**
```javascript
if (config.authMode === 'api_key') {
  if (config.tokenType === 'auth_token') {
    env.ANTHROPIC_AUTH_TOKEN = config.authToken;
  } else {
    env.ANTHROPIC_API_KEY = config.authToken;
  }
}
```

---

## 5️⃣ 用户交互界面更新

### 命令交互变化

#### add.js - 添加配置
- 新增 Token 类型选择步骤（仅在 `api_key` 模式时出现）
- 更新认证模式描述
- 支持用户选择使用 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN

#### edit.js - 编辑配置
- 集成 Token 类型编辑功能
- 支持在现有配置中切换 Token 类型

#### list.js - 列出配置
- 显示每个配置的认证模式
- 显示 `api_key` 模式下的具体 Token 类型

#### current.js - 显示当前配置
- 显示当前活跃配置的认证模式和 Token 类型
- 显示对应的环境变量设置方式

#### switch.js - 管理界面
- 详情页面显示 Token 类型
- 编辑时支持修改 Token 类型
- 更新说明文字

---

## 6️⃣ 文档更新

### README.md
- 更新项目标题和描述
- 更新命令示例（`cc` → `akm`）
- 添加支持 ANTHROPIC_AUTH_TOKEN 的说明
- 更新认证模式选择说明

### CLAUDE.md (项目内部文档)
- 更新项目概述
- 更新配置文件路径
- 添加 `tokenType` 字段说明
- 解释三种认证模式的差异

---

## 📋 修改的文件清单

### 修改文件
1. ✅ `package.json` - 项目元数据更新
2. ✅ `bin/akm.js` - 新建命令行入口
3. ✅ `src/config.js` - 配置路径和结构更新
4. ✅ `src/utils/env-launcher.js` - Token 类型支持
5. ✅ `src/commands/add.js` - Token 类型选择交互
6. ✅ `src/commands/edit.js` - Token 类型编辑交互
7. ✅ `src/commands/list.js` - Token 类型显示
8. ✅ `src/commands/current.js` - Token 类型和环境变量显示
9. ✅ `src/commands/switch.js` - Token 类型集成和显示
10. ✅ `README.md` - 项目文档更新
11. ✅ `CLAUDE.md` - 开发文档更新

---

## 🔄 向后兼容性

### 自动迁移
- 旧配置文件 `~/.cc-config.json` 不会自动迁移
- 用户需要重新添加配置到新的 `~/.akm-config.json`
- 建议：升级时备份旧配置

### 配置版本
- **旧版本**：`1.0.0`
- **新版本**：`2.0.0`

---

## ✅ 验证清单

- ✅ 所有 JavaScript 文件语法检查通过
- ✅ `build` 脚本执行成功
- ✅ 新的命令行工具 `akm` 已创建
- ✅ Token 类型逻辑集成完成
- ✅ UI 文本和提示已更新
- ✅ 文档已更新

---

## 🚀 下一步建议

1. **测试**：运行 `npm test` 确保所有测试通过
2. **本地测试**：运行 `npm run dev` 进行手动测试
3. **发布**：使用 `npm run release` 发布新版本
4. **迁移指南**：为用户提供从旧版本迁移的指南

---

## 📝 使用示例

### 添加配置（使用 ANTHROPIC_AUTH_TOKEN）
```bash
akm add
# 选择: 通用API密钥模式
# 选择: ANTHROPIC_AUTH_TOKEN
# 输入: Token 值和基础 URL
```

### 查看当前配置
```bash
akm current
# 显示: Token 类型是 ANTHROPIC_AUTH_TOKEN
# 显示: set ANTHROPIC_AUTH_TOKEN=...
```

---

**改造完成于**: 2025-11-13
**改造者**: Claude AI Assistant
