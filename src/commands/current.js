/**
 * Current Config Command
 * 显示当前激活的供应商配置
 * @module commands/current
 */

const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { formatShellAssignment } = require('../utils/shell-snippets');
const { AUTH_MODE_DISPLAY } = require('../constants');

/**
 * 当前配置显示类
 * 用于显示当前激活的 API 供应商配置详情
 */
class CurrentConfig {
  /**
   * 创建当前配置显示器实例
   */
  constructor(manager = configManager) {
    this.configManager = manager;
  }

  /**
   * 显示当前供应商配置
   * @returns {Promise<void>}
   */
  async show(options = {}) {
    try {
      await this.configManager.ensureLoaded();
      const currentProvider = this.configManager.getCurrentProvider();

      if (!currentProvider) {
        Logger.warning('未设置当前供应商');
        Logger.info('请使用 "akm <供应商名>" 切换供应商');
        return;
      }

      if (options.json) {
        console.log(
          JSON.stringify(
            { currentProvider: currentProvider.name, provider: currentProvider },
            null,
            2
          )
        );
        return;
      }

      const shell = options.shell;

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
          console.log(chalk.gray(`OPENAI_API_KEY: ${currentProvider.authToken}`));
        }
        console.log(
          chalk.gray(`创建时间: ${new Date(currentProvider.createdAt).toLocaleString()}`)
        );
        console.log(chalk.gray(`最后使用: ${new Date(currentProvider.lastUsed).toLocaleString()}`));
        console.log(chalk.gray('═'.repeat(60)));

        console.log(chalk.blue('\n🔧 环境变量设置:'));
        if (currentProvider.baseUrl) {
          console.log(chalk.gray(formatShellAssignment('OPENAI_BASE_URL', currentProvider.baseUrl, shell)));
        }
        if (currentProvider.authToken) {
          console.log(chalk.gray(formatShellAssignment('OPENAI_API_KEY', currentProvider.authToken, shell)));
        }
        console.log(chalk.gray('codex'));
        return;
      }

      // 显示认证模式
      console.log(
        chalk.gray(
          `认证模式: ${AUTH_MODE_DISPLAY[currentProvider.authMode] || currentProvider.authMode}`
        )
      );

      if (currentProvider.baseUrl) {
        console.log(chalk.gray(`基础URL: ${currentProvider.baseUrl}`));
      }
      console.log(chalk.gray(`认证Token: ${currentProvider.authToken}`));
      console.log(chalk.gray(`创建时间: ${new Date(currentProvider.createdAt).toLocaleString()}`));
      console.log(chalk.gray(`最后使用: ${new Date(currentProvider.lastUsed).toLocaleString()}`));

      // 显示模型配置
      if (
        currentProvider.models &&
        (currentProvider.models.primary || currentProvider.models.smallFast)
      ) {
        console.log(chalk.gray(`主模型: ${currentProvider.models.primary || '未设置'}`));
        console.log(chalk.gray(`快速模型: ${currentProvider.models.smallFast || '未设置'}`));
      }

      console.log(chalk.gray('═'.repeat(60)));

      // 显示环境变量设置方式
      console.log(chalk.blue('\n🔧 环境变量设置:'));
      if (currentProvider.baseUrl) {
        console.log(chalk.gray(formatShellAssignment('ANTHROPIC_BASE_URL', currentProvider.baseUrl, shell)));
      }
      if (currentProvider.authMode === 'auth_token') {
        console.log(chalk.gray(formatShellAssignment('ANTHROPIC_AUTH_TOKEN', currentProvider.authToken, shell)));
      } else {
        console.log(chalk.gray(formatShellAssignment('ANTHROPIC_API_KEY', currentProvider.authToken, shell)));
      }
      if (currentProvider.models?.primary) {
        console.log(chalk.gray(formatShellAssignment('ANTHROPIC_MODEL', currentProvider.models.primary, shell)));
      }
      if (currentProvider.models?.smallFast) {
        console.log(
          chalk.gray(
            formatShellAssignment('ANTHROPIC_SMALL_FAST_MODEL', currentProvider.models.smallFast, shell)
          )
        );
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
