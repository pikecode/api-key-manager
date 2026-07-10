/**
 * Provider Edit Questions Helper Tests
 * 测试供应商编辑问卷构建逻辑
 */

const { ProviderEditQuestionsHelper } = require('../src/commands/switch/provider-edit-questions-helper');

describe('ProviderEditQuestionsHelper', () => {
  const createValidator = () => ({
    validateName: jest.fn(() => null),
    validateModel: jest.fn(() => null)
  });

  const claudeProvider = {
    name: 'claude-provider',
    displayName: 'Claude Provider',
    alias: 'cp',
    ideName: 'claude',
    authMode: 'api_key',
    baseUrl: 'https://claude.example.com',
    authToken: 'claude-token',
    models: {
      primary: 'claude-primary',
      smallFast: 'claude-fast'
    }
  };

  const codexProvider = {
    name: 'codex-provider',
    displayName: 'Codex Provider',
    alias: 'cx',
    ideName: 'codex',
    baseUrl: 'https://codex.example.com',
    authToken: 'codex-token'
  };

  it('应该为 Claude 供应商构建包含 Claude 专属字段的问卷', () => {
    const questions = ProviderEditQuestionsHelper.buildQuestions(claudeProvider, createValidator());

    expect(questions.map(question => question.name)).toEqual([
      'name',
      'authMode',
      'primaryModel',
      'smallFastModel',
      'baseUrl',
      'authToken'
    ]);
  });

  it('应该为 Codex 供应商构建不包含 Claude 专属字段的问卷', () => {
    const questions = ProviderEditQuestionsHelper.buildQuestions(codexProvider, createValidator());

    expect(questions.map(question => question.name)).toEqual([
      'name',
      'baseUrl',
      'authToken'
    ]);
  });

  it('Codex 认证字段应该显示 OPENAI_API_KEY', () => {
    const questions = ProviderEditQuestionsHelper.buildQuestions(codexProvider, createValidator());
    const authTokenQuestion = questions.find(question => question.name === 'authToken');

    expect(authTokenQuestion.message({})).toBe('API Key (OPENAI_API_KEY):');
  });

  it('Claude 认证字段应该根据认证模式显示对应环境变量', () => {
    const questions = ProviderEditQuestionsHelper.buildQuestions(claudeProvider, createValidator());
    const authTokenQuestion = questions.find(question => question.name === 'authToken');

    expect(authTokenQuestion.message({ authMode: 'auth_token' })).toBe('Token (ANTHROPIC_AUTH_TOKEN):');
    expect(authTokenQuestion.message({ authMode: 'api_key' })).toBe('Token (ANTHROPIC_API_KEY):');
  });

  it('名称校验应该调用注入的 validateName', () => {
    const validator = createValidator();
    const questions = ProviderEditQuestionsHelper.buildQuestions(claudeProvider, validator);
    const nameQuestion = questions.find(question => question.name === 'name');

    expect(nameQuestion.validate('new-name')).toBe(true);
    expect(validator.validateName).toHaveBeenCalledWith('new-name');
  });

  it('模型字段校验应该调用注入的 validateModel', () => {
    const validator = createValidator();
    const questions = ProviderEditQuestionsHelper.buildQuestions(claudeProvider, validator);
    const primaryModelQuestion = questions.find(question => question.name === 'primaryModel');
    const smallFastModelQuestion = questions.find(question => question.name === 'smallFastModel');

    expect(primaryModelQuestion.validate('primary-model')).toBe(true);
    expect(smallFastModelQuestion.validate('fast-model')).toBe(true);
    expect(validator.validateModel).toHaveBeenCalledWith('primary-model');
    expect(validator.validateModel).toHaveBeenCalledWith('fast-model');
  });

  it('校验失败时应该返回校验器错误信息', () => {
    const validator = {
      validateName: jest.fn(() => '名称错误'),
      validateModel: jest.fn(() => '模型错误')
    };
    const questions = ProviderEditQuestionsHelper.buildQuestions(claudeProvider, validator);

    expect(questions.find(question => question.name === 'name').validate('bad name')).toBe('名称错误');
    expect(questions.find(question => question.name === 'primaryModel').validate('bad model')).toBe('模型错误');
  });
});
