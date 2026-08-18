# Codex 官方/本地登录切换指南

## 新功能

现在支持在 **官方网页登录** 和 **本地 API Key** 两种 Codex 认证方式之间快速切换。

**最简单的用法：首次添加 Codex 配置时自动创建官方登录选项！**

## 快速开始

### 方式 1: 自动生成官方配置（推荐）

```bash
# 添加第一个 Codex 配置
akm add --codex

# 会自动为你创建两个选项：
# ✓ 你刚才添加的 API Key 配置
# ✓ 自动生成的 openai-official (官方网页登录)
```

### 方式 2: 直接使用官方登录

```bash
# 列出所有 Codex 配置
akm list --codex

# 输出示例：
# 🟢 [Codex] my-api-key (API Key Config) - 可用
# 🟢 [Codex] openai-official (OpenAI Official) 🌐 官方登录 - 可用

# 切换到官方登录
akm openai-official

# 或交互式选择
akm  # 然后选择 openai-official
```

## 使用场景详解

### 场景 1: 首次使用 Codex（最简单）

```bash
akm add --codex
# 选择认证方式 → API Key
# 输入 API Key 和 Base URL
# ✨ 自动创建官方配置完成！

# 现在你有两个选项：
akm list --codex
# 🟢 my-config (API Key)
# 🟢 openai-official 🌐 官方登录

# 随时切换
akm openai-official    # 使用官方网页登录
akm my-config          # 使用 API Key
```

### 场景 2: 添加第二个 Codex 配置

```bash
# 第一个 Codex 配置已存在，手动添加第二个
akm add --codex

# 这次不会自动创建官方配置（因为已存在）
# 你可以选择添加另一个 API Key 配置或手动添加官方登录
```

### 场景 3: 在官方和 API Key 间快速切换

```bash
# 方法 1: 直接命令
akm openai-official  # 使用官方网页登录
akm my-api-key       # 使用 API Key

# 方法 2: 交互式菜单
akm                   # 显示所有配置，选择切换

# 方法 3: 快速启动（使用上次参数）
akm openai-official -q
```

## 工作原理

### 官方网页登录 (chatgpt_login) 🌐

```
akm openai-official
  ↓
清理 ~/.codex/auth.json
清理 ~/.codex/config.toml 中的 AKM 配置
  ↓
启动 Codex
  ↓
Codex 检测到无认证信息
  ↓
Codex 打开浏览器: OpenAI 登录
  ↓
用户完成登录
  ↓
Codex 正常运行
```

**特点：**
- ✅ 无需管理 API Key
- ✅ 使用你的 OpenAI 账号
- ✅ Token 安全存储在 Codex 应用内
- ✅ 支持多账号（多个浏览器 Profile）

### API Key 模式 (api_key) 🔑

```
akm my-api-key
  ↓
写入 ~/.codex/auth.json (包含 API Key)
更新 ~/.codex/config.toml 提供者配置
  ↓
注入环境变量启动 Codex
  ↓
Codex 使用 API Key 连接
```

**特点：**
- ✅ 支持官方 OpenAI API
- ✅ 支持第三方代理（自定义 Base URL）
- ✅ 支持离线/内网环境
- ✅ 支持 API 配额管理

## 配置示例

### 自动生成的官方配置

```json
{
  "name": "openai-official",
  "displayName": "OpenAI Official",
  "ideName": "codex",
  "authMode": "chatgpt_login",
  "authToken": null,
  "baseUrl": null
}
```

### 手动添加的 API Key 配置

```json
{
  "name": "my-api-key",
  "displayName": "My API Key",
  "ideName": "codex",
  "authMode": "api_key",
  "authToken": "sk-xxxx...",
  "baseUrl": "https://api.openai.com/v1"
}
```

### 第三方代理配置

```json
{
  "name": "local-proxy",
  "displayName": "Local Proxy",
  "ideName": "codex",
  "authMode": "api_key",
  "authToken": "sk-xxxx...",
  "baseUrl": "http://localhost:8000/v1"
}
```

## 常见问题

### Q: 第一次添加 Codex 时没有看到官方配置？

A: 它应该会自动创建。检查一下：
```bash
akm list --codex
# 或
akm list --json | grep openai-official
```

如果没有，手动添加：
```bash
akm add --codex
# 选择名称: openai-official
# 选择认证: 官方网页登录
```

### Q: 官方登录需要输入 Token 吗？

A: 不需要。Codex 会打开浏览器让你登录。

### Q: 两种方式能同时使用吗？

A: 可以。添加多个配置，用 `akm` 命令随时切换。

### Q: API Key 会被保存到哪里？

```bash
~/.akm-config.json          # 配置文件（权限 0600）
~/.codex/auth.json          # Codex 认证文件（只在启动时写入）
~/.codex/config.toml        # Codex 配置文件
~/.codex/akm-backups/       # 自动备份目录
```

### Q: 如何从官方登录切换到 API Key？

```bash
akm edit my-api-key    # 编辑现有配置
# 或
akm add --codex        # 添加新的 API Key 配置
```

### Q: 删除官方配置会怎样？

```bash
akm remove openai-official

# 不影响 Codex 本身，只是删除 akm 中的配置记录
# 你可以随时重新添加
```

