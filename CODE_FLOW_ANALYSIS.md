# API Key Manager - 代码流程深度分析

## 一、add.js 交互流程详解

### 1.1 主要函数调用链

```
addCommand()                          // 入口
  ↓
ProviderAdder.interactive()           // 主交互方法
  ├─ typeAnswer = prompt([...])       // 选择配置类型
  ├─ 如果是 official_oauth
  │   └─ addOfficialOAuthProvider()
  └─ 如果是 custom
      └─ addCustomProvider()          // 自定义配置流程
          ↓
          answers = prompt([...])     // 多步骤表单填充
          ↓
          saveProvider(answers)       // 保存配置
              ↓
              configManager.addProvider()
              ↓
              configManager.save()
              ↓
              registry.executeCommand('switch')  // 返回切换界面
```

### 1.2 addCustomProvider() 中的条件逻辑链

```javascript
// 第 176-340 行：核心交互表单
const answers = await this.prompt([
  // 1. 基本信息（无条件显示）
  { name: 'name', ... },              // 供应商名称
  { name: 'displayName', ... },       // 显示名称
  
  // 2. IDE 选择（无条件显示，决定后续一切）
  {
    name: 'ideName',                  // ← 关键字段
    choices: [
      { value: 'claude' },            // Claude Code
      { value: 'codex' }              // Codex
    ]
  },
  
  // 3. 认证模式（条件：依赖 ideName）
  {
    name: 'authMode',
    choices: (answers) => {
      if (answers.ideName === 'codex') {
        // Codex 的 2 种模式
        return [
          { value: 'chatgpt_login' },
          { value: 'api_key' }
        ];
      }
      // Claude Code 的 3 种模式
      return [
        { value: 'api_key' },
        { value: 'auth_token' },
        { value: 'oauth_token' }
      ];
    }
  },
  
  // 4. Token 类型（条件：ideName === 'claude' && authMode === 'api_key'）
  {
    name: 'tokenType',
    when: (answers) => answers.ideName === 'claude' && answers.authMode === 'api_key'
    // 仅 Claude Code 的 api_key 模式显示
  },
  
  // 5. Base URL（条件：ideName 和 authMode 的复杂组合）
  {
    name: 'baseUrl',
    when: (answers) => {
      if (answers.ideName === 'codex') {
        return answers.authMode === 'api_key';
        // Codex 仅在 api_key 时需要
      }
      return answers.authMode === 'api_key' || answers.authMode === 'auth_token';
      // Claude Code 在 api_key 和 auth_token 时需要
    },
    validate: (input, answers) => {
      // 验证规则也依赖 ideName + authMode
      if (answers.authMode === 'auth_token') {
        return true;  // 允许空值
      }
      if (answers.ideName === 'codex' && answers.authMode === 'api_key') {
        return true;  // 允许空值
      }
      if (answers.ideName === 'claude' && answers.authMode === 'api_key') {
        return !input ? 'API基础URL不能为空' : true;
        // 必须有值
      }
      return true;
    }
  },
  
  // 6. Token 输入（条件：取反条件）
  {
    name: 'authToken',
    when: (answers) => !(answers.ideName === 'codex' && answers.authMode === 'chatgpt_login')
    // Codex 的 chatgpt_login 模式不需要
  },
  
  // 7. 可选配置（无条件）
  { name: 'setAsDefault', ... },
  { name: 'configureLaunchArgs', ... },
  { name: 'configureModels', ... }
]);
```

### 1.3 条件显示的优先级

```
优先级 1：ideName（最高优先级）
  ↓
优先级 2：authMode（中等优先级）
  ↓
优先级 3：tokenType（低优先级，仅在特定条件下）
  ↓
优先级 4：baseUrl, authToken（最低优先级，由前面决定）
```

### 1.4 验证规则的多维度检查

```javascript
// baseUrl 验证示例（第 260-279 行）
validate: (input, answers) => {
  // 维度 1：IDE 类型（ideName）
  if (answers.ideName === 'codex') {
    // 维度 2：认证模式（authMode）
    if (answers.authMode === 'api_key') {
      // Codex api_key：允许空值
      return input === '' ? true : validator.validateUrl(input);
    }
  }
  
  if (answers.ideName === 'claude') {
    // 维度 2：认证模式（authMode）
    if (answers.authMode === 'auth_token') {
      // Claude Code auth_token：允许空值
      return input === '' ? true : validator.validateUrl(input);
    }
    if (answers.authMode === 'api_key') {
      // Claude Code api_key：必须有值
      return !input ? 'API基础URL不能为空' : validator.validateUrl(input);
    }
  }
  
  // 其他情况
  return validator.validateUrl(input);
}
```

