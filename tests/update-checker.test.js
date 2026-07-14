jest.mock('cross-spawn');
jest.mock('inquirer');

const spawn = require('cross-spawn');
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
});
