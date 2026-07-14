const { ProviderStatusChecker } = require('../src/utils/provider-status-checker');

describe('ProviderStatusChecker 安全边界', () => {
  test('Codex 允许检查本地配置的远程 HTTP 地址', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const checker = new ProviderStatusChecker();

    try {
      const result = await checker.check(
        {
          name: 'insecure-codex',
          ideName: 'codex',
          authToken: 'sk-review-secret',
          baseUrl: 'http://api.example.com/v1'
        },
        { skipCache: true }
      );

      expect(result).toEqual(
        expect.objectContaining({
          state: 'online'
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'http://api.example.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer sk-review-secret' })
        })
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('Claude 允许检查本地配置的远程 HTTP 地址', async () => {
    const checker = new ProviderStatusChecker();
    const create = jest.fn().mockResolvedValue({ content: [{ text: 'ok' }] });
    checker._createClient = jest.fn().mockReturnValue({ messages: { create } });

    const result = await checker.check(
      {
        name: 'insecure-claude',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'sk-review-secret',
        baseUrl: 'http://api.example.com'
      },
      { skipCache: true }
    );

    expect(result).toEqual(
      expect.objectContaining({
        state: 'online'
      })
    );
    expect(checker._createClient).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  test('非字符串 URL 不会被当作未配置值放行', async () => {
    const checker = new ProviderStatusChecker();
    checker._createClient = jest.fn();

    const result = await checker.check(
      {
        name: 'invalid-url-type',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'sk-review-secret',
        baseUrl: 12345
      },
      { skipCache: true }
    );

    expect(result).toEqual(
      expect.objectContaining({
        state: 'unknown',
        label: expect.stringContaining('字符串')
      })
    );
    expect(checker._createClient).not.toHaveBeenCalled();
  });

  test('Token 或模型变化时不会复用旧状态缓存', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const checker = new ProviderStatusChecker({ cacheTTL: 30000 });
    checker.clearCache();
    const baseProvider = {
      name: 'cache-provider',
      ideName: 'codex',
      baseUrl: 'https://api.example.com/v1'
    };

    try {
      await checker.check({
        ...baseProvider,
        authToken: 'token-one',
        models: { primary: 'model-one' }
      });
      await checker.check({
        ...baseProvider,
        authToken: 'token-two',
        models: { primary: 'model-one' }
      });
      await checker.check({
        ...baseProvider,
        authToken: 'token-two',
        models: { primary: 'model-two' }
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    } finally {
      global.fetch = originalFetch;
      checker.clearCache();
    }
  });

  test('批量状态检查遵守并发上限', async () => {
    const originalFetch = global.fetch;
    let active = 0;
    let maxActive = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return { ok: true, status: 200 };
    });
    const checker = new ProviderStatusChecker({ maxConcurrency: 2, cacheTTL: 0 });
    checker.clearCache();
    const providers = Array.from({ length: 6 }, (_, index) => ({
      name: `provider-${index}`,
      ideName: 'codex',
      authToken: `token-${index}`,
      baseUrl: 'https://api.example.com/v1'
    }));

    try {
      await checker.checkAll(providers);
      expect(maxActive).toBeLessThanOrEqual(2);
    } finally {
      global.fetch = originalFetch;
      checker.clearCache();
    }
  });
});