### 1.5 saveProvider() 中的数据转换

```javascript
async saveProvider(answers) {
  // answers 是交互表单的原始结果
  // {
  //   name: "my-provider",
  //   displayName: "My Provider",
  //   ideName: "codex",
  //   authMode: "api_key",
  //   tokenType: undefined,        // Codex 时不存在
  //   baseUrl: "https://...",
  //   authToken: "sk-...",
  //   setAsDefault: true,
  //   configureLaunchArgs: false,
  //   configureModels: false
  // }
  
  const launchArgs = answers.configureLaunchArgs
    ? await this.promptLaunchArgsSelection()
    : [];

  const modelConfig = answers.configureModels
    ? await this.promptModelConfiguration()
    : { primaryModel: null, smallFastModel: null };

  // 转换为 ConfigManager 格式
  await this.configManager.addProvider(answers.name, {
    displayName: answers.displayName || answers.name,
    ideName: answers.ideName,              // 直接传递
    baseUrl: answers.baseUrl,              // 可能为 undefined
    authToken: answers.authToken,          // 可能为 undefined
    authMode: answers.authMode,            // 直接传递
    tokenType: answers.tokenType,          // 可能为 undefined（Codex 时）
    launchArgs,                            // 从可选步骤
    primaryModel: modelConfig.primaryModel,
    smallFastModel: modelConfig.smallFastModel,
    setAsDefault: answers.setAsDefault
  });
}
```

---

## 二、env-launcher.js 环境变量映射详解

### 2.1 buildEnvVariables() 的完整逻辑树

```javascript
function buildEnvVariables(config) {
  const env = { ...process.env };

  // 分支 1：Claude Code（ideName === 'claude' 或未定义）
  if (config.ideName === 'claude' || !config.ideName) {
    
    // 子分支 1a：OAuth Token 模式
    if (config.authMode === 'oauth_token') {
      env.CLAUDE_CODE_OAUTH_TOKEN = config.authToken;
      // 设置项：1 个
      // 示例：CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-..."
    }
    
    // 子分支 1b：API Key 模式
    else if (config.authMode === 'api_key') {
      env.ANTHROPIC_BASE_URL = config.baseUrl;
      
      // 再细分：Token 类型（tokenType）
      if (config.tokenType === 'auth_token') {
        env.ANTHROPIC_AUTH_TOKEN = config.authToken;
        // 设置项：2 个
        // ANTHROPIC_BASE_URL = "https://api.example.com"
        // ANTHROPIC_AUTH_TOKEN = "token-..."
      } else {
        env.ANTHROPIC_API_KEY = config.authToken;
        // 设置项：2 个
        // ANTHROPIC_BASE_URL = "https://api.example.com"
        // ANTHROPIC_API_KEY = "sk-..."
      }
    }
    
    // 子分支 1c：Auth Token 模式
    else {
      env.ANTHROPIC_BASE_URL = config.baseUrl;
      env.ANTHROPIC_AUTH_TOKEN = config.authToken;
      // 设置项：2 个
      // ANTHROPIC_BASE_URL = "https://..."
      // ANTHROPIC_AUTH_TOKEN = "token-..."
    }
    
    // 模型配置（所有 Claude Code 模式都检查）
    if (config.models?.primary) {
      env.ANTHROPIC_MODEL = config.models.primary;
    }
    if (config.models?.smallFast) {
      env.ANTHROPIC_SMALL_FAST_MODEL = config.models.smallFast;
    }
  }

  // 分支 2：Codex（ideName === 'codex'）
  if (config.ideName === 'codex') {
    
    // 子分支 2a：API Key 模式
    if (config.authMode === 'api_key' && config.authToken) {
      env.OPENAI_API_KEY = config.authToken;
      
      // 可选的 Base URL
      if (config.baseUrl) {
        env.OPENAI_API_BASE = config.baseUrl;
        // 设置项：2 个
        // OPENAI_API_KEY = "sk-..."
        // OPENAI_API_BASE = "https://api.openai.com/v1"
      } else {
        // 设置项：1 个
        // OPENAI_API_KEY = "sk-..."
      }
    }
    
    // 子分支 2b：ChatGPT 登录模式
    // 无需设置环境变量（交互式登录）
    // 设置项：0 个
  }

  return env;
}
```

