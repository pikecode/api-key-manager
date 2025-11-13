# API Key Manager - Codex 支持快速参考

## 一句话总结

项目通过 `ideName` 字段区分 IDE，使用 `authMode` 实现多态认证，通过条件显示优化 UX，最后在启动时通过 `buildEnvVariables()` 映射到相应的环境变量。

---

## Codex vs Claude Code 核心差异

### 身份识别
```javascript
ideName: "claude"  // Claude Code
ideName: "codex"   // Codex
```

### 认证模式对比
```javascript
// Claude Code
authMode: "oauth_token"   // CLAUDE_CODE_OAUTH_TOKEN
authMode: "api_key"       // ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN
authMode: "auth_token"    // ANTHROPIC_AUTH_TOKEN

// Codex
authMode: "api_key"       // OPENAI_API_KEY
authMode: "chatgpt_login" // 交互式登录（无需 token）
```

### 关键字段差异
| 字段 | Claude Code | Codex |
|------|-----------|-------|
| ideName | "claude" | "codex" |
| authMode 数量 | 3 | 2 |
| tokenType | 在 api_key 模式时 | 不需要 |
| baseUrl | api_key/auth_token 时必须 | api_key 时可选 |

---

## 核心代码路径

### 1. 用户交互 (add.js)
```
选择 IDE (ideName)
  ↓ [根据 ideName 显示不同的认证模式]
选择认证模式 (authMode)
  ↓ [根据 ideName + authMode 显示 tokenType]
选择 Token 类型 (tokenType, 仅 Claude Code api_key)
  ↓ [根据 ideName + authMode 显示 baseUrl]
输入 Base URL
  ↓ [根据 ideName + authMode 显示 authToken]
输入认证令牌 (authToken)
```

**关键点**：所有条件判断都基于 `ideName` 和 `authMode` 的组合

### 2. 环境变量映射 (env-launcher.js)

```javascript
// 伪代码
function buildEnvVariables(config) {
  if (config.ideName === 'claude') {
    switch (config.authMode) {
      case 'oauth_token':
        env.CLAUDE_CODE_OAUTH_TOKEN = config.authToken;
        break;
      case 'api_key':
        env.ANTHROPIC_BASE_URL = config.baseUrl;
        env[config.tokenType === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY'] = config.authToken;
        break;
      case 'auth_token':
        env.ANTHROPIC_BASE_URL = config.baseUrl;
        env.ANTHROPIC_AUTH_TOKEN = config.authToken;
        break;
    }
  } else if (config.ideName === 'codex') {
    if (config.authMode === 'api_key') {
      env.OPENAI_API_KEY = config.authToken;
      if (config.baseUrl) env.OPENAI_API_BASE = config.baseUrl;
    }
    // chatgpt_login 模式无需环境变量
  }
}
```

### 3. 启动执行 (env-launcher.js)

```javascript
// 根据 ideName 选择启动命令
const command = config.ideName === 'codex' ? 'codex' : 'claude';
spawn(command, args, { env: buildEnvVariables(config) });
```

---

## 配置文件示例

### Codex ChatGPT 登录
```json
{
  "name": "openai-codex",
  "displayName": "OpenAI Codex",
  "ideName": "codex",
  "authMode": "chatgpt_login",
  "authToken": null,
  "baseUrl": null,
  "tokenType": null
}
```

### Codex API Key
```json
{
  "name": "openai-key",
  "displayName": "OpenAI (API Key)",
  "ideName": "codex",
  "authMode": "api_key",
  "authToken": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "tokenType": null
}
```

### Claude Code 官方
```json
{
  "name": "official",
  "displayName": "Claude Code Official",
  "ideName": "claude",
  "authMode": "oauth_token",
  "authToken": "sk-ant-oat01-...",
  "baseUrl": null,
  "tokenType": null
}
```

### Claude Code API Key
```json
{
  "name": "custom",
  "displayName": "Custom Claude",
  "ideName": "claude",
  "authMode": "api_key",
  "authToken": "sk-...",
  "baseUrl": "https://api.example.com",
  "tokenType": "api_key"
}
```

---

## 设计要点

