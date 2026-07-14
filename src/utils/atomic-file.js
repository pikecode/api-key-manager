const fs = require('fs-extra');
const nodeFs = require('fs');
const path = require('path');

let tempSequence = 0;

function buildTempPath(filePath) {
  const directory = path.dirname(filePath);
  const fileName = path.basename(filePath);
  return path.join(directory, `.${fileName}.${process.pid}.${Date.now()}.${tempSequence++}.tmp`);
}

async function writeFileAtomic(filePath, content, options = {}) {
  const mode = options.mode ?? 0o600;
  const encoding = options.encoding ?? (Buffer.isBuffer(content) ? undefined : 'utf8');
  const tempPath = buildTempPath(filePath);
  let handle;

  try {
    handle = await nodeFs.promises.open(tempPath, 'wx', mode);
    await handle.writeFile(content, encoding ? { encoding } : undefined);
    await handle.sync();
    await handle.close();
    handle = null;
    await nodeFs.promises.rename(tempPath, filePath);
    if (process.platform !== 'win32') {
      await nodeFs.promises.chmod(filePath, mode);
    }
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    await fs.remove(tempPath).catch(() => {});
    throw error;
  }
}

async function writeJsonAtomic(filePath, data, options = {}) {
  const spaces = options.spaces ?? 2;
  const content = JSON.stringify(data, null, spaces);
  await writeFileAtomic(filePath, content, {
    encoding: 'utf8',
    mode: options.mode ?? 0o600
  });
}

module.exports = { writeFileAtomic, writeJsonAtomic };
