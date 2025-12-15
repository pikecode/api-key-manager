const chalk = require('chalk');
const { ConfigManager } = require('../config');
const { Logger } = require('../utils/logger');
const { ProviderStatusChecker } = require('../utils/provider-status-checker');

class ProviderLister {
  constructor() {
    this.configManager = new ConfigManager();
    this.statusChecker = new ProviderStatusChecker();
  }

  async list(filter = null) {
    try {
      await this.configManager.ensureLoaded();
      let providers = this.configManager.listProviders();
      const currentProvider = this.configManager.getCurrentProvider();

      // 应用过滤器
      if (filter === 'codex') {
        providers = providers.filter(p => p.ideName === 'codex');
      } else if (filter === 'claude') {
        providers = providers.filter(p => p.ideName !== 'codex');
      }

      const statusMap = await this.statusChecker.checkAll(providers);

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
        const availability = statusMap[provider.name] || { state: 'unknown', label: '未知', latency: null };
        const availabilityIcon = this._iconForState(availability.state);
        const availabilityText = this._formatAvailability(availability);
        const nameColor = isCurrent ? chalk.green : chalk.white;

        // IDE 类型标签
        const ideTag = provider.ideName === 'codex'
          ? chalk.cyan('[Codex]')
          : chalk.magenta('[Claude]');

        console.log(`${status} ${availabilityIcon} ${ideTag} ${nameColor(provider.name)} (${provider.displayName}) - ${availabilityText}`);

        if (provider.ideName === 'codex') {
          console.log(chalk.gray('   IDE: Codex CLI'));
          if (provider.baseUrl) {
            console.log(chalk.gray(`   OPENAI_BASE_URL: ${provider.baseUrl}`));
          }
          if (provider.authToken) {
            console.log(chalk.gray(`   OPENAI_API_KEY: ${provider.authToken}`));
          }
        } else {
          // 显示认证模式
          const authModeDisplay = {
            api_key: '通用API密钥模式',
            auth_token: '认证令牌模式',
            oauth_token: 'OAuth令牌模式'
          };
          console.log(chalk.gray(`   认证模式: ${authModeDisplay[provider.authMode] || provider.authMode}`));

          // 根据不同模式显示对应的环境变量名称
          if (provider.authMode === 'oauth_token') {
            // OAuth 模式
            if (provider.authToken) {
              console.log(chalk.gray(`   CLAUDE_CODE_OAUTH_TOKEN: ${provider.authToken}`));
            }
            if (provider.baseUrl) {
              console.log(chalk.gray(`   ANTHROPIC_BASE_URL: ${provider.baseUrl}`));
            }
          } else if (provider.authMode === 'api_key') {
            // API Key 模式
            if (provider.baseUrl) {
              console.log(chalk.gray(`   ANTHROPIC_BASE_URL: ${provider.baseUrl}`));
            }
            if (provider.authToken) {
              const tokenEnvName = provider.tokenType === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
              console.log(chalk.gray(`   ${tokenEnvName}: ${provider.authToken}`));
            }
          } else {
            // auth_token 模式
            if (provider.baseUrl) {
              console.log(chalk.gray(`   ANTHROPIC_BASE_URL: ${provider.baseUrl}`));
            }
            if (provider.authToken) {
              console.log(chalk.gray(`   ANTHROPIC_AUTH_TOKEN: ${provider.authToken}`));
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

async function listCommand(filter = null) {
  const lister = new ProviderLister();
  await lister.list(filter);
}

module.exports = { listCommand, ProviderLister };
