# API Key Manager - 项目实现原理详解

## 核心概念

API Key Manager 是一个 CLI 工具，用于管理和快速切换多个 API 提供商的配置。其核心原理是：**保存多套 API 配置，通过环境变量动态切换，从而启动不同的 Claude Code 实例**。

---

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────┐
│              CLI 入口层 (bin/akm.js)                     │
│        使用 Commander.js 定义命令和参数                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         命令执行层 (src/CommandRegistry.js)              │
│   - 懒加载命令模块                                       │
│   - 统一命令执行接口                                     │
│   - 避免循环依赖                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│        业务逻辑层 (src/commands/)                        │
│   - switch: 切换提供商，启动 Claude Code               │
│   - add: 添加新提供商配置                               │
│   - remove: 删除提供商配置                              │
│   - list: 列出所有提供商                                │
│   - edit: 编辑提供商配置                                │
│   - current: 显示当前提供商                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│        工具层 (src/utils/)                              │
│   - ConfigManager: 配置文件管理                         │
│   - ProviderStatusChecker: 提供商状态检测               │
│   - env-launcher: 环境变量设置与启动                    │
│   - claude-settings: Claude Code 配置冲突处理           │
│   - 其他工具: 日志、验证、UI 等                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│     数据持久化层 (~/.akm-config.json)                   │
│       本地配置文件，存储所有提供商配置                   │
└─────────────────────────────────────────────────────────┘
```

---

## 核心工作流程

### 1️⃣ 启动与初始化

```javascript
// bin/akm.js - CLI 入口
┌─ program.parse() 解析命令行参数
│
├─ 如果有 'add' 命令 → 调用 registry.executeCommand('add')
├─ 如果有 'list' 命令 → 调用 registry.executeCommand('list')
├─ 如果有 'switch' 命令 → 调用 switchCommand(providerName)
└─ 如果无参数 → 显示提供商选择界面
```

**关键点**：所有命令都通过 `CommandRegistry` 的 `executeCommand()` 方法调用，实现了**懒加载**和**解耦**。

---

### 2️⃣ 配置管理系统 (ConfigManager)

```javascript
class ConfigManager {
  constructor() {
    this.configPath = ~/.akm-config.json    // 配置文件位置
    this.config = null                      // 缓存的配置对象
    this.isLoaded = false                   // 加载状态标志
    this.loadPromise = null                 // 防止并发加载的 Promise
  }

