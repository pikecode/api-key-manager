const fs = require('fs-extra');
const path = require('path');
const {
  readCodexFiles,
  applyCodexProfile,
  buildCodexPaths
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

