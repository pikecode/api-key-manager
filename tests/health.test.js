/**
 * Health Check Tests
 * 测试配置健康检查功能
 */

const { HealthChecker } = require('../src/utils/health-checker');

describe('Health Checker', () => {
  let checker;

  beforeEach(() => {
    checker = new HealthChecker();
  });

  describe('checkTokenExpiry', () => {
    it('应该检测 Token 已过期', () => {
      const provider = {
        name: 'test',
        tokenExpiry: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10天前
      };

      const result = checker.checkTokenExpiry(provider);
      expect(result.status).toBe('expired');
      expect(result.level).toBe('error');
      expect(result.daysUntilExpiry).toBeLessThan(0);
    });

    it('应该检测 Token 即将过期（3天内）', () => {
      const provider = {
        name: 'test',
        tokenExpiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2天后
      };

      const result = checker.checkTokenExpiry(provider);
      expect(result.status).toBe('critical');
      expect(result.level).toBe('error');
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(3);
    });

    it('应该检测 Token 警告期（7天内）', () => {
      const provider = {
        name: 'test',
        tokenExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5天后
      };

      const result = checker.checkTokenExpiry(provider);
      expect(result.status).toBe('warning');
      expect(result.level).toBe('warning');
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(7);
    });

    it('应该检测 Token 正常', () => {
      const provider = {
        name: 'test',
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60天后
      };

      const result = checker.checkTokenExpiry(provider);
      expect(result.status).toBe('ok');
      expect(result.level).toBe('info');
      expect(result.daysUntilExpiry).toBeGreaterThan(30);
    });

    it('没有过期时间时应该返回 ok', () => {
      const provider = { name: 'test' };
      const result = checker.checkTokenExpiry(provider);
      expect(result.status).toBe('ok');
      expect(result.daysUntilExpiry).toBeNull();
    });
  });

  describe('checkQuota', () => {
    it('应该检测配额已用完', () => {
      const provider = {
        name: 'test',
        quota: { used: 1000, limit: 1000 }
      };

      const result = checker.checkQuota(provider);
      expect(result.status).toBe('exceeded');
      expect(result.level).toBe('error');
      expect(result.usagePercent).toBe(100);
    });

    it('应该检测配额即将用完（90%以上）', () => {
      const provider = {
        name: 'test',
        quota: { used: 950, limit: 1000 }
      };

      const result = checker.checkQuota(provider);
      expect(result.status).toBe('critical');
      expect(result.level).toBe('error');
      expect(result.usagePercent).toBeGreaterThanOrEqual(90);
    });

    it('应该检测配额使用较高（75%以上）', () => {
      const provider = {
        name: 'test',
        quota: { used: 800, limit: 1000 }
      };

      const result = checker.checkQuota(provider);
      expect(result.status).toBe('warning');
      expect(result.level).toBe('warning');
      expect(result.usagePercent).toBeGreaterThanOrEqual(75);
    });

    it('应该检测配额正常', () => {
      const provider = {
        name: 'test',
        quota: { used: 300, limit: 1000 }
      };

      const result = checker.checkQuota(provider);
      expect(result.status).toBe('ok');
      expect(result.level).toBe('info');
      expect(result.usagePercent).toBe(30);
    });

    it('没有配额信息时应该返回 ok', () => {
      const provider = { name: 'test' };
      const result = checker.checkQuota(provider);
      expect(result.status).toBe('ok');
      expect(result.usagePercent).toBeNull();
    });
  });

  describe('checkLastUsed', () => {
    it('应该检测长期未使用（90天以上）', () => {
      const provider = {
        name: 'test',
        lastUsed: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100天前
      };

      const result = checker.checkLastUsed(provider);
      expect(result.status).toBe('stale');
      expect(result.level).toBe('warning');
      expect(result.daysSinceLastUse).toBeGreaterThan(90);
    });

    it('应该检测一段时间未使用（30天以上）', () => {
      const provider = {
        name: 'test',
        lastUsed: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45天前
      };

      const result = checker.checkLastUsed(provider);
      expect(result.status).toBe('inactive');
      expect(result.level).toBe('info');
      expect(result.daysSinceLastUse).toBeGreaterThan(30);
    });

    it('应该检测最近使用', () => {
      const provider = {
        name: 'test',
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5天前
      };

      const result = checker.checkLastUsed(provider);
      expect(result.status).toBe('ok');
      expect(result.level).toBe('info');
      expect(result.daysSinceLastUse).toBeLessThanOrEqual(30);
    });

    it('从未使用时应该标记', () => {
      const provider = { name: 'test' };
      const result = checker.checkLastUsed(provider);
      expect(result.status).toBe('never');
      expect(result.level).toBe('info');
      expect(result.daysSinceLastUse).toBeNull();
    });
  });

  describe('performHealthCheck', () => {
    it('应该执行完整健康检查', async () => {
      const provider = {
        name: 'test-provider',
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com',
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        quota: { used: 300, limit: 1000 },
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      };

      const results = await checker.performHealthCheck(provider, {
        checkConnectivity: false // 跳过 API 检查以加快测试速度
      });

      expect(results.provider).toBe('test-provider');
      expect(results.displayName).toBe('Test Provider');
      expect(results.checks.tokenExpiry).toBeDefined();
      expect(results.checks.quota).toBeDefined();
      expect(results.checks.lastUsed).toBeDefined();
    });

    it('有错误时整体状态应该是 error', async () => {
      const provider = {
        name: 'test-provider',
        displayName: 'Test Provider',
        ideName: 'claude',
        tokenExpiry: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 已过期
      };

      const results = await checker.performHealthCheck(provider, {
        checkConnectivity: false
      });

      expect(results.overallStatus).toBe('error');
    });

    it('有警告时整体状态应该是 warning', async () => {
      const provider = {
        name: 'test-provider',
        displayName: 'Test Provider',
        ideName: 'claude',
        quota: { used: 800, limit: 1000 } // 使用率80%
      };

      const results = await checker.performHealthCheck(provider, {
        checkConnectivity: false
      });

      expect(results.overallStatus).toBe('warning');
    });

    it('全部正常时整体状态应该是 ok', async () => {
      const provider = {
        name: 'test-provider',
        displayName: 'Test Provider',
        ideName: 'claude',
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        quota: { used: 100, limit: 1000 },
        lastUsed: new Date().toISOString()
      };

      const results = await checker.performHealthCheck(provider, {
        checkConnectivity: false
      });

      expect(results.overallStatus).toBe('info');
    });
  });

  describe('formatHealthReport', () => {
    it('应该格式化健康检查报告', async () => {
      const provider = {
        name: 'test-provider',
        displayName: 'Test Provider',
        ideName: 'claude'
      };

      const results = await checker.performHealthCheck(provider, {
        checkConnectivity: false
      });

      const report = checker.formatHealthReport(results);
      expect(report).toContain('Test Provider');
      expect(report).toContain('test-provider');
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });
});
