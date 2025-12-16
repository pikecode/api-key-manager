# API Key Manager (akm)

一个强大的 CLI 工具，用于管理和快速切换 **Claude Code** 和 **Codex CLI** 的 API 配置。

[![npm version](https://img.shields.io/npm/v/@pikecode/api-key-manager.svg)](https://www.npmjs.com/package/@pikecode/api-key-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能特性

- 🎯 **双 IDE 支持** - 同时管理 Claude Code 和 Codex CLI 配置
- 🔄 **快速切换** - 一键切换不同的 API 提供商
- 🔐 **安全存储** - 本地文件存储（Unix 自动设置为 0600 权限）
- 🎨 **多认证模式** - 支持 OAuth、API Key、Auth Token
- 🚀 **启动参数** - 为每个供应商配置专属启动参数
- 💾 **备份恢复** - 配置导出、导入、备份功能
- 🏷️ **智能过滤** - 按 IDE 类型过滤供应商列表
- ⚡ **参数校验** - 自动检测互斥参数冲突
- 🌍 **跨平台** - macOS / Linux / Windows

## 📦 安装

```bash
npm install -g @pikecode/api-key-manager
```

## 🚀 快速开始

```bash
# 添加第一个配置
akm add

# 切换供应商（交互式）
akm

# 查看所有配置
akm list

# 查看当前激活的配置
akm current
```

## 📚 详细使用指南

### 首次使用完整流程

#### 步骤 1: 安装 akm

```bash
# 全局安装
npm install -g @pikecode/api-key-manager

# 验证安装
akm --version
```

#### 步骤 2: 添加第一个供应商

**添加 Claude Code 供应商：**

```bash
akm add --claude
```

交互式问答流程：

```
? 选择要管理的 IDE: Claude Code (Anthropic)
? 请输入供应商名称 (用于命令行): my-claude
? 请输入显示名称: My Claude Account
? 选择认证模式:
  ❯ 🌐 OAuth令牌模式 (CLAUDE_CODE_OAUTH_TOKEN) - 适用于官方Claude Code
    🔑 通用API密钥模式 - 支持 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN
    🔐 认证令牌模式 (仅 ANTHROPIC_AUTH_TOKEN) - 适用于某些服务商
? 请输入 OAuth Token: sk-ant-oat01-xxxxx
? 选择默认启动参数:
  ◉ --continue 继续上次对话
  ◯ --dangerously-skip-permissions 跳过权限检查
? 设置主模型 (ANTHROPIC_MODEL): claude-sonnet-4
? 设置快速模型 (ANTHROPIC_SMALL_FAST_MODEL): claude-haiku-4

✅ 供应商 'my-claude' 已添加
```

**添加 Codex CLI 供应商：**

```bash
akm add --codex
```

交互式问答流程：

```
? 选择要管理的 IDE: Codex CLI (OpenAI)
? 选择配置方式:
  ❯ 从 ~/.codex 导入现有配置
    手动输入配置
? 请输入供应商名称 (用于命令行): my-codex
? 请输入显示名称: My Codex Account
? 请输入 API Key (OPENAI_API_KEY): sk-xxxxx
? 请输入基础 URL (OPENAI_BASE_URL): https://api.openai.com
? 选择默认启动参数:
  ◉ resume 继续上次对话
  ◯ --full-auto 全自动模式
  ◯ --search 启用网页搜索

✅ 供应商 'my-codex' 已添加
```

#### 步骤 3: 切换并启动

```bash
# 运行 akm 进入交互式选择界面
akm
```

选择供应商后，akm 会自动：
1. 设置为当前活跃供应商
2. 配置相应的环境变量/配置文件
3. 启动对应的 IDE（Claude Code 或 Codex CLI）

#### 步骤 4: 日常使用

```bash
# 快速切换到指定供应商
akm my-claude

# 查看当前配置
akm current

# 查看所有供应商
akm list
```

---

### 交互式界面操作说明

#### 主界面（供应商选择）

```
总共 3 个供应商配置

  ↑ / ↓ 选择供应商 | Enter 确认 | Tab 切换选项 | ESC 退出程序 | Ctrl+C 强制退出

? 请选择要切换的供应商 (总计 3 个):
  🟢 [Claude] My Claude Account --- 上次使用 - 可用
  🟢 [Claude] Work Account - 可用
❯ 🟢 [Codex] My Codex Account - 可用
  ──────────────
  ➕ 添加新供应商
  📋 供应商管理 (编辑/删除)
  📁 打开配置文件
  ❌ 退出
```

**状态图标说明：**
| 图标 | 含义 |
|-----|------|
| 🟢 | API 可用 |
| 🟡 | 有限可用/响应慢 |
| 🔴 | API 不可用 |
| ⏳ | 正在检测 |
| ⚪ | 未知状态 |

**IDE 标签：**
| 标签 | 含义 |
|------|------|
| [Claude] | Claude Code 供应商 |
| [Codex] | Codex CLI 供应商 |

#### 启动参数选择界面

选择供应商后进入启动参数选择：

```
┌─ 启动配置 ─────────────────────────────────┐

  📋 供应商: My Claude Account

  空格 切换选中 | A 全选 | I 反选 | Enter 启动 Claude Code | ESC 返回

? 选择启动参数:
  ◉ --continue (继续上次对话)
  ◯ --dangerously-skip-permissions (跳过权限检查)
```

**快捷键：**
| 按键 | 功能 |
|------|------|
| `Space` | 切换选中状态 |
| `A` | 全选所有参数 |
| `I` | 反选（选中变未选，未选变选中）|
| `Enter` | 确认并启动 |
| `ESC` | 返回上一级 |

#### 供应商管理界面

从主界面选择"供应商管理"进入：

```
  ↑ / ↓ 选择供应商或操作 | Enter 确认 | ESC 返回主菜单

┌─ 供应商管理 ─────────────────────────────────┐

? 选择供应商或操作 (总计 3 个):
❯ 🟢 [Claude] My Claude Account - 可用
  🟢 [Claude] Work Account - 可用
  🟢 [Codex] My Codex Account - 可用
  ──────────────
  ◀ 返回供应商选择
  ❌ 退出
```

选择供应商后显示详情和操作选项：

```
┌─ 供应商详情 ─────────────────────────────────┐

┌──────────────┬─────────────────────────────────┐
│ 供应商名称   │ my-claude                       │
│ 显示名称     │ My Claude Account               │
│ 认证模式     │ OAuth令牌模式                   │
│ 基础URL      │ ✨ 官方默认服务器               │
│ 认证令牌     │ sk-ant-***...***ddd             │
│ 主模型       │ claude-sonnet-4                 │
│ 快速模型     │ claude-haiku-4                  │
│ 创建时间     │ 2025-12-15 13:00                │
│ 最后使用     │ 2025-12-17 10:30                │
│ 当前状态     │ ✅ 使用中                       │
│ 使用次数     │ 42                              │
└──────────────┴─────────────────────────────────┘

? 选择操作:
❯ 🚀 立即启动
  ✏️ 编辑供应商
  🗑️ 删除供应商
  ◀ 返回管理列表
```

---

### 配置示例

#### Claude Code 官方 OAuth（推荐）

适用于：使用官方 Claude Code 登录获取的 OAuth Token

```bash
akm add --claude
```

```yaml
供应商名称: claude-official
显示名称: Claude Official
认证模式: oauth_token
Token: sk-ant-oat01-xxxxxxxx  # 从 claude 登录后获取
基础URL: (留空，使用官方服务器)
```

#### Claude Code 第三方 API（API Key 模式）

适用于：使用 Anthropic API Key 或第三方兼容服务

```bash
akm add --claude
```

```yaml
供应商名称: anthropic-api
显示名称: Anthropic API
认证模式: api_key
Token类型: ANTHROPIC_API_KEY
Token: sk-ant-api03-xxxxxxxx
基础URL: https://api.anthropic.com  # 或第三方服务地址
```

#### Claude Code 第三方 API（Auth Token 模式）

适用于：某些第三方服务商要求使用 ANTHROPIC_AUTH_TOKEN

```bash
akm add --claude
```

```yaml
供应商名称: third-party
显示名称: Third Party Service
认证模式: auth_token
Token: your-auth-token
基础URL: https://your-provider.com/v1
```

#### Codex CLI 官方 OpenAI

适用于：使用 OpenAI 官方 API

```bash
akm add --codex
```

```yaml
供应商名称: openai-official
显示名称: OpenAI Official
API Key: sk-xxxxxxxx
基础URL: https://api.openai.com  # 可留空
```

#### Codex CLI 第三方兼容服务

适用于：使用兼容 OpenAI API 的第三方服务

```bash
akm add --codex
```

```yaml
供应商名称: azure-openai
显示名称: Azure OpenAI
API Key: your-azure-key
基础URL: https://your-resource.openai.azure.com/openai/deployments/your-deployment
```

#### 多账号配置示例

```bash
# 工作账号
akm add --claude
# 名称: work, Token: sk-ant-work-xxx

# 个人账号
akm add --claude
# 名称: personal, Token: sk-ant-personal-xxx

# 测试账号
akm add --codex
# 名称: test-codex, Token: sk-test-xxx

# 快速切换
akm work      # 切换到工作账号
akm personal  # 切换到个人账号
akm test-codex # 切换到测试账号
```

---

### 常见问题 FAQ

#### Q1: 切换 Codex 后提示 "Token data is not available"

**原因：** `~/.codex/auth.json` 格式不正确或 `config.toml` 未设置 API Key 认证模式。

**解决方案：**
```bash
# 确保使用最新版本 akm
npm update -g @pikecode/api-key-manager

# 重新切换供应商
akm my-codex
```

akm 会自动：
- 设置 `~/.codex/config.toml` 中的 `preferred_auth_method = "apikey"`
- 写入正确格式的 `~/.codex/auth.json`

#### Q2: Claude Code 切换后环境变量不生效

**原因：** `~/.claude/settings.json` 中存在冲突的环境变量配置。

**解决方案：** 切换时 akm 会自动检测并提示处理冲突，选择"备份并清空这些变量"即可。

手动检查：
```bash
cat ~/.claude/settings.json | grep -A 10 '"env"'
```

#### Q3: 如何查看完整的 API Key/Token？

**解决方案：** 默认脱敏显示，使用 `--show-token` 参数：

```bash
akm list --show-token
akm current --show-token
```

#### Q4: 配置文件在哪里？如何手动编辑？

**位置：** `~/.akm-config.json`

```bash
# 通过 akm 打开
akm
# 选择 "📁 打开配置文件"

# 或直接编辑
code ~/.akm-config.json
vim ~/.akm-config.json
```

#### Q5: 如何备份和恢复配置？

```bash
# 创建备份
akm backup

# 查看备份列表
akm backup --list

# 恢复备份
akm backup --restore akm-backup-2025-12-17T10-30-00.json

# 导出到指定文件（可分享）
akm export my-config.json

# 导出脱敏版本（分享配置模板）
akm export template.json --mask

# 从文件导入
akm import my-config.json
```

#### Q6: 切换时报错 "找不到 claude/codex 命令"

**原因：** 未安装对应的 CLI 工具。

**解决方案：**

```bash
# 安装 Claude Code
npm install -g @anthropic-ai/claude-code

# 安装 Codex CLI
npm install -g @openai/codex
# 或
brew install codex
```

#### Q7: 如何删除某个供应商配置？

```bash
# 交互式选择删除
akm remove

# 直接删除指定供应商
akm remove my-provider
```

#### Q8: 支持哪些第三方服务？

理论上支持所有兼容以下 API 的服务：
- **Claude Code**: 兼容 Anthropic API 的服务
- **Codex CLI**: 兼容 OpenAI API 的服务

常见第三方服务配置：
| 服务 | IDE | 基础 URL |
|------|-----|----------|
| Azure OpenAI | Codex | `https://{resource}.openai.azure.com/...` |
| OpenRouter | Claude/Codex | `https://openrouter.ai/api/v1` |
| Together AI | Codex | `https://api.together.xyz/v1` |

#### Q9: 如何只显示某一类 IDE 的供应商？

```bash
# 只显示 Claude Code 供应商
akm switch --claude
akm list --claude

# 只显示 Codex CLI 供应商
akm switch --codex
akm list --codex
```

#### Q10: 配置文件权限问题

akm 会自动设置配置文件权限为 `0600`（仅所有者可读写）。

如果遇到权限问题：
```bash
chmod 600 ~/.akm-config.json
```

---

## 📖 完整命令参考

### 基础命令

#### `akm` / `akm switch`
交互式选择和切换供应商

```bash
# 显示所有供应商
akm

# 直接切换到指定供应商
akm my-provider

# 仅显示 Codex CLI 供应商
akm switch --codex

# 仅显示 Claude Code 供应商
akm switch --claude
```

#### `akm add`
添加新的 API 供应商配置

```bash
# 交互式添加（会询问 IDE 类型）
akm add

# 直接添加 Claude Code 供应商
akm add --claude

# 直接添加 Codex CLI 供应商
akm add --codex
```

**添加过程中可配置：**
- IDE 类型（Claude Code / Codex CLI）
- 供应商名称和显示名称
- 认证模式（仅 Claude Code）
- API 密钥 / OAuth Token
- 基础 URL
- 启动参数
- 模型配置

#### `akm list`
列出所有已保存的配置

```bash
# 列出所有供应商
akm list

# 仅列出 Codex CLI 供应商
akm list --codex

# 仅列出 Claude Code 供应商
akm list --claude

# 显示完整 Token（默认脱敏，慎用）
akm list --show-token
```

**显示内容：**
- ✅ 当前激活的供应商
- 🟢/🟡/🔴 API 可用性状态
- [Codex]/[Claude] IDE 类型标签
- 认证模式、环境变量、启动参数（Token 默认脱敏，可用 `--show-token` 显示完整）
- 创建时间、最后使用时间

#### `akm current`
显示当前激活的配置

```bash
akm current

# 显示完整 Token（默认脱敏，慎用）
akm current --show-token
```

**显示内容：**
- 供应商名称和显示名称
- IDE 类型
- 认证模式
- 环境变量设置
- 启动参数
- 模型配置

#### `akm edit`
编辑供应商配置

```bash
# 交互式选择要编辑的供应商
akm edit

# 直接编辑指定供应商
akm edit my-provider
```

**可编辑项：**
- 显示名称
- 认证令牌
- 基础 URL
- 启动参数
- 模型配置

#### `akm remove`
删除供应商配置

```bash
# 交互式选择要删除的供应商
akm remove

# 直接删除指定供应商
akm remove my-provider
```

### 备份与迁移

#### `akm export`
导出配置到文件

```bash
# 导出到默认文件 (akm-config-{timestamp}.json)
akm export

# 导出到指定文件
akm export my-backup.json

# 导出时脱敏 Token（适合分享配置模板）
akm export template.json --mask
```

**导出格式：**
```json
{
  "version": "1.0",
  "exportedAt": "2025-12-15T05:30:00.000Z",
  "providers": {
    "my-provider": {
      "name": "my-provider",
      "displayName": "My Provider",
      "ideName": "claude",
      "authMode": "api_key",
      "authToken": "sk-ant-***",
      "baseUrl": "https://api.anthropic.com"
    }
  },
  "currentProvider": "my-provider"
}
```

#### `akm import`
从文件导入配置

```bash
# 导入配置（跳过已存在的供应商）
akm import my-backup.json

# 导入并覆盖已存在的供应商
akm import my-backup.json --overwrite
```

**注意：** 如果导入的配置使用了 `--mask` 脱敏，需要手动编辑 Token。

#### `akm backup`
备份和恢复配置

```bash
# 创建备份（默认保存到 ~/.akm-backups/）
akm backup

# 指定备份目录
akm backup --dir /path/to/backups

# 列出所有备份
akm backup --list

# 从备份恢复
akm backup --restore akm-backup-2025-12-15T05-30-00.json

# 从指定目录的备份恢复
akm backup --restore backup.json --dir /path/to/backups
```

**自动清理：** 默认保留最近 10 个备份，自动删除旧备份。

## 🎨 IDE 支持

### Claude Code (Anthropic 官方)

**认证模式：**
- **oauth_token** - OAuth 令牌模式（官方推荐）
- **api_key** - 通用 API 密钥模式
- **auth_token** - 认证令牌模式

**切换原理：**

切换 Claude Code 供应商时，akm 通过**环境变量注入**方式工作：

1. **检测设置冲突** → 检查 `~/.claude/settings.json` 中是否有冲突的环境变量
2. **构建环境变量** → 根据认证模式构建相应的环境变量
3. **启动子进程** → 使用 `spawn('claude', args, { env })` 启动 Claude Code

```
认证模式 → 环境变量映射：
┌─────────────┬────────────────────────────┐
│ oauth_token │ CLAUDE_CODE_OAUTH_TOKEN    │
│ api_key     │ ANTHROPIC_API_KEY          │
│             │ ANTHROPIC_BASE_URL         │
│ auth_token  │ ANTHROPIC_AUTH_TOKEN       │
│             │ ANTHROPIC_BASE_URL (可选)  │
└─────────────┴────────────────────────────┘
```

> 💡 Claude Code 使用环境变量注入，不修改配置文件，切换只在当前会话生效。

**环境变量：**
- `CLAUDE_CODE_OAUTH_TOKEN` - OAuth 模式
- `ANTHROPIC_API_KEY` - API Key 模式
- `ANTHROPIC_AUTH_TOKEN` - Auth Token 模式
- `ANTHROPIC_BASE_URL` - 自定义 API 端点
- `ANTHROPIC_MODEL` - 主模型
- `ANTHROPIC_SMALL_FAST_MODEL` - 快速模型

**启动参数：**
- `--continue` - 继续上次对话
- `--dangerously-skip-permissions` - 跳过权限检查（沙盒环境）

**配置示例：**
```bash
akm add --claude
# 选择认证模式 -> 输入 Token -> 配置启动参数
```

### Codex CLI (OpenAI)

**认证模式：**
- 使用 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL` 环境变量

**切换原理：**

切换 Codex 供应商时，akm 会自动：

1. **备份现有配置** → `~/.codex/akm-backups/backup-{timestamp}/`
2. **更新 config.toml** → 设置 `preferred_auth_method = "apikey"`
3. **写入 auth.json** → 包含选中供应商的 API Key
4. **注入环境变量** → 启动时传递 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL`

```
~/.codex/
├── config.toml          # preferred_auth_method = "apikey"
├── auth.json            # { "OPENAI_API_KEY": "your-key" }
└── akm-backups/         # 自动备份目录
    └── backup-20251217_120000/
        ├── config.toml
        └── auth.json
```

> 💡 切换后直接运行 `codex` 命令也能使用新配置，无需通过 akm 启动。

**启动参数：**
- `resume` - 继续上次对话（子命令）
- `--full-auto` - 全自动模式（自动批准 + 工作区沙盒）⚠️ 与 `--dangerously-bypass-approvals-and-sandbox` 互斥
- `--dangerously-bypass-approvals-and-sandbox` - 跳过所有安全检查 ⚠️ 与 `--full-auto` 互斥
- `--search` - 启用网页搜索

**配置导入：**
```bash
akm add --codex
# 选择 "从 ~/.codex 导入现有配置" 自动读取现有配置
# 或选择 "手动输入配置" 手动设置
```

**配置示例：**
```bash
# 方式1：从现有 Codex 配置导入
akm add --codex
# -> 选择 "从 ~/.codex 导入现有配置"
# -> 自动读取 ~/.codex/auth.json 和 config.toml

# 方式2：手动配置
akm add --codex
# -> 选择 "手动输入配置"
# -> 输入 API Key 和 Base URL
```

## ⚙️ 配置文件

**位置：** `~/.akm-config.json`

**完整示例：**
```json
{
  "version": "2.0.0",
  "currentProvider": "my-claude",
  "providers": {
    "my-claude": {
      "name": "my-claude",
      "displayName": "Claude Code Official",
      "ideName": "claude",
      "authMode": "oauth_token",
      "authToken": "sk-ant-oat01-xxx",
      "baseUrl": null,
      "tokenType": null,
      "launchArgs": ["--continue"],
      "models": {
        "primary": "claude-sonnet-4",
        "smallFast": "claude-haiku-4"
      },
      "createdAt": "2025-12-15T05:00:00.000Z",
      "lastUsed": "2025-12-15T05:30:00.000Z"
    },
    "my-codex": {
      "name": "my-codex",
      "displayName": "Codex CLI",
      "ideName": "codex",
      "authMode": "openai_api_key",
      "authToken": "sk-xxx",
      "baseUrl": "https://api.openai.com",
      "tokenType": null,
      "launchArgs": ["resume", "--full-auto"],
      "createdAt": "2025-12-15T05:00:00.000Z",
      "lastUsed": "2025-12-15T05:25:00.000Z"
    }
  }
}
```

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        akm (CLI 入口)                           │
├─────────────────────────────────────────────────────────────────┤
│  CommandRegistry          命令注册中心，懒加载命令模块            │
│  ├── add                  添加供应商                            │
│  ├── switch               切换供应商（默认命令）                 │
│  ├── list                 列出供应商                            │
│  ├── edit                 编辑供应商                            │
│  ├── remove               删除供应商                            │
│  ├── export/import        导入导出                              │
│  └── backup               备份恢复                              │
├─────────────────────────────────────────────────────────────────┤
│  ConfigManager            配置管理（~/.akm-config.json）         │
│  ├── 懒加载 & 缓存                                              │
│  ├── 版本迁移                                                   │
│  └── 文件权限管理 (0600)                                        │
├─────────────────────────────────────────────────────────────────┤
│  IDE 启动器                                                     │
│  ├── env-launcher.js      Claude Code（环境变量注入）            │
│  └── codex-launcher.js    Codex CLI（配置文件 + 环境变量）       │
└─────────────────────────────────────────────────────────────────┘
```

**核心设计原则：**

1. **命令懒加载** - 通过 `CommandRegistry` 按需加载命令模块，减少启动时间
2. **配置缓存** - `ConfigManager` 单例模式，避免重复读取配置文件
3. **IDE 差异化处理** - Claude Code 用环境变量，Codex CLI 写配置文件
4. **安全优先** - 配置文件权限 0600，Token 默认脱敏显示
5. **自动备份** - 切换配置前自动备份，支持回滚

## 🎯 使用场景

### 场景 1: 同时使用多个 API Key

```bash
# 添加工作账号
akm add --claude
# 名称: work
# 显示名称: Work Account
# Token: sk-ant-work-xxx

# 添加个人账号
akm add --claude
# 名称: personal
# 显示名称: Personal Account
# Token: sk-ant-personal-xxx

# 快速切换
akm  # 选择 work 或 personal
```

### 场景 2: Claude Code 和 Codex CLI 混合使用

```bash
# 添加 Claude Code 配置
akm add --claude

# 添加 Codex CLI 配置
akm add --codex

# 查看所有配置（带 IDE 标签）
akm list

# 仅切换 Codex 供应商
akm switch --codex

# 仅切换 Claude 供应商
akm switch --claude
```

### 场景 3: 团队配置分享

```bash
# 导出配置模板（脱敏）
akm export team-template.json --mask

# 团队成员导入后编辑 Token
akm import team-template.json
akm edit my-provider  # 设置自己的 Token
```

### 场景 4: 配置迁移

```bash
# 旧机器：导出配置
akm export my-config.json

# 新机器：导入配置
akm import my-config.json
```

### 场景 5: 定期备份

```bash
# 创建备份
akm backup

# 查看备份列表
akm backup --list

# 恢复到某个备份
akm backup --restore akm-backup-2025-12-15T05-30-00.json
```

## ⚠️ 参数互斥说明

某些参数不能同时使用，akm 会自动检测并提示：

**Codex CLI:**
- `--full-auto` ⚔️ `--dangerously-bypass-approvals-and-sandbox`

如果同时选择互斥参数，会显示警告并要求重新选择。

## ⌨️ 快捷键

- **↑/↓** - 上下导航
- **Space** - 切换选中（多选）
- **Enter** - 确认
- **ESC** - 返回上级菜单 / 取消操作
- **Ctrl+C** - 退出程序

## 🔧 系统要求

- Node.js >= 14.0.0
- macOS / Linux / Windows

## 📝 更新日志

### v1.0.37 (最新)
- 🐛 修复 Codex 切换时无法更新 `~/.codex/auth.json` 的问题
- ✨ 切换 Codex 供应商时自动写入配置文件
- ✨ 自动设置 `preferred_auth_method = "apikey"`
- 💾 切换前自动备份现有 Codex 配置

### v1.0.27
- ✨ 新增参数互斥校验
- ✨ 新增 `export` / `import` / `backup` 命令
- 🧪 测试覆盖率提升 46%

### v1.0.26
- ✨ Codex 添加 `resume` 子命令支持

### v1.0.25
- 🐛 修复 Codex 启动参数

### v1.0.23
- ✨ list 和 switch 命令显示 IDE 类型标签

### v1.0.22
- ✨ 完整的 Codex CLI 支持优化

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 链接

- **GitHub**: https://github.com/pikecode/api-key-manager
- **NPM**: https://www.npmjs.com/package/@pikecode/api-key-manager
- **Issues**: https://github.com/pikecode/api-key-manager/issues

---

Made with ❤️ by [pikecode](https://github.com/pikecode)
