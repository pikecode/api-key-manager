class ProviderEditQuestionsHelper {
  static buildQuestions(provider, validator) {
    const isCodex = provider.ideName === 'codex';
    const questions = [
      this.buildNameQuestion(provider, validator)
    ];

    if (!isCodex) {
      questions.push(...this.buildClaudeQuestions(provider, validator));
    }

    questions.push(
      this.buildBaseUrlQuestion(provider, isCodex),
      this.buildAuthTokenQuestion(provider, isCodex)
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

  static buildBaseUrlQuestion(provider, isCodex) {
    return {
      type: 'input',
      name: 'baseUrl',
      message: isCodex ? '基础URL (OPENAI_BASE_URL):' : '基础URL:',
      default: provider.baseUrl,
      prefillDefault: true
    };
  }

  static buildAuthTokenQuestion(provider, isCodex) {
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
      prefillDefault: true
    };
  }
}

module.exports = { ProviderEditQuestionsHelper };
