const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
jest.mock('cross-spawn');
const spawn = require('cross-spawn');
const { executeWithEnv } = require('../src/utils/env-launcher');
const { ConfigManager } = require('../src/config');
const { BackupManager } = require('../src/commands/backup');
const { validateAndNormalizeImportData } = require('../src/utils/import-validator');
const { findSettingsConflict, backupSettingsFile, clearConflictKeys, saveSettingsFile } = require('../src/utils/claude-settings');

describe('Claude provider compatibility', () => {
  let directory;
  let originalEnv;
  beforeEach(async () => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-claude-compat-'));
    jest.spyOn(os, 'homedir').mockReturnValue(directory);
    jest.spyOn(process, 'cwd').mockReturnValue(path.join(directory, 'project'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    delete process.env.CLAUDE_SETTINGS_PATH;
    delete process.env.CLAUDE_CONFIG_DIR;
    spawn.mockImplementation(() => {
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      setTimeout(() => { child.emit('spawn'); child.emit('close', 0); }, 0);
      return child;
    });
  });
  afterEach(async () => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    spawn.mockReset();
    await fs.remove(directory);
  });
  const provider = { name: 'test', authMode: 'api_key', authToken: 'test-key', baseUrl: 'https://example.com' };

  test('spawn receives isolated thinking, auth and model settings without changing parent env', async () => {
    process.env.MAX_THINKING_TOKENS = '2048';
    process.env.ANTHROPIC_AUTH_TOKEN = 'old';
    await executeWithEnv({ ...provider, compatibility: { thinkingMode: 'disabled' }, models: { primary: 'model', smallFast: 'fast' } });
    const options = spawn.mock.calls[0][2];
    expect(options.env).toMatchObject({ MAX_THINKING_TOKENS: '0', ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_MODEL: 'model', ANTHROPIC_SMALL_FAST_MODEL: 'fast' });
    expect(options.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(process.env.MAX_THINKING_TOKENS).toBe('2048');
    await executeWithEnv(provider);
    expect(spawn.mock.calls[1][2].env.MAX_THINKING_TOKENS).toBe('2048');
    delete process.env.MAX_THINKING_TOKENS;
    await executeWithEnv({ ...provider, compatibility: { thinkingMode: 'default' } });
    expect(spawn.mock.calls[2][2].env.MAX_THINKING_TOKENS).toBeUndefined();
  });

  test('invalid thinking mode fails before spawn', async () => {
    await expect(executeWithEnv({ ...provider, compatibility: { thinkingMode: 'adaptive' } })).rejects.toThrow('thinking');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('compatibility survives save, reload, import normalization and updates', async () => {
    const manager = new ConfigManager();
    manager.configPath = path.join(directory, 'akm.json');
    await manager.addProvider('test', { ...provider, compatibility: { thinkingMode: 'disabled' } });
    await manager.addProvider('test', { displayName: 'updated' });
    await manager.load(true);
    const exportedPath = path.join(directory, 'export.json');
    await new BackupManager(manager).export(exportedPath, { includeSecrets: true });
    const restored = new ConfigManager();
    restored.configPath = path.join(directory, 'restored.json');
    const backup = new BackupManager(restored);
    jest.spyOn(backup, 'backup').mockImplementation(() => BackupManager.prototype.backup.call(backup, path.join(directory, 'backups')));
    await backup.import(exportedPath);
    expect(restored.getProvider('test').compatibility).toEqual({ thinkingMode: 'disabled' });
    const imported = validateAndNormalizeImportData(JSON.parse(JSON.stringify(manager.config)));
    expect(imported.providers.test.compatibility).toEqual({ thinkingMode: 'disabled' });
    imported.providers.test.compatibility = { thinkingMode: 'adaptive' };
    expect(() => validateAndNormalizeImportData(imported)).toThrow('Schema');
    imported.providers.test.compatibility = { thinkingMode: 'default', NODE_OPTIONS: '--require evil' };
    expect(() => validateAndNormalizeImportData(imported)).toThrow('Schema');
    delete imported.providers.test.compatibility;
    expect(validateAndNormalizeImportData(imported).providers.test.compatibility).toBeUndefined();
  });

  test('empty project settings do not hide global and explicit conflicts; backups are private and unique', async () => {
    const project = path.join(process.cwd(), '.claude', 'settings.local.json');
    const global = path.join(directory, '.claude', 'settings.json');
    const explicit = path.join(directory, 'custom.json');
    process.env.CLAUDE_SETTINGS_PATH = explicit;
    await fs.outputJson(project, { permissions: { allow: [] } });
    await fs.outputJson(global, { env: { ANTHROPIC_AUTH_TOKEN: 'old', KEEP: 'yes' }, hooks: { test: [] } });
    await fs.outputJson(explicit, { env: { ANTHROPIC_BASE_URL: 'https://old.example' } });
    const result = await findSettingsConflict();
    expect(result.conflicts.map(c => c.filePath)).toEqual([explicit, global]);
    const backup = await backupSettingsFile(global);
    const secondBackup = await backupSettingsFile(global);
    expect(backup).not.toBe(secondBackup);
    if (process.platform !== 'win32') expect((await fs.stat(backup)).mode & 0o777).toBe(0o600);
    const conflict = result.conflicts[1];
    await saveSettingsFile(global, clearConflictKeys(conflict.settings, conflict.keys));
    expect(await fs.readJson(global)).toEqual({ env: { KEEP: 'yes' }, hooks: { test: [] } });
    expect((await fs.readJson(backup)).env.ANTHROPIC_AUTH_TOKEN).toBe('old');
  });

  test('thinking in settings conflicts only when provider explicitly disables it', async () => {
    await fs.outputJson(path.join(directory, '.claude', 'settings.json'), { env: { MAX_THINKING_TOKENS: '2048' } });
    expect(await findSettingsConflict(provider)).toBeNull();
    expect((await findSettingsConflict({ ...provider, compatibility: { thinkingMode: 'disabled' } })).keys).toEqual(['MAX_THINKING_TOKENS']);
  });

  test('CLAUDE_CONFIG_DIR is included', async () => {
    process.env.CLAUDE_CONFIG_DIR = path.join(directory, 'custom-home');
    const target = path.join(process.env.CLAUDE_CONFIG_DIR, 'settings.json');
    await fs.outputJson(target, { env: { ANTHROPIC_API_KEY: 'old' } });
    expect((await findSettingsConflict()).filePath).toBe(target);
  });
});