  async load() {
    // 步骤1: 如果正在加载，等待当前加载完成
    if (this.loadPromise) return await this.loadPromise;

    // 步骤2: 如果已加载且未修改，返回缓存
    if (this.isLoaded && !forceReload) {
      if (!needsReload) return this.config;
    }

    // 步骤3: 读取配置文件
    const data = await fs.readJSON(configPath);

    // 步骤4: 验证并迁移配置
    this._migrateAuthModes();    // 处理旧版本格式

    // 步骤5: 缓存并返回
    this.isLoaded = true;
    return this.config;
  }
}
```

**配置文件结构** (`~/.akm-config.json`)：

```json
{
  "version": "1.0.0",
  "currentProvider": "claude-official",
  "providers": {
    "claude-official": {
      "name": "claude-official",
      "displayName": "Claude 官方",
      "authMode": "oauth_token",              // 认证模式
      "authToken": "sk-ant-oat01-...",       // 认证令牌
      "baseUrl": null,
      "tokenType": null,
      "models": {
        "primary": "claude-sonnet-4",
        "smallFast": "claude-haiku-4"
      },
      "launchArgs": ["--continue"],
      "current": true,
      "lastUsed": "2024-11-13T10:00:00.000Z",
      "createdAt": "2024-11-01T12:00:00.000Z",
      "usageCount": 42
    },
    "third-party": {
      "name": "third-party",
      "displayName": "第三方服务",
      "authMode": "api_key",                  // API 密钥模式
      "authToken": "api-key-123...",
      "baseUrl": "https://api.example.com",
      "tokenType": "api_key",                 // 使用 ANTHROPIC_API_KEY
      "models": { ... },
      // ...
    }
  }
}
```

**认证模式说明**：

| 模式 | 使用场景 | 环境变量 |
|------|---------|---------|
| `oauth_token` | 官方 Claude Code | `CLAUDE_CODE_OAUTH_TOKEN` |
| `api_key` | 第三方 API 服务 | `ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN` |
| `auth_token` | 第三方认证令牌 | `ANTHROPIC_AUTH_TOKEN` |

---

### 3️⃣ 核心流程：切换与启动

```
┌─ 用户运行 'akm' 或 'akm switch'
│
├─ EnvSwitcher.showProviderSelection()
│  │
│  ├─ 加载所有提供商配置
│  ├─ 检测各提供商的在线状态 (ProviderStatusChecker)
│  ├─ 显示交互式选择界面 (inquirer)
│  │  ├─ 提供商列表 + 在线状态指示
│  │  ├─ 支持 ESC 键导航
│  │  └─ 支持直接按名称切换 (akm provider-name)
│  │
│  └─ 用户选择提供商
│
├─ EnvSwitcher.validateProvider()
│  └─ 验证提供商配置完整性
│
├─ EnvSwitcher.ensureClaudeSettingsCompatibility()
│  │
│  ├─ 检查 .claude/settings.json 中是否有冲突的环境变量
│  │  (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL 等)
│  │
│  ├─ 如果有冲突，提示用户三种选择：
│  │  ① 🔧 备份并清空冲突变量（推荐）
│  │  ② ⚠️ 忽略并继续（可能失败）
│  │  ③ ❌ 取消启动
│  │
│  └─ 如果用户选择备份，自动：
│     ├─ 创建备份文件: settings.backup-YYYYMMDD_HHmmss.json
│     ├─ 清空冲突的环境变量
│     └─ 保存修改后的 settings.json
│
├─ EnvSwitcher.showLaunchArgsSelection() [可选]
│  │
│  ├─ 显示可用的启动参数
│  │  ├─ --continue: 继续上次对话
│  │  ├─ --dangerously-skip-permissions: 跳过权限检查
│  │  └─ 其他参数
│  │
│  └─ 用户勾选需要的参数
│
├─ EnvSwitcher.launchProvider(provider, launchArgs)
│  │
│  ├─ buildEnvVariables(provider)
│  │  │
│  │  └─ 根据认证模式构建环境变量：
│  │     ├─ oauth_token 模式:
│  │     │  └─ CLAUDE_CODE_OAUTH_TOKEN = provider.authToken
│  │     │
│  │     ├─ api_key 模式:
│  │     │  ├─ ANTHROPIC_BASE_URL = provider.baseUrl
│  │     │  ├─ ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN
│  │     │  │  (根据 tokenType 选择)
│  │     │  └─ ANTHROPIC_MODEL = provider.models.primary
│  │     │
│  │     └─ auth_token 模式:
│  │        ├─ ANTHROPIC_BASE_URL = provider.baseUrl
│  │        └─ ANTHROPIC_AUTH_TOKEN = provider.authToken
│  │
│  ├─ clearTerminal()  # 清屏
│  │
│  └─ spawn('claude', launchArgs, { env: builtEnv })
│     │
│     └─ ✅ 启动 Claude Code，带上自定义的环境变量
│
└─ 等待 Claude Code 进程完成
   └─ 返回到 akm，准备下一次切换
```

---

### 4️⃣ 提供商状态检测 (ProviderStatusChecker)

用于在选择界面中显示提供商的在线状态：

```javascript
// 状态检测流程
async check(provider) {
  // 检查认证信息
  if (!provider.authToken) return { state: 'unknown', ... };

  // 对于 oauth_token 模式，暂不支持检测
  if (provider.authMode === 'oauth_token')
    return { state: 'unknown', ... };

  // 创建 SDK 客户端
  const client = new Anthropic(clientOptions);

  // 对于 auth_token 模式，通过环境变量传递
  if (provider.authMode === 'auth_token') {
    process.env.ANTHROPIC_AUTH_TOKEN = provider.authToken;
  }

  // 发送测试请求
  const response = await client.messages.create({
    model: provider.models.primary || 'claude-haiku-4-5-20251001',
    max_tokens: 32,
    messages: [{ role: 'user', content: '你好' }]
  }, { timeout: 5000 });

  // 返回状态结果
  return {
    state: 'online',                    // online | offline | degraded | unknown
    label: `可用 ${latency}ms`,
    latency: latency
  };
}
```

**状态指示**：
- 🟢 **online** - 可用，显示响应延迟
- 🟡 **degraded** - 有限可用（服务异常）
- 🔴 **offline** - 不可用（认证失败、网络错误等）
- ⏳ **unknown** - 暂不检测（OAuth、未配置等）

---

### 5️⃣ ESC 键导航系统 (EscNavigationManager)

支持在交互界面中按 ESC 键返回上级菜单：

```javascript
// 使用模式
const escListener = this.createESCListener(() => {
  // 返回上级菜单的回调函数
  this.showProviderSelection();
}, '返回供应商选择');  // 提示文本

