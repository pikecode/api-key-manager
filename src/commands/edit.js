/**
 * Provider Editor Command
 * 编辑现有供应商配置
 * @module commands/edit
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const { configManager } = require('../config');
const { validator } = require('../utils/validator');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');
const { BaseCommand } = require('./BaseCommand');
const { AUTH_MODE_DISPLAY, IDE_NAMES } = require('../constants');

/**
 * 供应商编辑器类
 * 用于交互式编辑现有的 API 供应商配置
 * @extends BaseCommand
 */
class ProviderEditor extends BaseCommand {
  /**
   * 创建供应商编辑器实例
   */
  constructor() {
    super();
    this.configManager = configManager;
  }

  /**
   * 执行交互式编辑供应商流程
   * @param {string} [providerName] - 要编辑的供应商名称，如果不提供则让用户选择
   * @returns {Promise<void>}
   */
  async interactive(providerName) {
    await this.configManager.load();
    const providers = this.configManager.listProviders();

    if (providers.length === 0) {
      Logger.warning('没有可编辑的供应商配置。请先添加一个。');
      return;
    }

    let providerToEdit;
    if (providerName) {
      providerToEdit = this.configManager.getProvider(providerName);
      if (!providerToEdit) {
        Logger.error(`供应商 '${providerName}' 不存在。`);
        return;
      }
    } else {
      let selection;
      try {
        selection = await this.prompt([
          {
            type: 'list',
            name: 'selectedProviderName',
            message: '请选择要编辑的供应商:',
            choices: [
              ...providers.map(p => ({ name: p.displayName || p.name, value: p.name })),
              new inquirer.Separator(),
              { name: '取消', value: null }
            ]
          }
        ]);
      } catch (error) {
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      const { selectedProviderName } = selection;

      if (!selectedProviderName) {
        Logger.info('操作已取消。');
        return;
      }
      providerToEdit = this.configManager.getProvider(selectedProviderName);
    }

    console.log(UIHelper.createTitle(`编辑供应商: ${providerToEdit.displayName}`, UIHelper.icons.edit));
    console.log();
    console.log(UIHelper.createTooltip('请更新供应商配置信息。按 Enter 键接受默认值。'));
    console.log();

    const isCodex = providerToEdit.ideName === 'codex';

    const escListener = this.createESCListener(() => {
      Logger.info('取消编辑供应商。');
      const { registry } = require('../CommandRegistry');
      registry.executeCommand('switch');
    }, '取消编辑');

    try {
      let answers;
      try {
        const questions = [
          {
            type: 'input',
            name: 'displayName',
            message: '供应商名称:',
            default: providerToEdit.displayName,
            validate: (input) => validator.validateDisplayName(input) || true
          }
        ];

        if (isCodex) {
          const existingLaunchArgs = Array.isArray(providerToEdit.launchArgs) ? providerToEdit.launchArgs : [];
          const { getCodexLaunchArgs, checkExclusiveArgs } = require('../utils/launch-args');
          const codexArgs = getCodexLaunchArgs();

          const knownCodexArgNames = new Set(codexArgs.map(arg => arg.name));
          const customCodexArgs = existingLaunchArgs
            .filter(arg => typeof arg === 'string' && !knownCodexArgNames.has(arg));

          questions.push(
            {
              type: 'input',
              name: 'baseUrl',
              message: 'OpenAI API 基础URL (留空使用官方API):',
              default: providerToEdit.baseUrl || '',
              validate: (input) => {
                if (!input) return true;
                return validator.validateUrl(input) || true;
              }
            },
            {
              type: 'input',
              name: 'authToken',
              message: 'OpenAI API Key (OPENAI_API_KEY):',
              default: providerToEdit.authToken,
              validate: (input) => {
                if (!input) return 'API Key 不能为空';
                return validator.validateToken(input) || true;
              }
            },
            {
              type: 'checkbox',
              name: 'launchArgs',
              message: 'Codex 启动参数:',
              choices: [
                ...codexArgs.map(arg => ({
                  name: `${arg.label} (${arg.name})${arg.description ? ' - ' + arg.description : ''}`,
                  value: arg.name,
                  checked: existingLaunchArgs.includes(arg.name)
                })),
                ...customCodexArgs.map(arg => ({
                  name: `${arg} ${chalk.gray('(自定义参数)')}`,
                  value: arg,
                  checked: true
                }))
              ],
              validate: (selected) => {
                const conflictError = checkExclusiveArgs(selected, codexArgs);
                if (conflictError) {
                  return conflictError;
                }
                return true;
              }
            }
          );
        } else {
          questions.push(
            {
              type: 'list',
              name: 'authMode',
              message: '认证模式:',
              choices: [
                { name: '🔑 ANTHROPIC_API_KEY - 大多数第三方代理使用', value: 'api_key' },
                { name: '🔐 ANTHROPIC_AUTH_TOKEN - 部分服务商使用', value: 'auth_token' }
              ],
              default: providerToEdit.authMode
            },
            {
              type: 'input',
              name: 'baseUrl',
              message: 'API 基础URL (ANTHROPIC_BASE_URL):',
              default: providerToEdit.baseUrl || '',
              validate: (input) => {
                if (!input) return 'API 基础URL不能为空';
                return validator.validateUrl(input) || true;
              }
            },
            {
              type: 'input',
              name: 'authToken',
              message: (answers) => {
                const envVar = answers.authMode === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
                return `Token (${envVar}):`;
              },
              default: providerToEdit.authToken,
              validate: (input) => validator.validateToken(input) || true
            },
            {
              type: 'checkbox',
              name: 'launchArgs',
              message: '启动参数:',
              choices: validator.getAvailableLaunchArgs().map(arg => ({
                name: `${arg.label || arg.name} (${arg.name})${arg.description ? ' - ' + arg.description : ''}`,
                value: arg.name,
                checked: providerToEdit.launchArgs && providerToEdit.launchArgs.includes(arg.name)
              }))
            }
          );
        }

        answers = await this.prompt(questions);
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      this.removeESCListener(escListener);

      await this.saveProvider(providerToEdit.name, answers);

    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }
  }

  async saveProvider(name, answers) {
    try {
      const existingProvider = this.configManager.getProvider(name);
      const ideName = existingProvider?.ideName || 'claude';

      if (ideName === 'codex') {
        await this.configManager.addProvider(name, {
          displayName: answers.displayName,
          ideName: 'codex',
          baseUrl: answers.baseUrl || null,
          authToken: answers.authToken,
          launchArgs: answers.launchArgs,
          setAsDefault: false
        });
      } else {
        // Re-use addProvider which can overwrite existing providers
        await this.configManager.addProvider(name, {
          displayName: answers.displayName,
          ideName,
          baseUrl: answers.baseUrl,
          authToken: answers.authToken,
          authMode: answers.authMode,
          launchArgs: answers.launchArgs,
          // Retain original model settings unless we add editing for them
          primaryModel: existingProvider.models?.primary || null,
          smallFastModel: existingProvider.models?.smallFast || null,
          setAsDefault: false // Don't change default status on edit
        });
      }

      Logger.success(`供应商 '${answers.displayName}' 更新成功！`);

      console.log(chalk.green('\n🎉 供应商编辑完成！正在返回主界面...'));
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { registry } = require('../CommandRegistry');
      return await registry.executeCommand('switch');

    } catch (error) {
      if (this.isEscCancelled(error)) {
        return;
      }
      Logger.error(`更新供应商失败: ${error.message}`);
      throw error;
    }
  }
}

async function editCommand(providerName) {
  const editor = new ProviderEditor();
  try {
    await editor.interactive(providerName);
  } catch (error) {
    if (!editor.isEscCancelled(error)) {
      Logger.error(`编辑供应商失败: ${error.message}`);
    }
  } finally {
    editor.destroy();
  }
}

module.exports = { editCommand, ProviderEditor };
