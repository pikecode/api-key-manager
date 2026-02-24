#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { main } = require('../src/index');
const { registry } = require('../src/CommandRegistry');
const pkg = require('../package.json');
const { checkForUpdates } = require('../src/utils/update-checker');

// Set up CLI
program
  .name('akm')
  .description('API密钥管理工具 - Manage and switch multiple API provider configurations')
  .version(pkg.version, '-V, --version', '显示版本号');

// Check for updates before any command runs
program.hook('preAction', async () => {
  await checkForUpdates({ packageName: pkg.name, currentVersion: pkg.version });
});

// Default command - show provider selection
program
  .argument('[provider]', '直接切换到指定供应商')
  .option('-q, --quick', '快速启动（使用默认或上次的启动参数）')
  .option('--no-args', '以空参数启动（不使用任何启动参数）')
  .action(async (provider, options) => {
    try {
      await main(provider, options);
    } catch (error) {
      console.error(chalk.red('❌ 执行失败:'), error.message);
      process.exit(1);
    }
  });

// Add command
program
  .command('add')
  .description('添加新的API密钥配置')
  .option('--codex', '直接添加 Codex CLI 供应商')
  .option('--claude', '直接添加 Claude Code 供应商')
  .action(async (options) => {
    try {
      const ideName = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      await registry.executeCommand('add', { ideName });
    } catch (error) {
      console.error(chalk.red('❌ 添加失败:'), error.message);
      process.exit(1);
    }
  });

// Switch command
program
  .command('switch')
  .description('切换到指定供应商')
  .argument('[provider]', '直接切换到指定供应商')
  .option('--codex', '仅显示 Codex CLI 供应商')
  .option('--claude', '仅显示 Claude Code 供应商')
  .option('-q, --quick', '快速启动（使用默认或上次的启动参数）')
  .option('--no-args', '以空参数启动（不使用任何启动参数）')
  .action(async (provider, options) => {
    try {
      const filter = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      await registry.executeCommand('switch', provider, {
        filter,
        quick: options.quick,
        noArgs: options.noArgs
      });
    } catch (error) {
      console.error(chalk.red('❌ 切换失败:'), error.message);
      process.exit(1);
    }
  });

