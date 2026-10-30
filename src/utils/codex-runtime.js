const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { acquireFileLock } = require('./file-lock');
const { writeJsonAtomic, writeFileAtomic } = require('./atomic-file');
const {
  resolveCodexHome, buildSessionCacheAuthPath, applyCodexConfig, clearCodexAkmConfig
} = require('./codex-files');

function providerHome(name, root = resolveCodexHome()) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Codex 供应商名称不能为空');
  const key = path.basename(buildSessionCacheAuthPath(root, name), '.auth.json');
  return path.join(root, 'akm-providers', key);
}

async function lockProvider(name, root = resolveCodexHome()) {
  const home = providerHome(name, root);
  await fs.ensureDir(home, { mode: 0o700 });
  for (let attempt = 0; ; attempt++) {
    try {
      const release = await acquireFileLock(path.join(home, '.akm-settings.lock'), '该供应商正在初始化或修改认证，请稍后重试。');
      return { home, release };
    } catch (error) {
      if (error.code !== 'LOCK_BUSY' || attempt >= 40) throw error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

async function activeRuns(home) {
  const directory = path.join(home, '.akm-runs');
  await fs.ensureDir(directory, { mode: 0o700 });
  // 不自动删除强杀后留下的记录，父进程退出不代表 Codex 子进程已退出。
  return (await fs.readdir(directory)).length;
}

async function shareDirectory(root, home, name) {
  const source = path.join(root, name);
  const target = path.join(home, name);
  await fs.ensureDir(source);
  try {
    await fs.symlink(path.resolve(source), target, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await fs.realpath(target) !== await fs.realpath(source)) {
      throw new Error(`历史或资源目录已存在且指向其他位置，请先检查：${target}`);
    }
  }
}

async function prepareCodexRuntime(config, { forceRelogin = false } = {}) {
  const root = resolveCodexHome();
  const { home, release } = await lockProvider(config.name, root);
  try {
    const markerPath = path.join(home, '.akm-config.json');
    const authPath = path.join(home, 'auth.json');
    const authMode = config.authMode || 'api_key';
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([
      authMode, config.authToken || null, config.baseUrl || null, config.models || null
    ])).digest('hex');
    const marker = await fs.pathExists(markerPath) ? await fs.readJson(markerPath) : null;
    const running = await activeRuns(home);
    const changed = marker?.fingerprint !== fingerprint;
    if (running && (changed || forceRelogin || !(await fs.pathExists(authPath)))) {
      throw new Error(`该供应商仍有窗口运行或首次认证尚未完成，不能更改认证。请退出该供应商的窗口后重试；异常退出记录位于 ${path.join(home, '.akm-runs')}`);
    }

    for (const name of ['sessions', 'archived_sessions']) await shareDirectory(root, home, name);
    for (const name of ['skills', 'rules', 'plugins']) {
      if (await fs.pathExists(path.join(root, name))) await shareDirectory(root, home, name);
    }
    if (!marker) {
      for (const name of ['config.toml', 'AGENTS.md']) {
        if (await fs.pathExists(path.join(root, name))) {
          await writeFileAtomic(path.join(home, name), await fs.readFile(path.join(root, name)));
        }
      }
      // 仅迁移同名旧缓存，绝不继承根目录里其他账号的活跃认证。
      const legacy = buildSessionCacheAuthPath(root, config.name);
      if (authMode === 'chatgpt_login' && !forceRelogin && await fs.pathExists(legacy)) {
        await writeFileAtomic(authPath, await fs.readFile(legacy));
      }
    }
    if (changed || forceRelogin || (authMode === 'api_key' && !(await fs.pathExists(authPath)))) {
      if (authMode === 'chatgpt_login') {
        await clearCodexAkmConfig({ codexHome: home, forceRelogin: forceRelogin || Boolean(marker && changed) });
      } else {
        await applyCodexConfig(config, { codexHome: home });
      }
      await writeJsonAtomic(markerPath, { fingerprint });
    }
    const lease = path.join(home, '.akm-runs', `${process.pid}-${crypto.randomUUID()}.json`);
    await writeJsonAtomic(lease, { pid: process.pid, startedAt: new Date().toISOString() });
    return { home, release: () => fs.remove(lease) };
  } finally {
    await release();
  }
}

async function removeProviderRuntime(name, operation) {
  const { home, release } = await lockProvider(name);
  try {
    if (await activeRuns(home)) throw new Error('该供应商仍有窗口运行，请先退出后再删除');
    const authPath = path.join(home, 'auth.json');
    const snapshot = await fs.pathExists(authPath) ? await fs.readFile(authPath) : null;
    await fs.remove(authPath);
    try {
      return await operation();
    } catch (error) {
      if (snapshot !== null) await writeFileAtomic(authPath, snapshot);
      throw error;
    }
  } finally {
    await release();
  }
}

module.exports = { providerHome, prepareCodexRuntime, removeProviderRuntime };
