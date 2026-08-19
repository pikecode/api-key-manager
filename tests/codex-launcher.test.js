/**
 * Codex Launcher Tests
 * 测试 Codex CLI 环境变量启动器
 */

// Mock dependencies
jest.mock('cross-spawn');
jest.mock('../src/utils/env-utils');
jest.mock('../src/utils/codex-files');

const spawn = require('cross-spawn');
const { executeCodexWithEnv, buildCodexEnvVariables } = require('../src/utils/codex-launcher');
const { sanitizeEnvValue, clearTerminal } = require('../src/utils/env-utils');
const { applyCodexConfig, clearCodexAkmConfig } = require('../src/utils/codex-files');

describe('Codex Launcher', () => {
  const originalEnv = process.env;
  let mockChild;

  beforeEach(() => {
    process.env = { ...originalEnv };

    // Mock sanitizeEnvValue to return the value as-is
    sanitizeEnvValue.mockImplementation(value => value);
    clearTerminal.mockImplementation(() => {});
    applyCodexConfig.mockResolvedValue();

    // Mock spawn child process
    mockChild = {
      on: jest.fn(),
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

  describe('buildCodexEnvVariables', () => {
    it('应该构建基本的环境变量', () => {
      const config = {
        name: 'test-codex',
        authToken: 'sk-xxxxx',
        baseUrl: 'https://api.openai.com'
      };

      const env = buildCodexEnvVariables(config);

      expect(env.OPENAI_API_KEY).toBe('sk-xxxxx');
      expect(env.OPENAI_BASE_URL).toBe('https://api.openai.com');
    });

    it('应该设置自定义模型', () => {
      const config = {
        name: 'test-codex',
        authToken: 'sk-xxxxx',
        models: {
          primary: 'gpt-4'
        }
      };

      const env = buildCodexEnvVariables(config);

      expect(env.OPENAI_MODEL).toBe('gpt-4');
    });

    it('应该处理缺少 baseUrl 的情况', () => {
      process.env.OPENAI_BASE_URL = 'https://stale.example.com';
      process.env.OPENAI_MODEL = 'stale-model';
      const config = {
        name: 'test-codex',
        authToken: 'sk-xxxxx'
      };

      const env = buildCodexEnvVariables(config);

      expect(env.OPENAI_API_KEY).toBe('sk-xxxxx');
      expect(env.OPENAI_BASE_URL).toBeUndefined();
      expect(env.OPENAI_MODEL).toBeUndefined();
    });
  });

  describe('executeCodexWithEnv', () => {
    it('应该成功启动 Codex', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeCodexWithEnv(config);

      expect(applyCodexConfig).toHaveBeenCalledWith(config);
      expect(spawn).toHaveBeenCalledWith('codex', [], expect.any(Object));
      const options = spawn.mock.calls[0][2];
      expect(options.shell).toBe(false);
      expect(options.env.OPENAI_API_KEY).toBe('sk-xxxxx');
    });

    it('应该拒绝无效的配置', async () => {
      const config = {
        name: 'test-invalid',
        ideName: 'claude'
      };

      await expect(executeCodexWithEnv(config)).rejects.toThrow('无效的 Codex 供应商配置');
    });

    it('应该拒绝缺少 authToken 的配置', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex'
      };

      await expect(executeCodexWithEnv(config)).rejects.toThrow('未配置 API Key');
    });

    it('应该传递启动参数', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeCodexWithEnv(config, ['resume', '--search']);

      expect(spawn).toHaveBeenCalledWith(
        'codex',
        ['resume', '--search'],
        expect.any(Object)
      );
    });

    it('应该正确排序子命令和选项', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      // 混合顺序的参数
      await executeCodexWithEnv(config, ['--search', 'resume', '--full-auto']);

      // 应该重新排序：子命令在前，选项在后
      expect(spawn).toHaveBeenCalledWith(
        'codex',
        ['resume', '--search', '--full-auto'],
        expect.any(Object)
      );
    });

    it('应该拒绝未知或恶意启动参数', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      await expect(executeCodexWithEnv(config, ['resume; echo injected']))
        .rejects.toThrow('不支持的启动参数');
      expect(spawn).not.toHaveBeenCalled();
    });

    it('应该处理非零退出代码', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0);
        }
      });

      await expect(executeCodexWithEnv(config)).rejects.toThrow('退出代码: 1');
    });

    it('应该处理 ENOENT 错误', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback({ code: 'ENOENT' }), 0);
        }
      });

      await expect(executeCodexWithEnv(config)).rejects.toThrow('找不到 codex 命令');
    });

    it('应该处理其他启动错误', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Unknown error')), 0);
        }
      });

      await expect(executeCodexWithEnv(config)).rejects.toThrow('启动 Codex CLI 失败');
    });

    it('应该清除终端', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeCodexWithEnv(config);

      expect(clearTerminal).toHaveBeenCalled();
    });

    it('应该调用 applyCodexConfig', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeCodexWithEnv(config);

      expect(applyCodexConfig).toHaveBeenCalledWith(config);
    });

    it('chatgpt_login 模式应该调用 clearCodexAkmConfig', async () => {
      const config = {
        name: 'test-codex-official',
        ideName: 'codex',
        authMode: 'chatgpt_login'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await executeCodexWithEnv(config);

      expect(clearCodexAkmConfig).toHaveBeenCalled();
      expect(applyCodexConfig).not.toHaveBeenCalled();
    });

    it('chatgpt_login 模式不需要 authToken', async () => {
      const config = {
        name: 'test-official',
        ideName: 'codex',
        authMode: 'chatgpt_login',
        authToken: null
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await expect(executeCodexWithEnv(config)).resolves.toBeUndefined();
    });
  });

  describe('authMode handling', () => {
    it('chatgpt_login 模式不设置环境变量', () => {
      process.env.OPENAI_API_KEY = 'existing-key';
      const config = {
        name: 'test-official',
        authMode: 'chatgpt_login'
      };

      const env = buildCodexEnvVariables(config);

      expect(env.OPENAI_API_KEY).toBeUndefined();
      expect(env.OPENAI_BASE_URL).toBeUndefined();
    });

    it('缺少 authMode 时默认为 api_key', () => {
      const config = {
        name: 'test-codex',
        authToken: 'sk-legacy-key'
        // authMode 未设置
      };

      const env = buildCodexEnvVariables(config);

      expect(env.OPENAI_API_KEY).toBe('sk-legacy-key');
    });

    it('从 api_key 模式切换到 chatgpt_login 时清理旧文件', async () => {
      const config1 = {
        name: 'test-codex',
        ideName: 'codex',
        authMode: 'api_key',
        authToken: 'sk-old-key'
      };

      const config2 = {
        name: 'test-codex',
        ideName: 'codex',
        authMode: 'chatgpt_login'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      // 先用 api_key 模式启动
      await executeCodexWithEnv(config1);
      expect(applyCodexConfig).toHaveBeenCalledWith(config1);

      // 重置 mock
      applyCodexConfig.mockClear();
      clearCodexAkmConfig.mockClear();

      // 然后切换到 chatgpt_login 模式
      await executeCodexWithEnv(config2);
      expect(clearCodexAkmConfig).toHaveBeenCalled();
      expect(applyCodexConfig).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('应该检测"already has an active writer"错误', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authMode: 'api_key',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0);
        }
      });

      mockChild.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Error: thread already has an active writer')), 0);
        }
      });

      try {
        await executeCodexWithEnv(config, ['resume']);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.code).toBe('SESSION_LOCKED');
        expect(error.message).toContain('会话被锁定');
      }
    });

    it('应该检测"failed to resume session"错误', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authMode: 'api_key',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0);
        }
      });

      mockChild.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Error: Failed to resume session')), 0);
        }
      });

      try {
        await executeCodexWithEnv(config, ['resume']);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.code).toBe('SESSION_LOCKED');
      }
    });

    it('resume 启动以 1 退出但 stderr 未捕获错误文本时也应该允许上层重试', async () => {
      const config = {
        name: 'test-codex',
        ideName: 'codex',
        authMode: 'api_key',
        authToken: 'sk-xxxxx'
      };

      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0);
        }
      });

      await expect(executeCodexWithEnv(config, ['resume']))
        .rejects.toMatchObject({ code: 'SESSION_LOCKED' });
    });
  });
});