## 命令速查

```bash
# 核心命令
akm                              # 交互式选择 & 启动
akm openai-official              # 直接切换到官方登录
akm my-config                    # 直接切换到其他配置
akm my-config -q                 # 使用上次的启动参数快速启动

# 列表和编辑
akm list --codex                 # 列出所有 Codex 配置
akm list --codex --json          # JSON 格式输出
akm current                       # 显示当前激活配置
akm edit my-config               # 编辑配置
akm remove openai-official       # 删除配置

# 其他操作
akm export                        # 导出配置备份
akm import backup.json           # 导入备份
akm backup                        # 管理备份
akm validate                      # 验证 API 可用性
akm clone openai-official        # 克隆官方配置创建新的
```

## 最佳实践

✅ **推荐做法**
- 保留 `openai-official` 用于官方网页登录
- 为不同的 API Key 创建有意义的名称（如 `dev-key`、`prod-key`）
- 定期导出备份：`akm export backup.json`
- 在切换配置前查看列表：`akm list --codex`

❌ **避免做法**
- 不要删除 `openai-official`（可以随时重建）
- 不要在终端历史中留下 API Key（akm 使用环境变量）
- 不要手动编辑 `~/.codex/auth.json`（使用 akm 管理）


### 场景 1: 添加官方网页登录配置

```bash
akm add --codex
```

在提示中选择：
- 认证方式：**🌐 官方网页登录 - 使用 OpenAI 账号登录**
- 无需输入 Token

启动时会自动清理本地 API Key 配置，Codex 会打开浏览器让你登录 OpenAI。

### 场景 2: 添加本地 API Key 配置（官方或第三方）

```bash
akm add --codex
```

在提示中选择：
- 认证方式：**🔑 API Key - 使用 OpenAI API Key**
- 输入 Base URL（可选，默认官方）
- 输入 API Key

### 场景 3: 在两种方式之间切换

```bash
# 列出所有 Codex 配置
akm list --codex

# 交互式切换
akm

# 直接切换到指定配置
akm my-official-config    # 切换到官方登录
akm my-api-key-config     # 切换到 API Key
```

## 工作原理

### 官方网页登录模式 (chatgpt_login)

```
akm 启动 codex
  ↓
清理 ~/.codex/auth.json（删除 API Key 配置）
清理 ~/.codex/config.toml 中的 AKM 提供者配置
  ↓
启动 Codex
  ↓
Codex 检测到没有 auth.json
  ↓
Codex 打开浏览器提示用户登录 OpenAI
  ↓
用户完成登录
```

**优势：**
- 无需管理 API Key
- 自动使用你的 OpenAI 官方账号
- Token 安全存储在 Codex 应用内

### API Key 模式 (api_key)

```
akm 启动 codex
  ↓
写入 ~/.codex/auth.json（包含 API Key）
更新 ~/.codex/config.toml 中的提供者配置
  ↓
启动 Codex 时注入环境变量
  ↓
Codex 直接使用 API Key 连接
```

**优势：**
- 支持官方 OpenAI API
- 支持第三方 API 代理（自定义 Base URL）
- 支持离线或内部网络环境

## 配置示例

### 官方网页登录

```json
{
  "name": "official",
  "displayName": "OpenAI Official",
  "ideName": "codex",
  "authMode": "chatgpt_login",
  "authToken": null,
  "baseUrl": null
}
```

### 官方 API Key

```json
{
  "name": "api-key",
  "displayName": "OpenAI API Key",
  "ideName": "codex",
  "authMode": "api_key",
  "authToken": "sk-xxxx...",
  "baseUrl": "https://api.openai.com/v1"
}
```

### 第三方代理

```json
{
  "name": "proxy",
  "displayName": "Local Proxy",
  "ideName": "codex",
  "authMode": "api_key",
  "authToken": "sk-xxxx...",
  "baseUrl": "http://localhost:8000/v1"
}
```

## 常见问题

### Q: 如何从官方登录切换到 API Key？

```bash
akm edit official-config    # 改成 api_key 模式，添加 Token
# 或者添加新配置
akm add --codex
```

### Q: 官方登录需要输入 Token 吗？

不需要。Codex 会打开浏览器处理登录流程。

### Q: API Key 安全吗？

akm 将配置存储在 `~/.akm-config.json`（权限 0600），Token 在 Codex 启动时注入为环境变量，不持久化到 Codex 配置。

### Q: 能同时使用两种方式吗？

可以。添加多个 Codex 配置，然后用 `akm` 命令快速切换。

```bash
akm  # 交互选择官方或 API Key 配置
```

## 命令参考

```bash
# 查看 Codex 特定命令
akm --help | grep codex

# 列出所有 Codex 配置
akm list --codex

# 显示当前活跃配置
akm current

# 查看配置详情（完整 Token）
akm list --codex --json

# 编辑现有配置
akm edit my-config

# 删除配置
akm remove my-config
```

## 后续支持

所有 akm 命令都支持 Codex：
- `akm export` - 导出配置（默认不含 Token）
- `akm import` - 导入配置
- `akm backup` - 备份/恢复
- `akm validate` - 验证 API 可用性
- `akm clone` - 克隆现有配置

