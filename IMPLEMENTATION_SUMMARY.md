# Codex 官方/本地登录切换 - 实现总结

## ✅ 功能实现完成

### 核心功能

1. **官方网页登录支持** 🌐
   - 新认证模式：`chatgpt_login`
   - 无需配置 API Key，Codex 自动打开浏览器登录
   - 自动清理本地配置，使用官方认证

2. **API Key 模式强化** 🔑
   - 新认证模式：`api_key`
   - 支持官方 OpenAI API
   - 支持第三方代理（自定义 Base URL）
   - 向后兼容（未设置 authMode 默认为 api_key）

3. **自动官方配置生成** ✨
   - 首次添加 Codex 配置时自动创建 `openai-official`
   - 用户无需手动操作
   - 官方配置在列表中用 🌐 标记

### 代码改动

```
src/
├── constants/ui.js                    # 添加 Codex 认证模式常量
├── commands/add.js                    # 移除 authMode 强制覆盖
├── commands/add/prompts.js            # 支持 Codex authMode 选择
├── commands/add/providerSaver.js      # 自动生成官方配置
├── commands/switch/
│   └── provider-choices-helper.js     # 官方登录特殊标记 🌐
└── utils/
    ├── codex-launcher.js              # 支持两种启动模式
    └── codex-files.js                 # 新增 clearCodexAkmConfig() 函数

CODEX_LOGIN_GUIDE.md                   # 用户完整指南
```

### 测试覆盖

- ✅ 所有 502 个测试通过
- ✅ 官方登录流程验证
- ✅ API Key 模式验证
- ✅ 向后兼容性验证
- ✅ 自动配置生成验证

## 使用流程

### 新用户 (最简单)

```bash
# 1. 添加第一个 Codex 配置
akm add --codex
# 选择: API Key 模式
# 输入 API Key 和 Base URL
# ✨ 自动创建官方配置

# 2. 查看配置
akm list --codex
# 🟢 [Codex] my-config (API Key Config)
# 🟢 [Codex] openai-official (OpenAI Official) 🌐 官方登录

# 3. 随时切换
akm openai-official    # 官方登录
akm my-config          # API Key
```

### 现有用户

```bash
# 查看 Codex 配置
akm list --codex

# 手动添加官方配置
akm add --codex
# 选择: 官方网页登录
# ✓ 完成

# 编辑现有配置改成官方登录
akm edit my-config
```

## 技术细节

### 官方登录工作流

```
1. 用户运行: akm openai-official
2. buildCodexEnvVariables() 检测到 authMode === 'chatgpt_login'
3. 返回不包含 OPENAI_API_KEY 的 env
4. clearCodexAkmConfig() 清理 ~/.codex/auth.json
5. clearCodexAkmConfig() 清理 config.toml 中的 AKM section
6. 启动 Codex
7. Codex 检测到无 auth.json → 打开浏览器登录
```

### API Key 工作流

```
1. 用户运行: akm my-config
2. buildCodexEnvVariables() 检测到 authMode === 'api_key'
3. 返回包含 OPENAI_API_KEY 和 OPENAI_BASE_URL 的 env
4. applyCodexConfig() 写入 auth.json
5. applyCodexConfig() 更新 config.toml provider section
6. 启动 Codex 时注入环境变量
7. Codex 直接连接到 API
```

### 自动配置逻辑

```javascript
// providerSaver.js 中
if (answers.ideName === 'codex') {
  const existingCodexProviders = Object.values(configManager.getAllProviders())
    .filter(p => p.ideName === 'codex');
  
  // 只有第一个 Codex 配置时才创建官方配置
  if (existingCodexProviders.length === 1 && 
      !configManager.getProvider('openai-official')) {
    // 自动创建 openai-official 配置
  }
}
```

## 配置文件示例

### ~/.akm-config.json

```json
{
  "version": "2.0.0",
  "providers": {
    "my-api-key": {
      "name": "my-api-key",
      "displayName": "My API Key",
      "ideName": "codex",
      "authMode": "api_key",
      "authToken": "sk-...",
      "baseUrl": "https://api.openai.com/v1"
    },
    "openai-official": {
      "name": "openai-official",
      "displayName": "OpenAI Official",
      "ideName": "codex",
      "authMode": "chatgpt_login",
      "authToken": null,
      "baseUrl": null
    }
  }
}
```

## 用户体验改进

### Before

```bash
# 需要手动添加官方配置
akm add --codex
# 选择认证模式: 官方网页登录
# 然后再添加 API Key 配置
akm add --codex
```

### After

```bash
# 添加一次，自动获得两个选项
akm add --codex
# ✨ 自动创建官方配置

# 或直接用
akm openai-official    # 官方
akm my-api-key         # API Key
```

## 命令速查

```bash
# 基础
akm add --codex              # 添加 Codex 配置
akm list --codex             # 列出 Codex 配置
akm openai-official          # 切换到官方登录
akm my-config                # 切换到 API Key

# 快速启动
akm openai-official -q       # 使用上次参数启动

# 管理
akm edit my-config           # 编辑配置
akm remove openai-official   # 删除配置
akm export                   # 导出备份
akm import backup.json       # 导入备份
akm validate --codex         # 验证 API 可用性
```

## 注意事项

✅ **安全**
- 配置文件权限 0600
- API Key 只在启动时注入环境变量
- 官方登录不涉及 Key 存储

✅ **兼容性**
- 现有配置继续工作
- 未设置 authMode 默认为 api_key
- 支持升级迁移

✅ **易用性**
- 首次用户无需配置官方登录
- 快速 IDE 切换：`akm openai-official`
- 列表中明确标记认证方式

## 后续支持

所有 akm 功能都支持新配置：
- 导出/导入
- 备份/恢复
- 验证 API
- 克隆配置
- 批量删除

---

**文档**: 详见 `CODEX_LOGIN_GUIDE.md`
**测试**: 所有 502 个测试通过 ✓
