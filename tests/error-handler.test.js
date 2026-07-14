/**
 * Error Handler Tests
 * 测试错误处理工具
 */

const { ErrorHandler } = require('../src/utils/error-handler');
const { Logger } = require('../src/utils/logger');

describe('Error Handler', () => {
  let errorOutput = [];

  beforeEach(() => {
    errorOutput = [];

    // Mock Logger.error
    Logger.error = jest.fn((message) => {
      errorOutput.push(message);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('应该处理 CONFIG_NOT_FOUND 错误', () => {
      const error = { type: 'CONFIG_NOT_FOUND' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('配置文件不存在');
    });

    it('应该处理 PROVIDER_NOT_FOUND 错误', () => {
      const error = { type: 'PROVIDER_NOT_FOUND' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('供应商不存在');
    });

    it('应该处理 INVALID_TOKEN 错误', () => {
      const error = { type: 'INVALID_TOKEN' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('Token格式无效');
    });

    it('应该处理 INVALID_URL 错误', () => {
      const error = { type: 'INVALID_URL' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('URL格式无效');
    });

    it('应该处理 INVALID_NAME 错误', () => {
      const error = { type: 'INVALID_NAME' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('供应商名称格式无效');
    });

    it('应该处理 FILE_PERMISSION 错误', () => {
      const error = { type: 'FILE_PERMISSION' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('文件权限不足');
    });

    it('应该处理 NETWORK_ERROR 错误', () => {
      const error = { type: 'NETWORK_ERROR' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('网络连接错误');
    });

    it('应该处理未知错误类型', () => {
      const error = { message: '自定义错误消息' };
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('自定义错误消息');
    });

    it('应该处理没有消息的错误', () => {
      const error = {};
      ErrorHandler.handle(error);

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('未知错误');
    });

    it('应该添加上下文信息', () => {
      const error = { type: 'INVALID_TOKEN' };
      ErrorHandler.handle(error, 'add命令');

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('[add命令]');
    });

    it('应该处理无上下文的情况', () => {
      const error = { message: '测试错误' };
      ErrorHandler.handle(error, '');

      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toBe('测试错误');
    });
  });

  describe('createError', () => {
    it('应该创建带类型的错误', () => {
      const error = ErrorHandler.createError('INVALID_TOKEN', 'Token无效');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Token无效');
      expect(error.type).toBe('INVALID_TOKEN');
    });

    it('应该创建带原始错误的错误', () => {
      const originalError = new Error('原始错误');
      const error = ErrorHandler.createError('NETWORK_ERROR', '网络错误', originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('应该处理无原始错误的情况', () => {
      const error = ErrorHandler.createError('CONFIG_NOT_FOUND', '配置未找到');

      expect(error.originalError).toBeNull();
    });
  });

  describe('withErrorHandling', () => {
    it('应该执行函数并返回结果', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await ErrorHandler.withErrorHandling(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    it('应该捕获并处理错误', async () => {
      const error = new Error('测试错误');
      error.type = 'INVALID_TOKEN';
      const fn = jest.fn().mockRejectedValue(error);

      await expect(ErrorHandler.withErrorHandling(fn)).rejects.toThrow('测试错误');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('应该添加上下文到错误处理', async () => {
      const error = new Error('测试错误');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(ErrorHandler.withErrorHandling(fn, 'switch命令')).rejects.toThrow();
      expect(Logger.error).toHaveBeenCalled();
      expect(errorOutput[0]).toContain('[switch命令]');
    });

    it('应该处理同步函数', async () => {
      const fn = () => 'sync-result';

      const result = await ErrorHandler.withErrorHandling(fn);

      expect(result).toBe('sync-result');
    });

    it('应该传播错误', async () => {
      const error = new Error('传播的错误');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(ErrorHandler.withErrorHandling(fn)).rejects.toBe(error);
    });
  });
});
