/**
 * Stats Command Tests
 * 测试使用统计功能
 */

const { configManager } = require('../src/config');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Usage Statistics', () => {
  const testConfigPath = path.join(os.tmpdir(), '.akm-test-stats.json');
  let originalConfigPath;

  beforeEach(async () => {
    // 保存原始配置路径
    originalConfigPath = configManager.configPath;
    // 使用测试配置路径
    configManager.configPath = testConfigPath;
    configManager.config = null;
    configManager.isLoaded = false;

    // 创建测试配置
    await fs.writeJson(testConfigPath, {
      version: '1.0.0',
      currentProvider: null,
      providers: {}
    });
  });

  afterEach(async () => {
    // 恢复原始配置路径
    configManager.configPath = originalConfigPath;
    configManager.config = null;
    configManager.isLoaded = false;

    // 清理测试文件
    await fs.remove(testConfigPath);
  });

  describe('recordUsageSession', () => {
    it('应该记录使用会话', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      // 记录使用会话
      await configManager.recordUsageSession('test-provider', 60000); // 1分钟

      const provider = configManager.getProvider('test-provider');
      expect(provider.stats).toBeDefined();
      expect(provider.stats.totalSessions).toBe(1);
      expect(provider.stats.totalDurationMs).toBe(60000);
      expect(provider.stats.averageDurationMs).toBe(60000);
      expect(provider.stats.lastSessionDuration).toBe(60000);
    });

    it('应该累计多次会话', async () => {
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      // 第一次会话 30分钟
      await configManager.recordUsageSession('test-provider', 30 * 60 * 1000);
      // 第二次会话 60分钟
      await configManager.recordUsageSession('test-provider', 60 * 60 * 1000);

      const provider = configManager.getProvider('test-provider');
      expect(provider.stats.totalSessions).toBe(2);
      expect(provider.stats.totalDurationMs).toBe(90 * 60 * 1000);
      expect(provider.stats.averageDurationMs).toBe(45 * 60 * 1000);
      expect(provider.stats.lastSessionDuration).toBe(60 * 60 * 1000);
    });

    it('应该更新最后使用时间', async () => {
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      const beforeTime = new Date().toISOString();
      await configManager.recordUsageSession('test-provider', 1000);
      const afterTime = new Date().toISOString();

      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsed).toBeDefined();
      expect(provider.lastUsed >= beforeTime).toBe(true);
      expect(provider.lastUsed <= afterTime).toBe(true);
    });

    it('供应商不存在时应该抛出错误', async () => {
      await configManager.ensureLoaded();
      await expect(
        configManager.recordUsageSession('non-existent', 1000)
      ).rejects.toThrow('供应商 \'non-existent\' 不存在');
    });
  });

  describe('getUsageStats', () => {
    it('应该获取单个供应商的统计', async () => {
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      await configManager.recordUsageSession('test-provider', 60000);

      const stats = configManager.getUsageStats('test-provider');
      expect(stats).not.toBeNull();
      expect(stats.name).toBe('test-provider');
      expect(stats.displayName).toBe('Test Provider');
      expect(stats.stats).toBeDefined();
      expect(stats.stats.totalSessions).toBe(1);
    });

    it('应该获取所有供应商的统计', async () => {
      // 添加多个供应商
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

      await configManager.updateLastUsedArgs('provider-1', []);
      await configManager.updateLastUsedArgs('provider-1', []);
      await configManager.updateLastUsedArgs('provider-2', []);

      const allStats = configManager.getUsageStats();
      expect(allStats).toHaveLength(2);

      // 应该按使用次数降序排序
      expect(allStats[0].name).toBe('provider-1');
      expect(allStats[0].usageCount).toBe(2);
      expect(allStats[1].name).toBe('provider-2');
      expect(allStats[1].usageCount).toBe(1);
    });

    it('供应商不存在时应该返回 null', async () => {
      await configManager.ensureLoaded();
      const stats = configManager.getUsageStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('getRecommendedProviders', () => {
    it('应该按推荐分数排序', async () => {
      // 添加3个供应商，设置不同的使用情况
      await configManager.addProvider('high-usage', {
        displayName: 'High Usage',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-1',
        baseUrl: 'https://api1.example.com'
      });

      await configManager.addProvider('medium-usage', {
        displayName: 'Medium Usage',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-2',
        baseUrl: 'https://api2.example.com'
      });

      await configManager.addProvider('low-usage', {
        displayName: 'Low Usage',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-3',
        baseUrl: 'https://api3.example.com'
      });

      // 模拟不同的使用频率
      for (let i = 0; i < 10; i++) {
        await configManager.updateLastUsedArgs('high-usage', []);
      }
      for (let i = 0; i < 5; i++) {
        await configManager.updateLastUsedArgs('medium-usage', []);
      }
      await configManager.updateLastUsedArgs('low-usage', []);

      const recommendations = configManager.getRecommendedProviders({ limit: 3 });
      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].name).toBe('high-usage');
      expect(recommendations[1].name).toBe('medium-usage');
      expect(recommendations[2].name).toBe('low-usage');

      // 推荐分数应该递减
      expect(recommendations[0].recommendScore).toBeGreaterThan(recommendations[1].recommendScore);
      expect(recommendations[1].recommendScore).toBeGreaterThan(recommendations[2].recommendScore);
    });

    it('应该限制返回数量', async () => {
      // 添加5个供应商
      for (let i = 1; i <= 5; i++) {
        await configManager.addProvider(`provider-${i}`, {
          displayName: `Provider ${i}`,
          ideName: 'claude',
          authMode: 'api_key',
          authToken: `token-${i}`,
          baseUrl: `https://api${i}.example.com`
        });
      }

      const recommendations = configManager.getRecommendedProviders({ limit: 3 });
      expect(recommendations).toHaveLength(3);
    });

    it('应该根据过滤器过滤', async () => {
      // 添加 Claude 和 Codex 供应商
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

      // Claude 过滤器
      const claudeRecs = configManager.getRecommendedProviders({ filter: 'claude' });
      expect(claudeRecs).toHaveLength(1);
      expect(claudeRecs[0].ideName).not.toBe('codex');

      // Codex 过滤器
      const codexRecs = configManager.getRecommendedProviders({ filter: 'codex' });
      expect(codexRecs).toHaveLength(1);
      expect(codexRecs[0].ideName).toBe('codex');
    });

    it('空配置应该返回空数组', async () => {
      await configManager.ensureLoaded();
      const recommendations = configManager.getRecommendedProviders();
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('统计数据持久化', () => {
    it('统计数据应该持久化到文件', async () => {
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      await configManager.recordUsageSession('test-provider', 60000);

      // 重新加载配置
      configManager.config = null;
      configManager.isLoaded = false;
      await configManager.load();

      const provider = configManager.getProvider('test-provider');
      expect(provider.stats).toBeDefined();
      expect(provider.stats.totalSessions).toBe(1);
      expect(provider.stats.totalDurationMs).toBe(60000);
    });
  });
});