### 2.2 环境变量设置的矩阵表

```
                    oauth_token   api_key(api)   api_key(auth)   auth_token   api_key(codex)   chatgpt_login
Claude Code
├─ 环境变量数      1             2              2               2            -                -
├─ CLAUDE_CODE...  ✓             ✗              ✗               ✗            ✗                ✗
├─ ANTHROPIC_BASE  ✗             ✓              ✓               ✓            ✗                ✗
├─ ANTHROPIC_API   ✗             ✓ (tokenType)  ✗               ✗            ✗                ✗
├─ ANTHROPIC_AUTH  ✗             ✗ (tokenType)  ✓               ✓            ✗                ✗
├─ ANTHROPIC_MODEL ✓             ✓              ✓               ✓            ✗                ✗
└─ ANTHROPIC_SF    ✓             ✓              ✓               ✓            ✗                ✗

Codex
├─ 环境变量数      -             1-2            -               -            1-2              0
├─ OPENAI_API_KEY  -             ✓              -               -            ✓                ✗
├─ OPENAI_API_BASE -             ✓ (optional)   -               -            ✓ (optional)     ✗
└─ Others          -             ✗              -               -            ✗                ✗

说明：
- (api)     = tokenType === 'api_key'
- (auth)    = tokenType === 'auth_token'
- (codex)   = ideName === 'codex'
- optional  = 有 baseUrl 时才设置
```

### 2.3 调用时的完整上下文

```javascript
// env-launcher.js 第 77-104 行
async function executeWithEnv(config, launchArgs = []) {
  // config 此时已完整加载，包含所有字段
  // {
  //   name: "my-provider",
  //   displayName: "...",
  //   ideName: "codex",
  //   authMode: "api_key",
  //   tokenType: undefined,     // 对 Codex 不存在
  //   baseUrl: "https://...",
  //   authToken: "sk-...",
  //   models: { primary: null, smallFast: null },
  //   launchArgs: [],
  //   createdAt: "...",
  //   lastUsed: "...",
  //   usageCount: 0,
  //   current: true
  // }

  const env = buildEnvVariables(config);
  // buildEnvVariables 已处理所有 undefined 值和条件
  // 返回的 env 是完整的、可直接传递给 spawn 的环境对象

  const args = [...launchArgs];

  clearTerminal();

  // 根据 ideName 选择启动命令
  const command = config.ideName === 'codex' ? 'codex' : 'claude';
  const description = config.ideName === 'codex' ? 'Codex' : 'Claude Code';

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,        // ← 传递构建的环境对象
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

---

## 三、config.js 配置管理详解

### 3.1 ConfigManager 的生命周期

```
创建实例
  ↓
ConfigManager { config: null, isLoaded: false }
  ↓
load() [首次]
  ↓
_performLoad()
  ├─ 检查文件存在性
  ├─ 读取 JSON
  ├─ _migrateAuthModes()     [兼容旧版本]
  └─ 记录 lastModified 时间戳
  ↓
config 已加载并缓存
  ↓
load() [后续]
  ├─ 检查 isLoaded 标志
  ├─ checkIfModified()        [检查文件是否变化]
  └─ 如果未改变，返回缓存
