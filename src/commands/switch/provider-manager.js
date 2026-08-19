/**
 * Provider Manager
 * 供应商管理功能（详情、编辑、删除）
 */

const { configManager } = require('../../config');
const { Logger } = require('../../utils/logger');
const { UIHelper } = require('../../utils/ui-helper');
const { AUTH_MODE_DISPLAY, BASE_URL } = require('../../constants');
const { ProviderDetailsHelper } = require('./provider-details-helper');
const { ProviderEditQuestionsHelper } = require('./provider-edit-questions-helper');
const { validator } = require('../../utils/validator');

class ProviderManager {
  constructor(baseCommand) {
    this.baseCommand = baseCommand;
    this.configManager = configManager;
  }

  async showProviderDetails(providerName, onBack, onEdit, onRemove, onLaunch) {
    try {
      await this.configManager.load();
      const provider = this.configManager.getProvider(providerName);

      if (!provider) {
        Logger.error(`供应商 '${providerName}' 不存在`);
        return await onBack();
      }

      this.baseCommand.clearScreen();
      console.log(UIHelper.createTitle('供应商详情', UIHelper.icons.info));
      console.log();
      console.log(UIHelper.createHintLine([
        ['↑ / ↓', '选择操作'],
        ['Enter', '确认'],
        ['ESC', '返回管理列表']
      ]));
      console.log();

      const details = ProviderDetailsHelper.buildDetailsRows(provider, {
        authModeDisplay: AUTH_MODE_DISPLAY,
        baseUrl: BASE_URL,
        formatTime: UIHelper.formatTime
      });

      console.log(UIHelper.createTable(['项目', '信息'], details));
      console.log();

      const launchArgsText = ProviderDetailsHelper.formatLaunchArgs(provider);
      if (launchArgsText) {
        console.log(UIHelper.createCard('默认启动参数', launchArgsText, UIHelper.icons.settings));
        console.log();
      }

      const answer = await this.baseCommand.promptWithESC([
        {
          type: 'list',
          name: 'action',
          message: '选择操作:',
          choices: ProviderDetailsHelper.buildActionChoices(UIHelper.icons)
        }
      ], '返回管理列表', () => {
        Logger.info('返回管理列表');
      });

      switch (answer.action) {
      case 'back':
        return await onBack();
      case 'edit':
        return await onEdit(providerName);
      case 'remove':
        return await onRemove(providerName);
      case 'launch':
        return await onLaunch(providerName);
      }
    } catch (error) {
      if (this.baseCommand.isEscCancelled(error)) {
        return await onBack();
      }
      throw error;
    }
  }

  async editProvider(providerName, onComplete) {
    try {
      await this.configManager.load();
      const provider = this.configManager.getProvider(providerName);

      if (!provider) {
        Logger.error(`供应商 '${providerName}' 不存在`);
        return await onComplete();
      }

      this.baseCommand.clearScreen();
      console.log(UIHelper.createTitle(`编辑供应商: ${provider.displayName || provider.name}`, UIHelper.icons.edit));
      console.log();

      const isCodex = provider.ideName === 'codex';
      const questions = ProviderEditQuestionsHelper.buildQuestions(provider, validator);

      let answers;
      try {
        answers = await this.baseCommand.promptWithESC(questions, '取消编辑', () => {
          Logger.info('取消编辑供应商');
        });
      } catch (error) {
        if (this.baseCommand.isEscCancelled(error)) {
          return await onComplete();
        }
        throw error;
      }

      const originalConfig = this.configManager.config;
      const originalName = provider.name;
      const newName = answers.name;

      if (newName !== originalName && originalConfig.providers[newName]) {
        Logger.error(`供应商名称 '${newName}' 已存在，请使用其他名称`);
        return await onComplete();
      }

      // 在内存中构造快照，校验和保存失败时不污染当前配置对象。
      const updatedProvider = {
        ...provider,
        name: newName,
        displayName: answers.displayName || provider.displayName || newName,
        baseUrl: answers.baseUrl || null,
        authToken: answers.authToken,
        launchArgs: Array.isArray(answers.launchArgs)
          ? answers.launchArgs
          : (provider.launchArgs || [])
      };

      if (!isCodex) {
        updatedProvider.authMode = answers.authMode;
        updatedProvider.models = {
          ...(provider.models || {}),
          primary: answers.primaryModel || null,
          smallFast: answers.smallFastModel || null
        };
      } else {
        updatedProvider.authMode = answers.authMode || provider.authMode || 'api_key';
        if (updatedProvider.authMode === 'chatgpt_login') {
          updatedProvider.baseUrl = null;
          updatedProvider.authToken = null;
        }
        updatedProvider.models = null;
      }

      updatedProvider.ideName = isCodex ? 'codex' : 'claude';

      const providers = { ...originalConfig.providers };
      delete providers[originalName];
      providers[newName] = updatedProvider;
      const nextConfig = {
        ...originalConfig,
        currentProvider:
          originalConfig.currentProvider === originalName
            ? newName
            : originalConfig.currentProvider,
        providers
      };

      await this.configManager.save(nextConfig);
      Logger.success(`供应商 '${newName}' 已更新`);

      return await onComplete();
    } catch (error) {
      Logger.error(`编辑供应商失败: ${error.message}`);
      throw error;
    }
  }

  async removeProvider(providerName, onComplete) {
    try {
      await this.configManager.load();
      const provider = this.configManager.getProvider(providerName);

      if (!provider) {
        Logger.error(`供应商 '${providerName}' 不存在`);
        return await onComplete();
      }

      let confirm;
      try {
        confirm = await this.baseCommand.promptWithESC([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `确定要删除供应商 '${provider.displayName || providerName}' 吗?`,
            default: false
          }
        ], '取消删除', () => {
          Logger.info('取消删除供应商');
        });
      } catch (error) {
        if (this.baseCommand.isEscCancelled(error)) {
          return await onComplete();
        }
        throw error;
      }

      if (confirm.confirmed) {
        await this.configManager.removeProvider(providerName);
        Logger.success(`供应商 '${providerName}' 已删除`);
      } else {
        Logger.info('删除操作已取消');
      }

      return await onComplete();
    } catch (error) {
      Logger.error(`删除供应商失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { ProviderManager };
