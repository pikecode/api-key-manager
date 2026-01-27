/**
 * Health Check Command
 * 配置健康检查和告警
 * @module commands/health
 */

const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { HealthChecker } = require('../utils/health-checker');
const { UIHelper } = require('../utils/ui-helper');

/**
 * 显示单个供应商的健康检查
 * @param {string} providerName - 供应商名称或别名
 * @param {Object} options - 选项
 */
async function showProviderHealth(providerName, options = {}) {
  try {
    await configManager.ensureLoaded();

    // 支持别名查找
    let provider = configManager.getProvider(providerName);
    if (!provider) {
      provider = configManager.getProviderByNameOrAlias(providerName);
    }

    if (!provider) {
      Logger.error(`供应商 '${providerName}' 不存在`);
      Logger.info('使用 "akm list" 查看所有已配置的供应商');
      return;
    }

    console.log(chalk.blue(`\n🏥 健康检查: ${provider.displayName} (${provider.name})`));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();

    const checker = new HealthChecker();
    const loadingInterval = UIHelper.createLoadingAnimation('检查中...');

    try {
      const results = await checker.performHealthCheck(provider, options);
      UIHelper.clearLoadingAnimation(loadingInterval);

      console.log(checker.formatHealthReport(results));
      console.log();

      // 如果有问题，显示建议
      if (results.overallStatus === 'error' || results.overallStatus === 'warning') {
        console.log(chalk.yellow('💡 建议操作:'));

        if (results.checks.tokenExpiry?.status === 'expired' || results.checks.tokenExpiry?.status === 'critical') {
          console.log(chalk.yellow('   • 使用 "akm edit" 更新 Token'));
        }

        if (results.checks.quota?.status === 'exceeded' || results.checks.quota?.status === 'critical') {
          console.log(chalk.yellow('   • 检查 API 配额使用情况'));
          console.log(chalk.yellow('   • 考虑升级套餐或添加新的供应商'));
        }

        if (results.checks.connectivity?.status === 'offline') {
          console.log(chalk.yellow('   • 检查网络连接'));
          console.log(chalk.yellow('   • 验证 Token 是否正确'));
          console.log(chalk.yellow('   • 使用 "akm validate" 进行详细诊断'));
        }

        if (results.checks.lastUsed?.status === 'stale') {
          console.log(chalk.yellow('   • 考虑删除长期未使用的配置'));
          console.log(chalk.yellow('   • 或运行一次验证确保仍然可用'));
        }

        console.log();
      }

    } catch (error) {
      UIHelper.clearLoadingAnimation(loadingInterval);
      Logger.error(`健康检查失败: ${error.message}`);
    }

  } catch (error) {
    Logger.error(`健康检查执行失败: ${error.message}`);
    throw error;
  }
}

/**
 * 显示所有供应商的健康检查
 * @param {Object} options - 选项
 */
async function showAllHealth(options = {}) {
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
      if (options.filter) {
        const filterName = options.filter === 'codex' ? 'Codex CLI' : 'Claude Code';
        Logger.warning(`暂无 ${filterName} 供应商配置`);
      } else {
        Logger.warning('暂无配置的供应商');
      }
      Logger.info('请使用 "akm add" 添加供应商配置');
      return;
    }

    const titleSuffix = options.filter === 'codex' ? ' (Codex CLI)' : (options.filter === 'claude' ? ' (Claude Code)' : '');
    console.log(chalk.blue(`\n🏥 健康检查${titleSuffix}`));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();

    const checker = new HealthChecker();
    const allResults = [];
    let completedCount = 0;
    const total = providers.length;

    // 创建进度显示
    const progressInterval = setInterval(() => {
      process.stdout.write(`\r检查中... ${completedCount}/${total}`);
    }, 100);

    try {
      // 并行检查所有供应商
      const checkPromises = providers.map(async (provider) => {
        const results = await checker.performHealthCheck(provider, {
          checkConnectivity: options.connectivity !== false
        });
        completedCount++;
        return results;
      });

      const results = await Promise.all(checkPromises);
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // 清除进度显示

      allResults.push(...results);

      // 显示结果
      const currentProvider = configManager.getCurrentProvider();

      results.forEach((result, index) => {
        const provider = providers[index];
        const isCurrent = provider.name === currentProvider?.name;
        const statusIcon = isCurrent ? '✅' : '🔹';

        console.log(checker.formatHealthReport(result));
        if (isCurrent) {
          console.log(chalk.green('  (当前活跃)'));
        }
        console.log();
      });

      // 显示统计
      const errorCount = allResults.filter(r => r.overallStatus === 'error').length;
      const warningCount = allResults.filter(r => r.overallStatus === 'warning').length;
      const okCount = allResults.filter(r => r.overallStatus === 'ok' || r.overallStatus === 'info').length;

      console.log(chalk.gray('═'.repeat(60)));
      console.log(chalk.blue('📊 健康统计:'));
      console.log(`  总计: ${total} 个供应商`);
      console.log(`  ${chalk.green('✓')} 健康: ${okCount}`);
      console.log(`  ${chalk.yellow('⚠')} 警告: ${warningCount}`);
      console.log(`  ${chalk.red('✗')} 错误: ${errorCount}`);

      // 显示需要关注的问题
      if (errorCount > 0 || warningCount > 0) {
        console.log();
        console.log(chalk.yellow('⚠️  发现需要关注的问题:'));

        allResults.forEach((result) => {
          const hasIssue = result.overallStatus === 'error' || result.overallStatus === 'warning';
          if (hasIssue) {
            const issues = Object.entries(result.checks)
              .filter(([_, check]) => check.level === 'error' || check.level === 'warning')
              .map(([name, check]) => `${checker._getCheckLabel(name)}: ${check.message}`);

            if (issues.length > 0) {
              console.log(chalk.yellow(`  • ${result.displayName}:`));
              issues.forEach(issue => {
                console.log(chalk.yellow(`    - ${issue}`));
              });
            }
          }
        });
      }

    } catch (error) {
      clearInterval(progressInterval);
      Logger.error(`批量健康检查失败: ${error.message}`);
    }

  } catch (error) {
    Logger.error(`健康检查执行失败: ${error.message}`);
    throw error;
  }
}

/**
 * 健康检查命令
 * @param {string|null} providerName - 供应商名称
 * @param {Object} options - 选项
 */
async function healthCommand(providerName, options = {}) {
  try {
    if (providerName) {
      await showProviderHealth(providerName, options);
    } else {
      await showAllHealth(options);
    }
  } catch (error) {
    Logger.error(`健康检查失败: ${error.message}`);
    throw error;
  }
}

module.exports = { healthCommand };
