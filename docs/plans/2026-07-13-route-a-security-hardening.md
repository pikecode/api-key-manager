# 路线 A 安全加固实施计划

> **执行要求：** 按测试先行方式逐项实施，每项完成后运行对应测试，最终执行完整质量检查。

**目标：** 消除配置导入到子进程启动的命令注入链路，保护导出密钥，修复 Codex 配置切换和覆盖风险，并建立可重复发布基线。

**架构：** 保持现有 Node.js 模块化单体结构，不引入服务拆分。新增独立的导入 Schema 校验边界和启动参数校验函数；备份、Codex 配置和启动器仍通过现有命令层调用，避免扩大改动范围。

**技术栈：** Node.js 20+、CommonJS、Ajv JSON Schema、Jest、ESLint、GitHub Actions。

---

### 任务 1：导入配置与启动参数防护

**文件：**

- 新增：`src/utils/import-validator.js`
- 修改：`src/utils/validator.js`
- 修改：`src/commands/backup.js`
- 修改：`src/utils/env-launcher.js`
- 修改：`src/utils/codex-launcher.js`
- 新增：`tests/import-validator.test.js`
- 修改：`tests/env-launcher.test.js`
- 修改：`tests/codex-launcher.test.js`

**步骤：**

1. 编写恶意 `launchArgs`、危险属性名、错误字段类型和不安全 URL 的失败测试。
2. 运行定向测试，确认当前实现未拒绝这些输入。
3. 使用 Ajv 校验导出对象和供应商字段，并按 IDE 对参数做白名单验证。
4. 在两个启动器中再次校验参数，并将 `shell` 固定为 `false`。
5. 清理与当前认证模式冲突的父进程环境变量。
6. 运行 `npx jest tests/import-validator.test.js tests/env-launcher.test.js tests/codex-launcher.test.js --runInBand`，预期全部通过。

### 任务 2：安全导出

**文件：**

- 修改：`src/commands/backup.js`
- 修改：`bin/akm.js`
- 修改：`README.md`
- 重写：`tests/backup.test.js`

**步骤：**

1. 编写调用生产代码的测试，断言默认脱敏、显式完整导出以及 Unix `0600` 权限。
2. 运行 `npx jest tests/backup.test.js --runInBand`，确认测试先失败。
3. 将默认行为改为脱敏，新增 `--include-secrets`，保留 `--mask` 兼容入口。
4. 写文件时设置权限并在 Unix 上再次执行 `chmod 0600`。
5. 更新 README 的分享和安全说明，并运行定向测试。

### 任务 3：Codex 配置安全切换

**文件：**

- 修改：`src/utils/codex-files.js`
- 修改：`tests/codex-files.test.js`

**步骤：**

1. 编写“代理切回官方”“保留 auth.json 其他字段”“写前自动备份”的失败测试。
2. 新增仅清理 AKM 管理 provider 的函数，保留用户自定义 provider。
3. 写入 API Key 时合并现有认证 JSON；现有文件损坏时安全失败，不覆盖原内容。
4. 修改前调用备份函数，设置备份目录和文件的最小权限，并限制保留数量。
5. 运行 `npx jest tests/codex-files.test.js --runInBand`，预期全部通过。

### 任务 4：运行时和发布基线

**文件：**

- 修改：`package.json`
- 修改：`.gitignore`
- 新增：`.nvmrc`
- 新增：`.github/workflows/ci.yml`
- 纳入版本管理：`package-lock.json`
- 修改：`README.md`

**步骤：**

1. 将 Node.js 声明提升为 `>=20.0.0`，`.nvmrc` 使用 Node.js 22。
2. 提交锁文件所需配置，新增 `verify` 和 `test:coverage` 脚本。
3. CI 在 Node.js 20/22 上执行 `npm ci`、Lint 和测试。
4. 发布前执行 `verify`，防止仅测试通过但 Lint 失败的版本发布。

### 任务 5：完整验证

**步骤：**

1. 运行 `npm test -- --runInBand`，预期全部测试通过。
2. 运行 `npm run test:coverage -- --runInBand`，检查安全关键模块覆盖率。
3. 运行 `npm run lint -- --max-warnings=0`，预期 0 错误、0 告警。
4. 运行 `npm audit`，确认无已知依赖漏洞。
5. 运行 `CC_NO_UPDATE_CHECK=1 node bin/akm.js --help`，确认 CLI 参数与文档一致。
6. 检查 `git status` 和差异，确保没有测试临时文件或无关改动。

### 工程原则

- **KISS：** 保持单体 CLI，仅新增安全边界模块，不引入框架或服务拆分。
- **YAGNI：** 本轮不实现 OS 密钥库、加密保险库和全面存储层重构。
- **SOLID：** 将导入校验从备份命令中分离，减少命令层职责。
- **DRY：** 启动参数集合和 Token 脱敏逻辑统一复用，测试直接覆盖生产实现。