```

### 3.2 addProvider() 的标准化过程

```javascript
async addProvider(name, providerConfig) {
  // 输入：providerConfig 来自 add.js
  // {
  //   displayName: "OpenAI Codex",
  //   ideName: "codex",           // ← 直接来自用户选择
  //   baseUrl: "https://...",     // ← 可能为 undefined
  //   authToken: "sk-...",        // ← 可能为 undefined
  //   authMode: "api_key",        // ← 直接来自用户选择
  //   tokenType: undefined,       // ← 可能为 undefined（Codex 时）
  //   launchArgs: [],
  //   primaryModel: null,
  //   smallFastModel: null,
  //   setAsDefault: true
  // }

  // 标准化为持久化格式
  this.config.providers[name] = {
    // 直接复制的字段
    name,
    displayName: providerConfig.displayName || name,
    ideName: providerConfig.ideName || 'claude',    // 默认兼容
    baseUrl: providerConfig.baseUrl,                 // 可能为 undefined
    authToken: providerConfig.authToken,             // 可能为 undefined
    authMode: providerConfig.authMode || 'api_key',  // 默认值
    tokenType: providerConfig.tokenType || 'api_key',// 默认值（总是存储）
    launchArgs: providerConfig.launchArgs || [],

    // 自动生成的字段
    models: {
      primary: providerConfig.primaryModel || null,
      smallFast: providerConfig.smallFastModel || null
    },
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    current: false
  };

  // 处理 setAsDefault 逻辑
  if (Object.keys(this.config.providers).length === 1 || providerConfig.setAsDefault) {
    // 重置所有供应商的 current
    Object.keys(this.config.providers).forEach(key => {
      this.config.providers[key].current = false;
    });
    // 设置新供应商为当前
    this.config.providers[name].current = true;
    this.config.providers[name].lastUsed = new Date().toISOString();
    this.config.currentProvider = name;
  }

  return await this.save();
  // 序列化为 JSON 并写入 ~/.akm-config.json
}
```

### 3.3 字段的存储策略

```
字段分类：

1. 用户输入字段（必须存储）
   - name, displayName
   - ideName, authMode, authToken
   - baseUrl, tokenType
   - launchArgs

2. 自动生成字段（系统维护）
   - models (对象)
   - createdAt, lastUsed (时间戳)
   - usageCount (统计)
   - current (状态)

3. 条件字段（可能为 null/undefined）
   - tokenType    [仅 Claude Code api_key 时有意义]
   - baseUrl      [大多数模式时需要，但允许 null]
   - authToken    [大多数模式时需要，但允许 null]

设计决策：
✓ 所有字段都存储，即使有 null/undefined
✓ 加载时由业务逻辑判断是否使用
✓ 编辑时保留现有值（避免数据丢失）
```

---

## 四、switch.js 启动流程详解

### 4.1 launchProvider() 的完整执行链

```javascript
async launchProvider(provider, selectedLaunchArgs) {
  try {
    // 第 1 步：检查配置冲突
    // 这里是一个防御性检查，即使启动 Codex 也需要
    const shouldContinue = await this.ensureClaudeSettingsCompatibility(provider);
    if (!shouldContinue) {
      return;  // 用户取消启动
    }

    // 第 2 步：更新 UI（显示启动中）
    this.clearScreen();
    console.log(UIHelper.createTitle('正在启动', UIHelper.icons.loading));
    console.log(UIHelper.createCard('目标供应商', UIHelper.formatProvider(provider), UIHelper.icons.launch));
    if (selectedLaunchArgs.length > 0) {
      console.log(UIHelper.createCard('启动参数', selectedLaunchArgs.join(', '), UIHelper.icons.settings));
    }

    // 第 3 步：显示加载动画
    const loadingInterval = UIHelper.createLoadingAnimation('正在设置环境...');

    try {
      // 第 4 步：更新配置状态
      await this.configManager.setCurrentProvider(provider.name);
      provider.usageCount = (provider.usageCount || 0) + 1;
      provider.lastUsed = new Date().toISOString();
      await this.configManager.save();

      // 第 5 步：关闭加载动画，显示就绪状态
      UIHelper.clearLoadingAnimation(loadingInterval);
      console.log(UIHelper.createCard('准备就绪', '环境配置完成，正在启动 Claude Code...', UIHelper.icons.success));
      console.log();

      // 第 6 步：关键！调用 executeWithEnv
      // ┌─────────────────────────────────────────────────────────────┐
      // │ 此时 provider 包含完整的配置信息：                          │
      // │ {                                                             │
      // │   ideName: "codex" | "claude",   ← 决定启动哪个命令       │
      // │   authMode: "...",                ← 决定设置哪些环境变量   │
      // │   tokenType: "...",               ← 决定 token 变量名     │
      // │   authToken: "sk-...",            ← 实际的密钥值         │
      // │   baseUrl: "https://...",         ← API 端点地址        │
      // │   models: {...}                   ← 可选的模型配置       │
      // │ }                                                             │
      // └─────────────────────────────────────────────────────────────┘
      await executeWithEnv(provider, selectedLaunchArgs);
      // ↑ executeWithEnv 会：
      //   1. buildEnvVariables(provider)  - 构建环境变量
      //   2. spawn(command, args, {env})  - 启动子进程

    } catch (error) {
      UIHelper.clearLoadingAnimation(loadingInterval);
      throw error;
    }

  } catch (error) {
    // 错误处理
    await this.handleError(error, '启动供应商');
  }
}
```

### 4.2 从用户选择到执行的完整数据流

```
用户在菜单中选择供应商
  ↓
