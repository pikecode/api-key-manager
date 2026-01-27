/**
 * Provider Validation Command
 * 验证供应商配置的有效性
 * @module commands/validate
 */

const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { ProviderStatusChecker } = require('../utils/provider-status-checker');
const { UIHelper } = require('../utils/ui-helper');

/**
 * 供应商验证器
 * 用于验证 API 供应商的 Token 和配置是否有效
 */
class ProviderValidator {
  /**
   * 创建供应商验证器实例
   */
  constructor() {
    this.configManager = configManager;
    this.statusChecker = new ProviderStatusChecker();
  }

  /**
   * 验证单个供应商
   * @param {string} providerName - 供应商名称或别名
   * @returns {Promise<void>}
   */
  async validateOne(providerName) {
    try {
      await this.configManager.ensureLoaded();

      // 支持别名查找
      let provider = this.configManager.getProvider(providerName);
      if (!provider) {
        provider = this.configManager.getProviderByNameOrAlias(providerName);
      }

      if (!provider) {
        Logger.error(`供应商 '${providerName}' 不存在`);
        Logger.info('使用 "akm list" 查看所有已配置的供应商');
        return;
      }

      console.log(chalk.blue(`\n🔍 正在验证供应商: ${provider.displayName} (${provider.name})`));
      console.log(chalk.gray('═'.repeat(60)));

      const loadingInterval = UIHelper.createLoadingAnimation('验证中...');

      try {
        const status = await this.statusChecker.check(provider, { skipCache: true });
        UIHelper.clearLoadingAnimation(loadingInterval);

        this._printValidationResult(provider, status);
      } catch (error) {
        UIHelper.clearLoadingAnimation(loadingInterval);
        Logger.error(`验证失败: ${error.message}`);
      }

    } catch (error) {
      Logger.error(`验证供应商失败: ${error.message}`);
    }
  }

