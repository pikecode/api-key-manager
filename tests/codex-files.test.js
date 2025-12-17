const fs = require('fs-extra');
const path = require('path');
const {
  readCodexFiles,
  applyCodexProfile,
  buildCodexPaths,
  ensureApiKeyAuthMethod,
  updateApiBaseUrl
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

  test('applyCodexProfile backups existing and writes new files', async () => {
    const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);
    await fs.ensureDir(codexHome);
    await fs.writeFile(configTomlPath, 'old-config', 'utf8');
    await fs.writeFile(authJsonPath, '{"old":true}', 'utf8');

    const profile = {
      codexHome,
      configToml: 'new-config',
      authJson: '{"new":true}'
    };

    const { backupDir } = await applyCodexProfile(profile);
    expect(backupDir).toBeTruthy();
    expect(await fs.pathExists(backupDir)).toBe(true);

    expect(await fs.readFile(configTomlPath, 'utf8')).toBe('new-config');
    expect(await fs.readFile(authJsonPath, 'utf8')).toBe('{"new":true}');

    expect(await fs.readFile(path.join(backupDir, 'config.toml'), 'utf8')).toBe('old-config');
    expect(await fs.readFile(path.join(backupDir, 'auth.json'), 'utf8')).toBe('{"old":true}');
  });
});

describe('ensureApiKeyAuthMethod', () => {
  test('creates minimal config when input is null', () => {
    const result = ensureApiKeyAuthMethod(null);
    expect(result).toBe('preferred_auth_method = "apikey"\n');
  });

  test('adds auth method to existing config without it', () => {
    const input = 'some_other_setting = "value"\n';
    const result = ensureApiKeyAuthMethod(input);
    expect(result).toContain('preferred_auth_method = "apikey"');
    expect(result).toContain('some_other_setting = "value"');
  });

  test('replaces non-apikey auth method', () => {
    const input = 'preferred_auth_method = "oauth"\nother = "value"\n';
    const result = ensureApiKeyAuthMethod(input);
    expect(result).toContain('preferred_auth_method = "apikey"');
    expect(result).not.toContain('oauth');
  });

  test('keeps existing apikey auth method unchanged', () => {
    const input = 'preferred_auth_method = "apikey"\nother = "value"\n';
    const result = ensureApiKeyAuthMethod(input);
    expect(result).toBe(input);
  });
});

describe('updateApiBaseUrl', () => {
  test('adds base_url to empty config', () => {
    const result = updateApiBaseUrl('', 'https://example.com/api');
    expect(result).toContain('api_base_url = "https://example.com/api"');
  });

  test('adds base_url to existing config', () => {
    const input = 'preferred_auth_method = "apikey"\n';
    const result = updateApiBaseUrl(input, 'https://example.com/api');
    expect(result).toContain('preferred_auth_method = "apikey"');
    expect(result).toContain('api_base_url = "https://example.com/api"');
  });

  test('replaces existing base_url', () => {
    const input = 'api_base_url = "https://old.com"\nother = "value"\n';
    const result = updateApiBaseUrl(input, 'https://new.com/api');
    expect(result).toContain('api_base_url = "https://new.com/api"');
    expect(result).not.toContain('old.com');
    expect(result).toContain('other = "value"');
  });

  test('removes base_url when null', () => {
    const input = 'api_base_url = "https://example.com"\nother = "value"\n';
    const result = updateApiBaseUrl(input, null);
    expect(result).not.toContain('api_base_url');
    expect(result).toContain('other = "value"');
  });

  test('handles null input config', () => {
    const result = updateApiBaseUrl(null, 'https://example.com/api');
    expect(result).toContain('api_base_url = "https://example.com/api"');
  });
});

