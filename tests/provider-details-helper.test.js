/**
 * Provider Details Helper Tests
 * 测试供应商详情构建逻辑
 */

const { ProviderDetailsHelper } = require('../src/commands/switch/provider-details-helper');

describe('ProviderDetailsHelper', () => {
  const authModeDisplay = {
    api_key: 'API Key 模式',
    auth_token: 'Auth Token 模式'
  };
  const baseUrl = {
    OFFICIAL_DEFAULT: '✨ 官方默认服务器'
  };
  const formatTime = (value) => `time:${value}`;

  describe('buildDetailsRows', () => {
    it('应该构建完整的供应商详情 rows', () => {
      const provider = {
        name: 'test-provider',
        displayName: 'Test Provider',
        authMode: 'api_key',
        baseUrl: 'https://api.example.com',
        authToken: 'token',
        models: {
          primary: 'primary-model',
          smallFast: 'fast-model'
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        lastUsed: '2026-01-02T00:00:00.000Z',
        current: true,
        usageCount: 3
      };

      const rows = ProviderDetailsHelper.buildDetailsRows(provider, {
        authModeDisplay,
        baseUrl,
        formatTime
      });

      expect(rows).toEqual([
        ['供应商名称', 'test-provider'],
        ['显示名称', 'Test Provider'],
        ['认证模式', 'API Key 模式'],
        ['基础URL', 'https://api.example.com'],
        ['认证令牌', 'token'],
        ['主模型', 'primary-model'],
        ['快速模型', 'fast-model'],
        ['创建时间', 'time:2026-01-01T00:00:00.000Z'],
        ['最后使用', 'time:2026-01-02T00:00:00.000Z'],
        ['当前状态', '✅ 使用中'],
        ['使用次数', 3]
      ]);
    });

    it('auth_token 没有 baseUrl 时应该显示官方默认服务器', () => {
      const provider = {
        name: 'auth-provider',
        displayName: 'Auth Provider',
        authMode: 'auth_token'
      };

      const rows = ProviderDetailsHelper.buildDetailsRows(provider, {
        authModeDisplay,
        baseUrl,
        formatTime
      });

      expect(rows.find(([label]) => label === '基础URL')[1]).toBe('✨ 官方默认服务器');
    });

    it('api_key 没有 baseUrl 时应该显示未设置', () => {
      const provider = {
        name: 'api-provider',
        displayName: 'API Provider',
        authMode: 'api_key'
      };

      const rows = ProviderDetailsHelper.buildDetailsRows(provider, {
        authModeDisplay,
        baseUrl,
        formatTime
      });

      expect(rows.find(([label]) => label === '基础URL')[1]).toBe('⚠️ 未设置');
      expect(rows.find(([label]) => label === '认证令牌')[1]).toBe('未设置');
      expect(rows.find(([label]) => label === '当前状态')[1]).toBe('⚫ 未使用');
      expect(rows.find(([label]) => label === '使用次数')[1]).toBe(0);
    });
  });

  describe('buildActionChoices', () => {
    it('应该构建供应商详情操作 choices', () => {
      const icons = {
        launch: '▶',
        edit: '~',
        delete: '-',
        back: '←'
      };

      const choices = ProviderDetailsHelper.buildActionChoices(icons);

      expect(choices).toEqual([
        { name: '▶ 立即启动', value: 'launch' },
        { name: '~ 编辑供应商', value: 'edit' },
        { name: '- 删除供应商', value: 'remove' },
        { name: '← 返回管理列表', value: 'back' }
      ]);
    });
  });

  describe('formatLaunchArgs', () => {
    it('应该格式化默认启动参数', () => {
      const provider = {
        launchArgs: ['--continue', '--search']
      };

      expect(ProviderDetailsHelper.formatLaunchArgs(provider)).toBe('--continue, --search');
    });

    it('没有启动参数时应该返回 null', () => {
      expect(ProviderDetailsHelper.formatLaunchArgs({ launchArgs: [] })).toBeNull();
      expect(ProviderDetailsHelper.formatLaunchArgs({})).toBeNull();
    });
  });
});
