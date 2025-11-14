# Codex 配置指南

本指南说明如何使用 API Key Manager (akm) 来管理和快速切换 OpenAI Codex 配置。

## 前置要求

- 已安装 Node.js >= 14.0.0
- 已安装 API Key Manager: `npm install -g @pikecode/api-key-manager`
- 已安装 Codex: `npm install -g @openai/codex`

## 添加 Codex 配置

### 方法 1：交互式添加（推荐）

```bash
akm add
```

按照提示操作：

1. **选择配置方式**
   ```
   ? 选择配置方式:
   ❯ 🔒 官方 Claude Code (OAuth) - 推荐使用官方 token
     🚀 Claude Code - 自定义配置 (API Key 或 Auth Token)
     ⚙️ Codex - OpenAI Codex (ChatGPT 登录或 API Key)
   ```
   选择：`⚙️ Codex - OpenAI Codex`

2. **输入供应商名称**
   ```
   ? 请输入供应商名称 (用于命令行):
   my-codex
   ```

3. **输入显示名称（可选）**
   ```
   ? 请输入供应商显示名称 (可选，默认为供应商名称):
   My OpenAI Codex
   ```

4. **选择认证模式**
   ```
   ? 选择 Codex 认证模式:
   ❯ 🔐 ChatGPT 登录 (推荐) - 使用 ChatGPT 账户登录
     🔑 OpenAI API Key - 使用 OPENAI_API_KEY
   ```

### Codex 认证模式说明

#### 方案 A：ChatGPT 登录（推荐）

- **优点**：
  - 使用 ChatGPT 账户登录，无需手动管理 API Key
  - Codex 首次运行时会打开浏览器进行交互式登录
  - 登录状态会被本地缓存，后续使用无需重新登录

- **配置步骤**：
  1. 在认证模式选择中选择 `🔐 ChatGPT 登录 (推荐)`
  2. 系统提示"是否设置为当前供应商"，选择 `Yes`
  3. 完成！

- **使用方法**：
  ```bash
  akm              # 列出所有供应商
  akm my-codex     # 直接切换到 my-codex
  # 首次使用时，Codex 会打开浏览器进行登录
  ```

#### 方案 B：OpenAI API Key

- **优点**：
  - 可以使用自定义 OpenAI API 端点（比如企业私有部署的 OpenAI API）
  - 适合自动化脚本和 CI/CD 集成

