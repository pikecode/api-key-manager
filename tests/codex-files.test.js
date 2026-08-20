const fs = require('fs-extra');
const path = require('path');
const { writeFileAtomic } = require('../src/utils/atomic-file');
const {
  readCodexFiles,
  applyCodexConfig,
  clearCodexAkmConfig,
  cacheCodexOfficialSession,
  buildCodexPaths,
  removeTopLevelApiBaseUrl,
  extractBaseUrlFromConfigToml,
  updateModelProvider,
  buildAuthJson,
  removeAkmModelProvider
} = require('../src/utils/codex-files');

describe('codex-files', () => {
  const codexHome = path.join(__dirname, '..', 'test-codex-home');

  beforeEach(async () => {
    process.env.CODEX_HOME = codexHome;
    await fs.remove(codexHome);
  });

  afterEach(async () => {
    await fs.remove(codexHome);
    delete process.env.CODEX_HOME;
  });

  test('readCodexFiles returns null content when files missing', async () => {
    const result = await readCodexFiles();
    expect(result.codexHome).toBe(codexHome);
    expect(result.configToml).toBeNull();
    expect(result.authJson).toBeNull();
  });

  test('applyCodexConfig writes auth.json', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    await applyCodexConfig({ authToken: 'sk-test-key', name: 'test' });
    const content = JSON.parse(await fs.readFile(authJsonPath, 'utf8'));
    expect(content).toEqual({
      auth_mode: 'apikey',
      OPENAI_API_KEY: 'sk-test-key'
    });
  });

  test('applyCodexConfig 将混合登录态切换为最小 API Key 结构', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'existing-session' },
      OPENAI_API_KEY: 'old-key'
    });

    await applyCodexConfig({ authToken: 'new-key', name: 'test' });

    const content = await fs.readJson(authJsonPath);
    expect(content).toEqual({ auth_mode: 'apikey', OPENAI_API_KEY: 'new-key' });

    const backupRoot = path.join(codexHome, 'akm-backups');
    const [backupName] = await fs.readdir(backupRoot);
    expect(await fs.readJson(path.join(backupRoot, backupName, 'auth.json'))).toEqual({
      auth_mode: 'chatgpt',
      tokens: { access_token: 'existing-session' },
      OPENAI_API_KEY: 'old-key'
    });
  });

  test('applyCodexConfig 修改前自动备份原文件', async () => {
    const { authJsonPath, configTomlPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, { OPENAI_API_KEY: 'old-key', marker: 'original' });
    await fs.writeFile(configTomlPath, 'model = "gpt-old"\n', 'utf8');

    await applyCodexConfig({ authToken: 'new-key', baseUrl: 'https://api.example.com/v1' });

    const backupRoot = path.join(codexHome, 'akm-backups');
    const backupDirs = await fs.readdir(backupRoot);
    expect(backupDirs).toHaveLength(1);
    const backupDir = path.join(backupRoot, backupDirs[0]);
    expect(await fs.readJson(path.join(backupDir, 'auth.json'))).toEqual({
      OPENAI_API_KEY: 'old-key',
      marker: 'original'
    });
    expect(await fs.readFile(path.join(backupDir, 'config.toml'), 'utf8')).toBe(
      'model = "gpt-old"\n'
    );
  });

  test('auth.json 损坏时停止写入并保留原内容', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeFile(authJsonPath, '{broken-json', 'utf8');

    await expect(applyCodexConfig({ authToken: 'new-key' })).rejects.toThrow('auth.json 格式无效');
    expect(await fs.readFile(authJsonPath, 'utf8')).toBe('{broken-json');
  });

  test('config.toml 写入失败时回滚 auth.json 和 config.toml', async () => {
    const { authJsonPath, configTomlPath } = buildCodexPaths(codexHome);
    const originalAuth = { auth_mode: 'chatgpt', marker: 'original-auth' };
    const originalToml = 'model_provider = "original"\n';
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, originalAuth);
    await fs.writeFile(configTomlPath, originalToml, 'utf8');

    const failingWriter = async (filePath, content, options) => {
      if (filePath === configTomlPath) {
        throw new Error('模拟 config.toml 写入失败');
      }
      return await writeFileAtomic(filePath, content, options);
    };

    await expect(
      applyCodexConfig(
        { authToken: 'new-key', baseUrl: 'https://api.example.com/v1' },
        { codexHome, writeFile: failingWriter }
      )
    ).rejects.toThrow('已恢复原文件');

    expect(await fs.readJson(authJsonPath)).toEqual(originalAuth);
    expect(await fs.readFile(configTomlPath, 'utf8')).toBe(originalToml);
  });

  test('applyCodexConfig cleans up top-level api_base_url from config.toml', async () => {
    const { configTomlPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeFile(
      configTomlPath,
      'api_base_url = "https://old.com"\nmodel_provider = "88code"\n',
      'utf8'
    );

    await applyCodexConfig({ authToken: 'sk-test', name: 'test' });

    const content = await fs.readFile(configTomlPath, 'utf8');
    expect(content).not.toContain('api_base_url');
    expect(content).toContain('model_provider = "88code"');
  });

  test('applyCodexConfig does not touch config.toml if no api_base_url present', async () => {
    const { configTomlPath } = buildCodexPaths(codexHome);
    const original =
      'model_provider = "88code"\n[model_providers.88code]\nbase_url = "https://88code.ai"\n';
    await fs.ensureDir(codexHome);
    await fs.writeFile(configTomlPath, original, 'utf8');

    await applyCodexConfig({ authToken: 'sk-test', name: 'test' });

    const content = await fs.readFile(configTomlPath, 'utf8');
    expect(content).toBe(original);
  });

  test('applyCodexConfig throws when authToken missing', async () => {
    await expect(applyCodexConfig({ name: 'test' })).rejects.toThrow('Codex 配置缺少 API Key');
  });
});

