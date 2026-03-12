/**
 * Provider Adder Command
 * 添加新供应商的交互式命令
 * @module commands/add
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const { configManager } = require('../config');
const { validator } = require('../utils/validator');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');
const { BaseCommand } = require('./BaseCommand');
const { promptProviderInfo, promptLaunchArgs, promptModelConfig, promptCodexLaunchArgs } = require('./add/prompts');
const { importCodexConfig } = require('./add/codexImporter');
const { saveProvider } = require('./add/providerSaver');
const { printProviderSummary } = require('./add/summaryPrinter');

/**
 * 供应商添加器类
 * 用于交互式添加新的 API 供应商配置
 * @extends BaseCommand
 */
class ProviderAdder extends BaseCommand {
  /**
   * 创建供应商添加器实例
   * @param {Object} options - 配置选项
   * @param {string} [options.ideName] - 预设的 IDE 名称（claude-code 或 codex）
   */
  constructor(options = {}) {
    super();
    this.configManager = configManager;
    this.presetIdeName = options.ideName || null;
  }

  /**
   * 执行交互式添加供应商流程
   * @returns {Promise<void>}
   */
  async interactive() {
    console.log(UIHelper.createTitle('添加新供应商', UIHelper.icons.add));
    console.log();
    console.log(UIHelper.createTooltip('请填写供应商配置信息'));
    console.log();
    console.log(UIHelper.createStepIndicator(1, 2, '填写供应商信息'));
    console.log(UIHelper.createHintLine([
      ['Enter', '确认输入'],
      ['Tab', '切换字段'],
      ['ESC', '取消添加']
    ]));
    console.log();

    try {
      return await this.addCustomProvider();
    } catch (error) {
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }
  }

  async addCustomProvider() {
    try {
      const answers = await promptProviderInfo(this);

      // 如果是预设的 ideName，设置到 answers 中
      if (!answers.ideName && this.presetIdeName) {
        answers.ideName = this.presetIdeName;
      }

      if (answers.ideName === 'codex') {
        answers.authMode = 'openai_api_key';
        answers.codexFiles = null;

        // 从现有配置导入
        if (answers.importFromExisting === 'import') {
          const importedConfig = await importCodexConfig();
          if (importedConfig) {
            answers.authToken = importedConfig.apiKey;
            answers.baseUrl = importedConfig.baseUrl;
          } else {
            Logger.warning('未能导入现有配置，请手动输入');
            const manualAnswers = await this.prompt([
              {
                type: 'input',
                name: 'baseUrl',
                message: '请输入 OpenAI API 基础URL (如使用官方API可留空):',
                default: ''
              },
              {
                type: 'input',
                name: 'authToken',
                message: '请输入 OpenAI API Key (OPENAI_API_KEY):',
                validate: (input) => input ? true : 'API Key 不能为空'
              }
            ]);
            answers.authToken = manualAnswers.authToken;
            answers.baseUrl = manualAnswers.baseUrl;
          }
        }

        // Codex 启动参数配置
        if (answers.configureCodexLaunchArgs) {
          answers.launchArgs = await promptCodexLaunchArgs(this);
        }
      }

      await saveProvider(this, answers);
    } catch (error) {
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }
  }

  async confirmOverwrite(name) {
    try {
      const { overwrite } = await this.promptWithESC([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `供应商 '${name}' 已存在，是否覆盖?`,
          default: false
        }
      ], '取消覆盖', () => {
        Logger.info('取消覆盖供应商');
        const { registry } = require('../CommandRegistry');
        registry.executeCommand('switch');
      });

      return overwrite;
    } catch (error) {
      throw error;
    }
  }

  async pauseBeforeReturn(delay = 1500) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function addCommand(options = {}) {
  const adder = new ProviderAdder(options);
  try {
    await adder.interactive();
  } catch (error) {
    if (!adder.isEscCancelled(error)) {
      Logger.error(`添加供应商失败: ${error.message}`);
    }
  } finally {
    adder.destroy();
  }
}

module.exports = { addCommand, ProviderAdder };
