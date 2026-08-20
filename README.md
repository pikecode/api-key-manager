# API Key Manager (akm)

一个 CLI 工具，用于管理和快速切换 **Claude Code** 和 **Codex CLI** 的 API 配置。

[![npm version](https://img.shields.io/npm/v/@pikecode/api-key-manager.svg)](https://www.npmjs.com/package/@pikecode/api-key-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 功能特性

- 🎯 **双 IDE 支持** — 同时管理 Claude Code 和 Codex CLI 配置
- 🔄 **快速切换** — 一键切换不同的 API 供应商
- ⚡ **快速启动** — `-q` 跳过参数选择，秒级启动
- 🧠 **智能记忆** — 自动记住上次使用的启动参数
- 🗑️ **批量删除** — 支持一次选择多个供应商批量删除
- 🔌 **MCP 管理** — 管理 Claude Code 的 MCP 服务器配置
- 🧹 **配置清理** — 清理 Claude Code 配置文件中的冗余数据
- 📋 **克隆配置** — 快速克隆现有供应商配置
- ✅ **配置验证** — 验证 Token 有效性和 API 可用性
- 🔐 **权限保护** — 本地文件存储，Unix 自动设置 0600 权限
- 💾 **备份恢复** — 配置导出、导入、备份功能
- 🌍 **跨平台** — macOS / Linux / Windows

## 安装

```bash
npm install -g @pikecode/api-key-manager
```

## 快速开始

```bash
# 添加供应商配置
akm add

# 交互式切换供应商并启动
akm

# 快速启动（使用上次参数）
akm my-provider -q

# 查看所有配置
akm list

# 查看当前配置
akm current
```

## 命令参考

### 核心命令

| 命令                    | 说明                           |
| ----------------------- | ------------------------------ |
| `akm` / `akm switch`    | 交互式选择和切换供应商         |
| `akm add`               | 添加新的供应商配置             |
| `akm remove [provider]` | 删除供应商配置（支持批量删除） |
| `akm list`              | 列出所有供应商                 |
| `akm current`           | 显示当前激活的配置             |
| `akm edit [provider]`   | 编辑供应商配置                 |

### 运维命令

| 命令                      | 说明                 |
| ------------------------- | -------------------- |
| `akm export [file]`       | 导出配置到文件       |
| `akm import <file>`       | 从文件导入配置       |
| `akm backup`              | 备份和恢复配置       |
| `akm validate [provider]` | 验证供应商配置有效性 |
| `akm clone [source]`      | 克隆现有供应商配置   |

### 工具命令

| 命令                      | 说明                                  |
| ------------------------- | ------------------------------------- |
| `akm stats [provider]`    | 显示供应商使用统计                    |
| `akm health [provider]`   | 检查配置健康状态                      |
| `akm batch <operation>`   | 批量操作供应商                        |
| `akm benchmark`           | 供应商性能测试和对比                  |
| `akm claude <subcommand>` | Claude Code 配置管理 (clean/analyze)  |
| `akm mcp <subcommand>`    | MCP 服务器管理 (list/add/edit/remove) |

---

## 详细使用指南

### 添加供应商

```bash
# 交互式添加（会询问 IDE 类型）
akm add

# 直接添加 Claude Code 供应商
akm add --claude

# 直接添加 Codex CLI 供应商
akm add --codex
```

添加流程分两步：

**步骤 1 — 填写供应商信息：**

- 选择 IDE 类型（Claude Code / Codex CLI）
- 输入供应商名称
- 选择认证模式（Claude Code 有两种）
- 输入 API 基础 URL 和 Token

**步骤 2 — 可选配置：**

- 启动参数
- 模型配置

### 认证模式

Claude Code 支持两种认证模式：

| 模式       | 环境变量                                      | 适用场景         |
| ---------- | --------------------------------------------- | ---------------- |
| API Key    | `ANTHROPIC_API_KEY` + `ANTHROPIC_BASE_URL`    | 大多数第三方代理 |
| Auth Token | `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` | 部分服务商       |

Codex CLI 使用 `OPENAI_API_KEY` + `OPENAI_BASE_URL`。
如果选择官方网页登录模式，AKM 会按供应商名称缓存 Codex 的官方 Session；同一个官方供应商会复用本地 Session，Session 失效时由 Codex CLI 重新触发浏览器授权。需要多个 OpenAI 官方账号时，为每个账号添加一个不同名称的 Codex 官方网页登录供应商即可。

### 切换供应商

```bash
# 交互式选择
akm

# 直接切换到指定供应商
akm my-provider

# 仅显示 Claude Code 供应商
akm switch --claude

# 仅显示 Codex CLI 供应商
akm switch --codex
```

### 快速启动

```bash
# 使用上次的启动参数
akm my-provider -q

# 以空参数启动
akm my-provider --no-args

# Codex 官方网页登录模式下清理当前 Session 并重新网页登录
akm openai-work --relogin
```

参数优先级：`--no-args` > `--quick`

### 查看配置

```bash
# 列出所有供应商（默认不检测状态，秒出）
akm list

# 列出并检测在线状态
akm list --status

# 按 IDE 类型过滤
akm list --claude
akm list --codex
akm list --json

# 查看当前激活的配置（list/current 默认完整显示 Token）
akm current
akm current --shell zsh
akm current --json
```

`--show-token` 作为兼容参数继续接受；本地 `list`、`current`、创建摘要和供应商详情均直接显示完整 Token。
分享配置时仍建议使用默认的无密钥导出。

### 克隆供应商

快速基于现有配置创建新供应商：

```bash
# 交互式选择源供应商
akm clone

# 直接指定源供应商
akm clone my-provider
```

克隆时可以修改名称、认证模式、Token、基础 URL 等。

### 删除供应商

```bash
# 交互式删除（支持批量选择）
akm remove

# 直接删除指定供应商
akm remove my-provider
```

**批量删除流程：**

1. 使用空格键选择多个要删除的供应商
2. 按 Enter 确认选择
3. 预览将要删除的供应商列表
4. 最终确认后批量删除

### 编辑供应商

```bash
# 交互式选择要编辑的供应商
akm edit

# 直接编辑指定供应商
akm edit my-provider
```

**可编辑内容：**

- 供应商名称
- 认证模式
- API 基础 URL
- Token
- 启动参数

### MCP 服务器管理

管理 `~/.claude.json` 中的 MCP 服务器配置：

```bash
# 列出已配置的 MCP 服务器
akm mcp list

# 添加 MCP 服务器（支持预设模板和手动配置）
akm mcp add

# 编辑 MCP 服务器
akm mcp edit

# 删除 MCP 服务器
akm mcp remove
```

内置预设模板：Playwright、filesystem、memory、fetch。

### Claude Code 配置清理

清理 `~/.claude.json` 中的冗余数据（如过期的项目记录）：

```bash
# 清理配置
akm claude clean

# 分析配置（仅查看，不修改）
akm claude analyze
```

### 备份与迁移

```bash
# 创建备份
akm backup

# 列出备份
akm backup --list

# 恢复备份
akm backup --restore <file>

# 导出无密钥配置（默认，可作为模板分享）
akm export my-config.json

# 显式导出包含完整 Token 的配置（敏感文件）
akm export private-backup.json --include-secrets

# 预览导出，不写入文件
akm export my-config.json --dry-run

# 导入配置
akm import my-config.json
akm import my-config.json --overwrite
akm import my-config.json --dry-run
```

导出文件在 Unix 系统上会设置为 `0600`。默认导出会把 `authToken` 设为 `null`，并写入
`secretsIncluded: false`，导入后需要重新设置密钥；只有明确使用 `--include-secrets` 时才会
写出原始密钥。
`health` 默认只做本地配置健康检查；使用 `--connectivity` 才会真实调用 API，可能产生费用。
`--json` 和 `--dry-run` 适合脚本或自动化流程。

如果配置文件在当前操作期间被另一个 `akm` 进程修改，保存会停止并提示重新执行，避免覆盖较新的配置。

### 配置验证

```bash
# 验证单个供应商
akm validate my-provider

# 验证所有供应商
akm validate

# 按 IDE 类型过滤
akm validate --claude
akm validate --codex
```

验证内容：Token 有效性、API 响应时间、配置完整性。

---

## 配置示例

### Claude Code — API Key 模式

```yaml
供应商名称: my-claude
认证模式: api_key
Token (ANTHROPIC_API_KEY): sk-ant-api03-xxxxxxxx
基础URL (ANTHROPIC_BASE_URL): https://api.anthropic.com
```

### Claude Code — Auth Token 模式

```yaml
供应商名称: third-party
认证模式: auth_token
Token (ANTHROPIC_AUTH_TOKEN): your-auth-token
基础URL (ANTHROPIC_BASE_URL): https://your-provider.com/v1
```

### Codex CLI

```yaml
供应商名称: my-codex
API Key (OPENAI_API_KEY): sk-xxxxxxxx
基础URL (OPENAI_BASE_URL): https://api.openai.com
```

官方网页登录模式可以配置多个供应商名称，例如 `openai-work`、`openai-personal`。AKM 会把它们的 Session 分开缓存，切换时只恢复对应供应商的 Session。需要强制换号或重新授权时运行：

```bash
akm openai-work --relogin
```

### Codex 官方多账号

每个官方账号都应创建一个独立的 Codex 官方网页登录供应商，供应商名称就是 Session 隔离键。

```bash
# 添加个人 OpenAI 官方账号
akm add --codex
# 认证方式选择: 官方网页登录
# 供应商名称填写: openai-personal

# 添加工作 OpenAI 官方账号
akm add --codex
# 认证方式选择: 官方网页登录
# 供应商名称填写: openai-work
```

首次启动某个官方供应商时，如果该供应商还没有自己的 Session，Codex 会打开浏览器授权；授权完成后 AKM 会按供应商名称缓存 Session。

```bash
# 首次启动个人账号，会绑定 openai-personal 的 Session
akm openai-personal

# 首次启动工作账号，会重新网页授权，不复用 openai-personal
akm openai-work
```

日常切换时直接使用供应商名称即可：

```bash
akm openai-personal
akm openai-work
```

需要换号、Session 异常或希望重新网页登录时，使用 `--relogin` 清理当前供应商的 Session：

```bash
akm openai-work --relogin
akm switch openai-work --relogin
```

### 多账号配置

```bash
# 工作账号
akm add --claude  # 名称: work

# 个人账号
akm add --claude  # 名称: personal

# 快速切换
akm work -q
akm personal -q
```

---

## 交互式界面

### 主界面

```
? 请选择要切换的供应商 (总计 3 个):
  🟢 [Claude] my-claude (My Claude Account) --- 上次使用 - 可用
  🟢 [Claude] work (Work Account) - 可用
❯ 🟢 [Codex] my-codex (Codex Account) - 可用
  ──────────────
  ➕ 添加新供应商
  📋 供应商管理 (编辑/删除)
  📁 打开配置文件
  ❌ 退出
```

### 状态图标

| 图标 | 含义            |
| ---- | --------------- |
| 🟢   | API 可用        |
| 🟡   | 有限可用/响应慢 |
| 🔴   | API 不可用      |
| ⏳   | 正在检测        |
| ⚪   | 未知状态        |

### 快捷键

| 按键   | 功能             |
| ------ | ---------------- |
| ↑/↓    | 上下导航         |
| Space  | 切换选中（多选） |
| A      | 全选             |
| I      | 反选             |
| Enter  | 确认             |
| ESC    | 返回上级 / 取消  |
| Ctrl+C | 退出程序         |

---

## 架构设计

```
┌──────────────────────────────────────────────────────┐
│                    akm (CLI 入口)                     │
├──────────────────────────────────────────────────────┤
│  CommandRegistry        命令注册中心，懒加载命令模块   │
│  ├── 核心: add, switch, remove, list, current, edit  │
│  ├── 运维: export, import, backup, validate, clone   │
│  └── 工具: stats, health, batch, benchmark,          │
│           claude-clean, mcp                          │
├──────────────────────────────────────────────────────┤
│  ConfigManager          配置管理 (~/.akm-config.json) │
│  ├── 懒加载 & 缓存                                   │
│  ├── 版本迁移                                        │
│  └── 文件权限管理 (0600)                              │
├──────────────────────────────────────────────────────┤
│  IDE 启动器                                          │
│  ├── env-launcher.js    Claude Code（环境变量注入）    │
│  └── codex-launcher.js  Codex CLI（配置文件+环境变量） │
└──────────────────────────────────────────────────────┘
```

**切换原理：**

- **Claude Code** — 通过环境变量注入启动子进程，不修改配置文件，切换只在当前会话生效
- **Codex CLI** — 写入 `~/.codex/auth.json` 和 `config.toml`，切换后直接运行 `codex` 也能使用新配置

**环境变量映射：**

```
Claude Code:
  api_key    → ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL
  auth_token → ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL
  (可选)     → ANTHROPIC_MODEL, ANTHROPIC_SMALL_FAST_MODEL

Codex CLI:
  → OPENAI_API_KEY + OPENAI_BASE_URL
```

---

## 配置文件

位置：`~/.akm-config.json`

```json
{
  "version": "2.0.0",
  "currentProvider": "my-claude",
  "providers": {
    "my-claude": {
      "name": "my-claude",
      "displayName": "My Claude",
      "ideName": "claude",
      "authMode": "api_key",
      "authToken": "sk-ant-api03-xxx",
      "baseUrl": "https://api.anthropic.com",
      "launchArgs": ["--continue"],
      "models": {
        "primary": "claude-sonnet-4",
        "smallFast": "claude-haiku-4"
      },
      "createdAt": "2025-12-15T05:00:00.000Z",
      "lastUsed": "2025-12-15T05:30:00.000Z"
    }
  }
}
```

---

## 常见问题

### 切换 Codex 后提示 "Token data is not available"

`~/.codex/auth.json` 格式不正确。重新切换即可：

```bash
akm my-codex
```

akm 会把活跃认证切换为 `auth_mode = "apikey"`，并写入新的 `OPENAI_API_KEY`。
原 ChatGPT 登录态不会混入活跃认证文件，修改前内容会保存在 `~/.codex/akm-backups/`。
`auth.json` 与 `config.toml` 作为一组更新；任一文件写入失败时会自动恢复两者的原始内容。

### Claude Code 切换后环境变量不生效

`~/.claude/settings.json` 中可能存在冲突的环境变量。切换时 akm 会自动检测并提示处理。

### 找不到 claude/codex 命令

需要先安装对应的 CLI 工具：

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Codex CLI
npm install -g @openai/codex
```

### 配置文件权限问题

akm 会自动设置权限为 `0600`。手动修复：

```bash
chmod 600 ~/.akm-config.json
```

---

## 系统要求

- Node.js >= 20.0.0
- macOS / Linux / Windows

### 2.0 升级提示

- Node.js 最低版本由 14 提升到 20。
- 默认导出改为无密钥模板；完整备份必须显式使用 `--include-secrets`。
- 远程 API 地址必须使用 HTTPS，HTTP 仅允许 localhost 和回环地址。
- 导入配置不能携带跳过审批或沙盒的最高权限启动参数。

## 许可证

MIT License

## 链接

- [NPM](https://www.npmjs.com/package/@pikecode/api-key-manager)
- [GitHub](https://github.com/pikecode/api-key-manager)
- [Issues](https://github.com/pikecode/api-key-manager/issues)
