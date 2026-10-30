const fs = require('fs-extra');

async function acquireFileLock(lockPath, busyMessage) {
  let handle;
  try {
    handle = await fs.open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error(`${busyMessage}\n若进程异常终止，请确认相关进程均已退出后手动删除锁文件：${lockPath}`);
  }
  try {
    await fs.write(handle, String(process.pid));
  } catch (error) {
    await fs.close(handle);
    await fs.remove(lockPath);
    throw error;
  }
  await fs.close(handle);
  // shortcut: 强杀后的锁须人工确认进程退出后清理，避免误删仍被使用的锁。
  return () => fs.remove(lockPath);
}

module.exports = { acquireFileLock };