showProviderSelection()
  ↓
const answer = await prompt([...])
  { provider: "openai-apikey" }     // 用户选择的供应商名称
  ↓
handleSelection(answer.provider)
  ↓
showLaunchArgsSelection("openai-apikey")
  ↓
const provider = await validateProvider("openai-apikey")
  // 从 configManager 加载完整的提供商对象
  // {
  //   name: "openai-apikey",
  //   displayName: "OpenAI (API Key)",
  //   ideName: "codex",
  //   authMode: "api_key",
  //   authToken: "sk-...",
  //   baseUrl: "https://api.openai.com/v1",
  //   tokenType: null,
  //   ...other fields...
  // }
  ↓
用户选择启动参数（可选）
  { selectedArgs: ["--continue"] }
  ↓
launchProvider(provider, selectedArgs)
  ↓
ensureClaudeSettingsCompatibility(provider)
  ↓
executeWithEnv(provider, selectedArgs)
  ↓
buildEnvVariables(provider)
  // {ideName: 'codex', authMode: 'api_key', ...}
  // 进入环境变量映射逻辑
  // config.ideName === 'codex' 是 true
  // config.authMode === 'api_key' 是 true
  // 因此：
  // env.OPENAI_API_KEY = "sk-..."
  // env.OPENAI_API_BASE = "https://api.openai.com/v1"
  // 返回完整的 env 对象
  ↓
spawn("codex", ["--continue"], { env, stdio: 'inherit', shell: true })
  // Codex 进程读取 OPENAI_API_KEY 和 OPENAI_API_BASE
  // Codex 启动并运行
  ↓
等待 Codex 退出
  ↓
返回主菜单
```

---

## 五、关键决策点分析

### 5.1 第一个条件判断点：IDE 选择（add.js 第 199 行）

```javascript
{
  type: 'list',
  name: 'ideName',  // ← 最关键的字段
  choices: [
    { value: 'claude' },  // 选择 A
    { value: 'codex' }    // 选择 B
  ]
}
```

**影响范围**：
- ✓ 影响认证模式的选项（第 208 行）
- ✓ 影响 tokenType 的显示（第 245 行）
- ✓ 影响 baseUrl 的验证规则（第 266, 270, 282-285 行）
- ✓ 影响 authToken 的提示文本（第 291-312 行）
- ✓ 影响环境变量映射方式（env-launcher.js 第 28, 59 行）
- ✓ 影响启动命令选择（env-launcher.js 第 84 行）

### 5.2 第二个条件判断点：认证模式（add.js 第 208 行）

```javascript
{
  type: 'list',
  name: 'authMode',
  choices: (answers) => {
    // authMode 的选项直接取决于 ideName
    if (answers.ideName === 'codex') {
      return [
        { value: 'chatgpt_login' },  // 选择 B1
        { value: 'api_key' }         // 选择 B2
      ];
    }
    return [
      { value: 'api_key' },          // 选择 A1
      { value: 'auth_token' },       // 选择 A2
      { value: 'oauth_token' }       // 选择 A3
    ];
  }
}
```

**影响范围**：
- ✓ 影响 tokenType 的显示（第 245 行，仅 A1）
- ✓ 影响 baseUrl 的显示（第 281-286 行）
- ✓ 影响 baseUrl 的验证规则（第 262-271 行）
- ✓ 影响 authToken 的提示文本（第 250-312 行）
- ✓ 影响 authToken 的显示（第 320 行，B1 时不显示）
- ✓ 影响环境变量映射方式（env-launcher.js 第 29-44, 60-69 行）

### 5.3 第三个条件判断点：Token 类型（add.js 第 234 行）

```javascript
{
  type: 'list',
  name: 'tokenType',
  when: (answers) => answers.ideName === 'claude' && answers.authMode === 'api_key'
  // 仅在 ideName === 'claude' 且 authMode === 'api_key' 时显示
  choices: [
    { value: 'api_key' },      // 使用 ANTHROPIC_API_KEY
    { value: 'auth_token' }    // 使用 ANTHROPIC_AUTH_TOKEN
  ]
}
```

**影响范围**：
- ✓ 影响环境变量设置（env-launcher.js 第 34-39 行）
- ✓ 影响提示文本（add.js 第 304-305 行）

---

## 六、条件显示的矩阵总结

### 6.1 字段显示决策树

```
ideName 选择 (必显)
├─ == 'claude'
│  ├─ authMode 选项：api_key, auth_token, oauth_token
│  ├─ tokenType 显示条件：authMode === 'api_key'
│  ├─ baseUrl 显示条件：authMode === 'api_key' 或 'auth_token'
│  └─ authToken 显示条件：总是显示
│
└─ == 'codex'
   ├─ authMode 选项：api_key, chatgpt_login
   ├─ tokenType 显示条件：不显示
   ├─ baseUrl 显示条件：authMode === 'api_key'
   └─ authToken 显示条件：authMode !== 'chatgpt_login'
