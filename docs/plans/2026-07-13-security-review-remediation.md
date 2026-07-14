# 安全复审修复实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 修复安全复审确认的网络、认证、导入导出和 Codex TOML 兼容问题，并建立正确的 major 发布基线。

**架构：** 保持现有 Node.js CommonJS CLI 架构，在现有 `validator`、`launch-args`、`import-validator` 和 `codex-files` 边界增量加固。所有不可信输入必须在网络访问或文件写入前失败，避免引入新的框架或配置系统。

**技术栈：** Node.js 20+、CommonJS、Ajv、Jest 30、ESLint、fs-extra。

---

### 任务 1：状态检查 URL 边界

**文件：**
- 修改：`src/utils/provider-status-checker.js`
- 修改：`tests/provider-status-checker.test.js`

1. 新增远程 HTTP Codex/Claude 配置不会调用网络客户端的失败测试。
2. 运行 `npx jest tests/provider-status-checker.test.js --runInBand`，确认测试先失败。
3. 在缓存和 IDE 分支前复用 `validator.validateUrl(provider.baseUrl, false)`，无效时返回 `unknown`。
4. 再次运行定向测试，确认通过。

### 任务 2：导入参数与 Token 语义

**文件：**
- 修改：`src/utils/launch-args.js`
- 修改：`src/utils/import-validator.js`
- 修改：`src/commands/backup.js`
- 修改：`tests/import-validator.test.js`
- 修改：`tests/backup.test.js`

1. 新增导入最高权限参数、旧掩码 Token 失败，以及无密钥导出可安全导入的测试。
2. 运行 `npx jest tests/import-validator.test.js tests/backup.test.js --runInBand`，确认新增测试失败。
3. 新增导入专用危险参数断言；识别 `***` 掩码；Schema 支持 `secretsIncluded`。
4. 默认导出把 Token 设为 `null`，完整导出写入 `secretsIncluded: true`。
5. 重跑定向测试，确认通过。

### 任务 3：Codex API Key 认证模式

**文件：**
- 修改：`src/utils/codex-files.js`
- 修改：`tests/codex-files.test.js`

1. 将“保留 chatgpt 字段”测试改为“备份旧登录态、活跃文件使用最小 API Key 结构”。
2. 运行 `npx jest tests/codex-files.test.js --runInBand`，确认测试失败。
3. 让 `buildAuthJson` 只输出 `auth_mode: "apikey"` 和新 API Key。
4. 重跑定向测试，确认通过。

### 任务 4：TOML 行尾注释兼容

**文件：**
- 修改：`src/utils/codex-files.js`
- 修改：`tests/codex-files.test.js`

1. 新增带行尾注释的 `model_provider` 与 `[model_providers.akm]` 更新、清理测试。
2. 运行定向测试确认失败。
3. 使用行级 section 识别和替换，兼容空白与 `#` 注释，并移除重复 AKM section。
4. 重跑定向测试确认通过。

### 任务 5：版本与文档

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json`
- 修改：`README.md`

1. 将版本提升到 `2.0.0`。
2. 将发布命令拆成 `release:patch`、`release:minor`、`release:major`，通用 `release` 只发布已选择的版本。
3. 更新导出无密钥、Codex API Key 登录态和 Node.js 20 的迁移说明。

### 任务 6：完整验证

1. 运行 `npm run verify`，预期 41 个以上测试套件全部通过且安全模块达到覆盖率门槛。
2. 运行 `npm audit --omit=dev`，预期 0 个生产依赖漏洞。
3. 运行 `npm pack --dry-run --json`，确认 `2.0.0` 包内容完整。
4. 运行 `git diff --check`，确认没有空白错误。