- **配置步骤**：
  1. 在认证模式选择中选择 `🔑 OpenAI API Key`
  2. 输入你的 OpenAI API Key（格式：`sk-...`）
  3. **可选**：输入自定义 API 基础地址（默认使用官方 OpenAI API）
     - 留空：使用官方 OpenAI API (https://api.openai.com)
     - 填入：使用自定义 API 端点
  4. 完成！

- **获取 OpenAI API Key**：
  1. 访问 https://platform.openai.com/api-keys
  2. 登录你的 OpenAI 账户
  3. 点击"Create new secret key"
  4. 复制生成的 key

- **使用方法**：
  ```bash
  akm my-codex     # 切换到 Codex 配置
  # Codex 将使用设置的 OPENAI_API_KEY 自动运行
  ```

## 切换和使用 Codex

### 查看已配置的供应商

```bash
akm list
```

输出示例：
```
总共 3 个供应商配置

🎯 my-claude (My Claude) [🚀 Claude Code]
⚫ my-codex (My OpenAI Codex) [⚙️ Codex]
⚫ my-codex-chat (Codex ChatGPT) [⚙️ Codex]
```

### 切换到 Codex

```bash
# 交互式选择
akm

# 直接切换
akm my-codex
```

### 查看当前活跃配置

```bash
akm current
```

输出示例：
```
当前活跃的配置：

🎯 my-codex (My OpenAI Codex) [⚙️ Codex]
├─ IDE: Codex
├─ 认证模式: api_key
├─ API Base URL: (默认 OpenAI API)
└─ 状态: 已配置 OpenAI API Key
```

## 配置文件位置

所有配置保存在：`~/.akm-config.json`

示例配置结构：

```json
{
  "version": "1.0.0",
  "currentProvider": "my-codex",
  "providers": {
    "my-codex": {
      "name": "my-codex",
      "displayName": "My OpenAI Codex",
      "ideName": "codex",
      "authMode": "api_key",
      "authToken": "sk-...",
      "baseUrl": null,
      "tokenType": null,
      "models": {
        "primary": null,
        "smallFast": null
      },
      "current": true,
      "lastUsed": "2024-11-14T12:00:00.000Z",
      "createdAt": "2024-11-14T11:00:00.000Z"
    },
    "my-codex-chat": {
      "name": "my-codex-chat",
      "displayName": "Codex ChatGPT Login",
      "ideName": "codex",
      "authMode": "chatgpt_login",
      "authToken": null,
      "baseUrl": null,
      "tokenType": null,
      "models": {
        "primary": null,
        "smallFast": null
      },
      "current": false,
      "lastUsed": "2024-11-13T10:00:00.000Z",
      "createdAt": "2024-11-13T09:00:00.000Z"
    }
  }
}
```

## 编辑和删除配置

### 编辑现有配置

```bash
# 交互式编辑
akm edit my-codex
```

### 删除配置

```bash
# 交互式删除
akm remove my-codex
```

## 故障排除

### 问题 1：Codex ChatGPT 登录失败

**症状**：
```
错误: 无法打开浏览器登录
```

**解决方案**：
1. 确保有可用的网络连接
2. 检查是否安装了 Codex：`npm list -g @openai/codex`
3. 尝试手动设置 API Key（使用方案 B）

### 问题 2：OpenAI API Key 无效

**症状**：
```
认证失败: Invalid API Key
```

**解决方案**：
1. 检查 API Key 是否正确复制（应该以 `sk-` 开头）
2. 验证 API Key 未过期（在 https://platform.openai.com/api-keys 中检查）
3. 确保账户有足够的 API 额度
4. 重新编辑配置：`akm edit my-codex`

### 问题 3：显示 Codex 不可用

**症状**：
```
🔴 my-codex (My OpenAI Codex) [⚙️ Codex] --- 不可用
```

**解决方案**：
1. 检查配置是否正确设置
2. 验证网络连接
3. 对于 ChatGPT 登录模式，尝试重新登录
4. 对于 API Key 模式，验证 Key 是否有效

## 环境变量说明

当使用 Codex 配置时，API Key Manager 会自动设置以下环境变量：

### ChatGPT 登录模式
```bash
# 不设置任何环境变量
# Codex 会在首次运行时打开浏览器进行交互式登录
```

### OpenAI API Key 模式
```bash
export OPENAI_API_KEY=sk-...          # 你的 OpenAI API Key
export OPENAI_API_BASE=...            # 可选：自定义 API 端点
```

## 完整使用示例

### 快速开始

```bash
# 1. 添加 Codex 配置
$ akm add
? 选择配置方式: ⚙️ Codex - OpenAI Codex
? 请输入供应商名称: my-codex
? 选择 Codex 认证模式: 🔐 ChatGPT 登录 (推荐)
✅ 供应商添加成功！

# 2. 切换到 Codex
$ akm my-codex
# 首次运行时会打开浏览器登录

# 3. 使用 Codex（具体用法请参考 Codex 文档）
$ codex
```

### 管理多个 Codex 账户

```bash
# 添加第一个账户（ChatGPT 登录）
$ akm add
选择: ⚙️ Codex - OpenAI Codex
名称: codex-account1
认证模式: 🔐 ChatGPT 登录

# 添加第二个账户（API Key）
$ akm add
选择: ⚙️ Codex - OpenAI Codex
名称: codex-account2
认证模式: 🔑 OpenAI API Key
API Key: sk-...

# 查看所有账户
$ akm list

# 快速切换
$ akm codex-account1   # 切换到账户 1
$ akm codex-account2   # 切换到账户 2
```

## 相关文档

- [OpenAI Codex 官方文档](https://beta.openai.com/docs/guides/code)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [API Key Manager GitHub](https://github.com/pikecode/api-key-manager)

## 获取帮助

```bash
# 查看所有命令
akm --help

# 查看特定命令帮助
akm add --help
akm edit --help
akm remove --help
```
