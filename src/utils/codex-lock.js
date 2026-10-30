const fs = require('fs-extra');
const path = require('path');
const { resolveCodexHome } = require('./codex-files');

async function acquireCodexLock() {
  const home = resolveCodexHome();
  await fs.ensureDir(home);
  const lockPath = path.join(home, '.akm-launch.lock');
  let handle;
  try {
    handle = await fs.open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error(`此 Codex 目录已有 AKM 会话运行，请先退出该会话。若进程异常终止，请确认相关 Codex 进程均已退出后手动删除锁文件：${lockPath}`);
  }
  try {
    await fs.write(handle, String(process.pid));
  } catch (error) {
    await fs.remove(lockPath);
    throw error;
  } finally {
    await fs.close(handle);
  }
  // shortcut: 异常强杀后保留锁，避免遗留子进程仍在写认证文件；需要自动恢复时再跟踪子进程身份。
  return () => fs.remove(lockPath);
}

module.exports = { acquireCodexLock };
