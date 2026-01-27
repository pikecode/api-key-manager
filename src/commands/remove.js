/**
 * Provider Remover Command
 * 删除供应商配置
 * @module commands/remove
 */

const inquirer = require('inquirer');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');
const { BaseCommand } = require('./BaseCommand');

/**
 * 供应商删除器类
 * 用于删除已配置的 API 供应商
 * @extends BaseCommand
 */
class ProviderRemover extends BaseCommand {
  /**
   * 创建供应商删除器实例
   */
  constructor() {
    super();
    this.configManager = configManager;
  }

  /**
   * 删除供应商配置
   * @param {string} [providerName] - 要删除的供应商名称，如果不提供则进入交互式选择
   * @returns {Promise<void>}
   */
  async remove(providerName) {
    try {
      await this.configManager.ensureLoaded();

      // 如果没有指定供应商名称，显示选择列表
      if (!providerName) {
        return await this.interactiveRemove();
      }

      // 直接删除指定供应商
      if (!this.configManager.getProvider(providerName)) {
        Logger.error(`供应商 '${providerName}' 不存在`);
        return;
      }

      const provider = this.configManager.getProvider(providerName);
      let confirm;
      try {
        confirm = await this.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `确定要删除供应商 '${provider.displayName}' 吗?`,
            default: false
          }
        ]);
      } catch (error) {
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      if (!confirm.confirm) {
        Logger.warning('删除操作已取消');
        return;
      }

      await this.configManager.removeProvider(providerName);
      Logger.success(`供应商 '${provider.displayName}' 已删除`);

    } catch (error) {
      if (this.isEscCancelled(error)) {
        return;
      }
      Logger.error(`删除供应商失败: ${error.message}`);
      throw error;
    }
  }

  async interactiveRemove() {
    await this.configManager.ensureLoaded();
    const providers = this.configManager.listProviders();

    if (providers.length === 0) {
      Logger.warning('暂无配置的供应商');
      return;
    }

    console.log(UIHelper.createTitle('删除供应商', UIHelper.icons.delete));
    console.log();
    console.log(UIHelper.createTooltip('选择要删除的供应商'));
    console.log();

    const choices = providers.map(provider => ({
      name: `${provider.current ? '✅' : '🔹'} ${provider.name} (${provider.displayName})${provider.current ? ' - 当前使用中' : ''}`,
      value: provider.name,
      short: provider.name
    }));

    choices.push(
      new inquirer.Separator(),
      { name: '❌ 取消删除', value: '__CANCEL__' }
    );

    // 对于删除操作，不默认选中当前供应商，而是选中第一个非当前的供应商
    const nonCurrentProvider = providers.find(p => !p.current);
    const defaultChoice = nonCurrentProvider ? nonCurrentProvider.name : providers[0]?.name;

    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('取消删除供应商');
      // 使用CommandRegistry避免循环引用
      const { registry } = require('../CommandRegistry');
      registry.executeCommand('switch');
    }, '取消删除');

    try {
      let answer;
      try {
        answer = await this.prompt([
          {
            type: 'list',
            name: 'provider',
            message: '选择要删除的供应商:',
            choices,
            default: defaultChoice,
            pageSize: 10
          }
        ]);
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      this.removeESCListener(escListener);

      if (answer.provider === '__CANCEL__') {
        Logger.info('删除操作已取消');
        return;
      }

      await this.remove(answer.provider);
    } catch (error) {
      this.removeESCListener(escListener);
      throw error;
    }
  }
}

async function removeCommand(providerName) {
  const remover = new ProviderRemover();
  try {
    await remover.remove(providerName);
  } catch (error) {
    if (!remover.isEscCancelled(error)) {
      Logger.error(`删除供应商失败: ${error.message}`);
    }
  } finally {
    // 确保资源清理
    remover.destroy();
  }
}

module.exports = { removeCommand, ProviderRemover };