```

### 6.2 完整的场景矩阵

| 场景 | ideName | authMode | tokenType显示 | baseUrl显示 | authToken显示 |
|------|---------|----------|--------------|-----------|-------------|
| 1 | claude | oauth_token | ✗ | ✗ | ✓ |
| 2 | claude | api_key | ✓ | ✓ | ✓ |
| 3 | claude | auth_token | ✗ | ✓ | ✓ |
| 4 | codex | api_key | ✗ | ✓ | ✓ |
| 5 | codex | chatgpt_login | ✗ | ✗ | ✗ |

---

## 七、环境变量映射的完整矩阵

| 场景 | 设置的环境变量 |
|------|------------|
| 1: claude + oauth_token | `CLAUDE_CODE_OAUTH_TOKEN` |
| 2a: claude + api_key + tokenType:api_key | `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`(可选), `ANTHROPIC_SMALL_FAST_MODEL`(可选) |
| 2b: claude + api_key + tokenType:auth_token | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`(可选), `ANTHROPIC_SMALL_FAST_MODEL`(可选) |
| 3: claude + auth_token | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`(可选), `ANTHROPIC_SMALL_FAST_MODEL`(可选) |
| 4a: codex + api_key + baseUrl | `OPENAI_API_KEY`, `OPENAI_API_BASE` |
| 4b: codex + api_key + 无baseUrl | `OPENAI_API_KEY` |
| 5: codex + chatgpt_login | （无） |

---

## 八、错误处理路径

### 8.1 验证失败的处理

```
用户输入不符合规则
  ↓
validator.validate...() 返回错误字符串
  ↓
inquirer 显示错误提示
  ↓
用户重新输入
```

### 8.2 ESC 键取消的处理

```
用户按 ESC
  ↓
BaseCommand.createESCListener() 捕获
  ↓
当前 prompt 抛出特殊错误
  ↓
isEscCancelled() 检查并返回 true
  ↓
静默返回（不显示错误信息）
  ↓
返回上一个菜单
```

---

## 九、性能优化点

### 9.1 延迟加载（lazy loading）

```javascript
// CommandRegistry 中
const command = require(path);  // 仅在命令执行时才加载
```

### 9.2 配置文件缓存

```javascript
// ConfigManager 中
if (this.isLoaded && !forceReload) {
  if (!await this.checkIfModified()) {
    return this.config;  // 返回缓存
  }
}
```

### 9.3 并发控制

```javascript
// 使用 loadPromise 防止并发加载
if (this.loadPromise) {
  return await this.loadPromise;
}
```

---

## 总结：代码的流向与决策

### 核心流向
```
用户输入 → 数据收集 → 验证 → 标准化 → 持久化 → 启动 → 映射 → 执行
```

### 关键决策点
```
1. ideName（IDE 类型）→ 决定整个后续流程
2. authMode（认证方式）→ 决定环境变量映射
3. tokenType（Token 类型）→ 决定具体的环境变量名
```

### 设计精妙之处
```
✓ 通过 ideName 和 authMode 的组合，用最小的字段覆盖最大的组合
✓ 通过条件显示（when），让用户界面保持简洁
✓ 通过验证规则，防止无效配置
✓ 通过环境变量映射函数，统一启动接口
```

