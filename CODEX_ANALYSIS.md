# API Key Manager - Codex 配置支持技术分析

## 目录
1. [项目概览](#项目概览)
2. [架构设计](#架构设计)
3. [Codex vs Claude Code 对比](#codex-vs-claude-code-对比)
4. [核心实现分析](#核心实现分析)
5. [数据流向](#数据流向)
6. [执行流程](#执行流程)
7. [设计原理和考虑](#设计原理和考虑)

---

## 项目概览

本项目是一个 CLI 工具，用于管理多个 IDE 的 API 提供商配置，支持：
- **Claude Code** (Anthropic 官方编辑器)
- **Codex** (OpenAI 的代码生成工具)

核心功能：
- 多供应商配置管理
- 快速切换 IDE 和 API 认证方案
- 环境变量自动设置
- 配置文件冲突检测和修复

---

## 架构设计

### 1. 分层架构

```
┌─────────────────────────────────────┐
│      CLI 命令层 (bin/akm.js)        │  用户交互入口
├─────────────────────────────────────┤
│  命令实现层 (src/commands/*)        │  add, switch, edit, remove, list, current
├─────────────────────────────────────┤
│  业务逻辑层                          │
│ ├─ ConfigManager (配置管理)         │
│ ├─ EnvSwitcher (环境切换)           │
│ └─ executeWithEnv (环境执行)        │
├─────────────────────────────────────┤
│  工具层 (src/utils/*)               │  validator, logger, ui-helper 等
├─────────────────────────────────────┤
│  存储层 (~/.akm-config.json)       │  持久化配置文件
└─────────────────────────────────────┘
```

### 2. 配置结构

```javascript
// 单个供应商配置
{
  name: string,              // 供应商内部标识 (e.g., "openai-codex")
  displayName: string,       // 显示名称 (e.g., "OpenAI Codex")
  ideName: "claude" | "codex", // IDE 类型标识符
  authMode: string,          // 认证模式 (见下表)
  authToken: string,         // 实际的认证令牌
  tokenType?: "api_key" | "auth_token", // 仅用于 Claude Code 的 api_key 模式
  baseUrl?: string,          // API 基础地址
  models?: {
    primary: string,         // 主模型名称
    smallFast: string        // 快速模型名称
  },
  launchArgs: string[],      // 启动参数
  createdAt: ISO8601,        // 创建时间戳
  lastUsed: ISO8601,         // 最后使用时间戳
  usageCount: number,        // 使用次数统计
  current: boolean           // 是否为当前活跃供应商
}
```

---

## Codex vs Claude Code 对比

### 认证模式详解

| 维度 | Claude Code | Codex |
|------|-----------|-------|
| **IDE 标识** | `ideName: "claude"` | `ideName: "codex"` |
| **认证方式数量** | 3 种 | 2 种 |
| **支持的认证模式** | oauth_token, api_key, auth_token | api_key, chatgpt_login |

### 认证模式对照表

#### Claude Code 认证模式

| 模式 | authMode | 环境变量设置 | 适用场景 | tokenType |
|------|----------|-----------|--------|----------|
| OAuth | `oauth_token` | `CLAUDE_CODE_OAUTH_TOKEN` | 官方 Claude Code 用户 | - |
| API 密钥 | `api_key` | `ANTHROPIC_BASE_URL` + `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` | 第三方 API 服务商 | `api_key` / `auth_token` |
| 认证令牌 | `auth_token` | `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` | 仅支持认证令牌的服务商 | - |

#### Codex 认证模式

| 模式 | authMode | 环境变量设置 | 适用场景 |
|------|----------|-----------|--------|
| ChatGPT 登录 | `chatgpt_login` | 无（交互式登录） | 有 ChatGPT 账户的用户 |
| API Key | `api_key` | `OPENAI_API_KEY` + `OPENAI_API_BASE`（可选） | 有 OpenAI API Key 的用户 |

### 配置特性对比

```javascript
// Claude Code - api_key 模式示例
{
  ideName: "claude",
  authMode: "api_key",
  tokenType: "api_key",  // 关键字段：指定 API 密钥类型
  baseUrl: "https://api.example.com",
  authToken: "sk-..."
}

// Claude Code - auth_token 模式示例
{
  ideName: "claude",
  authMode: "auth_token",
  // tokenType 不存在（此模式只支持 ANTHROPIC_AUTH_TOKEN）
  baseUrl: "https://api.example.com",
  authToken: "token-..."
}

// Codex - api_key 模式示例
{
  ideName: "codex",
  authMode: "api_key",
  baseUrl: "https://api.openai.com/v1",  // 可选，默认使用官方
  authToken: "sk-..."  // OpenAI API Key
}

// Codex - chatgpt_login 模式示例
{
  ideName: "codex",
  authMode: "chatgpt_login"
  // authToken 不需要（使用交互式登录）
}
```

### 关键字段用途对比

| 字段 | Claude Code | Codex | 说明 |
|------|-----------|-------|------|
| `ideName` | "claude" | "codex" | IDE 类型标识 |
| `authMode` | oauth_token / api_key / auth_token | api_key / chatgpt_login | 认证方案选择 |
| `tokenType` | ✓ (api_key 模式必有) | ✗ | 指定 token 环境变量类型 |
| `baseUrl` | api_key/auth_token 时必需 | api_key 时可选 | API 端点地址 |
| `authToken` | api_key/auth_token/oauth_token 时必需 | api_key 时必需 | 认证凭证 |

---

## 核心实现分析

### 1. 交互式配置流程 (src/commands/add.js)

#### 第一步：IDE 选择
```javascript
// 第 199-206 行：ideName 选择逻辑
{
  type: 'list',
  name: 'ideName',
  message: '选择要使用的 IDE:',
  choices: [
    { name: '🚀 Claude Code - Anthropic 官方代码编辑器', value: 'claude' },
    { name: '⚙️ Codex - 代码生成和编辑工具', value: 'codex' }
  ],
  default: 'claude'
}
```

**设计原理**：
- 作为第一步选择，决定后续所有问题的呈现方式
- 存储在 `ideName` 字段中，用于区分不同的 IDE 类型

#### 第二步：认证模式选择
```javascript
// 第 208-232 行：authMode 条件选择
choices: (answers) => {
  if (answers.ideName === 'codex') {
    // Codex 的认证模式
    return [
      { name: '🔐 ChatGPT 登录 (推荐) - 使用 ChatGPT 账户登录', value: 'chatgpt_login' },
      { name: '🔑 OpenAI API Key - 使用 OPENAI_API_KEY', value: 'api_key' }
    ];
  }
  // Claude Code 的认证模式
  return [
    { name: '🔑 通用API密钥模式 - 支持 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN', value: 'api_key' },
    { name: '🔐 认证令牌模式 (仅 ANTHROPIC_AUTH_TOKEN) - 适用于某些服务商', value: 'auth_token' },
    { name: '🌐 OAuth令牌模式 (CLAUDE_CODE_OAUTH_TOKEN) - 适用于官方Claude Code', value: 'oauth_token' }
  ];
}
```

**设计原理**：
- 根据 `ideName` 动态显示不同的认证模式选项
- Codex 只有 2 种模式，Claude Code 有 3 种
- 选择结果影响后续 `tokenType` 和 `baseUrl` 的显示

#### 第三步：Token 类型选择（仅 Claude Code 的 api_key 模式）
```javascript
// 第 234-246 行：tokenType 条件显示
{
  type: 'list',
  name: 'tokenType',
  message: '选择Token类型:',
  choices: [
    { name: '🔑 ANTHROPIC_API_KEY - 通用API密钥', value: 'api_key' },
    { name: '🔐 ANTHROPIC_AUTH_TOKEN - 认证令牌', value: 'auth_token' }
  ],
  default: 'api_key',
  when: (answers) => answers.ideName === 'claude' && answers.authMode === 'api_key'
}
```

**设计原理**：
- 仅当 `ideName === "claude"` 且 `authMode === "api_key"` 时显示
- 让用户在两种 API 密钥类型之间选择
- Codex 的 api_key 模式固定使用 `OPENAI_API_KEY`，无需此选择

#### 第四步：Base URL 输入
```javascript
// 第 247-287 行：baseUrl 条件显示与验证
when: (answers) => {
  if (answers.ideName === 'codex') {
    return answers.authMode === 'api_key';  // Codex 仅在 api_key 时需要
  }
  // Claude Code 在 api_key 和 auth_token 时都需要
  return answers.authMode === 'api_key' || answers.authMode === 'auth_token';
},
validate: (input, answers) => {
  // auth_token 模式允许空值（使用官方 API）
  if (input === '' && answers.authMode === 'auth_token') {
    return true;
  }
  // Codex 的 api_key 模式也允许空值
  if (input === '' && answers.ideName === 'codex' && answers.authMode === 'api_key') {
    return true;
  }
  // Claude Code 的 api_key 模式必须有 URL
  if (!input && answers.ideName === 'claude' && answers.authMode === 'api_key') {
    return 'API基础URL不能为空';
  }
  // 其他校验...
}
```

**设计原理**：
- Codex 和 Claude Code 的 baseUrl 逻辑不同
- Codex 允许不设置 baseUrl（使用官方 OpenAI API）
- Claude Code 的 api_key 模式必须提供 baseUrl（通常是本地代理或第三方 API）

#### 第五步：Token 输入
```javascript
// 第 288-321 行：authToken 条件显示
message: (answers) => {
  if (answers.ideName === 'codex') {
    if (answers.authMode === 'api_key') {
      return '请输入OpenAI API Key (OPENAI_API_KEY):';
    }
    // chatgpt_login 模式不需要输入 Token
    return '请输入认证令牌:';
  }
  // Claude Code 的处理...
},
when: (answers) => !(answers.ideName === 'codex' && answers.authMode === 'chatgpt_login')
```

**设计原理**：
- Codex 的 chatgpt_login 模式不需要 Token（使用交互式登录）
- 根据 authMode 显示不同的 token 类型提示

### 2. 环境变量映射 (src/utils/env-launcher.js)

#### buildEnvVariables 函数

```javascript
function buildEnvVariables(config) {
  const env = { ...process.env };

  // Claude Code 配置逻辑
  if (config.ideName === 'claude' || !config.ideName) {
    if (config.authMode === 'oauth_token') {
      // OAuth 模式：只设置 OAuth Token
      env.CLAUDE_CODE_OAUTH_TOKEN = config.authToken;
    } else if (config.authMode === 'api_key') {
      // API Key 模式：需要 baseUrl + token
      env.ANTHROPIC_BASE_URL = config.baseUrl;
      // 根据 tokenType 选择设置哪种 token
      if (config.tokenType === 'auth_token') {
        env.ANTHROPIC_AUTH_TOKEN = config.authToken;
      } else {
        env.ANTHROPIC_API_KEY = config.authToken;
      }
    } else {
      // auth_token 模式：baseUrl + auth_token
      env.ANTHROPIC_BASE_URL = config.baseUrl;
      env.ANTHROPIC_AUTH_TOKEN = config.authToken;
    }
    
    // 设置模型配置（仅 Claude Code）
    if (config.models?.primary) {
      env.ANTHROPIC_MODEL = config.models.primary;
    }
    if (config.models?.smallFast) {
      env.ANTHROPIC_SMALL_FAST_MODEL = config.models.smallFast;
    }
  }

  // Codex 配置逻辑
  if (config.ideName === 'codex') {
    if (config.authMode === 'api_key' && config.authToken) {
      // 使用 OpenAI API Key
      env.OPENAI_API_KEY = config.authToken;
      // 可选的 OpenAI 兼容 API 端点
      if (config.baseUrl) {
        env.OPENAI_API_BASE = config.baseUrl;
      }
    }
    // chatgpt_login 模式无需环境变量
  }

  return env;
}
```

**环境变量映射表**：

| ideName | authMode | 设置的环境变量 |
|---------|----------|------------|
| claude | oauth_token | `CLAUDE_CODE_OAUTH_TOKEN` |
| claude | api_key (tokenType: api_key) | `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY` |
| claude | api_key (tokenType: auth_token) | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` |
| claude | auth_token | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` |
| codex | api_key | `OPENAI_API_KEY`, `OPENAI_API_BASE`（可选） |
| codex | chatgpt_login | 无（交互式登录） |

#### executeWithEnv 函数

```javascript
async function executeWithEnv(config, launchArgs = []) {
  const env = buildEnvVariables(config);
  const args = [...launchArgs];

  clearTerminal();

  // 确定要启动的命令
  const command = config.ideName === 'codex' ? 'codex' : 'claude';
  const description = config.ideName === 'codex' ? 'Codex' : 'Claude Code';

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,           // 传递构建的环境变量
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description} 退出，代码: ${code}`));
      }
    });

    child.on('error', reject);
  });
}
```

**设计原理**：
- 根据 `ideName` 决定启动哪个命令（`claude` 或 `codex`）
- 所有环境变量已通过 `buildEnvVariables` 构建完毕
- 使用 `cross-spawn` 跨平台启动子进程

### 3. 配置管理 (src/config.js)

#### ConfigManager.addProvider

```javascript
async addProvider(name, providerConfig) {
  // 创建新的提供商对象，保留所有字段
  this.config.providers[name] = {
    name,
    displayName: providerConfig.displayName || name,
    ideName: providerConfig.ideName || 'claude',  // 默认为 claude
    baseUrl: providerConfig.baseUrl,
    authToken: providerConfig.authToken,
    authMode: providerConfig.authMode || 'api_key',
    tokenType: providerConfig.tokenType || 'api_key', // 仅对 api_key 模式有效
    launchArgs: providerConfig.launchArgs || [],
    models: {
      primary: providerConfig.primaryModel || null,
      smallFast: providerConfig.smallFastModel || null
    },
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    current: false
  };

  // 设置为当前供应商逻辑
  if (Object.keys(this.config.providers).length === 1 || providerConfig.setAsDefault) {
    // 重置所有供应商的 current 状态
    Object.keys(this.config.providers).forEach(key => {
      this.config.providers[key].current = false;
    });
    
    // 设置新供应商为当前
    this.config.providers[name].current = true;
    this.config.providers[name].lastUsed = new Date().toISOString();
    this.config.currentProvider = name;
  }

  return await this.save();
}
```

**设计原理**：
- `ideName` 字段持久化，用于启动时识别 IDE 类型
- `tokenType` 只有在 `authMode === 'api_key'` 时才有实际用途，但总是存储
- 兼容旧版本：如果 `ideName` 不存在，默认为 `'claude'`

---

## 数据流向

### 1. 配置创建流程

```
用户交互输入
    ↓