describe('removeTopLevelApiBaseUrl', () => {
  test('removes top-level api_base_url', () => {
    const input = 'api_base_url = "https://example.com"\nother = "value"\n';
    const result = removeTopLevelApiBaseUrl(input);
    expect(result).not.toContain('api_base_url');
    expect(result).toContain('other = "value"');
  });

  test('does not remove api_base_url inside a section', () => {
    const input =
      'model = "gpt-4"\n\n[sandbox_workspace_write]\napi_base_url = "https://example.com"\n';
    const result = removeTopLevelApiBaseUrl(input);
    expect(result).toContain('api_base_url = "https://example.com"');
    expect(result).toContain('model = "gpt-4"');
  });

  test('handles null input', () => {
    expect(removeTopLevelApiBaseUrl(null)).toBeNull();
  });

  test('no-op when api_base_url not present', () => {
    const input = 'model_provider = "88code"\n';
    expect(removeTopLevelApiBaseUrl(input)).toBe(input);
  });
});

describe('extractBaseUrlFromConfigToml', () => {
  test('extracts base_url from active model_provider section', () => {
    const input = [
      'model_provider = "88code"',
      '',
      '[model_providers.88code]',
      'base_url = "https://www.88code.ai/openai/v1"',
      'name = "88code"'
    ].join('\n');
    expect(extractBaseUrlFromConfigToml(input)).toBe('https://www.88code.ai/openai/v1');
  });

  test('returns null when model_provider not set', () => {
    const input = '[model_providers.88code]\nbase_url = "https://example.com"\n';
    expect(extractBaseUrlFromConfigToml(input)).toBeNull();
  });

  test('returns null when matching section has no base_url', () => {
    const input = 'model_provider = "88code"\n\n[model_providers.88code]\nname = "88code"\n';
    expect(extractBaseUrlFromConfigToml(input)).toBeNull();
  });

  test('returns null for empty input', () => {
    expect(extractBaseUrlFromConfigToml(null)).toBeNull();
    expect(extractBaseUrlFromConfigToml('')).toBeNull();
  });
});

describe('buildAuthJson', () => {
  test('builds correct auth.json format', () => {
    const result = JSON.parse(buildAuthJson('sk-test-key'));
    expect(result).toEqual({ auth_mode: 'apikey', OPENAI_API_KEY: 'sk-test-key' });
  });

  test('removes conflicting ChatGPT authentication fields', () => {
    const result = JSON.parse(
      buildAuthJson('sk-new-key', {
        auth_mode: 'chatgpt',
        tokens: { access_token: 'existing-session' },
        OPENAI_API_KEY: 'old-key'
      })
    );
    expect(result).toEqual({ auth_mode: 'apikey', OPENAI_API_KEY: 'sk-new-key' });
  });
});

