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
      const configManager = {
        activateProvider: jest.fn().mockResolvedValue()
      };
      const provider = { name: 'test-provider' };
      const args = ['--continue'];

      await markProviderAsCurrent(configManager, provider, args);

      expect(configManager.activateProvider).toHaveBeenCalledWith('test-provider', args);
    });

    it('无启动参数时传入空数组', async () => {
      const configManager = {
        activateProvider: jest.fn().mockResolvedValue()
      };
      const provider = { name: 'new-provider' };

      await markProviderAsCurrent(configManager, provider);

      expect(configManager.activateProvider).toHaveBeenCalledWith('new-provider', []);
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

      expect(executeCodexWithEnv).toHaveBeenCalledWith(provider, args);
      expect(executeWithEnv).not.toHaveBeenCalled();
    });
  });
});
