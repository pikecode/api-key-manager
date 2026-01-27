/**
 * Usage Statistics Command
 * 显示供应商使用统计信息
 * @module commands/stats
 */

const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');

/**
 * 格式化时长
 * @param {number} ms - 毫秒
 * @returns {string} 格式化后的时长
 */
function formatDuration(ms) {
  if (!ms) return '0分钟';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

/**
 * 格式化日期
 * @param {string} isoDate - ISO日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(isoDate) {
  if (!isoDate) return '从未使用';

  const date = new Date(isoDate);
  const now = Date.now();
  const diff = now - date.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) {
    return date.toLocaleDateString('zh-CN');
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

/**
 * 显示单个供应商的统计信息
 * @param {string} providerName - 供应商名称或别名
 */
async function showProviderStats(providerName) {
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

    const stats = configManager.getUsageStats(provider.name);

    console.log(chalk.blue(`\n📊 ${stats.displayName} (${stats.name}) 使用统计`));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();

    // 基础统计
    console.log(chalk.white('基础信息:'));
    console.log(`  使用次数: ${chalk.cyan(stats.usageCount || 0)} 次`);
    console.log(`  最后使用: ${chalk.yellow(formatDate(stats.lastUsed))}`);
    console.log();

    // 详细统计
    if (stats.stats) {
      console.log(chalk.white('会话统计:'));
      console.log(`  总会话数: ${chalk.cyan(stats.stats.totalSessions || 0)} 次`);
      console.log(`  累计时长: ${chalk.cyan(formatDuration(stats.stats.totalDurationMs))}`);
      console.log(`  平均时长: ${chalk.cyan(formatDuration(stats.stats.averageDurationMs))}`);
      console.log(`  首次使用: ${chalk.yellow(formatDate(stats.stats.firstUsed))}`);
      console.log();
    }

    // 配置信息
    console.log(chalk.gray('配置详情:'));
    console.log(chalk.gray(`  IDE类型: ${provider.ideName === 'codex' ? 'Codex CLI' : 'Claude Code'}`));
    if (provider.alias) {
      console.log(chalk.gray(`  别名: ${provider.alias}`));
    }
    if (provider.ideName !== 'codex') {
      console.log(chalk.gray(`  认证模式: ${provider.authMode}`));
    }
    if (provider.baseUrl) {
      console.log(chalk.gray(`  基础URL: ${provider.baseUrl}`));
    }

  } catch (error) {
    Logger.error(`获取统计信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 显示所有供应商的统计概览
 * @param {Object} options - 选项
 * @param {string|null} options.filter - 过滤器
 * @param {string} options.sort - 排序方式
 */
async function showAllStats(options = {}) {
  try {
    await configManager.ensureLoaded();
    let allStats = configManager.getUsageStats();

    // 应用过滤器
    if (options.filter === 'codex') {
      allStats = allStats.filter(s => {
        const provider = configManager.getProvider(s.name);
        return provider && provider.ideName === 'codex';
      });
    } else if (options.filter === 'claude') {
      allStats = allStats.filter(s => {
        const provider = configManager.getProvider(s.name);
        return provider && provider.ideName !== 'codex';
      });
    }

    if (allStats.length === 0) {
      if (options.filter) {
        const filterName = options.filter === 'codex' ? 'Codex CLI' : 'Claude Code';
        Logger.warning(`暂无 ${filterName} 供应商配置`);
      } else {
        Logger.warning('暂无配置的供应商');
      }
      Logger.info('请使用 "akm add" 添加供应商配置');
      return;
    }

    // 排序
    if (options.sort === 'time') {
      allStats.sort((a, b) => {
        const timeA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const timeB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return timeB - timeA;
      });
    } else if (options.sort === 'name') {
      allStats.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 默认已经按使用次数排序

    const titleSuffix = options.filter === 'codex' ? ' (Codex CLI)' : (options.filter === 'claude' ? ' (Claude Code)' : '');
    console.log(chalk.blue(`\n📊 供应商使用统计${titleSuffix}`));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();

    const currentProvider = configManager.getCurrentProvider();

    // 显示表格
    allStats.forEach((stats, index) => {
      const provider = configManager.getProvider(stats.name);
      const isCurrent = provider.name === currentProvider?.name;
      const statusIcon = isCurrent ? '✅' : '🔹';
      const ideTag = provider.ideName === 'codex'
        ? chalk.cyan('[Codex]')
        : chalk.magenta('[Claude]');
      const nameColor = isCurrent ? chalk.green : chalk.white;
      const aliasText = provider.alias ? chalk.yellow(` [${provider.alias}]`) : '';

      console.log(`${statusIcon} ${ideTag} ${nameColor(stats.name)} (${stats.displayName})${aliasText}`);
      console.log(`   使用次数: ${chalk.cyan(stats.usageCount || 0)} 次 | 最后使用: ${chalk.yellow(formatDate(stats.lastUsed))}`);

      if (stats.stats) {
        console.log(`   会话数: ${chalk.cyan(stats.stats.totalSessions || 0)} | 累计: ${chalk.cyan(formatDuration(stats.stats.totalDurationMs))} | 平均: ${chalk.cyan(formatDuration(stats.stats.averageDurationMs))}`);
      }

      console.log();
    });

    // 统计汇总
    const totalUsage = allStats.reduce((sum, s) => sum + (s.usageCount || 0), 0);
    const totalSessions = allStats.reduce((sum, s) => sum + (s.stats?.totalSessions || 0), 0);
    const totalDuration = allStats.reduce((sum, s) => sum + (s.stats?.totalDurationMs || 0), 0);

    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.blue('汇总统计:'));
    console.log(`  总供应商数: ${chalk.cyan(allStats.length)}`);
    console.log(`  总使用次数: ${chalk.cyan(totalUsage)} 次`);
    console.log(`  总会话数: ${chalk.cyan(totalSessions)} 次`);
    console.log(`  累计使用时长: ${chalk.cyan(formatDuration(totalDuration))}`);

  } catch (error) {
    Logger.error(`获取统计信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 显示推荐的供应商
 * @param {Object} options - 选项
 */
async function showRecommendations(options = {}) {
  try {
    await configManager.ensureLoaded();

    const limit = options.limit || 5;
    const filter = options.filter || null;

    const recommendations = configManager.getRecommendedProviders({ limit, filter });

    if (recommendations.length === 0) {
      Logger.warning('暂无可推荐的供应商');
      Logger.info('使用 "akm add" 添加供应商配置');
      return;
    }

    const titleSuffix = filter === 'codex' ? ' (Codex CLI)' : (filter === 'claude' ? ' (Claude Code)' : '');
    console.log(chalk.blue(`\n⭐ 推荐供应商${titleSuffix}`));
    console.log(chalk.gray('基于使用频率、最近使用时间和会话时长的智能推荐'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log();

    const currentProvider = configManager.getCurrentProvider();

    recommendations.forEach((provider, index) => {
      const isCurrent = provider.name === currentProvider?.name;
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const statusIcon = isCurrent ? '✅' : '🔹';
      const ideTag = provider.ideName === 'codex'
        ? chalk.cyan('[Codex]')
        : chalk.magenta('[Claude]');
      const nameColor = isCurrent ? chalk.green : chalk.white;
      const aliasText = provider.alias ? chalk.yellow(` [${provider.alias}]`) : '';

      console.log(`${rankIcon} ${statusIcon} ${ideTag} ${nameColor(provider.name)} (${provider.displayName})${aliasText}`);
      console.log(`   推荐分数: ${chalk.cyan(provider.recommendScore)} | 使用: ${chalk.cyan(provider.usageCount || 0)}次 | 最后: ${chalk.yellow(formatDate(provider.lastUsed))}`);
      console.log();
    });

    console.log(chalk.gray('💡 提示: 使用 "akm <供应商名称>" 快速切换到推荐的供应商'));

  } catch (error) {
    Logger.error(`获取推荐失败: ${error.message}`);
    throw error;
  }
}

/**
 * 统计命令
 * @param {string|null} providerName - 供应商名称
 * @param {Object} options - 选项
 */
async function statsCommand(providerName, options = {}) {
  try {
    if (options.recommend) {
      await showRecommendations(options);
    } else if (providerName) {
      await showProviderStats(providerName);
    } else {
      await showAllStats(options);
    }
  } catch (error) {
    Logger.error(`统计命令执行失败: ${error.message}`);
    throw error;
  }
}

module.exports = { statsCommand };