describe('removeAkmModelProvider', () => {
  test('只移除 AKM 管理的 provider 和 section', () => {
    const input = [
      'model_provider = "akm"',
      '',
      '[model_providers.user]',
      'base_url = "https://user.example.com"',
      '',
      '[model_providers.akm]',
      'base_url = "https://old-proxy.example.com"',
      'wire_api = "responses"',
      '',
      '[projects."/workspace"]',
      'trust_level = "trusted"'
    ].join('\n');

    const result = removeAkmModelProvider(input);
    expect(result).not.toContain('model_provider = "akm"');
    expect(result).not.toContain('[model_providers.akm]');
    expect(result).not.toContain('old-proxy.example.com');
    expect(result).toContain('[model_providers.user]');
    expect(result).toContain('[projects."/workspace"]');
  });

  test('兼容顶层键和 section 的行尾注释', () => {
    const input = [
      'model_provider = "akm" # managed by akm',
      '',
      '[model_providers.akm] # managed by akm',
      'base_url = "https://old-proxy.example.com"',
      '',
      '[projects."/workspace"] # user config',
      'trust_level = "trusted"'
    ].join('\n');

    const result = removeAkmModelProvider(input);
    expect(result).not.toContain('model_provider = "akm"');
    expect(result).not.toContain('[model_providers.akm]');
    expect(result).not.toContain('old-proxy.example.com');
    expect(result).toContain('[projects."/workspace"] # user config');
  });
});

describe('updateModelProvider', () => {
  test('sets model_provider and adds [model_providers.akm] section to empty config', () => {
    const result = updateModelProvider('', 'https://api.example.com/v1');
    expect(result).toContain('model_provider = "akm"');
    expect(result).toContain('[model_providers.akm]');
    expect(result).toContain('base_url = "https://api.example.com/v1"');
  });

  test('replaces existing model_provider value', () => {
    const input =
      'model_provider = "88code"\n\n[model_providers.88code]\nbase_url = "https://88code.ai"\n';
    const result = updateModelProvider(input, 'https://new.api.com/v1');
    expect(result).toContain('model_provider = "akm"');
    expect(result).not.toContain('model_provider = "88code"');
    // preserves user's 88code section
    expect(result).toContain('[model_providers.88code]');
  });

  test('replaces existing [model_providers.akm] section', () => {
    const input =
      [
        'model_provider = "akm"',
        '',
        '[model_providers.akm]',
        'base_url = "https://old.api.com/v1"',
        'wire_api = "responses"'
      ].join('\n') + '\n';
    const result = updateModelProvider(input, 'https://new.api.com/v1');
    expect(result).toContain('base_url = "https://new.api.com/v1"');
    expect(result).not.toContain('https://old.api.com/v1');
  });

  test('替换带行尾注释的 AKM section 且不留下旧字段', () => {
    const input =
      [
        'model_provider = "akm" # managed by akm',
        '',
        '[model_providers.akm] # old comment',
        'base_url = "https://old.api.com/v1"',
        'wire_api = "responses"',
        '',
        '[projects."/workspace"] # user comment',
        'trust_level = "trusted"'
      ].join('\n') + '\n';

    const result = updateModelProvider(input, 'https://new.api.com/v1');
    expect(result).toContain('model_provider = "akm" # managed by akm');
    expect(result).toContain('base_url = "https://new.api.com/v1"');
    expect(result).not.toContain('https://old.api.com/v1');
    expect(result.match(/\[model_providers\.akm\]/g)).toHaveLength(1);
    expect(result).toContain('[projects."/workspace"] # user comment');
  });

  test('appends [model_providers.akm] section when not present', () => {
    const input = 'model_provider = "akm"\n';
    const result = updateModelProvider(input, 'https://api.example.com/v1');
    expect(result).toContain('[model_providers.akm]');
    expect(result).toContain('base_url = "https://api.example.com/v1"');
  });
});

