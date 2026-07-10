/**
 * Batch Operations Command
 * 批量操作功能
 * @module commands/batch
 */

const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const inquirer = require('inquirer');

/**
 * 批量更新供应商配置
 * @param {Object} options - 选项
 */
async function batchUpdate(options = {}) {
  try {
    await configManager.ensureLoaded();
    let providers = configManager.listProviders();

    // 应用过滤器
    if (options.filter === 'codex') {
      providers = providers.filter(p => p.ideName === 'codex');
    } else if (options.filter === 'claude') {
      providers = providers.filter(p => p.ideName !== 'codex');
    }

    if (providers.length === 0) {
      Logger.warning('暂无可更新的供应商');
      return;
    }

    console.log(chalk.blue('\n📦 批量更新供应商配置'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();

    console.log(chalk.yellow(`将更新以下 ${providers.length} 个供应商:`));
    providers.forEach(p => {
      const ideTag = p.ideName === 'codex' ? chalk.cyan('[Codex]') : chalk.magenta('[Claude]');
      console.log(`  ${ideTag} ${p.name} (${p.displayName})`);
    });
    console.log();

    // 选择要更新的字段
    const { fields } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'fields',
        message: '选择要更新的字段:',
        choices: [
          { name: 'Base URL (基础 URL)', value: 'baseUrl' },
          { name: 'Token Expiry (Token 过期时间)', value: 'tokenExpiry' },
          { name: 'Quota Limit (配额限制)', value: 'quotaLimit' },
          { name: 'Launch Args (启动参数)', value: 'launchArgs' }
        ]
      }
    ]);

    if (fields.length === 0) {
      Logger.info('未选择任何字段，操作已取消');
      return;
    }

    // 收集更新值
    const updates = {};
    for (const field of fields) {
      let answer;
      switch (field) {
      case 'baseUrl':
        answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: '输入新的 Base URL (留空表示清除):',
            validate: (input) => {
              if (input && !input.startsWith('http://') && !input.startsWith('https://')) {
                return 'Base URL 必须以 http:// 或 https:// 开头';
              }
              return true;
            }
          }
        ]);
        updates.baseUrl = answer.value || null;
        break;

      case 'tokenExpiry':
        answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: '输入 Token 过期时间 (YYYY-MM-DD 格式, 留空表示清除):',
            validate: (input) => {
              if (input && !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
                return '请使用 YYYY-MM-DD 格式';
              }
              return true;
            }
          }
        ]);
        updates.tokenExpiry = answer.value ? new Date(answer.value).toISOString() : null;
        break;

      case 'quotaLimit':
        answer = await inquirer.prompt([
          {
            type: 'number',
            name: 'value',
            message: '输入配额限制 (数字, 0 表示清除):',
            default: 0
          }
        ]);
        updates.quota = answer.value > 0 ? { limit: answer.value } : null;
        break;

      case 'launchArgs':
        answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: '输入启动参数 (空格分隔, 留空表示清除):'
          }
        ]);
        updates.launchArgs = answer.value ? answer.value.split(/\s+/).filter(Boolean) : [];
        break;
      }
    }

    // 确认更新
    console.log();
    console.log(chalk.yellow('将应用以下更新:'));
    Object.entries(updates).forEach(([key, value]) => {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    });
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `确认更新 ${providers.length} 个供应商?`,
        default: false
      }
    ]);

    if (!confirm) {
      Logger.info('操作已取消');
      return;
    }

    // 执行更新
    let successCount = 0;
    let failureCount = 0;

    for (const provider of providers) {
      try {
        const updatedConfig = { ...provider, ...updates };

        // 特殊处理 quota
        if (updates.quota !== undefined) {
          if (updates.quota === null) {
            delete updatedConfig.quota;
          } else {
            updatedConfig.quota = {
              ...(provider.quota || {}),
              limit: updates.quota.limit
            };
          }
        }

        await configManager.addProvider(provider.name, updatedConfig);
        successCount++;
      } catch (error) {
        Logger.error(`更新 ${provider.name} 失败: ${error.message}`);
        failureCount++;
      }
    }

    console.log();
    console.log(chalk.green(`✓ 成功更新 ${successCount} 个供应商`));
    if (failureCount > 0) {
      console.log(chalk.red(`✗ 失败 ${failureCount} 个`));
    }

  } catch (error) {
    Logger.error(`批量更新失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量删除供应商
 * @param {Object} options - 选项
 */
async function batchDelete(options = {}) {
  try {
    await configManager.ensureLoaded();
    let providers = configManager.listProviders();

    // 应用过滤器
    if (options.filter === 'codex') {
      providers = providers.filter(p => p.ideName === 'codex');
    } else if (options.filter === 'claude') {
      providers = providers.filter(p => p.ideName !== 'codex');
    }

    // 根据条件过滤
    if (options.unused) {
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      providers = providers.filter(p => {
        if (!p.lastUsed) return true;
        return new Date(p.lastUsed).getTime() < ninetyDaysAgo;
      });
    }

    if (providers.length === 0) {
      Logger.warning('暂无符合条件的供应商');
      return;
    }

    console.log(chalk.blue('\n🗑️  批量删除供应商'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();

    console.log(chalk.red(`将删除以下 ${providers.length} 个供应商:`));
    providers.forEach(p => {
      const ideTag = p.ideName === 'codex' ? chalk.cyan('[Codex]') : chalk.magenta('[Claude]');
      const lastUsed = p.lastUsed
        ? new Date(p.lastUsed).toLocaleDateString('zh-CN')
        : '从未使用';
      console.log(`  ${ideTag} ${p.name} (${p.displayName}) - 最后使用: ${lastUsed}`);
    });
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red(`确认删除这 ${providers.length} 个供应商? (此操作不可恢复)`),
        default: false
      }
    ]);

    if (!confirm) {
      Logger.info('操作已取消');
      return;
    }

    // 再次确认
    await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmAgain',
        message: '请输入 "DELETE" 以确认删除:',
        validate: (input) => {
          if (input !== 'DELETE') {
            return '请输入 "DELETE" 以确认';
          }
          return true;
        }
      }
    ]);

    // 执行删除
    let successCount = 0;
    let failureCount = 0;

    for (const provider of providers) {
      try {
        await configManager.removeProvider(provider.name);
        successCount++;
      } catch (error) {
        Logger.error(`删除 ${provider.name} 失败: ${error.message}`);
        failureCount++;
      }
    }

    console.log();
    console.log(chalk.green(`✓ 成功删除 ${successCount} 个供应商`));
    if (failureCount > 0) {
      console.log(chalk.red(`✗ 失败 ${failureCount} 个`));
    }

  } catch (error) {
    Logger.error(`批量删除失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量操作命令
 * @param {string} operation - 操作类型
 * @param {Object} options - 选项
 */
async function batchCommand(operation, options = {}) {
  try {
    switch (operation) {
    case 'update':
      await batchUpdate(options);
      break;
    case 'delete':
      await batchDelete(options);
      break;
    default:
      Logger.error(`未知的批量操作: ${operation}`);
      Logger.info('支持的操作: update, delete');
    }
  } catch (error) {
    Logger.error(`批量操作失败: ${error.message}`);
    throw error;
  }
}

module.exports = { batchCommand };
