/**
 * Clone Command Tests
 */

const { ProviderCloner } = require('../src/commands/clone');

// Mock dependencies
jest.mock('../src/config', () => ({
  configManager: {
    load: jest.fn().mockResolvedValue({}),
    listProviders: jest.fn(),
    getProvider: jest.fn(),
    addProvider: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../src/utils/logger', () => ({
  Logger: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

jest.mock('../src/utils/ui-helper', () => ({
  UIHelper: {
    createTitle: jest.fn().mockReturnValue(''),
    icons: { copy: '📋' }
  }
}));

jest.mock('../src/utils/validator', () => ({
  validator: {
    validateName: jest.fn().mockReturnValue(null),
    validateDisplayName: jest.fn().mockReturnValue(null),
    validateToken: jest.fn().mockReturnValue(null),
    validateUrl: jest.fn().mockReturnValue(null),
    getAvailableLaunchArgs: jest.fn().mockReturnValue([])
  }
}));

jest.mock('../src/utils/launch-args', () => ({
  getCodexLaunchArgs: jest.fn().mockReturnValue([]),
  checkExclusiveArgs: jest.fn().mockReturnValue(null)
}));

const { configManager } = require('../src/config');
const { Logger } = require('../src/utils/logger');

const mockClaudeProvider = {
  name: 'my-claude',
  displayName: 'My Claude',
  ideName: 'claude',
  authToken: 'sk-ant-test123',
  baseUrl: null,
  authMode: 'api_key',
  launchArgs: [],
  models: { primary: null, smallFast: null }
};

const mockCodexProvider = {
  name: 'my-codex',
  displayName: 'My Codex',
  ideName: 'codex',
  authToken: 'sk-openai-test123',
  baseUrl: 'https://api.openai.com',
  authMode: null,
  launchArgs: [],
  models: null
};

describe('ProviderCloner', () => {
  let cloner;

  beforeEach(() => {
    jest.resetAllMocks();
    cloner = new ProviderCloner();
    cloner.prompt = jest.fn();
    cloner.createESCListener = jest.fn().mockReturnValue({});
    cloner.removeESCListener = jest.fn();
    cloner.isEscCancelled = jest.fn().mockReturnValue(false);
    cloner.destroy = jest.fn();
  });

  test('没有供应商时应该提示警告', async () => {
    configManager.listProviders.mockReturnValue([]);
    await cloner.interactive();
    expect(Logger.warning).toHaveBeenCalledWith(expect.stringContaining('没有可克隆'));
  });

  test('指定不存在的源供应商时应该报错', async () => {
    configManager.listProviders.mockReturnValue([mockClaudeProvider]);
    configManager.getProvider.mockReturnValue(null);
    await cloner.interactive('nonexistent');
    expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('不存在'));
  });

  test('用户选择取消时应该退出', async () => {
    configManager.listProviders.mockReturnValue([mockClaudeProvider]);
    cloner.prompt.mockResolvedValueOnce({ name: null });
    await cloner.interactive();
    expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('取消'));
    expect(configManager.addProvider).not.toHaveBeenCalled();
  });

  test('应该成功克隆 Claude 供应商', async () => {
    configManager.listProviders.mockReturnValue([mockClaudeProvider]);
    configManager.getProvider
      .mockReturnValueOnce(mockClaudeProvider) // 获取源供应商
      .mockReturnValueOnce(null); // 检查新名称是否存在

    cloner.prompt
      .mockResolvedValueOnce({ name: 'my-claude-copy', displayName: 'My Claude (副本)' })
      .mockResolvedValueOnce({ fields: [] }) // 不修改任何字段
    ;

    await cloner.interactive('my-claude');

    expect(configManager.addProvider).toHaveBeenCalledWith(
      'my-claude-copy',
      expect.objectContaining({
        displayName: 'My Claude (副本)',
        ideName: 'claude',
        authToken: 'sk-ant-test123'
      })
    );
    expect(Logger.success).toHaveBeenCalled();
  });

  test('应该成功克隆 Codex 供应商', async () => {
    configManager.listProviders.mockReturnValue([mockCodexProvider]);
    configManager.getProvider
      .mockReturnValueOnce(mockCodexProvider)
      .mockReturnValueOnce(null);

    cloner.prompt
      .mockResolvedValueOnce({ name: 'my-codex-copy', displayName: 'My Codex (副本)' })
      .mockResolvedValueOnce({ fields: ['authToken'] })
      .mockResolvedValueOnce({ authToken: 'sk-openai-new456' });

    await cloner.interactive('my-codex');

    expect(configManager.addProvider).toHaveBeenCalledWith(
      'my-codex-copy',
      expect.objectContaining({
        displayName: 'My Codex (副本)',
        ideName: 'codex',
        authToken: 'sk-openai-new456'
      })
    );
  });

  test('修改 Token 时应该使用新 Token', async () => {
    configManager.listProviders.mockReturnValue([mockClaudeProvider]);
    configManager.getProvider
      .mockReturnValueOnce(mockClaudeProvider)
      .mockReturnValueOnce(null);

    cloner.prompt
      .mockResolvedValueOnce({ name: 'my-claude-v2', displayName: 'My Claude V2' })
      .mockResolvedValueOnce({ fields: ['authToken'] })
      .mockResolvedValueOnce({ authToken: 'sk-ant-newtoken' });

    await cloner.interactive('my-claude');

    expect(configManager.addProvider).toHaveBeenCalledWith(
      'my-claude-v2',
      expect.objectContaining({ authToken: 'sk-ant-newtoken' })
    );
  });
});
