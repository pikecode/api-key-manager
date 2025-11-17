# 故障排除指南

如果你遇到问题，比如"akm list 没有列出 Codex 的配置"，本指南可以帮助你诊断和解决。

## 常见问题

### 问题 1：akm list 不显示已添加的配置

#### 症状
```bash
$ akm list
暂无配置的供应商
请使用 "akm add" 添加供应商配置
```

但你明明已经添加过配置！

#### 诊断步骤

**步骤 1：检查配置文件是否存在**

```bash
ls -la ~/.akm-config.json
```

预期输出：
```
-rw-r--r-- 1 user staff 1234 Nov 17 10:00 ~/.akm-config.json
```

**步骤 2：检查配置文件内容**

```bash
cat ~/.akm-config.json
```

应该看到类似的 JSON 结构：
```json
{
  "version": "1.0.0",
  "currentProvider": "my-codex",
  "providers": {
    "my-codex": {
      "name": "my-codex",
      "displayName": "My Codex",
      "ideName": "codex",
      ...
    }
  }
}
```

**步骤 3：验证 providers 对象**

```bash
cat ~/.akm-config.json | jq '.providers | keys'
```

应该输出你添加的供应商名称：
```json
[
  "my-codex",
  "my-claude"
]
```

#### 常见原因和解决方案

##### 原因 A：配置文件为空或损坏

```bash
# 检查文件大小
wc -c ~/.akm-config.json

# 如果为 0 或很小，说明文件损坏
# 解决：备份后重新添加
cp ~/.akm-config.json ~/.akm-config.json.bak
rm ~/.akm-config.json
akm add
```

##### 原因 B：providers 对象为空

```bash
# 检查
cat ~/.akm-config.json | jq '.providers'

# 应该显示：
# {
#   "my-codex": { ... }
# }

# 如果显示 {} 或 null，说明没有保存成功
# 解决：重新添加配置
akm add
```

##### 原因 C：权限问题

```bash
# 检查权限
ls -la ~/.akm-config.json

# 应该是可读写的
# -rw-r--r-- 或 -rw-r--rw-

# 如果没有读写权限，修复：
chmod 644 ~/.akm-config.json
```

### 问题 2：akm list 显示配置，但不显示 Codex 标识

#### 症状

```bash
$ akm list
🔹 my-codex (My Codex) - 已配置 OpenAI API Key
   认证模式: api_key
   Token: sk-...
```

但看不到 `[⚙️ Codex]` 标识

#### 原因

这是 v1.0.13 之前的版本。IDE 类型标识是在 v1.0.13 中添加的。

#### 解决

升级到最新版本：
```bash
npm install -g @pikecode/api-key-manager@latest
```

然后再次运行：
```bash
akm list
```

应该看到：
```
🔹 my-codex (My Codex) [⚙️ Codex] - 已配置 OpenAI API Key
```

### 问题 3：添加配置时出错

#### 症状

```bash
$ akm add
[错误] 添加供应商失败: ...
```

#### 常见错误和解决方案

##### 错误：供应商名称已存在

```
[错误] 供应商 'my-codex' 已存在，是否覆盖? (y/N)
```

**解决**：
- 选择 `y` 覆盖，或
- 选择 `n` 并使用不同的名称

##### 错误：无效的 Token 格式

```
[错误] 验证失败: Token 不能为空
```

**解决**：
- 确保复制了完整的 Token
- Token 应该以 `sk-` 开头（对于 OpenAI API Key）
- 不要包含空格或换行符

##### 错误：配置文件权限问题

```
[错误] 保存配置失败: Permission denied
```

**解决**：
```bash
# 修复权限
chmod 644 ~/.akm-config.json

# 或者删除并重建
rm ~/.akm-config.json
akm add
```

### 问题 4：启动时找不到供应商

#### 症状

```bash
$ akm my-codex
[错误] 供应商 'my-codex' 不存在
```

但 `akm list` 显示有这个供应商！

