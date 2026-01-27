/**
 * Batch Operations Tests
 * 测试批量操作功能
 */

const { configManager } = require('../src/config');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Batch Operations', () => {
  const testConfigPath = path.join(os.tmpdir(), '.akm-test-batch.json');
  let originalConfigPath;

  beforeEach(async () => {
    originalConfigPath = configManager.configPath;
    configManager.configPath = testConfigPath;
    configManager.config = null;
    configManager.isLoaded = false;

    await fs.writeJson(testConfigPath, {
      version: '1.0.0',
      currentProvider: null,
      providers: {}
    });
  });

  afterEach(async () => {
    configManager.configPath = originalConfigPath;
    configManager.config = null;
    configManager.isLoaded = false;
    await fs.remove(testConfigPath);
  });

  describe('批量更新准备', () => {
    it('应该可以选择多个供应商', async () => {
      await configManager.addProvider('provider-1', {
        displayName: 'Provider 1',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-1',
        baseUrl: 'https://api1.example.com'
      });

      await configManager.addProvider('provider-2', {
        displayName: 'Provider 2',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-2',
        baseUrl: 'https://api2.example.com'
      });

      const providers = configManager.listProviders();
      expect(providers).toHaveLength(2);
    });

    it('应该可以按类型过滤', async () => {
      await configManager.addProvider('claude-provider', {
        displayName: 'Claude Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-1',
        baseUrl: 'https://api.example.com'
      });

      await configManager.addProvider('codex-provider', {
        displayName: 'Codex Provider',
        ideName: 'codex',
        authToken: 'token-2'
      });

      const allProviders = configManager.listProviders();
      const claudeProviders = allProviders.filter(p => p.ideName !== 'codex');
      const codexProviders = allProviders.filter(p => p.ideName === 'codex');

      expect(claudeProviders).toHaveLength(1);
      expect(codexProviders).toHaveLength(1);
    });
  });

  describe('批量删除过滤', () => {
    it('应该可以找到长期未使用的供应商', async () => {
      const ninetyDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      // 注意：addProvider 会自动设置 lastUsed，所以我们需要先添加再更新
      await configManager.addProvider('old-provider', {
        displayName: 'Old Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-1',
        baseUrl: 'https://api1.example.com'
      });

      await configManager.addProvider('recent-provider', {
        displayName: 'Recent Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-2',
        baseUrl: 'https://api2.example.com'
      });

      // 手动修改 lastUsed
      await configManager.ensureLoaded();
      configManager.config.providers['old-provider'].lastUsed = ninetyDaysAgo;
      configManager.config.providers['recent-provider'].lastUsed = recentDate;
      await configManager.save();

      await configManager.load();
      const providers = configManager.listProviders();
      const threshold = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const staleProviders = providers.filter(p => {
        if (!p.lastUsed) return false;
        return new Date(p.lastUsed).getTime() < threshold;
      });

      expect(staleProviders).toHaveLength(1);
      expect(staleProviders[0].name).toBe('old-provider');
    });

    it('从未使用的供应商应该被识别', async () => {
      await configManager.addProvider('never-used', {
        displayName: 'Never Used',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-1',
        baseUrl: 'https://api.example.com'
      });

      // 手动清除 lastUsed
      await configManager.ensureLoaded();
      delete configManager.config.providers['never-used'].lastUsed;
      await configManager.save();

      await configManager.load();
      const provider = configManager.getProvider('never-used');
      expect(provider.lastUsed).toBeUndefined();
    });
  });
});
