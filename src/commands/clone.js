/**
 * Provider Clone Command
 * 克隆现有供应商配置
 * @module commands/clone
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const { configManager } = require('../config');
const { validator } = require('../utils/validator');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');
const { BaseCommand } = require('./BaseCommand');
const { getCodexLaunchArgs, checkExclusiveArgs } = require('../utils/launch-args');

/**
 * 供应商克隆器类
 * @extends BaseCommand
 */
class ProviderCloner extends BaseCommand {
  constructor() {
    super();
    this.configManager = configManager;
  }

  async interactive(sourceProviderName) {
    await this.configManager.load();
    const providers = this.configManager.listProviders();

    if (providers.length === 0) {
      Logger.warning('没有可克隆的供应商配置。请先添加一个。');
      return;
    }

    // 选择源供应商
    let source;
    if (sourceProviderName) {
      source = this.configManager.getProvider(sourceProviderName);
      if (!source) {
        Logger.error(`供应商 '${sourceProviderName}' 不存在。`);
        return;
      }
    } else {
      let selection;
      try {
        selection = await this.prompt([
          {
            type: 'list',
            name: 'name',
            message: '请选择要克隆的供应商:',
            choices: [
              ...providers.map(p => ({
                name: `${p.displayName || p.name} ${chalk.gray('(' + p.name + ')')}`,
                value: p.name
              })),
              new inquirer.Separator(),
              { name: '取消', value: null }
            ]
          }
        ]);
      } catch (error) {
        if (this.isEscCancelled(error)) return;
        throw error;
      }
      if (!selection.name) {
        Logger.info('操作已取消。');
        return;
      }
      source = this.configManager.getProvider(selection.name);
    }

    console.log(UIHelper.createTitle(`克隆供应商: ${source.displayName || source.name}`, UIHelper.icons.copy || '📋'));
    console.log();

    const isCodex = source.ideName === 'codex';
    const escListener = this.createESCListener(() => {
      Logger.info('取消克隆供应商。');
    }, '取消克隆');

    try {
      // 输入新名称和显示名称
      let basicInfo;
      try {
        basicInfo = await this.prompt([
          {
            type: 'input',
            name: 'name',
            message: '新供应商名称:',
            validate: (input) => {
              if (!input || !input.trim()) return '名称不能为空';
              if (input.trim() === source.name) return '新名称不能与源供应商相同';
              const err = validator.validateName(input.trim());
              if (err) return err;
              if (this.configManager.getProvider(input.trim())) return `供应商 '${input.trim()}' 已存在，请使用其他名称`;
              return true;
            }
          },
          {
            type: 'input',
            name: 'displayName',
            message: '新显示名称:',
            default: `${source.displayName || source.name} (副本)`,
            validate: (input) => validator.validateDisplayName(input) || true
          }
        ]);
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) return;
        throw error;
      }

      // 选择要修改的字段
      let fieldsToModify;
      try {
        const fieldChoices = [
          { name: `🔑 Token（当前: ${source.authToken ? source.authToken.slice(0, 8) + '...' : '未设置'}）`, value: 'authToken', checked: true },
          { name: `🌐 基础URL（当前: ${source.baseUrl || '默认'}）`, value: 'baseUrl' }
        ];
        if (!isCodex) {
          fieldChoices.push({ name: `🔐 认证模式（当前: ${source.authMode || 'api_key'}）`, value: 'authMode' });
        }
        fieldChoices.push({ name: '🚀 启动参数', value: 'launchArgs' });

        const fieldSelection = await this.prompt([
          {
            type: 'checkbox',
            name: 'fields',
            message: '选择要修改的字段（默认推荐修改 Token）:',
            choices: fieldChoices
          }
        ]);
        fieldsToModify = fieldSelection.fields;
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) return;
        throw error;
      }