┌─────────────────────────────────────┐
│ 交互界面 (add.js)                   │
│ ├─ 选择 IDE (ideName)              │
│ ├─ 选择认证模式 (authMode)          │
│ ├─ 选择 Token 类型 (tokenType)     │
│ ├─ 输入 Base URL                    │
│ └─ 输入认证令牌 (authToken)         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 数据收集与汇总                       │
│ answers = {                         │
│   ideName: string,                  │
│   authMode: string,                 │
│   tokenType: string,                │
│   baseUrl: string,                  │
│   authToken: string,                │
│   ...                               │
│ }                                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ ConfigManager.addProvider()         │
│ 转换为标准化配置对象               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ JSON 序列化                          │
│ ~/.akm-config.json 文件             │
└─────────────────────────────────────┘
```

### 2. 配置启动流程

```
用户选择供应商
    ↓
┌─────────────────────────────────────┐
│ switch.js: launchProvider()         │
│ ├─ 加载配置文件                      │
│ ├─ 获取选中供应商配置               │
│ └─ 检测 Claude Settings 冲突        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ env-launcher.js: executeWithEnv()   │
│ ├─ buildEnvVariables(config)        │
│ │  ├─ 检查 config.ideName           │
│ │  ├─ 根据 authMode 设置变量        │
│ │  └─ 构建完整的环境对象            │
│ ├─ spawn(command, args, {env})      │
│ │  ├─ 选择命令: 'claude' 或 'codex'│
│ │  └─ 传递构建的环境变量            │
│ └─ 等待子进程退出                   │
└─────────────────────────────────────┘
    ↓
