/**
 * Provider Launcher Tests
 * 测试供应商启动辅助逻辑
 */

jest.mock('../src/utils/env-launcher', () => ({
  executeWithEnv: jest.fn()
}));

jest.mock('../src/utils/codex-launcher', () => ({
  executeCodexWithEnv: jest.fn()
}));

const {
  launchProviderProcess,
  markProviderAsCurrent
} = require('../src/commands/switch/provider-launcher');
const { executeWithEnv } = require('../src/utils/env-launcher');
const { executeCodexWithEnv } = require('../src/utils/codex-launcher');

describe('provider-launcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markProviderAsCurrent', () => {
    it('应该调用 activateProvider 并传入供应商名称和启动参数', async () => {
      const latestProvider = { name: 'test-provider', authToken: 'latest-token' };
      const configManager = {
        load: jest.fn().mockResolvedValue(),
        getProvider: jest.fn().mockReturnValue(latestProvider),
        activateProvider: jest.fn().mockResolvedValue()
      };
      const provider = { name: 'test-provider' };
      const args = ['--continue'];

      const result = await markProviderAsCurrent(configManager, provider, args);

      expect(configManager.load).toHaveBeenCalledWith(true);
      expect(configManager.activateProvider).toHaveBeenCalledWith('test-provider', args);
      expect(result).toBe(latestProvider);
    });

    it('无启动参数时传入空数组', async () => {
      const latestProvider = { name: 'new-provider' };
      const configManager = {
        load: jest.fn().mockResolvedValue(),
        getProvider: jest.fn().mockReturnValue(latestProvider),
        activateProvider: jest.fn().mockResolvedValue()
      };
      const provider = { name: 'new-provider' };

      await markProviderAsCurrent(configManager, provider);

      expect(configManager.activateProvider).toHaveBeenCalledWith('new-provider', []);
    });

    it('最新配置中找不到供应商时应该抛出明确错误', async () => {
      const configManager = {
        load: jest.fn().mockResolvedValue(),
        getProvider: jest.fn().mockReturnValue(null),
        activateProvider: jest.fn().mockResolvedValue()
      };

      await expect(markProviderAsCurrent(configManager, { name: 'missing' }))
        .rejects.toThrow("供应商 'missing' 不存在");
      expect(configManager.activateProvider).not.toHaveBeenCalled();
    });
  });

  describe('launchProviderProcess', () => {
    it('应该为 Claude provider 调用 Claude launcher', async () => {
      const provider = {
        name: 'claude-provider',
        ideName: 'claude'
      };
      const args = ['--continue'];

      await launchProviderProcess(provider, args);

      expect(executeWithEnv).toHaveBeenCalledWith(provider, args);
      expect(executeCodexWithEnv).not.toHaveBeenCalled();
    });

    it('应该为 Codex provider 调用 Codex launcher', async () => {
      const provider = {
        name: 'codex-provider',
        ideName: 'codex'
      };
      const args = ['chat', '--verbose'];

      await launchProviderProcess(provider, args);

      expect(executeCodexWithEnv).toHaveBeenCalledWith(provider, args, {});
      expect(executeWithEnv).not.toHaveBeenCalled();
    });

    it('应该向 Codex launcher 透传启动选项', async () => {
      const provider = {
        name: 'codex-provider',
        ideName: 'codex'
      };
      const args = [];
      const options = { forceRelogin: true };

      await launchProviderProcess(provider, args, options);

      expect(executeCodexWithEnv).toHaveBeenCalledWith(provider, args, options);
    });
  });
});
