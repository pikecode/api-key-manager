# 配置可靠性增量治理实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 在保持本地 Token 完整显示的前提下，统一配置校验、原子写入、备份恢复、状态缓存和批量并发边界。

**架构：** 扩展现有 Ajv 校验模块供导入与本地配置复用；新增无状态原子文件和并发映射工具；命令层继续通过现有 ConfigManager 与状态检查器调用，不引入新框架。

**技术栈：** Node.js 20+、CommonJS、Ajv、fs-extra、Jest 30、ESLint、Prettier。

---

### 任务 1：统一 Token 完整显示

**文件：**

- 修改：`src/commands/list.js`
- 修改：`src/commands/current.js`
- 修改：`bin/akm.js`
- 修改：`README.md`
- 新增：`tests/token-display.test.js`

1. 编写 `list` 和 `current` 缺省选项仍输出完整 Token 的测试。
2. 运行定向测试，确认当前行为并固化用户偏好。
3. 移除误导性的默认脱敏文案与冗余分支，保留 `--show-token` 作为兼容参数。
4. 重跑定向测试。

### 任务 2：共享配置校验

**文件：**

- 修改：`src/utils/import-validator.js`
- 修改：`src/config.js`
- 修改：`tests/import-validator.test.js`
- 修改：`tests/config.test.js`

1. 编写本地配置字段类型错误、危险 URL、控制字符和无效 currentProvider 的失败测试。
2. 增加本地配置 Schema 与 `validateAndNormalizeConfigData`，复用供应商标准化逻辑。
3. ConfigManager 加载和保存前统一校验；无效对象保持原文件并返回明确错误。
4. 运行配置与导入定向测试。

### 任务 3：原子文件写入

**文件：**

- 新增：`src/utils/atomic-file.js`
- 新增：`tests/atomic-file.test.js`
- 修改：`src/config.js`
- 修改：`src/commands/backup.js`
- 修改：`src/utils/codex-files.js`
- 修改：`src/utils/claude-settings.js`

1. 编写成功替换、权限为 `0600`、序列化失败不覆盖旧文件和临时文件清理测试。
2. 实现同目录临时写入、`fsync`、关闭、原子 `rename` 与失败清理。
3. 将敏感 JSON/TOML 写入替换为共享工具。
4. 运行原子写入和相关配置测试。

### 任务 4：导入、备份与恢复边界

**文件：**

- 修改：`src/commands/backup.js`
- 修改：`src/utils/import-validator.js`
- 修改：`tests/backup.test.js`
- 修改：`tests/import-validator.test.js`

1. 编写超 5 MB 文件、超过 200 个供应商、无效恢复文件和同秒双备份测试。
2. 读取 JSON 前检查文件大小；Schema 增加供应商数量上限。
3. 备份名称加入毫秒、PID 和序列号，并禁止覆盖。
4. 恢复改为校验后调用 ConfigManager 保存，刷新内存状态。

### 任务 5：状态缓存与并发控制

**文件：**

- 新增：`src/utils/concurrency.js`
- 新增：`tests/concurrency.test.js`
- 修改：`src/utils/provider-status-checker.js`
- 修改：`src/commands/health.js`
- 修改：`tests/provider-status-checker.test.js`

1. 编写 Token/模型变化触发新请求，以及最大并发不超过配置值的测试。
2. 实现保持结果顺序的固定 worker pool。
3. 缓存键加入非明文 Token 指纹、IDE 和模型；批量检查默认并发设为 4。
4. Health 批量任务复用并发工具并重跑测试。

### 任务 6：终端文本安全

**文件：**

- 修改：`src/utils/terminal-format.js`
- 修改：`src/utils/import-validator.js`
- 修改：`tests/terminal-format.test.js`
- 修改：`tests/import-validator.test.js`

1. 编写 ANSI、C0/C1 和双向控制字符转义测试。
2. 实现 `escapeTerminalText`，错误信息插值前统一处理不可信名称。
3. 运行终端格式与导入测试。

### 任务 7：完整验证

1. 运行 `npm run verify`，预期全部测试与关键覆盖率门槛通过。
2. 运行本轮文件 `prettier --check` 和 `git diff --check`。
3. 运行 `npm audit --omit=dev`，预期 0 个生产依赖漏洞。
4. 运行 `npm pack --dry-run --json`，确认 `2.0.0` 包内容完整。
