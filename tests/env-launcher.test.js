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
      on: jest.fn(),
      stdout: {
        on: jest.fn()
      },
      stderr: {
        on: jest.fn()
      }
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

      expect(spawn).toHaveBeenCalledWith('claude', [], expect.any(Object));
      const options = spawn.mock.calls[0][2];
      expect(options.shell).toBe(false);
      expect(options.env.ANTHROPIC_API_KEY).toBe('sk-xxxxx');
      expect(options.env.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
    });

    it('应该清理父进程遗留的 Auth Token', async () => {
      process.env.ANTHROPIC_AUTH_TOKEN = 'stale-token';
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') setTimeout(() => callback(0), 0);
      });

      await executeWithEnv({
        name: 'test-provider',
        authMode: 'api_key',
        authToken: 'sk-xxxxx',
        baseUrl: 'https://api.example.com'
      });

      const childEnv = spawn.mock.calls[0][2].env;
      expect(childEnv.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    });

    it('没有 baseUrl 时应使用官方 Anthropic API（不设置 ANTHROPIC_BASE_URL）', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'api_key',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') setTimeout(() => callback(0), 0);
      });

      await executeWithEnv(config);
      const childEnv = spawn.mock.calls[0][2].env;
      expect(childEnv.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(childEnv.ANTHROPIC_API_KEY).toBe('sk-xxxxx');
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

      expect(spawn).toHaveBeenCalledWith('claude', [], expect.any(Object));
      const options = spawn.mock.calls[0][2];
      expect(options.shell).toBe(false);
      expect(options.env.ANTHROPIC_AUTH_TOKEN).toBe('sk-xxxxx');
    });

    it('应该清理父进程遗留的 API Key 和模型变量', async () => {
      process.env.ANTHROPIC_API_KEY = 'stale-key';
      process.env.ANTHROPIC_MODEL = 'stale-model';
      process.env.ANTHROPIC_SMALL_FAST_MODEL = 'stale-fast-model';
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') setTimeout(() => callback(0), 0);
      });

      await executeWithEnv({
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      });

      const childEnv = spawn.mock.calls[0][2].env;
      expect(childEnv.ANTHROPIC_API_KEY).toBeUndefined();
      expect(childEnv.ANTHROPIC_MODEL).toBeUndefined();
      expect(childEnv.ANTHROPIC_SMALL_FAST_MODEL).toBeUndefined();
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

      await executeWithEnv(config, ['--continue', '--dangerously-skip-permissions']);

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        ['--continue', '--dangerously-skip-permissions'],
        expect.any(Object)
      );
    });

    it('应该拒绝未知或恶意启动参数', async () => {
      const config = {
        name: 'test-provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx'
      };

      await expect(executeWithEnv(config, ['--continue; echo injected']))
        .rejects.toThrow('不支持的启动参数');
      expect(spawn).not.toHaveBeenCalled();
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

    it('应该检测"No conversation found"错误', async () => {
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

      mockChild.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('No conversation found to continue')), 0);
        }
      });

      try {
        await executeWithEnv(config, ['--continue']);
        expect(true).toBe(false); // 应该抛出错误
      } catch (error) {
        expect(error.message).toContain('没有可恢复的会话');
        expect(error.code).toBe('NO_CONVERSATION_FOUND');
      }
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
