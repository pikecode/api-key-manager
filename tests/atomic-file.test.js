const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { writeFileAtomic, writeJsonAtomic } = require('../src/utils/atomic-file');

describe('原子文件写入', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-atomic-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  test('原子替换文件并设置安全权限', async () => {
    const filePath = path.join(tempDir, 'config.json');
    await fs.writeFile(filePath, 'old', 'utf8');

    await writeFileAtomic(filePath, 'new', { mode: 0o600 });

    expect(await fs.readFile(filePath, 'utf8')).toBe('new');
    if (process.platform !== 'win32') {
      expect((await fs.stat(filePath)).mode & 0o777).toBe(0o600);
    }
  });

  test('JSON 序列化失败时保留旧文件且清理临时文件', async () => {
    const filePath = path.join(tempDir, 'config.json');
    await fs.writeFile(filePath, 'old', 'utf8');
    const circular = {};
    circular.self = circular;

    await expect(writeJsonAtomic(filePath, circular)).rejects.toThrow();

    expect(await fs.readFile(filePath, 'utf8')).toBe('old');
    expect((await fs.readdir(tempDir)).filter(name => name.endsWith('.tmp'))).toEqual([]);
  });
});
