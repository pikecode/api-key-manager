const chalk = require('chalk');
const { ConfigManager } = require('../config');
const { Logger } = require('../utils/logger');
const { ProviderStatusChecker } = require('../utils/provider-status-checker');

class ProviderLister {
  constructor() {
    this.configManager = new ConfigManager();
    this.statusChecker = new ProviderStatusChecker();
  }

  async list() {
    try {
      await this.configManager.ensureLoaded();
      const providers = this.configManager.listProviders();
      const currentProvider = this.configManager.getCurrentProvider();
      const statusMap = await this.statusChecker.checkAll(providers);

      if (providers.length === 0) {
        Logger.warning('暂无配置的供应商');
        Logger.info('请使用 "akm add" 添加供应商配置');
        return;
      }

      console.log(chalk.blue('\n📋 供应商列表:'));
      console.log(chalk.gray('═'.repeat(60)));

      providers.forEach((provider, index) => {
        const isCurrent = provider.name === currentProvider?.name;
        const status = isCurrent ? '✅' : '🔹';
        const availability = statusMap[provider.name] || { state: 'unknown', label: '未知', latency: null };
        const availabilityIcon = this._iconForState(availability.state);
        const availabilityText = this._formatAvailability(availability);
        const nameColor = isCurrent ? chalk.green : chalk.white;

        // 显示 IDE 类型
        const ideIcon = provider.ideName === 'codex' ? '⚙️' : '🚀';
        const ideLabel = provider.ideName === 'codex' ? 'Codex' : 'Claude Code';

        console.log(`${status} ${availabilityIcon} ${nameColor(provider.name)} (${provider.displayName}) [${ideIcon} ${ideLabel}] - ${availabilityText}`);

        // 显示认证模式
        let authModeDisplay;
        if (provider.ideName === 'codex') {
          // Codex 认证模式
          authModeDisplay = {
            api_key: 'OpenAI API Key',
            chatgpt_login: 'ChatGPT 登录'
          };
        } else {
          // Claude Code 认证模式
          authModeDisplay = {
            api_key: '通用API密钥模式',
            auth_token: '认证令牌模式',
            oauth_token: 'OAuth令牌模式'
          };
        }
        console.log(chalk.gray(`   认证模式: ${authModeDisplay[provider.authMode] || provider.authMode}`));

        // 如果是 Claude Code api_key 模式，显示 tokenType
        if (provider.ideName === 'claude' && provider.authMode === 'api_key' && provider.tokenType) {
          const tokenTypeDisplay = provider.tokenType === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
          console.log(chalk.gray(`   Token类型: ${tokenTypeDisplay}`));
        }

        if (provider.baseUrl) {
          console.log(chalk.gray(`   API基础URL: ${provider.baseUrl}`));
        }

        // 仅在有 authToken 时显示（Codex ChatGPT 登录模式没有 Token）
        if (provider.authToken) {
          console.log(chalk.gray(`   Token: ${provider.authToken.substring(0, 10)}...`));
        } else if (provider.ideName === 'codex') {
          console.log(chalk.gray(`   认证: ChatGPT 交互式登录（无需 Token）`));
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

async function listCommand() {
  const lister = new ProviderLister();
  await lister.list();
}

module.exports = { listCommand, ProviderLister };