try {
  const answer = await this.prompt([...questions]);
  // 处理用户输入
} finally {
  this.removeESCListener(escListener);  // 必须清理
}
```

**工作原理**：
- Windows：通过 `node-windows-support` 检测 ESC 键
- macOS/Linux：直接在 stdin 上监听 ESC 序列
- 自动处理终端输入复原

---

## 关键设计模式

### 1. 懒加载模式 (CommandRegistry)

```javascript
registry.registerLazy('add', async () => {
  const { addCommand } = require('./commands/add');
  return addCommand;
});

// 使用时才加载模块
const command = await registry.getCommand('add');
```

**优势**：
- ✅ 减少启动时间（仅加载需要的命令）
- ✅ 避免循环依赖
- ✅ 节省内存

### 2. 配置缓存与外部变更检测

```javascript
async load() {
  // 缓存机制
  if (this.isLoaded && !forceReload) {
    const needsReload = await this.checkIfModified();
    if (!needsReload) return this.config;
  }

  // 防止并发加载
  if (this.loadPromise) return await this.loadPromise;

  this.loadPromise = this._performLoad();
}
```

**优势**：
- ✅ 快速响应（避免重复读取文件）
- ✅ 实时同步（检测外部修改）
- ✅ 并发安全

### 3. 基类与模板方法模式 (BaseCommand)

```javascript
class BaseCommand {
  // 提供通用功能
  createESCListener(callback, hint) { ... }
  removeESCListener(listener) { ... }
  clearScreen() { ... }
  prompt(questions) { ... }
  handleError(error, context) { ... }
}

class ProviderAdder extends BaseCommand {
  async interactive() {
    const escListener = this.createESCListener(...);
    try {
      const answers = await this.prompt(questions);
      // 业务逻辑
    } finally {
      this.removeESCListener(escListener);
    }
  }
}
```

**优势**：
- ✅ 代码复用
- ✅ 一致的用户体验
- ✅ 统一的错误处理

### 4. 环境变量隔离

```javascript
// 状态检查时临时设置环境变量
const originalEnv = process.env.ANTHROPIC_AUTH_TOKEN;
process.env.ANTHROPIC_AUTH_TOKEN = provider.authToken;

try {
  // 使用 SDK
} finally {
  // 恢复原始状态
  process.env.ANTHROPIC_AUTH_TOKEN = originalEnv;
}

// 启动时设置环境变量给子进程
const env = buildEnvVariables(provider);
spawn('claude', args, { env });  // Claude Code 会读到这些变量
```

**优势**：
- ✅ 不污染全局环境
- ✅ 并发请求互不影响
- ✅ 子进程隔离（Claude Code 看到自己的环境变量）

---

## 数据流示例

### 场景：用户想切换到第三方 API

```
用户输入: akm

↓

1️⃣ 加载配置
   ConfigManager.load()
   → 读取 ~/.akm-config.json
   → 返回 { claude-official, third-party, ... }

↓

2️⃣ 检测在线状态
   ProviderStatusChecker.checkAll()
   → 并发测试每个提供商
   → 返回 { 'claude-official': { state: 'online', ... },
           'third-party': { state: 'online', ... } }

↓

