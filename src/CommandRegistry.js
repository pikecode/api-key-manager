class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.lazyCommands = new Map();
  }

  // 注册懒加载命令
  registerLazy(name, loader) {
    this.lazyCommands.set(name, loader);
  }

  // 获取命令（懒加载）
  async getCommand(name) {
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    if (this.lazyCommands.has(name)) {
      const loader = this.lazyCommands.get(name);
      const command = await loader();
      this.commands.set(name, command);
      return command;
    }

    throw new Error(`未知命令 '${name}'\n运行 'akm --help' 查看所有可用命令`);
  }

  // 执行命令
  async executeCommand(name, ...args) {
    const command = await this.getCommand(name);
    return await command(...args);
  }

  // 清理所有缓存的命令
  clear() {
    this.commands.clear();
  }
}

// 单例实例
const registry = new CommandRegistry();

// 注册所有懒加载命令
registry.registerLazy('switch', async () => {
  const { switchCommand } = require('./commands/switch');
  return switchCommand;
});

registry.registerLazy('add', async () => {
  const { addCommand } = require('./commands/add');
  return addCommand;
});

registry.registerLazy('remove', async () => {
  const { removeCommand } = require('./commands/remove');
  return removeCommand;
});

registry.registerLazy('list', async () => {
  const { listCommand } = require('./commands/list');
  return listCommand;
});

registry.registerLazy('current', async () => {
  const { currentCommand } = require('./commands/current');
  return currentCommand;
});

registry.registerLazy('edit', async () => {
  const { editCommand } = require('./commands/edit');
  return editCommand;
});

registry.registerLazy('export', async () => {
  const { exportCommand } = require('./commands/backup');
  return exportCommand;
});

registry.registerLazy('import', async () => {
  const { importCommand } = require('./commands/backup');
  return importCommand;
});

registry.registerLazy('backup', async () => {
  const { backupCommand } = require('./commands/backup');
  return backupCommand;
});

registry.registerLazy('validate', async () => {
  const { validateCommand } = require('./commands/validate');
  return validateCommand;
});

registry.registerLazy('stats', async () => {
  const { statsCommand } = require('./commands/stats');
  return statsCommand;
});

registry.registerLazy('health', async () => {
  const { healthCommand } = require('./commands/health');
  return healthCommand;
});

registry.registerLazy('batch', async () => {
  const { batchCommand } = require('./commands/batch');
  return batchCommand;
});

registry.registerLazy('benchmark', async () => {
  const { benchmarkCommand } = require('./commands/benchmark');
  return benchmarkCommand;
});

registry.registerLazy('clone', async () => {
  const { cloneCommand } = require('./commands/clone');
  return cloneCommand;
});

registry.registerLazy('claude-clean', async () => {
  const { claudeCleanCommand } = require('./commands/claude-clean');
  return claudeCleanCommand;
});

module.exports = { CommandRegistry, registry };