IDE 启动并读取环境变量进行认证
```

### 3. 配置保存与加载

```
保存流程：
ConfigManager.addProvider()
    ↓
this.config.providers[name] = {...}
    ↓
this.save()
    ↓
fs.writeJSON(configPath, this.config)
    ↓
~/.akm-config.json

加载流程：
switch.js: showProviderSelection()
    ↓
configManager.load()
    ↓
checkIfModified() / loadPromise
    ↓
fs.readJSON(configPath)
    ↓
_migrateAuthModes() [兼容旧配置]
    ↓
this.config = {...}
```

---

## 执行流程

### 完整的用户交互流程

#### 场景1：添加 Codex ChatGPT 登录配置

```
1. 用户运行 akm add
   ↓
2. ProviderAdder.interactive()
   选择"自定义配置"
   ↓
3. addCustomProvider()
   a) 输入提供商名称: "openai-codex"
   b) 输入显示名称: "OpenAI Codex (ChatGPT)"
   c) 选择 IDE: "codex" ← ideName = 'codex'
   d) 选择认证模式: "chatgpt_login" ← authMode = 'chatgpt_login'
      [注意：由于 authMode === 'chatgpt_login'，tokenType 和 baseUrl 都不显示]
   e) 询问是否设置为默认供应商: true
   f) 询问是否配置启动参数: false
   g) 询问是否配置模型参数: false
   ↓
