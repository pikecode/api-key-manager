/**
 * Helper functions for ProviderAdder prompts.
 * Each function returns a promise that resolves to the collected answers.
 * The implementation mirrors the original large prompt array but is split
 * into focused pieces to keep each function under 50 lines.
 */

const { validator } = require('../../utils/validator');
const { UIHelper } = require('../../utils/ui-helper');
const { UI_MESSAGES } = require('../../constants/ui');
const { Logger } = require('../../utils/logger');
const { registry } = require('../../CommandRegistry');
const { getCodexLaunchArgs } = require('../../utils/launch-args');

/**
 * Prompt the initial provider information (name, IDE, auth mode, URLs, tokens, etc.).
 * @param {BaseCommand} adder - the ProviderAdder instance (used for ESC handling)
 * @returns {Promise<Object>} answers object
 */
async function promptProviderInfo(adder) {
  return await adder.promptWithESC(
    [
      {
        type: 'list',
        name: 'ideName',
        message: UI_MESSAGES.SELECT_IDE,
        choices: [
          { name: UI_MESSAGES.IDE_CLAUDE_CODE, value: 'claude' },
          { name: UI_MESSAGES.IDE_CODEX, value: 'codex' }
        ],
        default: adder.presetIdeName || 'claude',
        when: () => !adder.presetIdeName
      },
      {
        type: 'input',
        name: 'name',
        message: UI_MESSAGES.INPUT_PROVIDER_NAME,
        validate: input => {
          const err = validator.validateName(input);
          return err || true;
        },
        when: answers => {
          // 如果选择了官方登录，直接用 "openai-official"，不需要输入名称
          if ((answers.ideName || adder.presetIdeName) === 'codex' && answers.authMode === 'chatgpt_login') {
            return false;
          }
          return true;
        },
        default: answers => {
          // 官方登录模式下返回默认名称
          if ((answers.ideName || adder.presetIdeName) === 'codex' && answers.authMode === 'chatgpt_login') {
            return 'openai-official';
          }
          return undefined;
        }
      },
      {
        type: 'list',
        name: 'authMode',
        message: UI_MESSAGES.SELECT_AUTH_MODE,
        choices: [
          { name: UI_MESSAGES.AUTH_MODE_API_KEY, value: 'api_key' },
          { name: UI_MESSAGES.AUTH_MODE_AUTH_TOKEN, value: 'auth_token' }
        ],
        default: 'api_key',
        when: answers => (answers.ideName || adder.presetIdeName) !== 'codex'
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: UI_MESSAGES.INPUT_BASE_URL,
        validate: input => {
          if (!input) return 'API 基础URL不能为空';
          const err = validator.validateUrl(input);
          return err || true;
        },
        when: answers => (answers.ideName || adder.presetIdeName) !== 'codex'
      },
      {
        type: 'input',
        name: 'authToken',
        message: answers => {
          const envVar =
            answers.authMode === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
          return `${UI_MESSAGES.INPUT_TOKEN} (${envVar}):`;
        },
        validate: input => {
          const err = validator.validateToken(input);
          return err || true;
        },
        when: answers => (answers.ideName || adder.presetIdeName) !== 'codex'
      },
      // Codex‑specific prompts (manual entry)
      {
        type: 'list',
        name: 'authMode',
        message: UI_MESSAGES.SELECT_CODEX_AUTH_MODE,
        choices: [
          { name: UI_MESSAGES.AUTH_MODE_CODEX_API_KEY, value: 'api_key' },
          { name: UI_MESSAGES.AUTH_MODE_CODEX_CHATGPT_LOGIN, value: 'chatgpt_login' }
        ],
        default: 'api_key',
        when: answers => {
          const isCodex = (answers.ideName || adder.presetIdeName) === 'codex';
          if (!isCodex) return false;
          // 如果已经有官方配置了，就用 api_key 模式，不提示选择
          const hasOfficialConfig = adder.configManager.getProvider('openai-official');
          return !hasOfficialConfig;
        }
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: UI_MESSAGES.INPUT_OPENAI_BASE_URL,
        default: '',
        validate: input => {
          if (!input) return true;
          const err = validator.validateUrl(input);
          return err || true;
        },
        when: answers => (answers.ideName || adder.presetIdeName) === 'codex' && answers.authMode !== 'chatgpt_login'
      },
      {
        type: 'input',
        name: 'authToken',
        message: UI_MESSAGES.INPUT_OPENAI_API_KEY,
        validate: input => {
          if (!input) return 'API Key 不能为空';
          const err = validator.validateToken(input);
          return err || true;
        },
        when: answers => (answers.ideName || adder.presetIdeName) === 'codex' && answers.authMode !== 'chatgpt_login'
      },
      {
        type: 'confirm',
        name: 'confirmCodexLogin',
        message: 'Codex 将使用官方 OpenAI 网页登录方式，启动时需要在浏览器中登录。确认继续?',
        default: true,
        when: answers => (answers.ideName || adder.presetIdeName) === 'codex' && answers.authMode === 'chatgpt_login'
      },
      {
        type: 'confirm',
        name: 'setAsDefault',
        message: UI_MESSAGES.SET_AS_DEFAULT,
        default: true
      },
      {
        type: 'confirm',
        name: 'configureLaunchArgs',
        message: UI_MESSAGES.CONFIGURE_LAUNCH_ARGS,
        default: false,
        when: answers => (answers.ideName || adder.presetIdeName) !== 'codex'
      },
      {
        type: 'confirm',
        name: 'configureCodexLaunchArgs',
        message: UI_MESSAGES.CONFIGURE_CODEX_LAUNCH_ARGS,
        default: false,
        when: answers => (answers.ideName || adder.presetIdeName) === 'codex'
      },
      {
        type: 'confirm',
        name: 'configureModels',
        message: UI_MESSAGES.CONFIGURE_MODELS,
        default: false,
        when: answers => (answers.ideName || adder.presetIdeName) !== 'codex'
      }
    ],
    UI_MESSAGES.ESC_CANCEL_ADD,
    async () => {
      Logger.info(UI_MESSAGES.ADD_PROVIDER_CANCELLED);
      if (adder.returnToParent) {
        return;
      }
      await registry.executeCommand('switch');
    }
  );
}

