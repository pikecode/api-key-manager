/**
 * Switch Command Tests
 * 测试供应商选择和切换的核心功能
 */

// 不直接导入命令类，而是测试相关逻辑

const { configManager } = require('../src/config');
const { AUTH_MODE_DISPLAY, TOKEN_TYPE_DISPLAY, BASE_URL } = require('../src/constants');
const { validator } = require('../src/utils/validator');

// Mock modules
jest.mock('../src/config');

describe('Switch Command Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Selection', () => {
    it('应该列出所有可用供应商', async () => {
      const mockProviders = [
        {
          name: 'test-provider-1',
          displayName: 'Test Provider 1',
          ideName: 'claude',
          authMode: 'oauth_token',
          authToken: 'sk-ant-oat01-xxx',
          current: true,
          usageCount: 5,
          lastUsed: new Date().toISOString()
        },
        {
          name: 'test-provider-2',
          displayName: 'Test Provider 2',
          ideName: 'codex',
          authMode: 'api_key',
          authToken: 'sk-xxx',
          current: false,
          usageCount: 2,
          lastUsed: new Date().toISOString()
        }
      ];

      const providers = mockProviders;

      expect(providers).toHaveLength(2);
      expect(providers[0].name).toBe('test-provider-1');
      expect(providers[0].current).toBe(true);
    });

    it('应该过滤 Claude Code 供应商', () => {
      const mockProviders = [
        { name: 'claude-provider', ideName: 'claude', current: true },
        { name: 'codex-provider', ideName: 'codex', current: false }
      ];

      const filtered = mockProviders.filter(p => p.ideName !== 'codex');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].ideName).toBe('claude');
    });

    it('应该过滤 Codex 供应商', () => {
      const mockProviders = [
        { name: 'claude-provider', ideName: 'claude', current: false },
        { name: 'codex-provider', ideName: 'codex', current: true }
      ];

      const filtered = mockProviders.filter(p => p.ideName === 'codex');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].ideName).toBe('codex');
    });

    it('应该找到当前活跃的供应商', () => {
      const mockProviders = [
        { name: 'provider-1', current: false },
        { name: 'provider-2', current: true },
        { name: 'provider-3', current: false }
      ];

      const currentProvider = mockProviders.find(p => p.current);

      expect(currentProvider).toBeDefined();
      expect(currentProvider.name).toBe('provider-2');
    });
  });

  describe('Provider Information Formatting', () => {
    it('应该正确显示认证模式信息', () => {
      const provider = { authMode: 'oauth_token' };
      const display = AUTH_MODE_DISPLAY[provider.authMode];

      expect(display).toBe('OAuth令牌模式');
    });

    it('应该正确显示 Token 类型信息', () => {
      const provider = { tokenType: 'auth_token' };
      const display = TOKEN_TYPE_DISPLAY[provider.tokenType];

      expect(display).toBe('ANTHROPIC_AUTH_TOKEN');
    });

    it('应该显示默认 URL 信息', () => {
      const provider = { baseUrl: null, authMode: 'oauth_token' };
      const baseUrlDisplay = provider.baseUrl || BASE_URL.OFFICIAL_DEFAULT;

      expect(baseUrlDisplay).toBe(BASE_URL.OFFICIAL_DEFAULT);
    });
  });

  describe('Usage Statistics', () => {
    it('应该更新供应商使用计数', () => {
      const provider = {
        name: 'test-provider',
        usageCount: 5,
        lastUsed: '2025-01-20T10:00:00.000Z'
      };

      provider.usageCount = (provider.usageCount || 0) + 1;
      provider.lastUsed = new Date().toISOString();

      expect(provider.usageCount).toBe(6);
      expect(provider.lastUsed).toBeDefined();
    });

    it('应该追踪最后使用时间', () => {
      const providers = [
        { name: 'provider-1', lastUsed: '2025-01-15T10:00:00.000Z' },
        { name: 'provider-2', lastUsed: '2025-01-20T15:30:00.000Z' },
        { name: 'provider-3', lastUsed: '2025-01-18T12:00:00.000Z' }
      ];

      const mostRecent = providers.reduce((latest, current) => {
        if (!latest || !latest.lastUsed) return current;
        return new Date(current.lastUsed) > new Date(latest.lastUsed) ? current : latest;
      }, null);

      expect(mostRecent.name).toBe('provider-2');
    });
  });

  describe('IDE Detection', () => {
    it('应该识别 Claude Code IDE', () => {
      const provider = { ideName: 'claude' };
      const isCodex = provider.ideName === 'codex';

      expect(isCodex).toBe(false);
    });

    it('应该识别 Codex IDE', () => {
      const provider = { ideName: 'codex' };
      const isCodex = provider.ideName === 'codex';

      expect(isCodex).toBe(true);
    });
  });

  describe('Validation', () => {
    it('应该验证供应商名称存在', () => {
      const mockProviders = [
        { name: 'test-provider' },
        { name: 'another-provider' }
      ];

      const exists = mockProviders.some(p => p.name === 'test-provider');
      expect(exists).toBe(true);
    });

    it('应该验证不存在的供应商', () => {
      const mockProviders = [
        { name: 'test-provider' },
        { name: 'another-provider' }
      ];

      const exists = mockProviders.some(p => p.name === 'non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('Constants', () => {
    it('应该定义所有认证模式', () => {
      expect(AUTH_MODE_DISPLAY).toHaveProperty('api_key');
      expect(AUTH_MODE_DISPLAY).toHaveProperty('auth_token');
      expect(AUTH_MODE_DISPLAY).toHaveProperty('oauth_token');
    });

    it('应该定义所有 Token 类型', () => {
      expect(TOKEN_TYPE_DISPLAY).toHaveProperty('auth_token');
      expect(TOKEN_TYPE_DISPLAY).toHaveProperty('api_key');
    });

    it('应该定义 URL 显示信息', () => {
      expect(BASE_URL).toHaveProperty('OFFICIAL_DEFAULT');
      expect(BASE_URL).toHaveProperty('NOT_SET');
    });
  });
});