describe('applyCodexConfig with baseUrl', () => {
  const codexHome = path.join(__dirname, '..', 'test-codex-home-2');

  beforeEach(async () => {
    process.env.CODEX_HOME = codexHome;
    await fs.remove(codexHome);
  });

  afterEach(async () => {
    await fs.remove(codexHome);
    delete process.env.CODEX_HOME;
  });

  test('writes auth.json and updates config.toml with model_provider when baseUrl provided', async () => {
    const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);
    await applyCodexConfig({ authToken: 'sk-gmn1', baseUrl: 'https://gmn1.api.com/v1' });

    const auth = JSON.parse(await fs.readFile(authJsonPath, 'utf8'));
    expect(auth.OPENAI_API_KEY).toBe('sk-gmn1');

    const toml = await fs.readFile(configTomlPath, 'utf8');
    expect(toml).toContain('model_provider = "akm"');
    expect(toml).toContain('base_url = "https://gmn1.api.com/v1"');
  });

  test('preserves user custom sections when switching provider', async () => {
    const { configTomlPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeFile(
      configTomlPath,
      'model_provider = "88code"\n\n[model_providers.88code]\nbase_url = "https://88code.ai"\n',
      'utf8'
    );

    await applyCodexConfig({ authToken: 'sk-new', baseUrl: 'https://new.api.com/v1' });

    const toml = await fs.readFile(configTomlPath, 'utf8');
    expect(toml).toContain('model_provider = "akm"');
    expect(toml).toContain('[model_providers.88code]');
    expect(toml).toContain('[model_providers.akm]');
  });

  test('从代理切回官方时清理 AKM provider 并保留用户 section', async () => {
    const { configTomlPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeFile(
      configTomlPath,
      'model_provider = "user"\n\n[model_providers.user]\nbase_url = "https://user.example.com"\n',
      'utf8'
    );

    await applyCodexConfig({ authToken: 'proxy-key', baseUrl: 'https://proxy.example.com/v1' });
    await applyCodexConfig({ authToken: 'official-key', baseUrl: null });

    const toml = await fs.readFile(configTomlPath, 'utf8');
    expect(toml).not.toContain('model_provider = "akm"');
    expect(toml).not.toContain('[model_providers.akm]');
    expect(toml).not.toContain('https://proxy.example.com/v1');
    expect(toml).toContain('[model_providers.user]');
  });

  test('clearCodexAkmConfig 删除 auth.json', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, { OPENAI_API_KEY: 'test-key' });

    expect(await fs.pathExists(authJsonPath)).toBe(true);
    await clearCodexAkmConfig();
    expect(await fs.pathExists(authJsonPath)).toBe(false);
  });

  test('clearCodexAkmConfig 清理 config.toml 中的 AKM provider', async () => {
    const { configTomlPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeFile(
      configTomlPath,
      'model_provider = "akm"\n\n[model_providers.akm]\nname = "akm"\nbase_url = "https://test.api.com"\n\n[model_providers.user]\nbase_url = "https://user.example.com"\n',
      'utf8'
    );

    await clearCodexAkmConfig();

    const toml = await fs.readFile(configTomlPath, 'utf8');
    expect(toml).not.toContain('[model_providers.akm]');
    expect(toml).not.toContain('model_provider = "akm"');
    expect(toml).toContain('[model_providers.user]');
  });

  test('clearCodexAkmConfig 创建备份', async () => {
    const { authJsonPath, configTomlPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, { OPENAI_API_KEY: 'backup-test' });
    await fs.writeFile(configTomlPath, 'model_provider = "akm"\n', 'utf8');

    await clearCodexAkmConfig();

    const backupRoot = path.join(codexHome, 'akm-backups');
    expect(await fs.pathExists(backupRoot)).toBe(true);
    const backupDirs = await fs.readdir(backupRoot);
    expect(backupDirs.length).toBeGreaterThan(0);
  });

  test('clearCodexAkmConfig 保留 Codex 官方网页登录态', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const loginAuth = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'existing-session' }
    };
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, loginAuth);

    await clearCodexAkmConfig();

    expect(await fs.readJson(authJsonPath)).toEqual(loginAuth);
  });

  test('clearCodexAkmConfig 从备份恢复 Codex 官方网页登录态', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const loginAuth = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'existing-session' },
      last_refresh: '2026-08-19T00:00:00.000Z',
      OPENAI_API_KEY: 'official-derived-key'
    };
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, loginAuth);

    await applyCodexConfig({ authToken: 'proxy-key', name: 'proxy' });
    expect(await fs.readJson(authJsonPath)).toEqual({
      auth_mode: 'apikey',
      OPENAI_API_KEY: 'proxy-key'
    });

    await clearCodexAkmConfig();

    expect(await fs.readJson(authJsonPath)).toEqual(loginAuth);
  });

  test('applyCodexConfig 独立缓存 Codex 官方网页登录态', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const loginAuth = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'existing-session' },
      last_refresh: '2026-08-20T00:00:00.000Z'
    };
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, loginAuth);

    await applyCodexConfig({ authToken: 'proxy-key', name: 'proxy' });

    const cacheAuthPath = path.join(codexHome, 'akm-session-cache', 'auth.json');
    expect(await fs.readJson(cacheAuthPath)).toEqual(loginAuth);
  });

  test('clearCodexAkmConfig 优先从独立缓存恢复 Codex 官方网页登录态', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const loginAuth = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'cached-session' },
      last_refresh: '2026-08-20T00:00:00.000Z'
    };
    const cacheAuthPath = path.join(codexHome, 'akm-session-cache', 'auth.json');
    await fs.ensureDir(path.dirname(cacheAuthPath));
    await fs.writeJson(cacheAuthPath, loginAuth);
    await fs.writeJson(authJsonPath, { auth_mode: 'apikey', OPENAI_API_KEY: 'proxy-key' });

    await clearCodexAkmConfig();

    expect(await fs.readJson(authJsonPath)).toEqual(loginAuth);
  });

  test('cacheCodexOfficialSession 按供应商名称隔离官方网页登录态', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const accountA = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'account-a' },
      last_refresh: '2026-08-20T00:00:00.000Z'
    };
    const accountB = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'account-b' },
      last_refresh: '2026-08-20T01:00:00.000Z'
    };
    await fs.ensureDir(codexHome);

    await fs.writeJson(authJsonPath, accountA);
    await cacheCodexOfficialSession({ codexHome, sessionKey: 'openai-personal' });

    await fs.writeJson(authJsonPath, accountB);
    await cacheCodexOfficialSession({ codexHome, sessionKey: 'openai-work' });

    await fs.writeJson(authJsonPath, { auth_mode: 'apikey', OPENAI_API_KEY: 'proxy-key' });
    await clearCodexAkmConfig({ codexHome, sessionKey: 'openai-personal' });
    expect(await fs.readJson(authJsonPath)).toEqual(accountA);

    await fs.writeJson(authJsonPath, { auth_mode: 'apikey', OPENAI_API_KEY: 'proxy-key' });
    await clearCodexAkmConfig({ codexHome, sessionKey: 'openai-work' });
    expect(await fs.readJson(authJsonPath)).toEqual(accountB);
  });

  test('clearCodexAkmConfig 有供应商名时不复用其他官方账号缓存', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const accountA = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'account-a' }
    };
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, accountA);
    await cacheCodexOfficialSession({ codexHome, sessionKey: 'openai-personal' });

    await fs.writeJson(authJsonPath, { auth_mode: 'apikey', OPENAI_API_KEY: 'proxy-key' });
    await clearCodexAkmConfig({ codexHome, sessionKey: 'openai-work' });

    expect(await fs.pathExists(authJsonPath)).toBe(false);
  });

  test('clearCodexAkmConfig 新官方账号首次启动不复用当前活跃官方 Session', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const accountA = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'account-a' }
    };
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, accountA);
    await cacheCodexOfficialSession({ codexHome, sessionKey: 'openai-personal' });

    await clearCodexAkmConfig({ codexHome, sessionKey: 'openai-work' });

    expect(await fs.pathExists(authJsonPath)).toBe(false);
    const cacheEntries = await fs.readdir(path.join(codexHome, 'akm-session-cache'));
    expect(cacheEntries.some(name => name.startsWith('openai-work-'))).toBe(false);
  });

  test('clearCodexAkmConfig 当前 auth 缺失时恢复指定官方账号缓存', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const accountA = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'account-a' }
    };
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, accountA);
    await cacheCodexOfficialSession({ codexHome, sessionKey: 'openai-personal' });
    await fs.remove(authJsonPath);

    await clearCodexAkmConfig({ codexHome, sessionKey: 'openai-personal' });

    expect(await fs.readJson(authJsonPath)).toEqual(accountA);
  });

  test('clearCodexAkmConfig forceRelogin 清理指定官方账号 Session', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    const loginAuth = {
      auth_mode: 'chatgpt',
      tokens: { access_token: 'cached-session' }
    };
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, loginAuth);
    await cacheCodexOfficialSession({ codexHome, sessionKey: 'openai-work' });

    await clearCodexAkmConfig({
      codexHome,
      sessionKey: 'openai-work',
      forceRelogin: true
    });

    expect(await fs.pathExists(authJsonPath)).toBe(false);
    await fs.writeJson(authJsonPath, { auth_mode: 'apikey', OPENAI_API_KEY: 'proxy-key' });
    await clearCodexAkmConfig({ codexHome, sessionKey: 'openai-work' });
    expect(await fs.pathExists(authJsonPath)).toBe(false);
  });

  test('clearCodexAkmConfig 移除 API Key 认证文件', async () => {
    const { authJsonPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeJson(authJsonPath, { auth_mode: 'apikey', OPENAI_API_KEY: 'sk-test' });

    await clearCodexAkmConfig();

    expect(await fs.pathExists(authJsonPath)).toBe(false);
  });

  test('clearCodexAkmConfig 处理不存在的文件', async () => {
    // 不创建任何文件
    await expect(clearCodexAkmConfig()).resolves.toBeDefined();
  });
});
