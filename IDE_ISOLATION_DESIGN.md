# IDE 隔离设计文档

本文档说明 API Key Manager 如何确保 Codex 和 Claude Code 完全隔离，防止混淆。

## 问题背景

在之前的版本中，存在以下潜在的混淆：

1. **环境变量混淆** - 可能同时设置 Claude Code 和 Codex 的环境变量
2. **启动命令混淆** - 可能启动了错误的 IDE
3. **默认行为不明确** - ideName 缺失时默认为 Claude Code
4. **UI 提示不清晰** - 启动时没有明确显示将启动哪个 IDE

## 解决方案架构

### 1. 严格的条件检查

**原则**：每个关键点都使用 `===` 明确检查 ideName

```javascript
// ❌ 不推荐（有默认值）
if (config.ideName === 'claude' || !config.ideName) { ... }

// ✅ 推荐（明确检查）
if (config.ideName === 'claude') { ... }
if (config.ideName === 'codex') { ... }
```

### 2. IDE 识别流程

整个流程中的 IDE 识别点：

```
用户执行: akm my-codex
    ↓
配置加载：provider.ideName = 'codex'
    ↓
switch.js (launchProvider)
    │
    ├─ 检查 1: if (provider.ideName !== 'codex')
    │           → 跳过 Claude 设置检查
    │
    ├─ 检查 2: 动态显示启动提示
    │           → "正在启动 ⚙️ Codex..."
    │
    └─ 检查 3: executeWithEnv(provider)
                ↓
            env-launcher.js (buildEnvVariables)
                │
                ├─ if (config.ideName === 'claude')
                │   → 设置 ANTHROPIC_* 环境变量
                │
                └─ if (config.ideName === 'codex')
                    → 设置 OPENAI_* 环境变量
                ↓
            env-launcher.js (executeWithEnv)
                │
                ├─ 安全检查: if (!config.ideName)
                │           → throw Error()
                │
                ├─ const command = ideName === 'codex' ? 'codex' : 'claude'
                │ → 选择正确的命令
                │
                └─ spawn(command, args, { env })
                    → 启动正确的 IDE
```

### 3. 关键隔离点

#### 3.1 环境变量隔离

**Claude Code 环境变量**（设置在 ideName === 'claude' 时）：
- `CLAUDE_CODE_OAUTH_TOKEN`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_SMALL_FAST_MODEL`

**Codex 环境变量**（设置在 ideName === 'codex' 时）：
- `OPENAI_API_KEY`
- `OPENAI_API_BASE`（可选）

**关键原则**：两个 IDE 的环境变量**绝不会同时设置**

#### 3.2 配置检查隔离

```javascript
// switch.js - launchProvider() 中
if (provider.ideName !== 'codex') {
  // 仅对 Claude Code 执行
  const shouldContinue = await this.ensureClaudeSettingsCompatibility(provider);
  if (!shouldContinue) {
    return;
  }
}
```

**为什么**：
- Claude Code 需要检查 `.claude/settings.json` 中的环境变量冲突
- Codex 使用 `~/.codex/config.toml`，不需要这个检查
- 避免对 Codex 进行无关的检查

#### 3.3 命令选择隔离

```javascript
// env-launcher.js - executeWithEnv() 中
const isCodex = config.ideName === 'codex';
const command = isCodex ? 'codex' : 'claude';
```

**隔离机制**：
- 明确的三元操作符，没有默认值
- `isCodex` 变量增强可读性
- 清晰的意图表达

#### 3.4 启动提示隔离

```javascript
// switch.js - launchProvider() 中
const ideName = provider.ideName === 'codex' ? 'Codex' : 'Claude Code';
const ideIcon = provider.ideName === 'codex' ? '⚙️' : '🚀';
console.log(`环境配置完成，正在启动 ${ideIcon} ${ideName}...`);
```

**用户反馈**：
- Claude Code 启动时显示：`🚀 Claude Code`
- Codex 启动时显示：`⚙️ Codex`
- 用户能清晰知道将启动哪个 IDE

### 4. 安全检查

#### 4.1 缺失 ideName 的防御

```javascript
// env-launcher.js - executeWithEnv() 开始
if (!config.ideName) {
  throw new Error('供应商配置缺少 ideName 字段，无法启动 IDE');
}
```

**意义**：
- 防止意外的 undefined 行为
- 及时发现配置错误
- 给用户清晰的错误提示

#### 4.2 显式确认

```javascript
// env-launcher.js - 启动前打印
console.log(`\n启动 ${ideIcon} ${description}...\n`);
```

**意义**：
- 在启动 IDE 前最后确认一次
- 用户可以看到即将启动的 IDE
- 防止意外启动错误的 IDE

## IDE 配置数据流

### Claude Code 配置

```json
{
  "name": "my-claude",
  "ideName": "claude",
  "authMode": "api_key",
  "authToken": "sk-ant-...",
  "baseUrl": "https://api.anthropic.com",
  "tokenType": "api_key"
}
```

**数据流**：
```
ideName: 'claude'
    ↓
buildEnvVariables() → ANTHROPIC_API_KEY=sk-ant-...
                      ANTHROPIC_BASE_URL=https://...
    ↓
executeWithEnv() → command='claude'
    ↓
spawn('claude', [...])
```

### Codex 配置

#### ChatGPT 登录模式

```json
{
  "name": "my-codex-chat",
  "ideName": "codex",
  "authMode": "chatgpt_login",
  "authToken": null,
  "baseUrl": null
}
```

**数据流**：
```
ideName: 'codex'
    ↓