      // 收集修改值
      const overrides = {};
      if (fieldsToModify.length > 0) {
        const questions = [];

        if (fieldsToModify.includes('authToken')) {
          questions.push({
            type: 'input',
            name: 'authToken',
            message: isCodex ? 'OpenAI API Key:' : 'Token:',
            default: source.authToken,
            validate: (input) => validator.validateToken(input) || true
          });
        }

        if (fieldsToModify.includes('baseUrl')) {
          questions.push({
            type: 'input',
            name: 'baseUrl',
            message: 'API 基础URL（留空使用默认）:',
            default: source.baseUrl || '',
            validate: (input) => {
              if (!input) return true;
              return validator.validateUrl(input) || true;
            }
          });
        }

        if (!isCodex && fieldsToModify.includes('authMode')) {
          questions.push({
            type: 'list',
            name: 'authMode',
            message: '认证模式:',
            choices: [
              { name: '🔑 ANTHROPIC_API_KEY - 大多数第三方代理使用', value: 'api_key' },
              { name: '🔐 ANTHROPIC_AUTH_TOKEN - 部分服务商使用', value: 'auth_token' }
            ],
            default: source.authMode || 'api_key'
          });
        }

        if (fieldsToModify.includes('launchArgs')) {
          if (isCodex) {
            const codexArgs = getCodexLaunchArgs();
            questions.push({
              type: 'checkbox',
              name: 'launchArgs',
              message: 'Codex 启动参数:',
              choices: codexArgs.map(arg => ({
                name: `${arg.label} (${arg.name})${arg.description ? ' - ' + arg.description : ''}`,
                value: arg.name,
                checked: (source.launchArgs || []).includes(arg.name)
              })),
              validate: (selected) => checkExclusiveArgs(selected, codexArgs) || true
            });
          } else {
            questions.push({
              type: 'checkbox',
              name: 'launchArgs',
              message: '启动参数:',
              choices: validator.getAvailableLaunchArgs().map(arg => ({
                name: `${arg.label || arg.name} (${arg.name})${arg.description ? ' - ' + arg.description : ''}`,
                value: arg.name,
                checked: (source.launchArgs || []).includes(arg.name)
              }))
            });
          }
        }

        if (questions.length > 0) {
          let modifiedValues;
          try {
            modifiedValues = await this.prompt(questions);
          } catch (error) {
            this.removeESCListener(escListener);
            if (this.isEscCancelled(error)) return;
            throw error;
          }
          Object.assign(overrides, modifiedValues);
        }
      }

      this.removeESCListener(escListener);

      // 保存克隆的供应商
      const newName = basicInfo.name.trim();
      const authMode = overrides.authMode || source.authMode;
      const baseUrl = overrides.baseUrl !== undefined ? overrides.baseUrl : source.baseUrl;

      await this.configManager.addProvider(newName, {
        displayName: basicInfo.displayName,
        ideName: source.ideName,
        authToken: overrides.authToken !== undefined ? overrides.authToken : source.authToken,
        baseUrl,
        authMode,
        launchArgs: overrides.launchArgs !== undefined ? overrides.launchArgs : (source.launchArgs || []),
        primaryModel: source.models?.primary || null,
        smallFastModel: source.models?.smallFast || null,
        setAsDefault: false
      });

      Logger.success(`供应商 '${basicInfo.displayName}' 克隆成功！`);
      console.log(chalk.gray(`  源供应商: ${source.displayName || source.name}  →  新供应商: ${basicInfo.displayName} (${newName})`));
      console.log();

    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) return;
      throw error;
    }
  }
}

async function cloneCommand(sourceProviderName) {
  const cloner = new ProviderCloner();
  try {
    await cloner.interactive(sourceProviderName);
  } catch (error) {
    if (!cloner.isEscCancelled(error)) {
      Logger.error(`克隆供应商失败: ${error.message}`);
    }
  } finally {
    cloner.destroy();
  }
}

module.exports = { cloneCommand, ProviderCloner };
