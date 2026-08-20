const { promptProviderInfo } = require('../src/commands/add/prompts');

describe('ProviderAdder prompts', () => {
  it('Codex 应该始终允许选择官方网页登录并填写供应商名称', async () => {
    const adder = {
      presetIdeName: 'codex',
      promptWithESC: jest.fn(async questions => questions)
    };

    const questions = await promptProviderInfo(adder);
    const authModeQuestion = questions.find(question => question.name === 'authMode');
    const nameQuestion = questions.find(question => question.name === 'name');

    expect(authModeQuestion.when({})).toBe(true);
    expect(authModeQuestion.choices.map(choice => choice.value)).toEqual(
      expect.arrayContaining(['api_key', 'chatgpt_login'])
    );
    expect(nameQuestion.when).toBeUndefined();
    expect(nameQuestion.default({ authMode: 'chatgpt_login' })).toBe('openai-official');
  });
});