buildEnvVariables() → 不设置任何环境变量
    ↓
executeWithEnv() → command='codex'
    ↓
spawn('codex', [...])
    ↓
Codex 打开浏览器进行交互式登录
```

#### API Key 模式

```json
{
  "name": "my-codex-api",
  "ideName": "codex",
  "authMode": "api_key",
  "authToken": "sk-...",
  "baseUrl": null
}
```

**数据流**：
```
ideName: 'codex'
    ↓
buildEnvVariables() → OPENAI_API_KEY=sk-...
    ↓
executeWithEnv() → command='codex'
    ↓
spawn('codex', [...])
    ↓
Codex 使用 OPENAI_API_KEY 连接 OpenAI API
```

## 测试验证

### 测试场景 1：启动 Claude Code

```bash
$ akm my-claude
正在启动
    目标供应商: my-claude (My Claude) [🚀 Claude Code]
    准备就绪: 环境配置完成，正在启动 🚀 Claude Code...
启动 🚀 Claude Code...

[claude CLI 启动]
```

**验证点**：
- ✅ 显示 Claude Code 标识
- ✅ 设置 ANTHROPIC_* 环境变量
- ✅ 启动 'claude' 命令
- ✅ 检查 Claude 设置文件兼容性

### 测试场景 2：启动 Codex (ChatGPT 登录)

```bash
$ akm my-codex-chat
正在启动
    目标供应商: my-codex-chat (Codex ChatGPT) [⚙️ Codex]
    准备就绪: 环境配置完成，正在启动 ⚙️ Codex...
启动 ⚙️ Codex...

[codex CLI 启动，打开浏览器登录]
```

**验证点**：
- ✅ 显示 Codex 标识
- ✅ 不设置 ANTHROPIC_* 环境变量
- ✅ 不检查 Claude 设置文件（跳过）
- ✅ 启动 'codex' 命令

### 测试场景 3：启动 Codex (API Key)

```bash
$ akm my-codex-api
正在启动
    目标供应商: my-codex-api (Codex API Key) [⚙️ Codex]
    准备就绪: 环境配置完成，正在启动 ⚙️ Codex...
启动 ⚙️ Codex...

[codex CLI 启动，使用 OPENAI_API_KEY]
```

**验证点**：
- ✅ 显示 Codex 标识
- ✅ 设置 OPENAI_API_KEY 环境变量
- ✅ 不设置 ANTHROPIC_* 环境变量
- ✅ 不检查 Claude 设置文件（跳过）
- ✅ 启动 'codex' 命令

## 配置升级

### 旧版本配置兼容性

如果用户有旧版本的配置（缺少 ideName），会发生：

```bash
$ akm old-provider
错误: 供应商配置缺少 ideName 字段，无法启动 IDE
```

**用户需要**：
1. 重新编辑配置：`akm edit old-provider`
2. 在编辑时会自动保存 ideName
3. 之后可正常使用

## 最佳实践

### 1. 命名约定

推荐的供应商名称：

```
Claude Code 配置：
  - my-claude
  - claude-official
  - claude-custom

Codex 配置：
  - my-codex
  - codex-gpt4
  - codex-chatgpt
```

### 2. 显示名称

推荐的显示名称：

```
Claude Code:
  - "My Claude Code (Official)"
  - "Claude Code - API Key"

Codex:
  - "OpenAI Codex - ChatGPT"
  - "Codex - API Key"
```

### 3. 备注和文档

在配置文件的备注中说明：

```json
{
  "my-claude": {
    "displayName": "Claude Code - Official",
    "ideName": "claude",
    "_comment": "官方 Claude Code with OAuth token"
  },
  "my-codex": {
    "displayName": "Codex - ChatGPT Login",
    "ideName": "codex",
    "_comment": "OpenAI Codex with interactive ChatGPT login"
  }
}
```

## 架构演进

### v1.0.10 之前

```
❌ 混淆的地方：
- ideName 可以为 undefined，默认为 Claude Code
- 启动前没有明确确认
- 环境变量可能混合
```

### v1.0.10 及以后

```
✅ 隔离的地方：
- 所有 IDE 选择都是显式的 (=== 'claude' 或 === 'codex')
- 启动前清晰显示将启动哪个 IDE
- 环境变量严格隔离，绝不混合
- 安全检查防止意外行为
```

## 故障排除

### 问题：启动了错误的 IDE

**症状**：选择了 Codex，但启动了 Claude Code

**诊断**：
```bash
# 检查供应商配置
akm list
# 查看 ideName 是否正确显示

# 检查配置文件
cat ~/.akm-config.json | grep -A 5 "my-codex"
```

**解决**：
```bash
# 重新编辑配置
akm edit my-codex

# 确保选择了正确的 IDE
```

### 问题：缺少 ideName 错误

**症状**：
```
错误: 供应商配置缺少 ideName 字段，无法启动 IDE
```

**原因**：配置来自更早的版本

**解决**：
```bash
# 删除旧配置
akm remove old-provider

# 重新添加
akm add
```

## 总结

v1.0.10 通过以下机制确保 Codex 和 Claude Code 完全隔离：

1. **显式条件检查** - 每个关键点都明确检查 ideName
2. **环境变量隔离** - 两个 IDE 的环境变量绝不混合
3. **启动命令隔离** - 根据 ideName 启动不同的命令
4. **用户反馈清晰** - UI 明确显示将启动哪个 IDE
5. **安全防护** - 检查缺失的 ideName，防止意外行为

用户现在可以放心地混合使用 Codex 和 Claude Code 配置，系统会确保正确的 IDE 在正确的时间启动。
