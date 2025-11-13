# API Key Manager

一个简洁而强大的 CLI 工具，用于管理和快速切换多个 API 提供商配置。

## 功能特性

- ✨ **快速切换** - 一键切换不同的 API 提供商配置
- 🔐 **安全存储** - 本地安全存储 API 密钥
- 🌍 **多提供商支持** - 支持多个 API 提供商（Anthropic、OpenAI 等）
- 🎯 **灵活配置** - 支持多种认证模式（API Key、Auth Token、OAuth）
- 🚀 **开箱即用** - 无需复杂配置
- 💾 **环境变量管理** - 自动设置和管理环境变量

## 安装

```bash
npm install -g @pikecode/api-key-manager
```

## 快速开始

```bash
# 列出所有命令和选项
akm --help

# 添加新的 API 提供商配置
akm add

# 切换 API 提供商
akm

# 查看当前配置
akm current

# 列出所有配置
akm list
```

## 命令

| 命令 | 说明 |
|------|------|
| `akm` | 交互式选择和切换 API 提供商 |
| `akm add` | 添加新的 API 提供商配置 |
| `akm list` | 列出所有已保存的配置 |
| `akm current` | 显示当前激活的配置 |
| `akm edit <name>` | 编辑指定提供商的配置 |
| `akm remove <name>` | 删除指定的提供商配置 |

## 配置文件

配置文件位置：`~/.akm-config.json`

示例配置结构：
```json
{
  "version": "2.0.0",
  "currentProvider": "provider-name",
  "providers": {
    "provider-name": {
      "name": "provider-name",
      "displayName": "Provider Name",
      "authMode": "api_key",
      "authToken": "your-token",
      "tokenType": "api_key",
      "models": {
        "primary": "claude-sonnet-4",
        "smallFast": "claude-haiku-4"
      }
    }
  }
}
```

## 支持的认证模式

- **api_key** - 标准 API 密钥模式
- **auth_token** - 认证令牌模式
- **oauth_token** - OAuth 令牌模式

## 快捷键

- **ESC** - 返回上级菜单
- **方向键** - 导航菜单
- **Ctrl+C** - 退出程序

## 系统要求

- Node.js >= 14.0.0
- macOS / Linux / Windows

## 许可证

MIT

## 更多信息

- GitHub: https://github.com/pikecode/api-key-manager
- NPM: https://www.npmjs.com/package/@pikecode/api-key-manager
