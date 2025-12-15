# API Key Manager (akm)

一个强大的 CLI 工具，用于管理和快速切换 **Claude Code** 和 **Codex CLI** 的 API 配置。

[![npm version](https://img.shields.io/npm/v/@pikecode/api-key-manager.svg)](https://www.npmjs.com/package/@pikecode/api-key-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能特性

- 🎯 **双 IDE 支持** - 同时管理 Claude Code 和 Codex CLI 配置
- 🔄 **快速切换** - 一键切换不同的 API 提供商
- 🔐 **安全存储** - 本地加密存储 API 密钥
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
```

**显示内容：**
- ✅ 当前激活的供应商
- 🟢/🟡/🔴 API 可用性状态
- [Codex]/[Claude] IDE 类型标签
- 认证模式、环境变量、启动参数
- 创建时间、最后使用时间

#### `akm current`
显示当前激活的配置

```bash
akm current
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

**环境变量：**
- `CLAUDE_CODE_OAUTH_TOKEN` - OAuth 模式
- `ANTHROPIC_API_KEY` - API Key 模式
- `ANTHROPIC_AUTH_TOKEN` - Auth Token 模式
- `ANTHROPIC_BASE_URL` - 自定义 API 端点

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

### v1.0.27 (最新)
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
