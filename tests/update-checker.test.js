jest.mock('cross-spawn');
jest.mock('inquirer');
jest.mock('fs-extra');
jest.mock('../src/utils/atomic-file');

const spawn = require('cross-spawn');
const fs = require('fs-extra');
const { writeJsonAtomic } = require('../src/utils/atomic-file');
const { checkForUpdates } = require('../src/utils/update-checker');

function createNpmViewChild(version) {
  let dataHandler;
  return {
    stdout: {
      on: jest.fn((event, handler) => {
        if (event === 'data') dataHandler = handler;
      })
    },
    kill: jest.fn(),
    on: jest.fn((event, handler) => {
      if (event === 'close') {
        process.nextTick(() => {
          dataHandler(Buffer.from(JSON.stringify(version)));
          handler(0);
        });
      }
    })
  };
}

describe('更新检查器', () => {
  const originalEnv = process.env;
  let logSpy;

  beforeEach(() => {
    fs.readJson.mockRejectedValue(new Error('缓存不存在'));
    writeJsonAtomic.mockResolvedValue();
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.CC_NO_UPDATE_CHECK;
    delete process.env.CI;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    logSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('禁用更新检查时不启动子进程', async () => {
    process.env.CC_NO_UPDATE_CHECK = '1';

    await checkForUpdates({ packageName: '@pikecode/api-key-manager', currentVersion: '1.0.0' });

    expect(spawn).not.toHaveBeenCalled();
  });

  test('查询版本时不启用 shell', async () => {
    spawn.mockReturnValue(createNpmViewChild('2.0.0'));

    await checkForUpdates({ packageName: '@pikecode/api-key-manager', currentVersion: '1.0.0' });

    expect(spawn).toHaveBeenCalledWith(
      'npm',
      ['view', '@pikecode/api-key-manager', 'version', '--json'],
      { shell: false, stdio: ['ignore', 'pipe', 'ignore'] }
    );
  });

  test('24 小时内复用检查结果，不启动 npm', async () => {
    fs.readJson.mockResolvedValue({ packageName: 'akm', checkedAt: Date.now(), latest: '1.0.0' });
    await checkForUpdates({ packageName: 'akm', currentVersion: '1.0.0' });
    expect(spawn).not.toHaveBeenCalled();
  });

  test('缓存过期后重新检查并保存结果', async () => {
    fs.readJson.mockResolvedValue({ packageName: 'akm', checkedAt: Date.now() - 86400001, latest: '1.0.0' });
    spawn.mockReturnValue(createNpmViewChild('2.0.0'));
    await checkForUpdates({ packageName: 'akm', currentVersion: '2.0.0' });
    expect(writeJsonAtomic).toHaveBeenCalledWith(expect.any(String), {
      packageName: 'akm', checkedAt: expect.any(Number), latest: '2.0.0'
    });
  });

  test('失败的检查也缓存，缓存写入失败不影响命令', async () => {
    spawn.mockReturnValue({
      stdout: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'error') process.nextTick(() => callback(new Error('离线')));
      })
    });
    writeJsonAtomic.mockRejectedValue(new Error('只读目录'));
    await expect(checkForUpdates({ packageName: 'akm', currentVersion: '1.0.0' })).resolves.toBeUndefined();
    expect(writeJsonAtomic).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ latest: null }));
  });
});
