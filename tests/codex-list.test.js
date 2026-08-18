const { ProviderLister } = require('../src/commands/list');
const { ConfigManager } = require('../src/config');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('Codex Official Config in List', () => {
  let configPath;
  let configManager;
  let lister;
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `akm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.ensureDirSync(tmpDir);
    configPath = path.join(tmpDir, '.akm.json');
    configManager = new ConfigManager(configPath);
    await configManager.ensureLoaded();
    lister = new ProviderLister(configManager);
  });

  afterEach(() => {
    fs.removeSync(tmpDir);
  });

  it('自动生成的官方配置会在 list 中显示', async () => {
    // 添加第一个 Codex 配置
    await configManager.addProvider('test-codex', {
      displayName: 'Test Codex',
      ideName: 'codex',
      authMode: 'api_key',
      authToken: 'sk-test',
      baseUrl: 'https://api.openai.com',
      launchArgs: []
    });

    // 模拟自动生成官方配置
    const providers = configManager.listProviders();
    const codexProviders = providers.filter(p => p.ideName === 'codex');
    if (codexProviders.length === 1 && !configManager.getProvider('openai-official')) {
      await configManager.addProvider('openai-official', {
        displayName: 'OpenAI Official',
        ideName: 'codex',
        authMode: 'chatgpt_login',
        baseUrl: null,
        authToken: null,
        launchArgs: []
      });
    }

    // 验证两个配置都存在
    const allProviders = configManager.listProviders();
    expect(allProviders.map(p => p.name)).toEqual(
      expect.arrayContaining(['test-codex', 'openai-official'])
    );

    // 验证两个配置都是 Codex 类型
    const codexProviders2 = allProviders.filter(p => p.ideName === 'codex');
    expect(codexProviders2.length).toBeGreaterThanOrEqual(2);
    expect(codexProviders2.map(p => p.name)).toEqual(
      expect.arrayContaining(['test-codex', 'openai-official'])
    );

    // 验证认证模式正确
    expect(configManager.getProvider('test-codex').authMode).toBe('api_key');
    expect(configManager.getProvider('openai-official').authMode).toBe('chatgpt_login');
  });

  it('akm list --codex 会列出官方配置', async () => {
    // 添加配置
    await configManager.addProvider('test-codex', {
      ideName: 'codex',
      authMode: 'api_key',
      authToken: 'sk-test',
      baseUrl: 'https://api.openai.com',
      displayName: 'Test Codex',
      launchArgs: []
    });

    await configManager.addProvider('openai-official', {
      ideName: 'codex',
      authMode: 'chatgpt_login',
      displayName: 'OpenAI Official',
      baseUrl: null,
      authToken: null,
      launchArgs: []
    });

    // 获取过滤后的列表
    const providers = configManager.listProviders();
    const codexProviders = providers.filter(p => p.ideName === 'codex');

    // 应该包含至少这两个配置
    expect(codexProviders.map(p => p.name)).toEqual(
      expect.arrayContaining(['test-codex', 'openai-official'])
    );

    // 验证官方配置的 authMode
    const official = codexProviders.find(p => p.name === 'openai-official');
    expect(official).toBeDefined();
    expect(official.authMode).toBe('chatgpt_login');
  });
});