3️⃣ 显示选择界面
   EnvSwitcher.showProviderSelection()
   ┌──────────────────────────┐
   │ Claude 官方 (OAuth)  🟢  │  ← 可用，显示延迟
   │ 第三方服务         🟢  │
   │ [其他提供商...]         │
   └──────────────────────────┘
   用户选择: 第三方服务

↓

4️⃣ 验证配置
   EnvSwitcher.validateProvider('third-party')
   → 检查是否存在
   → 检查认证信息是否完整

↓

5️⃣ 冲突检测
   EnvSwitcher.ensureClaudeSettingsCompatibility()
   → 检查 .claude/settings.json
   → 如果有 ANTHROPIC_API_KEY → 备份并清空

↓

6️⃣ 构建环境变量
   buildEnvVariables(provider)
   {
     ANTHROPIC_BASE_URL: 'https://api.example.com',
     ANTHROPIC_API_KEY: 'api-key-123...',
     ANTHROPIC_MODEL: 'claude-sonnet-4',
     ...
   }

↓

7️⃣ 启动 Claude Code
   spawn('claude', [], { env: builtEnv })
   → Claude Code 进程接收这些环境变量
   → Claude Code 使用指定的 API 服务和密钥

↓

8️⃣ Claude Code 运行
   用户在 Claude Code 中工作
   (使用第三方 API 服务的配置)

↓

9️⃣ 进程完成
   Claude Code 退出
   返回到 akm CLI

↓

🔟 更新统计
   ConfigManager.setCurrentProvider('third-party')
   → 记录 lastUsed 时间
   → 增加 usageCount
```

---

## 文件操作与持久化

### 配置文件位置

- **主配置**: `~/.akm-config.json`
  - 存储所有提供商配置
  - JSON 格式，易于编辑和导出

- **Claude 设置**: `.claude/settings.json` 或 `.claude/settings.local.json`
  - 可能包含环境变量配置
  - 本工具会检测并处理冲突

- **备份文件**: `[同目录]/settings.backup-YYYYMMDD_HHmmss.json`
  - 自动备份被修改的设置文件
  - 用户可随时恢复

---

## 内部通信机制

### 命令间通信

通过 `CommandRegistry` 实现命令间的调用：

```javascript
// 在 add.js 中，添加完提供商后，跳转回 switch 命令
const { registry } = require('../CommandRegistry');
return await registry.executeCommand('switch');

// 优点：
// - 避免直接导入（防止循环依赖）
// - 统一的命令执行方式
// - 易于追踪和调试
```

### 模块间通信

```javascript
// Provider 配置从 ConfigManager 流向 EnvSwitcher
const configManager = new ConfigManager();
await configManager.load();
const provider = configManager.getProvider(name);

// 传递给环境变量构建器
const env = buildEnvVariables(provider);

// 传递给状态检查器
const status = await statusChecker.check(provider);

// 传递给启动器
await executeWithEnv(provider, launchArgs);
```

---

## 错误处理策略

```javascript
// 1. ESC 取消（特殊处理）
if (this.isEscCancelled(error)) {
  return;  // 静默处理，不显示错误
}

// 2. 验证错误
if (!provider) {
  throw new Error(`供应商 '${name}' 不存在`);
}

// 3. 网络错误
if (error instanceof APIConnectionError) {
  return { state: 'offline', label: '网络连接失败', ... };
}

// 4. 认证错误
if (error.status === 401) {
  return { state: 'offline', label: '认证失败 (401)', ... };
}

// 5. 一般错误
Logger.error(`操作失败: ${error.message}`);
throw error;
```

---

## 性能优化

1. **配置缓存**：避免重复读取配置文件
2. **懒加载**：只在需要时加载命令模块
3. **并发检测**：同时检测多个提供商的在线状态
4. **流式更新**：提供商状态逐个显示，不阻塞界面

---

## 总结

API Key Manager 的核心原理是：

```
配置存储 → 命令分发 → 交互界面 → 状态检测 →
环境构建 → 冲突处理 → 进程启动 → Claude Code 运行
```

每一层都有清晰的职责：
- **CLI 层**：解析命令
- **命令层**：业务逻辑
- **工具层**：通用功能
- **数据层**：配置持久化

通过这样的分层设计，项目具有良好的可维护性、可扩展性和可测试性。
