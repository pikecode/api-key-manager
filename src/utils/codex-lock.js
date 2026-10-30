const fs = require('fs-extra');
const path = require('path');
const { acquireFileLock } = require('./file-lock');

async function acquireCodexLock() {
  const { resolveCodexHome } = require('./codex-files');
  const home = resolveCodexHome();
  await fs.ensureDir(home);
  const lockPath = path.join(home, '.akm-launch.lock');
  return acquireFileLock(lockPath, '此 Codex 目录已有 AKM 会话运行，请先退出该会话。');
}

module.exports = { acquireCodexLock };
