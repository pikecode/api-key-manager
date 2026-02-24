/**
 * Environment Launcher Tests
 * 测试 Claude Code 环境变量启动器
 */

// Mock cross-spawn and env-utils
jest.mock('cross-spawn');
jest.mock('../src/utils/env-utils');

const spawn = require('cross-spawn');
const { executeWithEnv } = require('../src/utils/env-launcher');
const { sanitizeEnvValue, clearTerminal } = require('../src/utils/env-utils');

describe('Environment Launcher', () => {
  const originalEnv = process.env;
  let mockChild;

  beforeEach(() => {
    process.env = { ...originalEnv };

    // Mock sanitizeEnvValue to return the value as-is
    sanitizeEnvValue.mockImplementation(value => value);
    clearTerminal.mockImplementation(() => {});

    // Mock spawn child process
    mockChild = {
      on: jest.fn()
    };
    spawn.mockReturnValue(mockChild);

    // Mock console.log
    console.log = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('API Key Mode', () => {
    it('应该设置 ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'api_key',
        authToken: 'sk-xxxxx',
        baseUrl: 'https://api.example.com'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeWithEnv(config);

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: 'sk-xxxxx',
            ANTHROPIC_BASE_URL: 'https://api.example.com'
          })
        })
      );
    });

    it('应该在缺少 baseUrl 时抛出错误', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'api_key',
        authToken: 'sk-xxxxx'
      };

      await expect(executeWithEnv(config)).rejects.toThrow('未配置基础地址');
    });
  });

  describe('Auth Token Mode', () => {
    it('应该设置 ANTHROPIC_AUTH_TOKEN', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeWithEnv(config);

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_AUTH_TOKEN: 'sk-xxxxx'
          })
        })
      );
    });

    it('应该设置 ANTHROPIC_BASE_URL 当提供时', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx',
        baseUrl: 'https://api.example.com'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeWithEnv(config);

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_AUTH_TOKEN: 'sk-xxxxx',
            ANTHROPIC_BASE_URL: 'https://api.example.com'
          })
        })
      );
    });
  });

  describe('Model Configuration', () => {
    it('应该设置主模型', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx',
        models: {
          primary: 'claude-3-sonnet-20240229'
        }
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeWithEnv(config);

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_MODEL: 'claude-3-sonnet-20240229'
          })
        })
      );
    });

    it('应该设置快速模型', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx',
        models: {
          smallFast: 'claude-3-haiku-20240307'
        }
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeWithEnv(config);

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_SMALL_FAST_MODEL: 'claude-3-haiku-20240307'
          })
        })
      );
    });
  });

  describe('Launch Arguments', () => {
    it('应该传递启动参数', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeWithEnv(config, ['--continue', '--verbose']);

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        ['--continue', '--verbose'],
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('应该处理非零退出代码', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0);
        }
      });

      await expect(executeWithEnv(config)).rejects.toThrow('退出代码: 1');
    });

    it('应该处理 ENOENT 错误', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback({ code: 'ENOENT' }), 0);
        }
      });

      await expect(executeWithEnv(config)).rejects.toThrow('找不到 claude 命令');
    });

    it('应该处理其他启动错误', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Unknown error')), 0);
        }
      });

      await expect(executeWithEnv(config)).rejects.toThrow('启动 Claude Code 失败');
    });
  });

  describe('Terminal Clearing', () => {
    it('应该清除终端', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeWithEnv(config);

      expect(clearTerminal).toHaveBeenCalled();
    });
  });
});