/**
 * Prompt for launch arguments (non‑Codex).
 */
async function promptLaunchArgs(adder) {
  console.log(UIHelper.createTitle(UI_MESSAGES.CONFIG_LAUNCH_ARGS_TITLE, UIHelper.icons.settings));
  console.log();
  console.log(UIHelper.createTooltip(UI_MESSAGES.CONFIG_LAUNCH_ARGS_TOOLTIP));
  console.log();
  console.log(UIHelper.createStepIndicator(2, 2, UI_MESSAGES.ADD_PROVIDER_STEP_2_LAUNCH_ARGS));
  console.log(
    UIHelper.createHintLine([
      [UI_MESSAGES.HINT_SPACE, UI_MESSAGES.HINT_SPACE_DESC],
      [UI_MESSAGES.HINT_A, UI_MESSAGES.HINT_A_DESC],
      [UI_MESSAGES.HINT_I, UI_MESSAGES.HINT_I_DESC],
      [UI_MESSAGES.HINT_ENTER, UI_MESSAGES.HINT_ENTER_CONFIRM],
      [UI_MESSAGES.HINT_ESC, UI_MESSAGES.HINT_ESC_SKIP]
    ])
  );
  console.log();

  const result = await adder.promptWithESCAndDefault(
    [
      {
        type: 'checkbox',
        name: 'launchArgs',
        message: UI_MESSAGES.SELECT_LAUNCH_ARGS,
        choices: validator.getAvailableLaunchArgs().map(arg => ({
          name: `${arg.name} - ${arg.description}`,
          value: arg.name,
          checked: false
        }))
      }
    ],
    UI_MESSAGES.ESC_SKIP_CONFIG,
    () => {
      Logger.info(UI_MESSAGES.CONFIG_LAUNCH_ARGS_SKIP);
    },
    { launchArgs: [] }
  );

  return result.launchArgs;
}

