const { ProviderLister } = require('../src/commands/list');
const { CurrentConfig } = require('../src/commands/current');

function createProvider() {
  return {
    name: 'local-provider',
    displayName: '本地供应商',
    ideName: 'codex',
    authMode: null,
    authToken: 'sk-local-full-token-123456',
    baseUrl: 'https://api.example.com/v1',
    launchArgs: [],
    createdAt: '2026-07-14T00:00:00.000Z',
    lastUsed: '2026-07-14T00:00:00.000Z',
    current: true
  };
}

describe('本地 Token 完整显示', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('list 默认完整显示 Token', async () => {
    const provider = createProvider();
    const manager = {
      ensureLoaded: jest.fn().mockResolvedValue(),
      listProviders: jest.fn().mockReturnValue([provider]),
      getCurrentProvider: jest.fn().mockReturnValue(provider)
    };

    await new ProviderLister(manager).list(null, { showToken: false });

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain(provider.authToken);
    expect(output).not.toContain('***');
  });

  test('current 默认完整显示 Token', async () => {
    const provider = createProvider();
    const manager = {
      ensureLoaded: jest.fn().mockResolvedValue(),
      getCurrentProvider: jest.fn().mockReturnValue(provider)
    };

    await new CurrentConfig(manager).show({ showToken: false });

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain(provider.authToken);
    expect(output).not.toContain('***');
  });
});