#### 原因

配置文件在启动时被修改或删除。

#### 诊断

```bash
# 立即检查配置文件
cat ~/.akm-config.json | jq '.providers.["my-codex"]'
```

#### 解决

1. **如果返回 null**：
   ```bash
   # 配置已被删除，重新添加
   akm add
   ```

2. **如果返回配置信息**：
   ```bash
   # 检查 ideName 是否正确
   cat ~/.akm-config.json | jq '.providers.["my-codex"].ideName'
   # 应该输出: "codex"

   # 如果是 null，需要编辑配置
   akm edit my-codex
   ```

### 问题 5：Claude Code 启动时的环境变量问题

#### 症状

```bash
$ akm my-claude
启动 🚀 Claude Code...
[错误] 认证失败: Invalid API Key
```

#### 原因

1. API Key 无效或过期
2. 使用了错误的 Token 类型
3. baseUrl 不正确

#### 诊断

```bash
# 检查配置
akm current

# 验证 Token 是否有效（对于 OpenAI API Key）
curl -H "Authorization: Bearer YOUR-TOKEN" https://api.openai.com/v1/models
```

#### 解决

```bash
# 编辑配置
akm edit my-claude

# 检查以下内容：
# 1. authMode 是否正确 (oauth_token, api_key, auth_token)
# 2. authToken 是否有效
# 3. baseUrl 是否正确（如果是自定义 API）
# 4. tokenType 是否正确（如果 authMode 是 api_key）
```

## 快速诊断脚本

```bash
#!/bin/bash

echo "=== API Key Manager 诊断 ==="
echo

# 检查安装
echo "✓ 检查安装..."
which akm || echo "✗ akm 未安装"
akm --version
echo

# 检查配置文件
echo "✓ 检查配置文件..."
if [ -f ~/.akm-config.json ]; then
    echo "  文件存在: ~/.akm-config.json"
    echo "  文件大小: $(wc -c < ~/.akm-config.json) 字节"
    echo "  供应商数量: $(cat ~/.akm-config.json | jq '.providers | length')"
else
    echo "  ✗ 配置文件不存在"
fi
echo

# 列出配置
echo "✓ 已保存的配置:"
akm list || echo "  ✗ 无法读取配置"
echo

# 检查 Claude Code
echo "✓ 检查 Claude Code..."
which claude && echo "  🚀 Claude Code: $(claude --version 2>/dev/null || echo 'version unknown')" || echo "  ✗ Claude Code 未安装"
echo

echo "=== 诊断完成 ==="
```

将上述脚本保存为 `diagnose.sh`，然后运行：
```bash
bash diagnose.sh
```

## 数据恢复

如果你的配置文件损坏或丢失，这里是恢复步骤：

### 步骤 1：寻找备份

```bash
# 查找自动备份（如果有）
find ~ -name ".akm-config*.bak" -o -name ".akm-config*.backup"

# 如果找到备份，恢复它
cp ~/.akm-config.json.bak ~/.akm-config.json
```

### 步骤 2：手动重建

如果没有备份，记住配置信息后重新添加：

```bash
# 删除损坏的文件
rm ~/.akm-config.json

# 重新添加配置
akm add

# 按照提示一步步填写
```

### 步骤 3：验证

```bash
# 检查新配置
akm list

# 测试启动
akm <provider-name>
```

## 获取帮助

如果以上都无法解决，请提供以下信息：

1. **操作系统**：
   ```bash
   uname -a
   ```

2. **Node.js 版本**：
   ```bash
   node --version
   npm --version
   ```

3. **API Key Manager 版本**：
   ```bash
   akm --version
   ```

4. **已安装的 Claude Code**：
   ```bash
   which claude
   ```

5. **配置信息**（去掉敏感信息）：
   ```bash
   cat ~/.akm-config.json | jq '.providers | keys'
   ```

6. **错误日志**：复制完整的错误信息

## 相关文档

- [README.md](./README.md)
