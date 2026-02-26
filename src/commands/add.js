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
const {
  AUTH_MODE_DISPLAY_DETAILED,
  IDE_NAMES
} = require('../constants');

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
      const answers = await this.promptWithESC([
        {
          type: 'list',
          name: 'ideName',
          message: '选择要管理的 IDE:',
          choices: [
            { name: 'Claude Code (Anthropic)', value: 'claude' },
            { name: 'Codex CLI (OpenAI)', value: 'codex' }
          ],
          default: this.presetIdeName || 'claude',
          when: () => !this.presetIdeName
        },
        {
          type: 'list',
          name: 'importFromExisting',
          message: '是否从现有 Codex 配置导入?',
          choices: [
            { name: '从 ~/.codex 导入现有配置', value: 'import' },
            { name: '手动输入配置', value: 'manual' }
          ],
          default: 'import',
          when: (answers) => (answers.ideName || this.presetIdeName) === 'codex'
        },
        {
          type: 'input',
          name: 'name',
          message: '请输入供应商名称:',
          validate: (input) => {
            const error = validator.validateName(input);
            if (error) return error;
            return true;
          }
        },
        {
          type: 'list',
          name: 'authMode',
          message: '选择认证模式:',
          choices: [
            { name: '🔑 ANTHROPIC_API_KEY - 大多数第三方代理使用', value: 'api_key' },
            { name: '🔐 ANTHROPIC_AUTH_TOKEN - 部分服务商使用', value: 'auth_token' }
          ],
          default: 'api_key',
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex'
        },
        {
          type: 'input',
          name: 'baseUrl',
          message: '请输入 API 基础URL (ANTHROPIC_BASE_URL):',
          validate: (input) => {
            if (!input) return 'API 基础URL不能为空';
            const error = validator.validateUrl(input);
            if (error) return error;
            return true;
          },
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex'
        },
        {
          type: 'input',
          name: 'authToken',
          message: (answers) => {
            const envVar = answers.authMode === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
            return `请输入 Token (${envVar}):`;
          },
          validate: (input) => {
            const error = validator.validateToken(input);
            if (error) return error;
            return true;
          },
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex'
        },
        {
          type: 'input',
          name: 'baseUrl',
          message: '请输入 OpenAI API 基础URL (如使用官方API可留空):',
          default: '',
          validate: (input) => {
            if (!input) return true;
            const error = validator.validateUrl(input);
            if (error) return error;
            return true;
          },
          when: (answers) => (answers.ideName || this.presetIdeName) === 'codex' && answers.importFromExisting === 'manual'
        },
        {
          type: 'input',
          name: 'authToken',
          message: '请输入 OpenAI API Key (OPENAI_API_KEY):',
          validate: (input) => {
            if (!input) return 'API Key 不能为空';
            const error = validator.validateToken(input);
            if (error) return error;
            return true;
          },
          when: (answers) => (answers.ideName || this.presetIdeName) === 'codex' && answers.importFromExisting === 'manual'
        },
        {
          type: 'confirm',
          name: 'setAsDefault',
          message: '是否设置为当前供应商?',
          default: true
        },
        {
          type: 'confirm',
          name: 'configureLaunchArgs',
          message: '是否配置启动参数?',
          default: false,
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex'
        },
        {
          type: 'confirm',
          name: 'configureCodexLaunchArgs',
          message: '是否配置 Codex 启动参数?',
          default: false,
          when: (answers) => (answers.ideName || this.presetIdeName) === 'codex'
        },
        {
          type: 'confirm',
          name: 'configureModels',
          message: '是否配置模型参数?',
          default: false,
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex'
        }
      ], '取消添加', () => {
        Logger.info('取消添加供应商');
        // 使用CommandRegistry避免循环引用
        const { registry } = require('../CommandRegistry');
        registry.executeCommand('switch');
      });

      // 如果是预设的 ideName，设置到 answers 中
      if (!answers.ideName && this.presetIdeName) {
        answers.ideName = this.presetIdeName;
      }

      if (answers.ideName === 'codex') {
        answers.authMode = 'openai_api_key';
        answers.codexFiles = null;

        // 从现有配置导入
        if (answers.importFromExisting === 'import') {
          const importedConfig = await this.importCodexConfig();
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
          answers.launchArgs = await this.promptCodexLaunchArgsSelection();
        }
      }

      await this.saveProvider(answers);
    } catch (error) {
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }
  }

  async saveProvider(answers) {
    try {
      await this.configManager.load();

      if (this.configManager.getProvider(answers.name)) {
        const shouldOverwrite = await this.confirmOverwrite(answers.name);
        if (!shouldOverwrite) {
          Logger.warning('操作已取消');
          return;
        }
      }

      const launchArgs = answers.ideName === 'codex'
        ? (Array.isArray(answers.launchArgs) ? answers.launchArgs : [])
        : (answers.configureLaunchArgs ? await this.promptLaunchArgsSelection() : []);

      const modelConfig = answers.configureModels
        ? await this.promptModelConfiguration()
        : { primaryModel: null, smallFastModel: null };

      await this.configManager.addProvider(answers.name, {
        displayName: answers.displayName || answers.name,
        ideName: answers.ideName || 'claude',
        baseUrl: answers.baseUrl,
        authToken: answers.authToken,
        authMode: answers.authMode,
        codexFiles: answers.codexFiles || null,
        launchArgs,
        primaryModel: modelConfig.primaryModel,
        smallFastModel: modelConfig.smallFastModel,
        setAsDefault: answers.setAsDefault
      });

      this.printProviderSummary(answers, launchArgs, modelConfig);
      await this.pauseBeforeReturn();

      const { registry } = require('../CommandRegistry');
      return await registry.executeCommand('switch');
    } catch (error) {
      if (this.isEscCancelled(error)) {
        return;
      }
      Logger.error(`添加供应商失败: ${error.message}`);
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
        const { switchCommand } = require('./switch');
        switchCommand();
      });

      return overwrite;
    } catch (error) {
      throw error;
    }
  }

  async promptLaunchArgsSelection() {
    console.log(UIHelper.createTitle('配置启动参数', UIHelper.icons.settings));
    console.log();
    console.log(UIHelper.createTooltip('选择要使用的启动参数'));
    console.log();
    console.log(UIHelper.createStepIndicator(2, 2, '可选: 配置启动参数'));
    console.log(UIHelper.createHintLine([
      ['空格', '切换选中'],
      ['A', '全选'],
      ['I', '反选'],
      ['Enter', '确认选择'],
      ['ESC', '跳过配置']
    ]));
    console.log();

    const result = await this.promptWithESCAndDefault([
      {
        type: 'checkbox',
        name: 'launchArgs',
        message: '请选择启动参数:',
        choices: validator.getAvailableLaunchArgs().map(arg => ({
          name: `${arg.name} - ${arg.description}`,
          value: arg.name,
          checked: false
        }))
      }
    ], '跳过配置', () => {
      Logger.info('跳过启动参数配置');
    }, { launchArgs: [] });

    return result.launchArgs;
  }

  async promptModelConfiguration() {
    console.log(UIHelper.createTitle('配置模型参数', UIHelper.icons.settings));
    console.log();
    console.log(UIHelper.createTooltip('配置主模型和快速模型（可选）'));
    console.log();
    console.log(UIHelper.createStepIndicator(2, 2, '可选: 配置模型参数'));
    console.log(UIHelper.createHintLine([
      ['Enter', '确认输入'],
      ['ESC', '跳过配置']
    ]));
    console.log();

    const responses = await this.promptWithESCAndDefault([
      {
        type: 'input',
        name: 'primaryModel',
        message: '主模型 (ANTHROPIC_MODEL)：',
        default: '',
        validate: (input) => {
          const error = validator.validateModel(input);
          if (error) return error;
          return true;
        }
      },
      {
        type: 'input',
        name: 'smallFastModel',
        message: '快速模型 (ANTHROPIC_SMALL_FAST_MODEL)：',
        default: '',
        validate: (input) => {
          const error = validator.validateModel(input);
          if (error) return error;
          return true;
        }
      }
    ], '跳过配置', () => {
      Logger.info('跳过模型参数配置');
    }, { primaryModel: null, smallFastModel: null });

    return {
      primaryModel: responses.primaryModel,
      smallFastModel: responses.smallFastModel
    };
  }

  async importCodexConfig() {
    try {
      const { readCodexFiles, extractBaseUrlFromConfigToml } = require('../utils/codex-files');
      const codexFiles = await readCodexFiles();

      if (!codexFiles.authJson) {
        return null;
      }

      // 解析 auth.json 获取 API Key
      const authData = JSON.parse(codexFiles.authJson);
      const apiKey = authData.api_key || authData.openai_api_key || authData.OPENAI_API_KEY;

      if (!apiKey) {
        return null;
      }

      // 从 config.toml 中读取当前激活 provider 的 base_url
      // 优先从 [model_providers.<key>] section 读取，兼容旧的顶层 api_base_url 格式
      let baseUrl = null;
      if (codexFiles.configToml) {
        baseUrl = extractBaseUrlFromConfigToml(codexFiles.configToml);
        if (!baseUrl) {
          // 兼容旧格式（akm 之前错误写入的顶层字段）
          const legacyMatch = codexFiles.configToml.match(/^api_base_url\s*=\s*["']([^"']+)["']/m);
          if (legacyMatch) baseUrl = legacyMatch[1];
        }
      }

      Logger.success(`成功从 ${codexFiles.codexHome} 导入配置`);
      return { apiKey, baseUrl };
    } catch (error) {
      Logger.warning(`导入配置失败: ${error.message}`);
      return null;
    }
  }

  async promptCodexLaunchArgsSelection() {
    console.log(UIHelper.createTitle('配置 Codex 启动参数', UIHelper.icons.settings));
    console.log();
    console.log(UIHelper.createTooltip('选择要使用的 Codex 启动参数'));
    console.log();
    console.log(UIHelper.createHintLine([
      ['空格', '切换选中'],
      ['A', '全选'],
      ['I', '反选'],
      ['Enter', '确认选择'],
      ['ESC', '跳过配置']
    ]));
    console.log();

    try {
      const { getCodexLaunchArgs, checkExclusiveArgs } = require('../utils/launch-args');
      const codexArgs = getCodexLaunchArgs();

      const result = await this.promptWithESCAndDefault([
        {
          type: 'checkbox',
          name: 'launchArgs',
          message: '请选择 Codex 启动参数:',
          choices: codexArgs.map(arg => ({
            name: `${arg.label} (${arg.name}) - ${arg.description}`,
            value: arg.name,
            checked: arg.checked
          }))
        }
      ], '跳过配置', () => {
        Logger.info('跳过 Codex 启动参数配置');
      }, { launchArgs: [] });

      const { launchArgs } = result;

      const conflictError = checkExclusiveArgs(launchArgs, codexArgs);
      if (conflictError) {
        Logger.warning(conflictError);
        return await this.promptCodexLaunchArgsSelection();
      }
      return launchArgs;
    } catch (error) {
      throw error;
    }
  }

  printProviderSummary(answers, launchArgs, modelConfig) {
    const finalDisplayName = answers.displayName || answers.name;
    Logger.success(`供应商 '${finalDisplayName}' 添加成功！`);

    console.log(chalk.blue('\n配置详情:'));
    console.log(chalk.gray(`  名称: ${answers.name}`));
    console.log(chalk.gray(`  显示名称: ${finalDisplayName}`));

    if (answers.ideName === 'codex') {
      console.log(chalk.gray('  IDE: Codex CLI'));
      if (answers.baseUrl) {
        console.log(chalk.gray(`  OPENAI_BASE_URL: ${answers.baseUrl}`));
      }
      if (answers.authToken) {
        console.log(chalk.gray(`  OPENAI_API_KEY: ${answers.authToken}`));
      }
      if (answers.launchArgs && answers.launchArgs.length > 0) {
        console.log(chalk.gray(`  启动参数: ${answers.launchArgs.join(' ')}`));
      }
      console.log(chalk.green('\n🎉 供应商添加完成！正在返回主界面...'));
      return;
    }

    console.log(chalk.gray(`  认证模式: ${AUTH_MODE_DISPLAY_DETAILED[answers.authMode] || answers.authMode}`));

    if (answers.baseUrl) {
      console.log(chalk.gray(`  基础URL: ${answers.baseUrl}`));
    }
    console.log(chalk.gray(`  Token: ${answers.authToken}`));

    if (launchArgs.length > 0) {
      console.log(chalk.gray(`  启动参数: ${launchArgs.join(' ')}`));
    }

    if (modelConfig.primaryModel) {
      console.log(chalk.gray(`  主模型: ${modelConfig.primaryModel}`));
    }

    if (modelConfig.smallFastModel) {
      console.log(chalk.gray(`  快速模型: ${modelConfig.smallFastModel}`));
    }

    console.log(chalk.green('\n🎉 供应商添加完成！正在返回主界面...'));
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
