const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { acquireCodexLock } = require('../src/utils/codex-lock');

describe('Codex 目录互斥', () => {
  let home;
  const originalHome = process.env.CODEX_HOME;
  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-lock-'));
    process.env.CODEX_HOME = home;
  });
  afterEach(async () => {
    if (originalHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalHome;
    await fs.remove(home);
  });

  test('同一目录只能有一个持有者，释放后可再次获取', async () => {
    const release = await acquireCodexLock();
    await expect(acquireCodexLock()).rejects.toThrow('已有 AKM 会话');
    expect(await fs.readFile(path.join(home, '.akm-launch.lock'), 'utf8')).toBe(String(process.pid));
    await release();
    const releaseAgain = await acquireCodexLock();
    await releaseAgain();
  });

  test('同时争抢时只有一个调用成功', async () => {
    const results = await Promise.allSettled([acquireCodexLock(), acquireCodexLock()]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    await results.find(result => result.status === 'fulfilled').value();
  });
});
