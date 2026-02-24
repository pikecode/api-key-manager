# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

API Key Manager is a CLI tool for managing and switching multiple API provider configurations.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Run tests
npm test

# Release new version (runs tests automatically)
npm run release
```

## Architecture

### Command System

- `src/CommandRegistry.js` - Lazy loads and manages all commands
- `src/commands/BaseCommand.js` - Base class for all commands (ESC handling, error handling)
- `src/commands/` - Individual command implementations

### Configuration Management

- `src/config.js` - ConfigManager class handles all provider configurations
- Config location: `~/.akm-config.json`
- Lazy loading and caching mechanism
- Automatic migration support

### Project Structure

```
src/
├── commands/           # CLI command implementations
├── utils/              # Utility modules
├── navigation/         # Navigation and keyboard handling
├── config.js           # Configuration management
├── CommandRegistry.js  # Command registry
└── index.js            # Entry point

tests/                  # Test files
bin/                    # Executable scripts
```

## Key Design Principles

1. All commands inherit from `BaseCommand` and call `super()`
2. Commands are lazily loaded via `CommandRegistry.executeCommand()`
3. Avoid circular dependencies by using registry pattern
4. Configuration is lazy-loaded and cached
5. ESC key handling is centralized in `BaseCommand`

## Testing

```bash
npm test
```

Tests are located in the `tests/` directory using Jest.

## Publishing to npm

### Package Info

- Package name: `@pikecode/api-key-manager` (scoped, must use `--access public`)
- Registry: https://registry.npmjs.org/
- npm account: `pikecode`

### One-time Setup (new machine)

npm 强制要求发布时使用带有 "Bypass 2FA" 权限的 Granular Access Token：

1. 访问 https://www.npmjs.com/settings/pikecode/tokens
2. 点击 "Generate New Token" → 选择 "Granular Access Token"
3. 填写：
   - Packages and scopes: Read and write access to all packages
   - **Security settings: 勾选 "Bypass two-factor authentication (2FA)"**
4. 复制生成的 token（`npm_` 开头）
5. 设置到本地：
   ```bash
   npm config set //registry.npmjs.org/:_authToken <your-token>
   ```

### Release Flow

```bash
# 自动：升版本号 + 运行测试 + 发布
npm run release

# 手动：指定版本类型
npm version minor  # 或 major / patch
npm publish --access public
```

### 注意事项

- git 标签与版本号必须对应，若遇到 `tag already exists` 错误，手动设置版本跳过冲突：
  ```bash
  npm version <比现有最大标签更高的版本号>
  npm publish --access public
  ```
- 包名 `api-key-manager`（非 scoped）与 npm 已有包 `apikey-manager` 冲突，**不可使用**
