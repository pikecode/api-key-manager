jest.mock('../src/config', () => ({ configManager: {} }));
jest.mock('../src/commands/add/prompts', () => ({
  promptProviderInfo: jest.fn(),
  promptCodexLaunchArgs: jest.fn()
}));
jest.mock('../src/commands/add/providerSaver', () => ({
  saveProvider: jest.fn()
}));
jest.mock('../src/utils/logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

const { ProviderAdder } = require('../src/commands/add');
const { promptProviderInfo } = require('../src/commands/add/prompts');
const { saveProvider } = require('../src/commands/add/providerSaver');
const { Logger } = require('../src/utils/logger');

describe('ProviderAdder Codex 官方登录', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('用户取消官方登录确认时不保存配置', async () => {
    promptProviderInfo.mockResolvedValue({
      ideName: 'codex',
      authMode: 'chatgpt_login',
      confirmCodexLogin: false
    });

    const adder = new ProviderAdder();
    adder.isEscCancelled = jest.fn(() => false);

    await adder.addCustomProvider();

    expect(saveProvider).not.toHaveBeenCalled();
    expect(Logger.info).toHaveBeenCalledWith('已取消添加 Codex 官方登录配置');
  });
});
