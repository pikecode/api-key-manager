const { codexProviderIdentity, historyConfirmation } = require('../src/utils/codex-provider-identity');
const config = { name: 'a', baseUrl: 'https://example.com/v1', authToken: 'test-secret' };

test('第三方来源稳定，认证、名称或端点变化时区分配置', () => {
  const id = codexProviderIdentity(config);
  expect(id).toMatch(/^akm_[a-f0-9]{64}$/);
  expect(codexProviderIdentity({ ...config })).toBe(id);
  for (const update of [{ authToken: 'different' }, { name: 'b' }, { baseUrl: 'https://other.com' }]) {
    expect(codexProviderIdentity({ ...config, ...update })).not.toBe(id);
  }
  expect(id).not.toContain(config.authToken);
  expect(historyConfirmation(id, config)).toContain('来自当前供应商配置');
  expect(historyConfirmation(id, { ...config, name: 'b' })).toContain('来自其他供应商配置');
});

test('旧第三方和多个官方账号不误判为同一配置', () => {
  expect(historyConfirmation('akm', config)).toContain('无法确认');
  const official = { ...config, authMode: 'chatgpt_login' };
  expect(codexProviderIdentity(official)).toBe('openai');
  expect(historyConfirmation('openai', official)).toContain('无法确认');
  expect(historyConfirmation('未知', config)).toContain('无法确认');
  expect(historyConfirmation('akm', official)).toContain('来自其他供应商配置');
  expect(historyConfirmation('openai', config)).toContain('来自其他供应商配置');
});
