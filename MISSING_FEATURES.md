# Codex 官方/本地登录 - 完善清单

## ✅ 已实现

### 1. 认证模式选择
- ✅ `akm add --codex` 时显示两个选项
  - 🔑 API Key 模式（本地配置）
  - 🌐 官方网页登录模式

### 2. 官方配置自动生成
- ✅ 第一次添加 Codex 时自动创建 `openai-official` 配置
- ✅ 防止重复创建
- ✅ 自动生成后的配置可直接使用

### 3. 环境变量管理
- ✅ `chatgpt_login` 模式不设置 OPENAI_API_KEY
- ✅ `api_key` 模式正确设置 API 密钥和 Base URL
- ✅ 清理旧文件（切换模式时）

### 4. 验证和安全
- ✅ Schema 验证（authMode 枚举包含 chatgpt_login）
- ✅ 错误处理（clearCodexAkmConfig 异常捕获）
- ✅ 文件原子操作（备份+写入+校验）
- ✅ 权限设置（0600）

### 5. 测试覆盖
- ✅ 511 个测试通过
- ✅ clearCodexAkmConfig 函数测试
- ✅ chatgpt_login 模式测试
- ✅ 向后兼容性测试

## 📋 建议改进

### 高优先级

1. **可视化标记改进**
   - 当前：`akm list --codex` 中 `🌐 官方登录` 出现在描述中
   - 建议：在配置名称前或后加标记，更容易识别
   - 文件：`src/commands/switch/provider-choices-helper.js`

2. **编辑模式切换**
   - 当前：`akm edit` 时可以改 authMode
   - 建议：验证从 api_key → chatgpt_login 时自动清理文件
   - 文件：`src/commands/switch/provider-manager.js`

3. **迁移指导**
   - 当前：用户可以手动切换
   - 建议：提供 `akm migrate` 或升级检查
   - 文件：需新增

### 中优先级

4. **快速切换快捷方式**
   - 当前：`akm openai-official` 可以切换
   - 建议：记住最后两个配置，提供 `akm switch -p` 快速切换
   - 文件：`src/commands/switch.js`

5. **导出/导入优化**
   - 当前：导出时包含 auth.json 路径
   - 建议：为 chatgpt_login 模式导出脱敏配置
   - 文件：`src/commands/backup.js`

### 低优先级

6. **健康检查**
   - 当前：无
   - 建议：`akm health` 检查官方配置是否有效
   - 文件：`src/commands/health.js`

7. **文档**
   - ✅ CODEX_LOGIN_GUIDE.md - 已提供
   - ✅ IMPLEMENTATION_SUMMARY.md - 已提供
   - 建议：集成到 README.md 主文档

## 🔍 测试建议

```bash
# 测试完整流程
akm add --codex
# 选择 🌐 官方网页登录
# 验证：openai-official 自动创建

# 切换模式
akm switch           # 列表中应显示两个 Codex 配置
akm switch openai-official   # 快速切换到官方
akm switch my-api-key        # 切换回本地

# 编辑模式
akm edit my-api-key
# 改 authMode 为 chatgpt_login
# 验证：auth.json 被清理

# 导出/导入
akm backup export.json
akm import export.json
```

## 📌 已知限制

1. **Token 刷新**：官方登录不支持自动刷新
2. **多账户**：每个配置只能一个账户
3. **代理支持**：官方登录不支持自定义代理

## 总结

**核心功能 100% 完成并经过测试**。建议改进主要关于 UX 优化和边界情况处理，不影响核心功能使用。

