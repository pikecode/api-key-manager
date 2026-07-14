jest.mock('../src/CommandRegistry', () => ({
  registry: { executeCommand: jest.fn().mockResolvedValue() }
}));
jest.mock('../src/commands/add/prompts', () => ({
  promptCodexLaunchArgs: jest.fn().mockResolvedValue([]),
  promptLaunchArgs: jest.fn().mockResolvedValue([]),
  promptModelConfig: jest.fn().mockResolvedValue({ primaryModel: null, smallFastModel: null })
}));
jest.mock('../src/commands/add/summaryPrinter', () => ({
  printProviderSummary: jest.fn().mockResolvedValue()
}));

const { registry } = require('../src/CommandRegistry');
const { saveProvider } = require('../src/commands/add/providerSaver');

function createAdder(returnToParent) {
  return {
    returnToParent,
    configManager: {
      load: jest.fn().mockResolvedValue(),
      getProvider: jest.fn().mockReturnValue(null),
      addProvider: jest.fn().mockResolvedValue(true)
    },
    pauseBeforeReturn: jest.fn().mockResolvedValue(),
    isEscCancelled: jest.fn().mockReturnValue(false)
  };
}

describe('添加供应商导航', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('主菜单子流程完成后不启动新的 switch 实例', async () => {
    await saveProvider(createAdder(true), {
      name: 'provider',
      ideName: 'claude',
      baseUrl: 'https://api.example.com',
      authToken: 'valid-token',
      authMode: 'api_key'
    });

    expect(registry.executeCommand).not.toHaveBeenCalled();
  });

  test('独立 add 命令保持返回供应商选择的旧行为', async () => {
    await saveProvider(createAdder(false), {
      name: 'provider',
      ideName: 'claude',
      baseUrl: 'https://api.example.com',
      authToken: 'valid-token',
      authMode: 'api_key'
    });

    expect(registry.executeCommand).toHaveBeenCalledWith('switch');
  });
});