  /**
   * 验证所有供应商
   * @param {string|null} filter - 过滤器 ('codex', 'claude', 或 null 表示全部)
   * @returns {Promise<void>}
   */
  async validateAll(filter = null) {
    try {
      await this.configManager.ensureLoaded();
      let providers = this.configManager.listProviders();

      // 应用过滤器
      if (filter === 'codex') {
        providers = providers.filter(p => p.ideName === 'codex');
      } else if (filter === 'claude') {
        providers = providers.filter(p => p.ideName !== 'codex');
      }

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
      console.log(chalk.blue(`\n🔍 正在验证供应商配置${titleSuffix}...`));
      console.log(chalk.gray('═'.repeat(60)));
      console.log();

      let completedCount = 0;
      const total = providers.length;

      // 创建进度显示
      const progressInterval = setInterval(() => {
        process.stdout.write(`\r验证中... ${completedCount}/${total}`);
      }, 100);

      try {
        // 使用流式检查，实时显示结果
        const results = await this.statusChecker.checkAllStreaming(providers, (providerName, status) => {
          completedCount++;
        });

        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(50) + '\r'); // 清除进度显示

        // 显示结果
        this._printBatchResults(providers, results);
      } catch (error) {
        clearInterval(progressInterval);
        Logger.error(`批量验证失败: ${error.message}`);
      }

    } catch (error) {
      Logger.error(`验证供应商失败: ${error.message}`);
    }
  }

  /**
   * 打印单个验证结果
   * @private
   * @param {Object} provider - 供应商配置
   * @param {Object} status - 状态结果
   */
  _printValidationResult(provider, status) {
    const stateIcon = this._getStateIcon(status.state);
    const stateLabel = this._getStateLabel(status.state);
    const stateColor = this._getStateColor(status.state);

    console.log();
    console.log(`${stateIcon} 状态: ${stateColor(stateLabel)}`);

    if (status.message) {
      console.log(`   消息: ${status.message}`);
    }

    if (status.latency !== null) {
      console.log(`   响应时间: ${status.latency.toFixed(0)}ms`);
    }

    console.log();

    // 配置详情
    console.log(chalk.gray('配置详情:'));
    console.log(chalk.gray(`   供应商名称: ${provider.name}`));
    console.log(chalk.gray(`   显示名称: ${provider.displayName}`));
    if (provider.alias) {
      console.log(chalk.gray(`   别名: ${provider.alias}`));
    }

    if (provider.ideName === 'codex') {
      console.log(chalk.gray('   IDE: Codex CLI'));
      if (provider.baseUrl) {
        console.log(chalk.gray(`   OPENAI_BASE_URL: ${provider.baseUrl}`));
      }
    } else {
      console.log(chalk.gray(`   IDE: Claude Code`));
      console.log(chalk.gray(`   认证模式: ${provider.authMode}`));
      if (provider.baseUrl) {
        console.log(chalk.gray(`   基础URL: ${provider.baseUrl}`));
      }
    }

    // 根据状态提供建议
    if (status.state === 'offline') {
      console.log();
      console.log(chalk.yellow('💡 建议:'));
      console.log(chalk.yellow('   1. 检查 Token 是否正确'));
      console.log(chalk.yellow('   2. 检查基础URL是否可访问'));
      console.log(chalk.yellow('   3. 检查网络连接是否正常'));
    } else if (status.state === 'unknown') {
      console.log();
      console.log(chalk.yellow('💡 建议:'));
      console.log(chalk.yellow('   1. 检查配置是否完整'));
      console.log(chalk.yellow('   2. 使用 "akm edit" 更新配置'));
    }
  }

  /**
   * 打印批量验证结果
   * @private
   * @param {Array} providers - 供应商列表
   * @param {Object} results - 验证结果
   */
  _printBatchResults(providers, results) {
    const currentProvider = this.configManager.getCurrentProvider();

    let onlineCount = 0;
    let offlineCount = 0;
    let unknownCount = 0;

    providers.forEach(provider => {
      const status = results[provider.name];
      const isCurrent = provider.name === currentProvider?.name;
      const statusIcon = isCurrent ? '✅' : '🔹';
      const stateIcon = this._getStateIcon(status.state);
      const stateColor = this._getStateColor(status.state);
      const nameColor = isCurrent ? chalk.green : chalk.white;

      // IDE 类型标签
      const ideTag = provider.ideName === 'codex'
        ? chalk.cyan('[Codex]')
        : chalk.magenta('[Claude]');

      // 别名
      const aliasText = provider.alias ? chalk.yellow(` [别名: ${provider.alias}]`) : '';

      const statusText = status.message || this._getStateLabel(status.state);

      console.log(`${statusIcon} ${stateIcon} ${ideTag} ${nameColor(provider.name)} (${provider.displayName})${aliasText}`);
      console.log(`   ${stateColor(statusText)}`);

      // 统计
      if (status.state === 'online') onlineCount++;
      else if (status.state === 'offline') offlineCount++;
      else unknownCount++;
    });

    // 显示统计
    console.log();
    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.blue('📊 验证统计:'));
    console.log(`   总计: ${providers.length} 个供应商`);
    console.log(`   ${chalk.green('✓')} 可用: ${onlineCount}`);
    console.log(`   ${chalk.red('✗')} 不可用: ${offlineCount}`);
    console.log(`   ${chalk.yellow('?')} 未知: ${unknownCount}`);
  }

  /**
   * 获取状态图标
   * @private
   * @param {string} state - 状态
   * @returns {string} 图标
   */
  _getStateIcon(state) {
    switch (state) {
      case 'online': return '✓';
      case 'offline': return '✗';
      case 'degraded': return '⚠';
      case 'pending': return '⋯';
      default: return '?';
    }
  }

  /**
   * 获取状态标签
   * @private
   * @param {string} state - 状态
   * @returns {string} 标签
   */
  _getStateLabel(state) {
    switch (state) {
      case 'online': return '可用';
      case 'offline': return '不可用';
      case 'degraded': return '降级';
      case 'pending': return '检测中';
      default: return '未知';
    }
  }

  /**
   * 获取状态颜色
   * @private
   * @param {string} state - 状态
   * @returns {Function} 颜色函数
   */
  _getStateColor(state) {
    switch (state) {
      case 'online': return chalk.green;
      case 'offline': return chalk.red;
      case 'degraded': return chalk.yellow;
      case 'pending': return chalk.blue;
      default: return chalk.gray;
    }
  }
}

/**
 * 验证命令
 * @param {string|null} providerName - 供应商名称或别名
 * @param {Object} options - 选项
 * @param {string|null} options.filter - 过滤器
 * @returns {Promise<void>}
 */
async function validateCommand(providerName, options = {}) {
  const validator = new ProviderValidator();

  try {
    if (providerName) {
      await validator.validateOne(providerName);
    } else {
      await validator.validateAll(options.filter || null);
    }
  } catch (error) {
    Logger.error(`验证失败: ${error.message}`);
    throw error;
  }
}

module.exports = { validateCommand, ProviderValidator };
