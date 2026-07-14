/**
 * Provider Remover Command
 * 删除供应商配置
 * @module commands/remove
 */

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
    console.log(UIHelper.createTooltip('选择要删除的供应商（可多选）'));
    console.log();

    const choices = providers.map(provider => ({
      name: `${provider.current ? '✅' : '🔹'} ${provider.name} (${provider.displayName})${provider.current ? ' - 当前使用中' : ''}`,
      value: provider.name,
      checked: false
    }));

    // 设置 ESC 键监听
    const escListener = this.createESCListener(async () => {
      Logger.info('取消删除供应商');
      // 使用CommandRegistry避免循环引用
      const { registry } = require('../CommandRegistry');
      await registry.executeCommand('switch');
    }, '取消删除');

    try {
      let answer;
      try {
        answer = await this.prompt([
          {
            type: 'checkbox',
            name: 'providers',
            message: '选择要删除的供应商（空格选择，Enter确认）:',
            choices,
            pageSize: 10,
            validate: (selected) => {
              if (selected.length === 0) {
                return '请至少选择一个供应商';
              }
              return true;
            }
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

      if (!answer.providers || answer.providers.length === 0) {
        Logger.info('删除操作已取消');
        return;
      }

      // 显示将要删除的供应商列表
      console.log();
      console.log(UIHelper.createTitle(`即将删除 ${answer.providers.length} 个供应商`, '⚠️'));
      answer.providers.forEach(name => {
        const provider = this.configManager.getProvider(name);
        console.log(`  • ${provider.displayName} (${name})`);
      });
      console.log();

      // 最终确认
      let finalConfirm;
      try {
        finalConfirm = await this.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `确定要删除这 ${answer.providers.length} 个供应商吗？`,
            default: false
          }
        ]);
      } catch (error) {
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      if (!finalConfirm.confirm) {
        Logger.warning('删除操作已取消');
        return;
      }

      // 批量删除
      let successCount = 0;
      let failCount = 0;
      for (const providerName of answer.providers) {
        try {
          const provider = this.configManager.getProvider(providerName);
          await this.configManager.removeProvider(providerName);
          Logger.success(`✓ 已删除: ${provider.displayName}`);
          successCount++;
        } catch (error) {
          Logger.error(`✗ 删除失败: ${providerName} - ${error.message}`);
          failCount++;
        }
      }

      console.log();
      Logger.success(`删除完成: 成功 ${successCount} 个${failCount > 0 ? `, 失败 ${failCount} 个` : ''}`);

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