4. saveProvider(answers)
   configManager.addProvider('openai-codex', {
     displayName: 'OpenAI Codex (ChatGPT)',
     ideName: 'codex',
     authMode: 'chatgpt_login',
     authToken: undefined,  // 不需要
     baseUrl: undefined,    // 不需要
     tokenType: undefined,  // 不适用
     launchArgs: [],
     setAsDefault: true
   })
   ↓
5. 保存到配置文件
   {
     "name": "openai-codex",
     "displayName": "OpenAI Codex (ChatGPT)",
     "ideName": "codex",
     "authMode": "chatgpt_login",
     "authToken": null,
     "baseUrl": null,
     "tokenType": null,
     "launchArgs": [],
     "current": true,
     ...
   }
```

#### 场景2：添加 Codex API Key 配置

```
1. 用户运行 akm add
   ↓
2. 选择"自定义配置"
   ↓
3. addCustomProvider()
   a) 输入提供商名称: "openai-apikey"
   b) 输入显示名称: "OpenAI (API Key)"
   c) 选择 IDE: "codex" ← ideName = 'codex'
   d) 选择认证模式: "api_key" ← authMode = 'api_key'
      [注意：由于 ideName === 'codex'，tokenType 不显示]
   e) 输入 Base URL: "https://api.openai.com/v1" 或留空使用官方
   f) 输入 OpenAI API Key: "sk-..."
   g) 询问是否设置为默认供应商: false
   h) 询问是否配置启动参数: false
   i) 询问是否配置模型参数: false
   ↓