/**
 * Prompt for model configuration (non‑Codex).
 */
async function promptModelConfig(adder) {
  console.log(UIHelper.createTitle(UI_MESSAGES.CONFIG_MODELS_TITLE, UIHelper.icons.settings));
  console.log();
  console.log(UIHelper.createTooltip(UI_MESSAGES.CONFIG_MODELS_TOOLTIP));
  console.log();
  console.log(UIHelper.createStepIndicator(2, 2, UI_MESSAGES.ADD_PROVIDER_STEP_2_MODELS));
  console.log(
    UIHelper.createHintLine([
      [UI_MESSAGES.HINT_ENTER, UI_MESSAGES.HINT_ENTER_DESC],
      [UI_MESSAGES.HINT_ESC, UI_MESSAGES.HINT_ESC_SKIP]
    ])
  );
  console.log();

  const responses = await adder.promptWithESCAndDefault(
    [
      {
        type: 'input',
        name: 'primaryModel',
        message: UI_MESSAGES.INPUT_PRIMARY_MODEL,
        default: '',
        validate: input => validator.validateModel(input) || true
      },
      {
        type: 'input',
        name: 'smallFastModel',
        message: UI_MESSAGES.INPUT_SMALL_FAST_MODEL,
        default: '',
        validate: input => validator.validateModel(input) || true
      }
    ],
    UI_MESSAGES.ESC_SKIP_CONFIG,
    () => {
      Logger.info(UI_MESSAGES.CONFIG_MODELS_SKIP);
    },
    { primaryModel: null, smallFastModel: null }
  );

  return { primaryModel: responses.primaryModel, smallFastModel: responses.smallFastModel };
}

/**
 * Prompt for Codex‑specific launch arguments.
 */
async function promptCodexLaunchArgs(adder) {
  // Reuse the same UI as the generic launch args but fetch Codex args.
  console.log(
    UIHelper.createTitle(UI_MESSAGES.CONFIG_CODEX_LAUNCH_ARGS_TITLE, UIHelper.icons.settings)
  );
  console.log();
  console.log(UIHelper.createTooltip(UI_MESSAGES.CONFIG_CODEX_LAUNCH_ARGS_TOOLTIP));
  console.log();
  console.log(UIHelper.createStepIndicator(2, 2, UI_MESSAGES.ADD_PROVIDER_STEP_2_LAUNCH_ARGS));
  console.log(
    UIHelper.createHintLine([
      [UI_MESSAGES.HINT_SPACE, UI_MESSAGES.HINT_SPACE_DESC],
      [UI_MESSAGES.HINT_A, UI_MESSAGES.HINT_A_DESC],
      [UI_MESSAGES.HINT_I, UI_MESSAGES.HINT_I_DESC],
      [UI_MESSAGES.HINT_ENTER, UI_MESSAGES.HINT_ENTER_CONFIRM],
      [UI_MESSAGES.HINT_ESC, UI_MESSAGES.HINT_ESC_SKIP]
    ])
  );
  console.log();

  const result = await adder.promptWithESCAndDefault(
    [
      {
        type: 'checkbox',
        name: 'launchArgs',
        message: UI_MESSAGES.SELECT_LAUNCH_ARGS,
        choices: getCodexLaunchArgs().map(arg => ({
          name: `${arg.name} - ${arg.description}`,
          value: arg.name,
          checked: false
        }))
      }
    ],
    UI_MESSAGES.ESC_SKIP_CONFIG,
    () => {
      Logger.info(UI_MESSAGES.CONFIG_CODEX_LAUNCH_ARGS_SKIP);
    },
    { launchArgs: [] }
  );

  return result.launchArgs;
}

module.exports = {
  promptProviderInfo,
  promptLaunchArgs,
  promptModelConfig,
  promptCodexLaunchArgs
};
