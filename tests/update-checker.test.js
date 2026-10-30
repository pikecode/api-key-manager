jest.mock('cross-spawn');
jest.mock('inquirer');
jest.mock('fs-extra');
jest.mock('../src/utils/atomic-file');

const spawn = require('cross-spawn');
const { EventEmitter } = require('events');
const inquirer = require('inquirer');
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

describe('更新后的命令交接', () => {
  const originalEnv = process.env;
  const inputTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const outputTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  let install;
  let restart;
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.CC_NO_UPDATE_CHECK;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    fs.readJson.mockResolvedValue({ packageName: 'akm', checkedAt: Date.now(), latest: '2.0.0' });
    inquirer.prompt.mockResolvedValue({ doUpdate: true });
    install = new EventEmitter();
    restart = new EventEmitter();
    spawn.mockReturnValueOnce(install).mockReturnValueOnce(restart);
  });
  afterEach(() => {
    process.env = originalEnv;
    if (inputTTY) Object.defineProperty(process.stdin, 'isTTY', inputTTY);
    else delete process.stdin.isTTY;
    if (outputTTY) Object.defineProperty(process.stdout, 'isTTY', outputTTY);
    else delete process.stdout.isTTY;
    jest.restoreAllMocks();
    spawn.mockReset();
  });
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));

  test('新版进程结束前不返回，结束后传递退出码', async () => {
    let completed = false;
    const result = checkForUpdates({ packageName: 'akm', currentVersion: '1.0.0' }).then(code => {
      completed = true;
      return code;
    });
    await tick();
    install.emit('close', 0);
    await tick();
    expect(completed).toBe(false);
    expect(spawn).toHaveBeenLastCalledWith(process.execPath, [process.argv[1], ...process.argv.slice(2)], { shell: false, stdio: 'inherit' });
    restart.emit('close', 7);
    await expect(result).resolves.toBe(7);
  });

  test('安装进程错误时跳过重启', async () => {
    const result = checkForUpdates({ packageName: 'akm', currentVersion: '1.0.0' });
    await tick();
    install.emit('error', new Error('npm 不存在'));
    await expect(result).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  test('重启进程错误时返回失败退出码，不能继续旧命令', async () => {
    const result = checkForUpdates({ packageName: 'akm', currentVersion: '1.0.0' });
    await tick();
    install.emit('close', 0);
    await tick();
    restart.emit('error', new Error('启动失败'));
    await expect(result).resolves.toBe(1);
  });
});