4. saveProvider(answers)
   configManager.addProvider('openai-apikey', {
     displayName: 'OpenAI (API Key)',
     ideName: 'codex',
     authMode: 'api_key',
     authToken: 'sk-...',
     baseUrl: 'https://...',
     tokenType: undefined,  // 不存储（不适用）
     launchArgs: [],
     setAsDefault: false
   })
   ↓
5. 保存到配置文件
   {
     "name": "openai-apikey",
     "displayName": "OpenAI (API Key)",
     "ideName": "codex",
     "authMode": "api_key",
     "authToken": "sk-...",
     "baseUrl": "https://...",
     "tokenType": null,
     "launchArgs": [],
     "current": false,
     ...
   }
```

#### 场景3：启动 Codex 供应商

```
1. 用户运行 akm 或 akm switch
   ↓
2. EnvSwitcher.showProviderSelection()
   加载配置，显示供应商列表
   ↓
3. 用户选择 Codex 供应商
   ↓
4. handleSelection() → showLaunchArgsSelection('openai-apikey')
   ↓
5. launchProvider(provider, selectedLaunchArgs)
   ↓
6. ensureClaudeSettingsCompatibility(provider)
   检测 Claude Settings 文件冲突
   [注意：即使启动 Codex，仍需检查冲突（因为可能有其他 IDE 使用同样的变量）]
   ↓
7. executeWithEnv(provider, selectedLaunchArgs)
   ├─ buildEnvVariables(provider)
   │  ├─ 检查 provider.ideName === 'codex'
   │  ├─ 检查 provider.authMode === 'api_key'
   │  ├─ 设置 env.OPENAI_API_KEY = provider.authToken
   │  ├─ 如果 provider.baseUrl 存在，设置 env.OPENAI_API_BASE = provider.baseUrl
   │  └─ 返回完整的环境变量对象
   ├─ spawn('codex', [], { env, stdio: 'inherit', shell: true })
   │  └─ Codex 启动，读取 OPENAI_API_KEY 和 OPENAI_API_BASE
   └─ 等待 Codex 进程结束
   ↓
8. 返回到主菜单或退出
```

#### 场景4：编辑 Claude Code API Key 配置

```
1. 用户选择"供应商管理" → "编辑供应商"
   ↓
2. EnvSwitcher.editProvider('my-claude')
   加载当前供应商配置
   ↓
