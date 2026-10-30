const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { ConfigManager } = require('../src/config');
const { cacheCodexOfficialSession, clearCodexAkmConfig } = require('../src/utils/codex-files');
const { prepareCodexRuntime } = require('../src/utils/codex-runtime');

describe('配置保存和删除事务', () => {
  let directory;
  let manager;
  const originalHome = process.env.CODEX_HOME;
  const official = { ideName: 'codex', authMode: 'chatgpt_login' };
  const keyProvider = { authToken: 'test-token', baseUrl: 'https://example.com' };
  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-transactions-'));
    process.env.CODEX_HOME = path.join(directory, 'codex');
    manager = new ConfigManager();
    manager.configPath = path.join(directory, 'config.json');
    await manager.load();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    if (originalHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalHome;
    await fs.remove(directory);
  });

  test('两个独立管理器同时保存只允许一个成功，不覆盖对方修改', async () => {
    const other = new ConfigManager();
    other.configPath = manager.configPath;
    await other.load();
    const results = await Promise.allSettled([
      manager.addProvider('a', keyProvider), other.addProvider('b', keyProvider)
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const saved = await fs.readJson(manager.configPath);
    expect(Object.keys(saved.providers)).toHaveLength(1);
    expect(await fs.pathExists(`${manager.configPath}.lock`)).toBe(false);
  });

  test('修改时间相同但文件内容已改变时拒绝覆盖', async () => {
    const changed = { ...manager.config, version: 'external' };
    await fs.writeJson(manager.configPath, changed);
    await fs.utimes(manager.configPath, new Date(), manager.lastModified);
    await expect(manager.addProvider('a', keyProvider)).rejects.toThrow('其他进程修改');
    expect(await fs.readJson(manager.configPath)).toEqual(changed);
  });

  async function prepareSession() {
    await manager.addProvider('official', official);
    const authPath = path.join(process.env.CODEX_HOME, 'auth.json');
    await fs.outputJson(authPath, { auth_mode: 'chatgpt', tokens: { access_token: 'fake-session' } });
    await cacheCodexOfficialSession({ sessionKey: 'official' });
    return authPath;
  }

  test('删除后重建同名账号不会继承旧 Session', async () => {
    const authPath = await prepareSession();
    await manager.removeProvider('official');
    await manager.addProvider('official', official);
    await clearCodexAkmConfig({ sessionKey: 'official' });
    expect(await fs.pathExists(authPath)).toBe(false);
  });

  test('会话运行中禁止删除，保留配置和缓存', async () => {
    await prepareSession();
    const { release } = await prepareCodexRuntime({ name: 'official', ...official });
    try {
      await expect(manager.removeProvider('official')).rejects.toThrow('仍有窗口运行');
      expect(manager.getProvider('official')).toBeDefined();
    } finally {
      await release();
    }
    await fs.remove(path.join(process.env.CODEX_HOME, 'auth.json'));
    await clearCodexAkmConfig({ sessionKey: 'official' });
    expect(await fs.pathExists(path.join(process.env.CODEX_HOME, 'auth.json'))).toBe(true);
  });

  test('配置保存失败时恢复 Session 缓存和内存配置', async () => {
    const authPath = await prepareSession();
    jest.spyOn(manager, 'save').mockRejectedValueOnce(new Error('磁盘写入失败'));
    await expect(manager.removeProvider('official')).rejects.toThrow('磁盘写入失败');
    expect(manager.getProvider('official')).toBeDefined();
    await fs.remove(authPath);
    await clearCodexAkmConfig({ sessionKey: 'official' });
    expect((await fs.readJson(authPath)).tokens.access_token).toBe('fake-session');
  });
});
