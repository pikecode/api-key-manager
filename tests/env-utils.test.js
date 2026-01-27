/**
 * Environment Utils Tests
 * 测试环境变量工具函数
 */

const { sanitizeEnvValue, clearTerminal } = require('../src/utils/env-utils');

describe('Environment Utils', () => {
  describe('sanitizeEnvValue', () => {
    it('应该返回干净的字符串', () => {
      const result = sanitizeEnvValue('sk-ant-oat01-xxxxx');
      expect(result).toBe('sk-ant-oat01-xxxxx');
    });

    it('应该允许包含 $ 符号', () => {
      const result = sanitizeEnvValue('token-with-$-symbol');
      expect(result).toBe('token-with-$-symbol');
    });

    it('应该移除控制字符', () => {
      const result = sanitizeEnvValue('test\x00value\x08');
      expect(result).toBe('testvalue');
    });

    it('应该拒绝包含分号的值', () => {
      expect(() => sanitizeEnvValue('value;command')).toThrow('潜在不安全的字符');
    });

    it('应该拒绝包含 & 的值', () => {
      expect(() => sanitizeEnvValue('value&command')).toThrow('潜在不安全的字符');
    });

    it('应该拒绝包含 | 的值', () => {
      expect(() => sanitizeEnvValue('value|command')).toThrow('潜在不安全的字符');
    });

    it('应该拒绝包含反引号的值', () => {
      expect(() => sanitizeEnvValue('value`command`')).toThrow('潜在不安全的字符');
    });

    it('应该拒绝非字符串值', () => {
      expect(() => sanitizeEnvValue(123)).toThrow('必须是字符串');
      expect(() => sanitizeEnvValue(null)).toThrow('必须是字符串');
      expect(() => sanitizeEnvValue(undefined)).toThrow('必须是字符串');
      expect(() => sanitizeEnvValue({})).toThrow('必须是字符串');
    });

    it('应该处理空字符串', () => {
      const result = sanitizeEnvValue('');
      expect(result).toBe('');
    });

    it('应该处理包含特殊字符的正常 token', () => {
      const result = sanitizeEnvValue('sk-ant-api03-AbCdEf_123-xyz');
      expect(result).toBe('sk-ant-api03-AbCdEf_123-xyz');
    });

    it('应该允许 URL', () => {
      const result = sanitizeEnvValue('https://api.example.com/v1');
      expect(result).toBe('https://api.example.com/v1');
    });
  });

  describe('clearTerminal', () => {
    const originalStdout = process.stdout;
    const originalPlatform = process.platform;
    let mockWrite;

    beforeEach(() => {
      // Mock process.stdout.write
      mockWrite = jest.fn();
      process.stdout.write = mockWrite;
    });

    afterEach(() => {
      // Restore
      if (originalStdout && originalStdout.write) {
        process.stdout.write = originalStdout.write;
      }
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
        configurable: true
      });
    });

    it('应该在 Unix 系统上清屏', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true
      });

      clearTerminal();

      expect(mockWrite).toHaveBeenCalled();
    });

    it('应该在 Windows 系统上清屏', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });

      clearTerminal();

      expect(mockWrite).toHaveBeenCalled();
    });

    it('应该在 macOS 系统上清屏', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });

      clearTerminal();

      expect(mockWrite).toHaveBeenCalled();
    });

    it('应该处理 stdout 不可用的情况', () => {
      const savedStdout = process.stdout;
      process.stdout = null;

      expect(() => clearTerminal()).not.toThrow();

      process.stdout = savedStdout;
    });

    it('应该处理 write 函数不存在的情况', () => {
      const savedWrite = process.stdout.write;
      delete process.stdout.write;

      expect(() => clearTerminal()).not.toThrow();

      process.stdout.write = savedWrite;
    });

    it('应该处理 write 抛出错误的情况', () => {
      mockWrite.mockImplementation(() => {
        throw new Error('Write failed');
      });

      expect(() => clearTerminal()).not.toThrow();
    });
  });
});
