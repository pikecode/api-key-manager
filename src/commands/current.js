/**
 * Current Config Command
 * 显示当前激活的供应商配置
 * @module commands/current
 */

const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { maybeMaskToken } = require('../utils/secrets');
const { AUTH_MODE_DISPLAY, TOKEN_TYPE_DISPLAY, BASE_URL, CURRENT_STATUS } = require('../constants');

/**
 * 当前配置显示类
 * 用于显示当前激活的 API 供应商配置详情
 */
class CurrentConfig {
  /**
   * 创建当前配置显示器实例
   */
  constructor() {
    this.configManager = configManager;
  }

  /**
   * 显示当前供应商配置
   * @param {Object} options - 显示选项
   * @param {boolean} [options.showToken=true] - 是否显示完整 token
   * @returns {Promise<void>}
   */
  async show(options = {}) {
    try {
      // 默认显示完整 token，不再加密
      const showToken = options.showToken !== false;
      await this.configManager.ensureLoaded();
      const currentProvider = this.configManager.getCurrentProvider();

      if (!currentProvider) {
        Logger.warning('未设置当前供应商');
        Logger.info('请使用 "akm <供应商名>" 切换供应商');
        return;
      }

      console.log(chalk.blue('\n📍 当前配置:'));
      console.log(chalk.gray('═'.repeat(60)));

      console.log(chalk.green(`供应商: ${currentProvider.displayName}`));
      console.log(chalk.gray(`内部名称: ${currentProvider.name}`));

      if (currentProvider.ideName === 'codex') {
        console.log(chalk.gray('IDE: Codex CLI'));
        if (currentProvider.baseUrl) {
          console.log(chalk.gray(`OPENAI_BASE_URL: ${currentProvider.baseUrl}`));
        }
        if (currentProvider.authToken) {
          console.log(chalk.gray(`OPENAI_API_KEY: ${maybeMaskToken(currentProvider.authToken, showToken)}`));
        }
        console.log(chalk.gray(`创建时间: ${new Date(currentProvider.createdAt).toLocaleString()}`));
        console.log(chalk.gray(`最后使用: ${new Date(currentProvider.lastUsed).toLocaleString()}`));
        console.log(chalk.gray('═'.repeat(60)));

        console.log(chalk.blue('\n🔧 环境变量设置:'));
        if (currentProvider.baseUrl) {
          console.log(chalk.gray(`set OPENAI_BASE_URL=${currentProvider.baseUrl}`));
        }
        if (currentProvider.authToken) {
          console.log(chalk.gray(`set OPENAI_API_KEY=${maybeMaskToken(currentProvider.authToken, showToken)}`));
        }
        console.log(chalk.gray('codex'));
        return;
      }

      // 显示认证模式
      console.log(chalk.gray(`认证模式: ${AUTH_MODE_DISPLAY[currentProvider.authMode] || currentProvider.authMode}`));

      // 如果是 api_key 模式，显示 tokenType
      if (currentProvider.authMode === 'api_key' && currentProvider.tokenType) {
        const tokenTypeDisplay = TOKEN_TYPE_DISPLAY[currentProvider.tokenType];
        console.log(chalk.gray(`Token类型: ${tokenTypeDisplay}`));
      }

      if (currentProvider.baseUrl) {
        console.log(chalk.gray(`基础URL: ${currentProvider.baseUrl}`));
      }
      console.log(chalk.gray(`认证Token: ${maybeMaskToken(currentProvider.authToken, showToken)}`));
      console.log(chalk.gray(`创建时间: ${new Date(currentProvider.createdAt).toLocaleString()}`));
      console.log(chalk.gray(`最后使用: ${new Date(currentProvider.lastUsed).toLocaleString()}`));

      // 显示模型配置
      if (currentProvider.models && (currentProvider.models.primary || currentProvider.models.smallFast)) {
        console.log(chalk.gray(`主模型: ${currentProvider.models.primary || '未设置'}`));
        console.log(chalk.gray(`快速模型: ${currentProvider.models.smallFast || '未设置'}`));
      }

      console.log(chalk.gray('═'.repeat(60)));

      // 显示环境变量设置方式
      console.log(chalk.blue('\n🔧 环境变量设置:'));
      if (currentProvider.baseUrl) {
        console.log(chalk.gray(`set ANTHROPIC_BASE_URL=${currentProvider.baseUrl}`));
      }
      if (currentProvider.authMode === 'oauth_token') {
        console.log(chalk.gray(`set CLAUDE_CODE_OAUTH_TOKEN=${maybeMaskToken(currentProvider.authToken, showToken)}`));
      } else if (currentProvider.authMode === 'api_key') {
        // 根据 tokenType 显示对应的环境变量
        if (currentProvider.tokenType === 'auth_token') {
          console.log(chalk.gray(`set ANTHROPIC_AUTH_TOKEN=${maybeMaskToken(currentProvider.authToken, showToken)}`));
        } else {
          console.log(chalk.gray(`set ANTHROPIC_API_KEY=${maybeMaskToken(currentProvider.authToken, showToken)}`));
        }
      } else {
        // auth_token 模式
        console.log(chalk.gray(`set ANTHROPIC_AUTH_TOKEN=${maybeMaskToken(currentProvider.authToken, showToken)}`));
      }
      if (currentProvider.models?.primary) {
        console.log(chalk.gray(`set ANTHROPIC_MODEL=${currentProvider.models.primary}`));
      }
      if (currentProvider.models?.smallFast) {
        console.log(chalk.gray(`set ANTHROPIC_SMALL_FAST_MODEL=${currentProvider.models.smallFast}`));
      }
      console.log(chalk.gray('claude'));

    } catch (error) {
      Logger.error(`获取当前配置失败: ${error.message}`);
      throw error;
    }
  }
}

async function currentCommand(options = {}) {
  const current = new CurrentConfig();
  await current.show(options);
}

module.exports = { currentCommand, CurrentConfig };
