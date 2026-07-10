/**
 * Terminal Format Tests
 * 测试终端格式化工具
 */

// Mock supports-color before requiring terminal-format
jest.mock('supports-color', () => ({
  stdout: { hasBasic: true, level: 1 }
}));

const { formatMessage } = require('../src/utils/terminal-format');

describe('Terminal Format', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('formatMessage', () => {
    it('应该格式化成功消息', () => {
      const result = formatMessage('操作成功', 'success');

      expect(result).toContain('操作成功');
      // 应该包含某种形式的成功标识
      expect(result.length).toBeGreaterThan('操作成功'.length);
    });

    it('应该格式化错误消息', () => {
      const result = formatMessage('操作失败', 'error');

      expect(result).toContain('操作失败');
      expect(result.length).toBeGreaterThan('操作失败'.length);
    });

    it('应该格式化警告消息', () => {
      const result = formatMessage('注意事项', 'warning');

      expect(result).toContain('注意事项');
      expect(result.length).toBeGreaterThan('注意事项'.length);
    });

    it('应该格式化信息消息', () => {
      const result = formatMessage('一般信息', 'info');

      expect(result).toContain('一般信息');
      expect(result.length).toBeGreaterThan('一般信息'.length);
    });

    it('应该使用默认类型', () => {
      const result = formatMessage('默认消息');

      expect(result).toContain('默认消息');
      expect(result.length).toBeGreaterThan('默认消息'.length);
    });

    it('应该处理未知类型', () => {
      const result = formatMessage('未知类型', 'unknown');

      expect(result).toContain('未知类型');
      // 应该回退到默认格式
    });

    it('应该处理空消息', () => {
      const result = formatMessage('', 'info');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('应该处理包含特殊字符的消息', () => {
      const message = '测试 ~!@#$%^&*() 特殊字符';
      const result = formatMessage(message, 'info');

      expect(result).toContain(message);
    });
  });

  describe('Unicode 支持', () => {
    it('应该检测 Windows Terminal', () => {
      process.env.WT_SESSION = 'true';
      const result = formatMessage('测试', 'success');

      expect(result).toBeDefined();
      expect(result).toContain('测试');
    });

    it('应该检测 VS Code 终端', () => {
      process.env.TERM_PROGRAM = 'vscode';
      const result = formatMessage('测试', 'success');

      expect(result).toBeDefined();
      expect(result).toContain('测试');
    });
  });
});
