/**
 * Provider Lister Command
 * 列出和显示所有配置的供应商
 * @module commands/list
 */

const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { ProviderStatusChecker } = require('../utils/provider-status-checker');
const { maybeMaskToken } = require('../utils/secrets');
const { AUTH_MODE_DISPLAY, BASE_URL } = require('../constants');

/**
 * 供应商列表显示类
 * 用于列出、过滤和显示所有配置的 API 供应商
 */
class ProviderLister {
  /**
   * 创建供应商列表显示器实例
   */
  constructor() {
    this.configManager = configManager;
    this.statusChecker = new ProviderStatusChecker();
  }

  /**
   * 列出供应商配置
   * @param {string|null} filter - 过滤器 ('codex', 'claude', 或 null 表示全部)
   * @param {Object} options - 显示选项
   * @param {boolean} [options.showToken=true] - 是否显示完整 token
   * @param {boolean} [options.checkStatus=false] - 是否检测在线状态
   * @returns {Promise<void>}
   */
  async list(filter = null, options = {}) {
    try {
      // 默认显示完整 token，不再加密
      const showToken = options.showToken !== false;
      const checkStatus = options.checkStatus === true;
      await this.configManager.ensureLoaded();
      let providers = this.configManager.listProviders();
      const currentProvider = this.configManager.getCurrentProvider();

      // 应用过滤器
      if (filter === 'codex') {
        providers = providers.filter(p => p.ideName === 'codex');
      } else if (filter === 'claude') {
        providers = providers.filter(p => p.ideName !== 'codex');
      }

      const statusMap = checkStatus ? await this.statusChecker.checkAll(providers) : {};

      if (providers.length === 0) {
        if (filter) {
          const filterName = filter === 'codex' ? 'Codex CLI' : 'Claude Code';
          Logger.warning(`暂无 ${filterName} 供应商配置`);
        } else {
          Logger.warning('暂无配置的供应商');
        }
        Logger.info('请使用 "akm add" 添加供应商配置');
        return;
      }

      const titleSuffix = filter === 'codex' ? ' (Codex CLI)' : (filter === 'claude' ? ' (Claude Code)' : '');
      console.log(chalk.blue(`\n📋 供应商列表${titleSuffix}:`));
      console.log(chalk.gray('═'.repeat(60)));

      providers.forEach((provider, index) => {
        const isCurrent = provider.name === currentProvider?.name;
        const status = isCurrent ? '✅' : '🔹';
        const nameColor = isCurrent ? chalk.green : chalk.white;

        // IDE 类型标签
        const ideTag = provider.ideName === 'codex'
          ? chalk.cyan('[Codex]')
          : chalk.magenta('[Claude]');

        // 如果有别名，显示别名
        const aliasText = provider.alias ? chalk.yellow(` [别名: ${provider.alias}]`) : '';

        if (checkStatus) {
          const availability = statusMap[provider.name] || { state: 'unknown', label: '未知', latency: null };
          const availabilityIcon = this._iconForState(availability.state);
          const availabilityText = this._formatAvailability(availability);
          console.log(`${status} ${availabilityIcon} ${ideTag} ${nameColor(provider.name)} (${provider.displayName})${aliasText} - ${availabilityText}`);
        } else {
          console.log(`${status} ${ideTag} ${nameColor(provider.name)} (${provider.displayName})${aliasText}`);
        }

        if (provider.ideName === 'codex') {
          console.log(chalk.gray('   IDE: Codex CLI'));
          if (provider.baseUrl) {
            console.log(chalk.gray(`   OPENAI_BASE_URL: ${provider.baseUrl}`));
          }
          if (provider.authToken) {
            console.log(chalk.gray(`   OPENAI_API_KEY: ${maybeMaskToken(provider.authToken, showToken)}`));
          }
        } else {
          // 显示认证模式
          console.log(chalk.gray(`   认证模式: ${AUTH_MODE_DISPLAY[provider.authMode] || provider.authMode}`));

          // 根据不同模式显示对应的环境变量名称
          if (provider.authMode === 'auth_token') {
            if (provider.baseUrl) {
              console.log(chalk.gray(`   ANTHROPIC_BASE_URL: ${provider.baseUrl}`));
            }
            if (provider.authToken) {
              console.log(chalk.gray(`   ANTHROPIC_AUTH_TOKEN: ${maybeMaskToken(provider.authToken, showToken)}`));
            }
          } else {
            // API Key 模式（默认）
            if (provider.baseUrl) {
              console.log(chalk.gray(`   ANTHROPIC_BASE_URL: ${provider.baseUrl}`));
            }
            if (provider.authToken) {
              console.log(chalk.gray(`   ANTHROPIC_API_KEY: ${maybeMaskToken(provider.authToken, showToken)}`));
            }
          }
        }

        if (provider.launchArgs && provider.launchArgs.length > 0) {
          console.log(chalk.gray(`   启动参数: ${provider.launchArgs.join(' ')}`));
        }
        if (provider.models && (provider.models.primary || provider.models.smallFast)) {
          console.log(chalk.gray(`   主模型: ${provider.models.primary || '未设置'}`));
          console.log(chalk.gray(`   快速模型: ${provider.models.smallFast || '未设置'}`));
        }
        console.log(chalk.gray(`   创建时间: ${new Date(provider.createdAt).toLocaleString()}`));
        console.log(chalk.gray(`   最后使用: ${new Date(provider.lastUsed).toLocaleString()}`));

        if (index < providers.length - 1) {
          console.log(chalk.gray('─'.repeat(60)));
        }
      });

      console.log(chalk.gray('═'.repeat(60)));

      if (currentProvider) {
        console.log(chalk.green(`\n当前供应商: ${currentProvider.displayName}`));
      } else {
        console.log(chalk.yellow('\n未设置当前供应商'));
      }

      console.log(chalk.blue(`\n总计: ${providers.length} 个供应商`));

    } catch (error) {
      Logger.error(`获取供应商列表失败: ${error.message}`);
      throw error;
    }
  }

  _iconForState(state) {
    if (state === 'online') {
      return '🟢';
    }
    if (state === 'degraded') {
      return '🟡';
    }
    if (state === 'offline') {
      return '🔴';
    }
    return '⚪';
  }

  _formatAvailability(availability) {
    if (!availability) {
      return '未知';
    }
    if (availability.state === 'online') {
      return chalk.green(availability.label);
    }
    if (availability.state === 'degraded') {
      return chalk.yellow(availability.label);
    }
    if (availability.state === 'offline') {
      return chalk.red(availability.label);
    }
    return chalk.gray(availability.label || '未知');
  }
}

async function listCommand(filter = null, options = {}) {
  const lister = new ProviderLister();
  await lister.list(filter, options);
}

module.exports = { listCommand, ProviderLister };
