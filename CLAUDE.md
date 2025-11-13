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