3. 显示编辑表单：
   a) 供应商名称: 'my-claude' (可修改)
   b) 显示名称: 'My Custom Claude'
   c) 认证模式: 
      选择 'api_key' 
      [注意：编辑时不再显示 ideName 选择，因为已经绑定]
      [可以通过认证模式的变化间接识别 IDE 类型]
   d) Token 类型 (仅 authMode === 'api_key' 时):
      选择 'api_key' 或 'auth_token'
   e) Base URL: 'https://...'
   f) Token: 'sk-...'
   g) 主模型: 'claude-sonnet-4'
   h) 快速模型: 'claude-haiku-4'
   ↓
4. 更新配置对象
   provider.displayName = '...'
   provider.authMode = 'api_key'
   provider.tokenType = 'api_key'  // 仅当 authMode === 'api_key' 时更新
   provider.baseUrl = '...'
   provider.authToken = '...'
   provider.models.primary = '...'
   provider.models.smallFast = '...'
   ↓
5. configManager.save()
   更新配置文件
```

---

## 设计原理和考虑

### 1. IDE 抽象层设计

#### 问题
- 不同的 IDE 有完全不同的认证机制和环境变量
- 需要在单一系统中管理多个 IDE 而不产生混淆

#### 解决方案
- 引入 `ideName` 字段作为 IDE 的唯一标识符
- 在所有决策点检查 `ideName`，展示不同的选项和行为

#### 优势
```
✓ 清晰的抽象边界
✓ 易于扩展新 IDE
✓ 配置结构统一
✓ 前后向兼容（默认为 'claude'）
```

#### 缺点与改进
```
✗ 某些字段对特定 IDE 无意义（如 tokenType 对 Codex）
  → 存储 null/undefined，加载时由配置模式判断是否使用
```

### 2. 认证模式多态设计

#### 问题
- 不同认证模式需要不同的配置字段和环境变量
- 用户可能在不同模式间切换

#### 解决方案
使用"模式+条件显示"的策略：

```
authMode 决定：
├─ 是否显示 baseUrl 字段
├─ 是否显示 authToken 字段
├─ 是否显示 tokenType 子选项
└─ 环境变量映射方式

ideName 与 authMode 联合决定：
├─ 可用的认证模式选项
├─ 提示文本的具体内容
├─ 字段验证规则
└─ 环境变量设置方式
```

#### 设计优势
```
✓ 用户界面精简（只显示相关字段）
✓ 配置结构扁平（所有字段在一个对象中）
✓ 易于验证（通过 when 条件检查字段有效性）
✓ 兼容性强（可以安全地存储额外字段）
```

### 3. tokenType 设计的权衡

#### 为什么 Claude Code api_key 模式需要 tokenType?

```javascript
// 问题：同一个 authMode (api_key) 可以映射两种不同的环境变量
if (config.tokenType === 'auth_token') {
  env.ANTHROPIC_AUTH_TOKEN = config.authToken;  // 认证令牌方式
} else {
  env.ANTHROPIC_API_KEY = config.authToken;     // API 密钥方式
}
```

- `ANTHROPIC_API_KEY` 和 `ANTHROPIC_AUTH_TOKEN` 的含义不同
- 用户需要明确指定要使用哪一种
- 不能从 token 内容自动推断（都是字符串）

#### 为什么 Codex 不需要 tokenType?

- Codex 只支持 `OPENAI_API_KEY` (对于 api_key 模式)
- chatgpt_login 模式甚至不需要 token
- 无歧义，可以直接映射

#### 设计权衡

```
选项A：为所有 authMode 都定义 tokenType
  优点：结构统一
  缺点：冗余，某些字段永不使用

选项B（当前）：仅在 Claude Code api_key 模式使用 tokenType
  优点：字段最小化，结构简洁
  缺点：复杂性分散到配置逻辑中

当前实现采用选项B，原因：
✓ 字段意义清晰
✓ 验证逻辑简单
✓ 配置大小最小
✓ 易于添加新 IDE（只在需要时引入 tokenType）
```

### 4. baseUrl 处理的差异化

#### Claude Code 的 api_key 模式

```javascript
// 必须提供 baseUrl
validate: (input, answers) => {
  if (!input && answers.ideName === 'claude' && answers.authMode === 'api_key') {
    return 'API基础URL不能为空';
  }
}
```

**原因**：
- Claude Code 通常连接到本地代理或第三方 API
- 没有 baseUrl 无法确定连接到哪个服务
- 官方 Anthropic API 的默认 URL 可能会变化

#### Codex 的 api_key 模式

```javascript
// 可选提供 baseUrl
if (input === '' && answers.ideName === 'codex' && answers.authMode === 'api_key') {
  return true;  // 允许空值
}
```

**原因**：
- OpenAI API 的默认 URL 是稳定的、众所周知的
- 用户通常使用官方 OpenAI API（除非使用代理）
- 降低配置复杂度

### 5. 环境变量设置的最小化原则

#### 清晰的职责边界

```javascript
// env-launcher.js 只关心：
1. 根据 ideName 确定执行哪个 IDE
2. 根据 authMode 确定设置哪些环境变量
3. 构建并返回完整的环境对象

