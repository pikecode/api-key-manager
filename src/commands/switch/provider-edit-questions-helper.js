class ProviderEditQuestionsHelper {
  static buildQuestions(provider, validator) {
    const isCodex = provider.ideName === 'codex';
    const questions = [
      this.buildNameQuestion(provider, validator),
      this.buildDisplayNameQuestion(provider, validator)
    ];

    if (!isCodex) {
      questions.push(...this.buildClaudeQuestions(provider, validator));
    } else {
      questions.push(this.buildCodexAuthModeQuestion(provider));
    }

    questions.push(
      this.buildBaseUrlQuestion(provider, isCodex, validator),
      this.buildAuthTokenQuestion(provider, isCodex, validator)
    );

    return questions;
  }

  static buildNameQuestion(provider, validator) {
    return {
      type: 'input',
      name: 'name',
      message: '请输入供应商名称 (用于命令行):',
      default: provider.name,
      validate: (input) => {
        const error = validator.validateName(input);
        if (error) return error;
        return true;
      }
    };
  }

  static buildDisplayNameQuestion(provider, validator) {
    return {
      type: 'input',
      name: 'displayName',
      message: '请输入显示名称:',
      default: provider.displayName || provider.name,
      validate: input => {
        if (typeof validator?.validateDisplayName !== 'function') return true;
        return validator.validateDisplayName(input) || true;
      }
    };
  }

  static buildClaudeQuestions(provider, validator) {
    return [
      {
        type: 'list',
        name: 'authMode',
        message: '认证模式:',
        choices: [
          { name: '🔑 ANTHROPIC_API_KEY - 大多数第三方代理使用', value: 'api_key' },
          { name: '🔐 ANTHROPIC_AUTH_TOKEN - 部分服务商使用', value: 'auth_token' }
        ],
        default: provider.authMode || 'api_key'
      },
      {
        type: 'input',
        name: 'primaryModel',
        message: '主模型 (ANTHROPIC_MODEL):',
        default: provider.models?.primary || '',
        prefillDefault: true,
        allowEmpty: true,
        validate: (input) => {
          const error = validator.validateModel(input);
          if (error) return error;
          return true;
        }
      },
      {
        type: 'input',
        name: 'smallFastModel',
        message: '快速模型 (ANTHROPIC_SMALL_FAST_MODEL):',
        default: provider.models?.smallFast || '',
        prefillDefault: true,
        allowEmpty: true,
        validate: (input) => {
          const error = validator.validateModel(input);
          if (error) return error;
          return true;
        }
      }
    ];
  }

  static buildCodexAuthModeQuestion(provider) {
    return {
      type: 'list',
      name: 'authMode',
      message: 'Codex 认证方式:',
      choices: [
        { name: '🔑 API Key - 使用 OpenAI API Key', value: 'api_key' },
        { name: '🌐 官方网页登录 - 使用 OpenAI 账号登录', value: 'chatgpt_login' }
      ],
      default: provider.authMode || 'api_key'
    };
  }

  static buildBaseUrlQuestion(provider, isCodex, validator) {
    return {
      type: 'input',
      name: 'baseUrl',
      message: isCodex ? '基础URL (OPENAI_BASE_URL):' : '基础URL:',
      default: provider.baseUrl,
      prefillDefault: true,
      when: answers => !isCodex || (answers.authMode || provider.authMode || 'api_key') !== 'chatgpt_login',
      validate: input => {
        if (typeof validator?.validateUrl !== 'function') return true;
        return validator.validateUrl(input, false) || true;
      }
    };
  }

  static buildAuthTokenQuestion(provider, isCodex, validator) {
    return {
      type: 'input',
      name: 'authToken',
      message: (answers) => {
        if (isCodex) {
          return 'API Key (OPENAI_API_KEY):';
        }
        const envVar = answers.authMode === 'auth_token' ? 'ANTHROPIC_AUTH_TOKEN' : 'ANTHROPIC_API_KEY';
        return `Token (${envVar}):`;
      },
      default: provider.authToken,
      prefillDefault: true,
      when: answers => !isCodex || (answers.authMode || provider.authMode || 'api_key') !== 'chatgpt_login',
      validate: input => {
        if (typeof validator?.validateToken !== 'function') return true;
        return validator.validateToken(input) || true;
      }
    };
  }
}

module.exports = { ProviderEditQuestionsHelper };
