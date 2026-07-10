/**
 * Provider Choices Helper Tests
 * 测试供应商选择项构建逻辑
 */

const { ProviderChoicesHelper } = require('../src/commands/switch/provider-choices-helper');

const UIHelper = {
  icons: {
    back: '←',
    error: '✗'
  },
  colors: {
    muted: (text) => text
  },
  formatProvider: (provider) => `${provider.name} (${provider.displayName})`
};

const StatusHelper = {
  getIconForState: (state) => {
    const icons = {
      online: '●',
      pending: '…'
    };
    return icons[state] || '·';
  },
  formatAvailability: (availability) => availability?.label || '测试中...'
};

const chalk = {
  gray: (text) => text,
  cyan: (text) => text,
  magenta: (text) => text
};

class Separator {
  constructor() {
    this.type = 'separator';
  }
}

describe('ProviderChoicesHelper', () => {
  describe('findLastUsedProvider', () => {
    it('应该找到最近使用的供应商', () => {
      const providers = [
        { name: 'old', lastUsed: '2026-01-01T00:00:00.000Z' },
        { name: 'new', lastUsed: '2026-01-02T00:00:00.000Z' }
      ];

      const result = ProviderChoicesHelper.findLastUsedProvider(providers);

      expect(result.name).toBe('new');
    });

    it('应该忽略没有 lastUsed 的供应商', () => {
      const providers = [
        { name: 'never' },
        { name: 'used', lastUsed: '2026-01-01T00:00:00.000Z' }
      ];

      const result = ProviderChoicesHelper.findLastUsedProvider(providers);

      expect(result.name).toBe('used');
    });
  });

  describe('buildProviderChoices', () => {
    it('应该构建供应商选择项并标记上次使用', () => {
      const providers = [
        {
          name: 'claude-provider',
          displayName: 'Claude Provider',
          ideName: 'claude',
          lastUsed: '2026-01-01T00:00:00.000Z'
        },
        {
          name: 'codex-provider',
          displayName: 'Codex Provider',
          ideName: 'codex',
          lastUsed: '2026-01-02T00:00:00.000Z'
        }
      ];
      const statusMap = {
        'claude-provider': { state: 'online', label: '可用' },
        'codex-provider': { state: 'pending', label: '测试中...' }
      };

      const choices = ProviderChoicesHelper.buildProviderChoices(providers, {
        statusMap,
        UIHelper,
        StatusHelper,
        chalk,
        Separator
      });

      expect(choices).toHaveLength(2);
      expect(choices[0]).toEqual(expect.objectContaining({
        value: 'claude-provider',
        short: 'claude-provider'
      }));
      expect(choices[0].name).toContain('[Claude]');
      expect(choices[0].name).toContain('可用');
      expect(choices[1].name).toContain('[Codex]');
      expect(choices[1].name).toContain('--- 上次使用');
    });

    it('应该在管理模式追加返回和退出操作', () => {
      const providers = [
        {
          name: 'provider',
          displayName: 'Provider',
          ideName: 'claude'
        }
      ];

      const choices = ProviderChoicesHelper.buildProviderChoices(providers, {
        includeActions: true,
        UIHelper,
        StatusHelper,
        chalk,
        Separator
      });

      expect(choices).toHaveLength(4);
      expect(choices[1]).toBeInstanceOf(Separator);
      expect(choices[2]).toEqual({ name: '← 返回供应商选择', value: 'back' });
      expect(choices[3]).toEqual({ name: '✗ 退出', value: 'exit' });
    });
  });
});
