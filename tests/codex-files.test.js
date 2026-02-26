const fs = require('fs-extra');
const path = require('path');
const {
  readCodexFiles,
  applyCodexConfig,
  buildCodexPaths,
  removeTopLevelApiBaseUrl,
  extractBaseUrlFromConfigToml,
  updateModelProvider,
  buildAuthJson
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
    expect(content.OPENAI_API_KEY).toBe('sk-test-key');
  });

  test('applyCodexConfig cleans up top-level api_base_url from config.toml', async () => {
    const { configTomlPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeFile(configTomlPath,
      'api_base_url = "https://old.com"\nmodel_provider = "88code"\n', 'utf8');

    await applyCodexConfig({ authToken: 'sk-test', name: 'test' });

    const content = await fs.readFile(configTomlPath, 'utf8');
    expect(content).not.toContain('api_base_url');
    expect(content).toContain('model_provider = "88code"');
  });

  test('applyCodexConfig does not touch config.toml if no api_base_url present', async () => {
    const { configTomlPath } = buildCodexPaths(codexHome);
    const original = 'model_provider = "88code"\n[model_providers.88code]\nbase_url = "https://88code.ai"\n';
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
    const input = 'model = "gpt-4"\n\n[sandbox_workspace_write]\napi_base_url = "https://example.com"\n';
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
      'name = "88code"',
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
    expect(result).toEqual({ OPENAI_API_KEY: 'sk-test-key' });
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
    const input = 'model_provider = "88code"\n\n[model_providers.88code]\nbase_url = "https://88code.ai"\n';
    const result = updateModelProvider(input, 'https://new.api.com/v1');
    expect(result).toContain('model_provider = "akm"');
    expect(result).not.toContain('model_provider = "88code"');
    // preserves user's 88code section
    expect(result).toContain('[model_providers.88code]');
  });

  test('replaces existing [model_providers.akm] section', () => {
    const input = [
      'model_provider = "akm"',
      '',
      '[model_providers.akm]',
      'base_url = "https://old.api.com/v1"',
      'wire_api = "chat_completions"',
    ].join('\n') + '\n';
    const result = updateModelProvider(input, 'https://new.api.com/v1');
    expect(result).toContain('base_url = "https://new.api.com/v1"');
    expect(result).not.toContain('https://old.api.com/v1');
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
    await fs.writeFile(configTomlPath,
      'model_provider = "88code"\n\n[model_providers.88code]\nbase_url = "https://88code.ai"\n', 'utf8');

    await applyCodexConfig({ authToken: 'sk-new', baseUrl: 'https://new.api.com/v1' });

    const toml = await fs.readFile(configTomlPath, 'utf8');
    expect(toml).toContain('model_provider = "akm"');
    expect(toml).toContain('[model_providers.88code]');
    expect(toml).toContain('[model_providers.akm]');
  });
});
