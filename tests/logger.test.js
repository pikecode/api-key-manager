/**
 * Logger Tests
 * 测试日志工具类
 */

// Mock supports-color before requiring logger
jest.mock('supports-color', () => ({
  stdout: { hasBasic: true, level: 1 }
}));

const { Logger } = require('../src/utils/logger');

// Mock console methods
const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

describe('Logger', () => {
  let logOutput = [];
  let errorOutput = [];

  beforeEach(() => {
    logOutput = [];
    errorOutput = [];

    console.log = jest.fn((...args) => {
      logOutput.push(args.join(' '));
    });

    console.error = jest.fn((...args) => {
      errorOutput.push(args.join(' '));
    });

    process.exit = jest.fn();
    delete process.env.DEBUG;
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  describe('info', () => {
    it('应该输出信息消息', () => {
      Logger.info('测试信息');

      expect(console.log).toHaveBeenCalled();
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('测试信息');
    });
  });

  describe('success', () => {
    it('应该输出成功消息', () => {
      Logger.success('操作成功');

      expect(console.log).toHaveBeenCalled();
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('操作成功');
    });
  });

  describe('warning', () => {
    it('应该输出警告消息', () => {
      Logger.warning('注意警告');

      expect(console.log).toHaveBeenCalled();
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('注意警告');
    });
  });

  describe('error', () => {
    it('应该输出错误消息到 stderr', () => {
      Logger.error('发生错误');

      expect(console.error).toHaveBeenCalled();
      expect(errorOutput.length).toBe(1);
      expect(errorOutput[0]).toContain('发生错误');
    });
  });

  describe('debug', () => {
    it('应该在 DEBUG 模式下输出调试消息', () => {
      process.env.DEBUG = 'true';
      Logger.debug('调试信息');

      expect(console.log).toHaveBeenCalled();
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('[DEBUG]');
      expect(logOutput[0]).toContain('调试信息');
    });

    it('应该在非 DEBUG 模式下不输出', () => {
      delete process.env.DEBUG;
      Logger.debug('调试信息');

      expect(console.log).not.toHaveBeenCalled();
      expect(logOutput.length).toBe(0);
    });
  });

  describe('step', () => {
    it('应该输出步骤消息', () => {
      Logger.step('正在处理');

      expect(console.log).toHaveBeenCalled();
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('🔄');
      expect(logOutput[0]).toContain('正在处理');
    });
  });

  describe('complete', () => {
    it('应该输出完成消息', () => {
      Logger.complete('任务完成');

      expect(console.log).toHaveBeenCalled();
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('✅');
      expect(logOutput[0]).toContain('任务完成');
    });
  });

  describe('fatal', () => {
    it('应该输出致命错误并退出', () => {
      Logger.fatal('严重错误');

      expect(console.error).toHaveBeenCalled();
      expect(errorOutput.length).toBe(1);
      expect(errorOutput[0]).toContain('💀');
      expect(errorOutput[0]).toContain('严重错误');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
