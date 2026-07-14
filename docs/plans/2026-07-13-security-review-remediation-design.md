# 安全复审修复设计

## 背景与目标

上一轮安全加固已经关闭 shell 注入、增加导入 Schema、默认脱敏导出并补齐 CI，但复审发现校验只存在于部分入口：状态检查仍可向远程 HTTP 地址发送 Token，Codex 认证文件保留 `chatgpt` 模式时会忽略新 API Key，导入配置还能携带跳过审批与沙盒的参数。此外，默认导出的掩码 Token 可被重新导入，带行尾注释的合法 TOML 也会绕过 AKM section 清理。本轮目标是在不重构整个配置系统的前提下，关闭这些发布阻断问题，并通过回归测试固化行为。

## 设计方案

采用发布前最小修复方案。`ProviderStatusChecker` 在读取缓存或创建客户端前校验 `baseUrl`，无效 URL 返回 `unknown` 且绝不发起请求。导入校验继续复用统一启动参数定义，但额外拒绝两个最高权限参数；交互式本地配置仍允许用户主动选择。默认导出把 `authToken` 置为 `null`，并写入 `secretsIncluded: false`；旧格式中的 `***` 掩码 Token 在导入时明确拒绝。Codex 切换写入最小 `{ auth_mode: "apikey", OPENAI_API_KEY }` 结构，原 ChatGPT 登录态依靠现有备份恢复。TOML 更新继续采用轻量行处理，但 section 和顶层键识别兼容行尾注释，并确保重复 AKM section 被统一替换。

## 失败处理与验证

所有输入问题在网络请求、备份和配置写入前失败。测试分别覆盖远程 HTTP 不触发 `fetch`、危险参数导入失败、无密钥导出可导入、旧掩码导入失败、ChatGPT 登录态切换为 API Key、带注释 TOML 的更新与清理。最后运行 ESLint、全量覆盖率测试、生产依赖审计和 npm 打包预检。版本提升为 `2.0.0`，发布脚本拆分 patch、minor、major，避免以后固定按 patch 或 major 递增。