// Remove command
program
  .command('remove')
  .argument('[provider]', '要删除的供应商名称')
  .description('删除API密钥配置')
  .action(async (provider) => {
    try {
      await registry.executeCommand('remove', provider);
    } catch (error) {
      console.error(chalk.red('❌ 删除失败:'), error.message);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('列出所有API密钥配置')
  .option('--codex', '仅显示 Codex CLI 供应商')
  .option('--claude', '仅显示 Claude Code 供应商')
  .option('--show-token', '显示完整 Token（默认脱敏）')
  .action(async (options) => {
    try {
      const filter = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      await registry.executeCommand('list', filter, { showToken: options.showToken });
    } catch (error) {
      console.error(chalk.red('❌ 列表失败:'), error.message);
      process.exit(1);
    }
  });

// Current command
program
  .command('current')
  .description('显示当前活跃的配置')
  .option('--show-token', '显示完整 Token（默认脱敏）')
  .action(async (options) => {
    try {
      await registry.executeCommand('current', { showToken: options.showToken });
    } catch (error) {
      console.error(chalk.red('❌ 获取当前配置失败:'), error.message);
      process.exit(1);
    }
  });

// Edit command
program
  .command('edit')
  .argument('[provider]', '要编辑的供应商名称')
  .description('编辑API密钥配置')
  .action(async (provider) => {
    try {
      await registry.executeCommand('edit', provider);
    } catch (error) {
      console.error(chalk.red('❌ 编辑失败:'), error.message);
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .argument('[file]', '导出文件路径 (默认: akm-config-{timestamp}.json)')
  .description('导出配置到文件')
  .option('--mask', '脱敏 Token (导入后需重新设置)')
  .action(async (file, options) => {
    try {
      await registry.executeCommand('export', file, options);
    } catch (error) {
      console.error(chalk.red('❌ 导出失败:'), error.message);
      process.exit(1);
    }
  });

// Import command
program
  .command('import')
  .argument('<file>', '要导入的配置文件路径')
  .description('从文件导入配置')
  .option('--overwrite', '覆盖已存在的供应商')
  .action(async (file, options) => {
    try {
      await registry.executeCommand('import', file, options);
    } catch (error) {
      console.error(chalk.red('❌ 导入失败:'), error.message);
      process.exit(1);
    }
  });

// Backup command
program
  .command('backup')
  .description('备份和恢复配置')
  .option('-l, --list', '列出所有备份')
  .option('-r, --restore <file>', '从备份恢复')
  .option('-d, --dir <path>', '指定备份目录')
  .action(async (options) => {
    try {
      await registry.executeCommand('backup', options);
    } catch (error) {
      console.error(chalk.red('❌ 备份操作失败:'), error.message);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('验证供应商配置的有效性')
  .argument('[provider]', '要验证的供应商名称（不指定则验证全部）')
  .option('--codex', '仅验证 Codex CLI 供应商')
  .option('--claude', '仅验证 Claude Code 供应商')
  .action(async (provider, options) => {
    try {
      const filter = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      await registry.executeCommand('validate', provider, { filter });
    } catch (error) {
      console.error(chalk.red('❌ 验证失败:'), error.message);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('显示供应商使用统计')
  .argument('[provider]', '要查看统计的供应商名称（不指定则显示全部）')
  .option('--codex', '仅显示 Codex CLI 供应商')
  .option('--claude', '仅显示 Claude Code 供应商')
  .option('-r, --recommend', '显示智能推荐')
  .option('-s, --sort <type>', '排序方式: usage(使用次数), time(最近使用), name(名称)', 'usage')
  .option('-l, --limit <number>', '推荐列表数量限制', '5')
  .action(async (provider, options) => {
    try {
      const filter = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      const limit = parseInt(options.limit, 10);
      await registry.executeCommand('stats', provider, {
        filter,
        recommend: options.recommend,
        sort: options.sort,
        limit
      });
    } catch (error) {
      console.error(chalk.red('❌ 统计失败:'), error.message);
      process.exit(1);
    }
  });

// Health command
program
  .command('health')
  .description('检查供应商配置健康状态')
  .argument('[provider]', '要检查的供应商名称（不指定则检查全部）')
  .option('--codex', '仅检查 Codex CLI 供应商')
  .option('--claude', '仅检查 Claude Code 供应商')
  .option('--no-connectivity', '跳过 API 连接性检查（加快速度）')
  .action(async (provider, options) => {
    try {
      const filter = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      await registry.executeCommand('health', provider, {
        filter,
        connectivity: options.connectivity
      });
    } catch (error) {
      console.error(chalk.red('❌ 健康检查失败:'), error.message);
      process.exit(1);
    }
  });

// Batch command
program
  .command('batch <operation>')
  .description('批量操作供应商 (operations: update, delete)')
  .option('--codex', '仅操作 Codex CLI 供应商')
  .option('--claude', '仅操作 Claude Code 供应商')
  .option('--unused', '仅操作长期未使用的供应商 (90天以上)')
  .action(async (operation, options) => {
    try {
      const filter = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      await registry.executeCommand('batch', operation, {
        filter,
        unused: options.unused
      });
    } catch (error) {
      console.error(chalk.red('❌ 批量操作失败:'), error.message);
      process.exit(1);
    }
  });

// Benchmark command
program
  .command('benchmark')
  .description('供应商性能测试和对比')
  .option('--codex', '仅测试 Codex CLI 供应商')
  .option('--claude', '仅测试 Claude Code 供应商')
  .option('-r, --rounds <number>', '每个供应商测试轮数', '3')
  .option('-p, --parallel', '并行测试（更快但可能不准确）')
  .option('--report [file]', '生成 Markdown 测试报告')
  .action(async (options) => {
    try {
      const filter = options.codex ? 'codex' : (options.claude ? 'claude' : null);
      const rounds = parseInt(options.rounds, 10);
      await registry.executeCommand('benchmark', {
        filter,
        rounds,
        parallel: options.parallel,
        report: options.report
      });
    } catch (error) {
      console.error(chalk.red('❌ 性能测试失败:'), error.message);
      process.exit(1);
    }
  });

// Clone command
program
  .command('clone')
  .argument('[source]', '要克隆的源供应商名称')
  .description('克隆现有供应商配置')
  .action(async (source) => {
    try {
      await registry.executeCommand('clone', source);
    } catch (error) {
      console.error(chalk.red('❌ 克隆失败:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
