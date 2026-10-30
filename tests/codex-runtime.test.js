const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { prepareCodexRuntime, providerHome, removeProviderRuntime } = require('../src/utils/codex-runtime');
const { cacheCodexOfficialSession } = require('../src/utils/codex-files');

describe('多窗口供应商隔离', () => {
  let root;
  const previous = process.env.CODEX_HOME;
  const provider = { name: 'a', ideName: 'codex', authToken: 'a-key', baseUrl: 'https://a.example.com' };
  const official = { name: 'official', ideName: 'codex', authMode: 'chatgpt_login' };
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-runtime-'));
    process.env.CODEX_HOME = root;
  });
  afterEach(async () => {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    await fs.remove(root);
  });
  test('同供应商多窗口及跨供应商同时运行，根认证不被修改', async () => {
    await fs.writeJson(path.join(root, 'auth.json'), { sentinel: 'root-auth' });
    await fs.writeFile(path.join(root, '.akm-launch.lock'), 'legacy-lock');
    const a = await prepareCodexRuntime(provider);
    const a2 = await prepareCodexRuntime(provider);
    const b = await prepareCodexRuntime({ ...provider, name: 'b', authToken: 'b-key' });
    expect(a.home).toBe(a2.home);
    expect(b.home).not.toBe(a.home);
    expect((await fs.readJson(path.join(a.home, 'auth.json'))).OPENAI_API_KEY).toBe('a-key');
    expect((await fs.readJson(path.join(b.home, 'auth.json'))).OPENAI_API_KEY).toBe('b-key');
    expect(await fs.readJson(path.join(root, 'auth.json'))).toEqual({ sentinel: 'root-auth' });
    await fs.outputFile(path.join(root, 'sessions', 'history.jsonl'), 'history');
    expect(await fs.readFile(path.join(b.home, 'sessions', 'history.jsonl'), 'utf8')).toBe('history');
    await a.release(); await a2.release(); await b.release();
  });
  test('官方认证只迁移同名缓存，后续窗口不会覆盖刷新后的 Token', async () => {
    const rootAuth = path.join(root, 'auth.json');
    await fs.writeJson(rootAuth, { auth_mode: 'chatgpt', tokens: { access_token: 'old' } });
    await cacheCodexOfficialSession({ sessionKey: 'official' });
    const a = await prepareCodexRuntime(official);
    const authPath = path.join(a.home, 'auth.json');
    await fs.writeJson(authPath, { auth_mode: 'chatgpt', tokens: { access_token: 'refreshed' } });
    const second = await prepareCodexRuntime(official);
    expect((await fs.readJson(authPath)).tokens.access_token).toBe('refreshed');
    const b = await prepareCodexRuntime({ ...official, name: 'other' });
    expect(await fs.pathExists(path.join(b.home, 'auth.json'))).toBe(false);
    await expect(prepareCodexRuntime(official, { forceRelogin: true })).rejects.toThrow('仍有窗口运行');
    await a.release(); await second.release(); await b.release();
    const relogin = await prepareCodexRuntime(official, { forceRelogin: true });
    expect(await fs.pathExists(authPath)).toBe(false);
    await relogin.release();
  });
  test('认证修改只要求退出该供应商窗口，不受其他供应商影响', async () => {
    const a = await prepareCodexRuntime(provider);
    const b = await prepareCodexRuntime({ ...provider, name: 'b' });
    await expect(prepareCodexRuntime({ ...provider, authToken: 'new-key' })).rejects.toThrow('不能更改认证');
    await a.release();
    const changed = await prepareCodexRuntime({ ...provider, authToken: 'new-key' });
    expect((await fs.readJson(path.join(changed.home, 'auth.json'))).OPENAI_API_KEY).toBe('new-key');
    await changed.release(); await b.release();
  });
  test('同时启动同一 API 供应商时只短暂等待初始化，不限制运行窗口数量', async () => {
    const [first, second] = await Promise.all([prepareCodexRuntime(provider), prepareCodexRuntime(provider)]);
    expect(first.home).toBe(second.home);
    expect(await fs.readdir(path.join(first.home, '.akm-runs'))).toHaveLength(2);
    await first.release(); await second.release();
  });
  test('首次登录未完成时禁止第二个窗口并行更改同一账号', async () => {
    const first = await prepareCodexRuntime(official);
    await expect(prepareCodexRuntime(official)).rejects.toThrow('首次认证尚未完成');
    await first.release();
  });
  test('删除失败恢复独立目录中的认证，运行期间禁止删除', async () => {
    const running = await prepareCodexRuntime(provider);
    await expect(removeProviderRuntime('a', async () => {})).rejects.toThrow('仍有窗口运行');
    await running.release();
    await expect(removeProviderRuntime('a', async () => { throw new Error('保存失败'); })).rejects.toThrow('保存失败');
    expect((await fs.readJson(path.join(running.home, 'auth.json'))).OPENAI_API_KEY).toBe('a-key');
  });
  test('不覆盖已有真实历史目录，初始化失败不留下设置锁', async () => {
    const home = providerHome('a');
    await fs.ensureDir(path.join(home, 'sessions'));
    await expect(prepareCodexRuntime(provider)).rejects.toThrow('指向其他位置');
    expect(await fs.pathExists(path.join(home, '.akm-settings.lock'))).toBe(false);
    expect(() => providerHome('')).toThrow('不能为空');
  });
});
