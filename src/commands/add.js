const inquirer = require('inquirer');
const chalk = require('chalk');
const { ConfigManager } = require('../config');
const { validator } = require('../utils/validator');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');
const { BaseCommand } = require('./BaseCommand');

class ProviderAdder extends BaseCommand {
  constructor(options = {}) {
    super();
    this.configManager = new ConfigManager();
    this.presetIdeName = options.ideName || null;
  }

  async interactive() {
    console.log(UIHelper.createTitle('添加新供应商', UIHelper.icons.add));
    console.log();
    console.log(UIHelper.createTooltip('选择供应商类型或手动配置'));
    console.log();
    console.log(UIHelper.createStepIndicator(1, 3, '选择供应商类型'));
    console.log(UIHelper.createHintLine([
      ['↑ / ↓', '选择类型'],
      ['Enter', '确认'],
      ['ESC', '取消添加']
    ]));
    console.log();
    
    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('取消添加供应商');
      // 使用CommandRegistry避免循环引用
      const { registry } = require('../CommandRegistry');
      registry.executeCommand('switch');
    }, '取消添加');

    try {
      // 首先选择是否使用预设配置
      const typeAnswer = await this.prompt([
        {
          type: 'list',
          name: 'providerType',
          message: '选择供应商类型:',
          choices: [
            { name: '🔒 官方 Claude Code (OAuth)', value: 'official_oauth' },
            { name: '⚙️ 自定义配置', value: 'custom' }
          ],
          default: 'custom'
        }
      ]);

      // 移除 ESC 键监听
      this.removeESCListener(escListener);

      if (typeAnswer.providerType === 'official_oauth') {
        return await this.addOfficialOAuthProvider();
      } else {
        return await this.addCustomProvider();
      }
    } catch (error) {
      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }
  }

  async addOfficialOAuthProvider() {
    console.log(UIHelper.createTitle('添加官方 OAuth 供应商', UIHelper.icons.add));
    console.log();
    console.log(UIHelper.createTooltip('配置官方 Claude Code OAuth 认证'));
    console.log();
    console.log(UIHelper.createStepIndicator(2, 3, '填写官方 OAuth 信息'));
    console.log(UIHelper.createHintLine([
      ['Enter', '确认输入'],
      ['Tab', '切换字段'],
      ['ESC', '取消添加']
    ]));
    console.log();
    
    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('取消添加供应商');
      // 使用CommandRegistry避免循环引用
      const { registry } = require('../CommandRegistry');
      registry.executeCommand('switch');
    }, '取消添加');

    try {
      const answers = await this.prompt([
        {
          type: 'input',
          name: 'name',
          message: '请输入供应商名称 (用于命令行):',
          default: 'claude-official',
          validate: (input) => {
            const error = validator.validateName(input);
            if (error) return error;
            return true;
          }
        },
        {
          type: 'input',
          name: 'displayName',
          message: '请输入供应商显示名称:',
          default: 'Claude Code 官方 (OAuth)',
          validate: (input) => {
            const error = validator.validateDisplayName(input);
            if (error) return error;
            return true;
          }
        },
        {
          type: 'input',
          name: 'authToken',
          message: '请输入 OAuth Token (sk-ant-oat01-...):',
          validate: (input) => {
            if (!input || !input.startsWith('sk-ant-oat01-')) {
              return '请输入有效的 OAuth Token (格式: sk-ant-oat01-...)';
            }
            const error = validator.validateToken(input);
            if (error) return error;
            return true;
          }
        },
        {
          type: 'confirm',
          name: 'setAsDefault',
          message: '是否设置为当前供应商?',
          default: true
        }
      ]);

      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      
      // 使用官方 OAuth 配置
      await this.saveProvider({
        ...answers,
        authMode: 'oauth_token',
        baseUrl: null // OAuth 模式不需要 baseUrl
      });
    } catch (error) {
      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }
  }

  async addCustomProvider() {
    console.log(UIHelper.createTitle('添加自定义供应商', UIHelper.icons.add));
    console.log();
    console.log(UIHelper.createTooltip('请填写供应商配置信息'));
    console.log();
    console.log(UIHelper.createStepIndicator(2, 3, '填写供应商信息'));
    console.log(UIHelper.createHintLine([
      ['Enter', '确认输入'],
      ['Tab', '切换字段'],
      ['ESC', '取消添加']
    ]));
    console.log();

    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('取消添加供应商');
      // 使用CommandRegistry避免循环引用
      const { registry } = require('../CommandRegistry');
      registry.executeCommand('switch');
    }, '取消添加');

    try {
      const answers = await this.prompt([
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
          message: '请输入供应商名称 (用于命令行):',
          validate: (input) => {
            const error = validator.validateName(input);
            if (error) return error;
            return true;
          }
        },
        {
          type: 'input',
          name: 'displayName',
          message: '请输入供应商显示名称 (可选，默认为供应商名称):',
          validate: (input) => {
            const error = validator.validateDisplayName(input);
            if (error) return error;
            return true;
          }
        },
        {
          type: 'list',
          name: 'authMode',
          message: '选择认证模式:',
          choices: [
            { name: '🔑 通用API密钥模式 - 支持 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN', value: 'api_key' },
            { name: '🔐 认证令牌模式 (仅 ANTHROPIC_AUTH_TOKEN) - 适用于某些服务商', value: 'auth_token' },
            { name: '🌐 OAuth令牌模式 (CLAUDE_CODE_OAUTH_TOKEN) - 适用于官方Claude Code', value: 'oauth_token' }
          ],
          default: 'api_key',
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex'
        },
        {
          type: 'list',
          name: 'tokenType',
          message: '选择Token类型:',
          choices: [
            { name: '🔑 ANTHROPIC_API_KEY - 通用API密钥', value: 'api_key' },
            { name: '🔐 ANTHROPIC_AUTH_TOKEN - 认证令牌', value: 'auth_token' }
          ],
          default: 'api_key',
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex' && answers.authMode === 'api_key'
        },
        {
          type: 'input',
          name: 'baseUrl',
          message: (answers) => {
            if (answers.authMode === 'auth_token') {
              return '请输入API基础URL (如使用官方API可留空):';
            }
            return '请输入API基础URL:';
          },
          validate: (input, answers) => {
            // auth_token 模式允许空值（使用官方 API）
            if (input === '' && answers.authMode === 'auth_token') {
              return true;
            }
            // 其他模式需要有效的 URL
            if (!input && answers.authMode === 'api_key') {
              return 'API基础URL不能为空';
            }
            const error = validator.validateUrl(input);
            if (error) return error;
            return true;
          },
          when: (answers) => (answers.ideName || this.presetIdeName) !== 'codex' && (answers.authMode === 'api_key' || answers.authMode === 'auth_token')
        },
        {
          type: 'input',
          name: 'authToken',
          message: (answers) => {
            switch (answers.authMode) {
              case 'api_key':
                const tokenTypeLabel = answers.tokenType === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
                return `请输入Token (${tokenTypeLabel}):`;
              case 'auth_token':
                return '请输入认证令牌 (ANTHROPIC_AUTH_TOKEN):';
              case 'oauth_token':
                return '请输入OAuth令牌 (CLAUDE_CODE_OAUTH_TOKEN):';
              default:
                return '请输入认证令牌:';
            }
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
      ]);

      // 移除 ESC 键监听
      this.removeESCListener(escListener);

      // 如果是预设的 ideName，设置到 answers 中
      if (!answers.ideName && this.presetIdeName) {
        answers.ideName = this.presetIdeName;
      }

      if (answers.ideName === 'codex') {
        answers.authMode = 'openai_api_key';
        answers.tokenType = null;
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
      // 移除 ESC 键监听
      this.removeESCListener(escListener);
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

      const launchArgs = answers.configureLaunchArgs
        ? await this.promptLaunchArgsSelection()
        : [];

      const modelConfig = answers.configureModels
        ? await this.promptModelConfiguration()
        : { primaryModel: null, smallFastModel: null };

      await this.configManager.addProvider(answers.name, {
        displayName: answers.displayName || answers.name,
        ideName: answers.ideName || 'claude',
        baseUrl: answers.baseUrl,
        authToken: answers.authToken,
        authMode: answers.authMode,
        tokenType: answers.tokenType, // 仅在 authMode 为 'api_key' 时使用
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
    const escListener = this.createESCListener(() => {
      Logger.info('取消覆盖供应商');
      const { switchCommand } = require('./switch');
      switchCommand();
    }, '取消覆盖');

    try {
      const { overwrite } = await this.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `供应商 '${name}' 已存在，是否覆盖?`,
          default: false
        }
      ]);

      this.removeESCListener(escListener);
      return overwrite;
    } catch (error) {
      this.removeESCListener(escListener);
      throw error;
    }
  }

  async promptLaunchArgsSelection() {
    console.log(UIHelper.createTitle('配置启动参数', UIHelper.icons.settings));
    console.log();
    console.log(UIHelper.createTooltip('选择要使用的启动参数'));
    console.log();
    console.log(UIHelper.createStepIndicator(3, 3, '可选: 配置启动参数'));
    console.log(UIHelper.createHintLine([
      ['空格', '切换选中'],
      ['A', '全选'],
      ['I', '反选'],
      ['Enter', '确认选择'],
      ['ESC', '跳过配置']
    ]));
    console.log();

    const escListener = this.createESCListener(() => {
      Logger.info('跳过启动参数配置');
    }, '跳过配置');

    try {
      const { launchArgs } = await this.prompt([
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
      ]);

      this.removeESCListener(escListener);
      return launchArgs;
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return [];
      }
      throw error;
    }
  }

  async promptModelConfiguration() {
    console.log(UIHelper.createTitle('配置模型参数', UIHelper.icons.settings));
    console.log();
    console.log(UIHelper.createTooltip('配置主模型和快速模型（可选）'));
    console.log();
    console.log(UIHelper.createStepIndicator(3, 3, '可选: 配置模型参数'));
    console.log(UIHelper.createHintLine([
      ['Enter', '确认输入'],
      ['ESC', '跳过配置']
    ]));
    console.log();

    const escListener = this.createESCListener(() => {
      Logger.info('跳过模型参数配置');
    }, '跳过配置');

    try {
      const responses = await this.prompt([
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
      ]);

      this.removeESCListener(escListener);
      return {
        primaryModel: responses.primaryModel,
        smallFastModel: responses.smallFastModel
      };
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return { primaryModel: null, smallFastModel: null };
      }
      throw error;
    }
  }

  async importCodexConfig() {
    try {
      const { readCodexFiles } = require('../utils/codex-files');
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

      // 尝试从 config.toml 获取 base URL
      let baseUrl = null;
      if (codexFiles.configToml) {
        const baseUrlMatch = codexFiles.configToml.match(/api_base\s*=\s*["']([^"']+)["']/);
        if (baseUrlMatch) {
          baseUrl = baseUrlMatch[1];
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

    const escListener = this.createESCListener(() => {
      Logger.info('跳过 Codex 启动参数配置');
    }, '跳过配置');

    try {
      const codexArgs = [
        {
          name: '--full-auto',
          label: '全自动模式',
          description: '自动批准 + 工作区写入沙盒 (与跳过沙盒互斥)',
          checked: false
        },
        {
          name: '--dangerously-bypass-approvals-and-sandbox',
          label: '跳过审批和沙盒',
          description: '危险：跳过所有安全检查 (与全自动互斥)',
          checked: false
        },
        {
          name: '--search',
          label: '启用网页搜索',
          description: '允许模型搜索网页',
          checked: false
        }
      ];

      const { launchArgs } = await this.prompt([
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
      ]);

      this.removeESCListener(escListener);
      return launchArgs;
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return [];
      }
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

    const authModeDisplay = {
      api_key: '通用API密钥模式',
      auth_token: '认证令牌模式 (仅 ANTHROPIC_AUTH_TOKEN)',
      oauth_token: 'OAuth令牌模式 (CLAUDE_CODE_OAUTH_TOKEN)'
    };

    console.log(chalk.gray(`  认证模式: ${authModeDisplay[answers.authMode] || answers.authMode}`));

    // 如果是 api_key 模式，显示 tokenType
    if (answers.authMode === 'api_key' && answers.tokenType) {
      const tokenTypeDisplay = answers.tokenType === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
      console.log(chalk.gray(`  Token类型: ${tokenTypeDisplay}`));
    }

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