// 不关心：
✗ 配置文件格式
✗ 用户交互细节
✗ 错误消息显示
```

#### 环境隔离

```javascript
const env = { ...process.env };  // 复制当前环境
// 修改副本，不影响原始 process.env
// 传递给 spawn()，完全隔离子进程的环境
```

**优势**：
- 不影响当前进程
- 支持连续切换（一个进程内多次执行）
- 便于测试（可以模拟任意环境）

### 6. 数据持久化的向后兼容性

#### 迁移机制

```javascript
_migrateAuthModes() {
  // 支持从旧的 api_token 模式迁移到新的 auth_token 模式
  if (provider.authMode === 'api_token') {
    provider.authMode = 'auth_token';
  }
}
```

#### 缺失字段的默认值

```javascript
// addProvider 时设置默认值
ideName: providerConfig.ideName || 'claude',  // 默认为 claude
authMode: providerConfig.authMode || 'api_key'
tokenType: providerConfig.tokenType || 'api_key'

// 启动时也有防守
if (config.ideName === 'claude' || !config.ideName) {
  // 处理 claude
}
```

**设计考虑**：
- 旧配置文件可能缺少 `ideName` 字段（都是 Claude Code）
- 加载时自动补全默认值
- 首次保存时写入完整字段

### 7. 用户体验的渐进式复杂度

#### 简单场景（官方 OAuth）
```
1. 选择官方 OAuth
2. 输入 OAuth Token
3. 完成！
```

#### 中等复杂（第三方 API）
```
1. 选择自定义配置
2. 选择 IDE (Claude Code)
3. 选择 API 密钥模式
4. 选择 Token 类型
5. 输入 Base URL
6. 输入 Token
7. 完成！
```

#### 高级复杂（启动参数+模型配置）
```
1. 基础配置（如上）
2. 选择启动参数
3. 配置模型
4. 完成！
```

**设计原理**：
- 基础配置足以启动
- 高级配置完全可选
- 通过条件显示降低认知负担

---

## 总结：系统的优雅性

### 核心设计原则

| 原则 | 实现方式 | 好处 |
|------|--------|------|
| **单一职责** | 各模块清晰划分 | 易于维护和测试 |
| **开闭原则** | ideName 抽象层 | 易于添加新 IDE |
| **依赖注入** | 配置对象传递 | 高度解耦 |
| **最小化** | 仅存储必要字段 | 配置文件简洁 |
| **渐进复杂** | 条件显示字段 | UX 友好 |
| **向后兼容** | 迁移和默认值 | 升级无痛 |

### 为什么这样设计？

```
问题域：
  多个 IDE × 多种认证方式 = 复杂的组合爆炸

解决方案：
  1. IDE 抽象层（ideName）
     → 清晰的概念边界
     
  2. 认证模式多态（authMode）
     → 灵活的配置组合
     
  3. 条件显示（when 函数）
     → 用户只看到相关字段
     
  4. 环境变量映射（buildEnvVariables）
     → 统一的启动接口
     
结果：
  ✓ 系统复杂度 O(n)（线性）而非 O(n²)（平方）
  ✓ 添加新 IDE 无需修改现有逻辑
  ✓ 用户体验直观，配置过程流畅
```

---

## 参考代码位置

| 功能 | 文件 | 行号 |
|------|------|------|
| IDE 选择逻辑 | add.js | 199-206 |
| 认证模式条件 | add.js | 208-232 |
| Token 类型选择 | add.js | 234-246 |
| baseUrl 验证 | add.js | 260-279 |
| 环境变量映射 | env-launcher.js | 24-75 |
| 启动执行 | env-launcher.js | 77-104 |
| 配置保存 | config.js | 140-175 |
| 用户交互流程 | switch.js | 199-244 |

