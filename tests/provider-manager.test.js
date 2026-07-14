jest.mock('../src/config', () => ({ configManager: {} }));
jest.mock('../src/utils/logger', () => ({
  Logger: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}));

const { ProviderManager } = require('../src/commands/switch/provider-manager');

function createProvider() {
  return {
    name: 'old-name',
    displayName: '旧显示名称',
    ideName: 'claude',
    authMode: 'api_key',
    authToken: 'valid-token',
    baseUrl: 'https://api.example.com',
    launchArgs: [],
    models: { primary: 'primary-model', smallFast: null },
    current: true
  };
}

describe('ProviderManager 编辑供应商', () => {
  test('重命名和显示名称独立保存，且不直接修改旧配置', async () => {
    const provider = createProvider();
    const originalConfig = {
      version: '2.0',
      currentProvider: 'old-name',
      providers: { 'old-name': provider }
    };
    const manager = new ProviderManager({
      clearScreen: jest.fn(),
      isEscCancelled: jest.fn(() => false),
      promptWithESC: jest.fn().mockResolvedValue({
        name: 'new-name',
        displayName: '新显示名称',
        authMode: 'api_key',
        baseUrl: 'https://new.example.com',
        authToken: 'new-valid-token',
        primaryModel: 'new-primary',
        smallFastModel: ''
      })
    });
    manager.configManager = {
      config: originalConfig,
      load: jest.fn().mockResolvedValue(),
      getProvider: jest.fn(() => provider),
      save: jest.fn().mockResolvedValue(true)
    };
    const onComplete = jest.fn();

    await manager.editProvider('old-name', onComplete);

    expect(manager.configManager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        currentProvider: 'new-name',
        providers: expect.objectContaining({
          'new-name': expect.objectContaining({
            name: 'new-name',
            displayName: '新显示名称',
            authToken: 'new-valid-token'
          })
        })
      })
    );
    expect(originalConfig.currentProvider).toBe('old-name');
    expect(originalConfig.providers['old-name']).toBe(provider);
    expect(provider.displayName).toBe('旧显示名称');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