### 1. 为什么用 ideName？
- 一个字段完全区分 IDE，避免后续每个逻辑都需要复杂判断
- 扩展新 IDE 时只需在关键点添加新分支

### 2. 为什么 tokenType 只对 Claude Code 有效？
- Claude Code api_key 模式支持两种环境变量：ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN
- Codex 只支持 OPENAI_API_KEY，无需选择

### 3. 为什么 Codex baseUrl 可选而 Claude Code 必须？
- OpenAI API URL 是稳定的公知地址
- Claude Code 通常连接到本地代理或第三方服务，必须指定

### 4. 为什么 Codex chatgpt_login 不需要 token？
- 使用交互式登录流程，在 Codex 启动时处理
- 系统只负责启动 Codex 命令，具体认证由 Codex 处理

### 5. 为什么在 add.js 中 when 条件如此复杂？
- 条件显示的目的是给用户最少的选项
- 通过组合 ideName 和 authMode，精确控制每个字段的显示

---

## 常见修改点

### 添加新 IDE
1. 在 add.js 第 199-206 行添加新 IDE 选项
2. 在 add.js 第 208-232 行为新 IDE 定义认证模式
3. 在 add.js 第 247-287 行处理新 IDE 的 baseUrl 逻辑
4. 在 add.js 第 288-321 行处理新 IDE 的 authToken 逻辑
5. 在 env-launcher.js 第 54-72 行添加环境变量映射逻辑
6. 在 env-launcher.js 第 84-85 行选择启动命令

### 为 Codex 添加新认证模式
1. 在 add.js 第 220-223 行添加新模式选项
2. 更新相关的 when 条件
3. 在 env-launcher.js 中添加环境变量映射

### 修改验证规则
- baseUrl 验证：add.js 第 260-279 行
- authToken 验证：add.js 第 314-318 行

---

## 执行流程速览

```
用户运行 akm
  ↓
EnvSwitcher.showProviderSelection()
  ↓
用户选择供应商
  ↓
handleSelection()
  ↓
showLaunchArgsSelection(providerName)
  ↓
launchProvider(provider, args)
  ↓
executeWithEnv(provider, args)
  ├─ buildEnvVariables(provider)  [根据 ideName 和 authMode]
  ├─ spawn(command, args, {env})   [根据 ideName]
  └─ 等待进程结束
  ↓
返回主菜单
```

---

## 关键字段映射表

### 环境变量映射
| ideName | authMode | 环境变量 |
|---------|----------|--------|
| claude | oauth_token | CLAUDE_CODE_OAUTH_TOKEN |
| claude | api_key | ANTHROPIC_BASE_URL + ANTHROPIC_API_KEY\|AUTH_TOKEN |
| claude | auth_token | ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN |
| codex | api_key | OPENAI_API_KEY + OPENAI_API_BASE(可选) |
| codex | chatgpt_login | 无 |

### 启动命令
| ideName | 启动命令 |
|---------|---------|
| claude | claude |
| codex | codex |

### 字段有效性
| 字段 | Claude | Codex | 说明 |
|------|--------|-------|------|
| ideName | 必需 | 必需 | IDE 标识 |
| authMode | 必需 | 必需 | 认证方案 |
| tokenType | api_key时 | 无 | Token 类型选择 |
| baseUrl | api_key时 | api_key时可选 | API 地址 |
| authToken | api_key/auth_token/oauth时 | api_key时 | 认证凭证 |

---

## 测试关键点

1. **Codex ChatGPT 登录**
   - 不显示 baseUrl 和 authToken 输入
   - 启动时不设置环境变量

2. **Codex API Key**
   - 显示 baseUrl（可选）和 authToken 输入
   - 启动时设置 OPENAI_API_KEY

3. **Claude Code OAuth**
   - 不显示 baseUrl 输入
   - 启动时只设置 CLAUDE_CODE_OAUTH_TOKEN

4. **Claude Code API Key**
   - 显示 tokenType 选择
   - 根据 tokenType 设置不同的环境变量

5. **Claude Code Auth Token**
   - 显示 baseUrl 输入
   - 启动时设置 ANTHROPIC_AUTH_TOKEN

