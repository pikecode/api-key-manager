/**
 * Secrets Utility Tests
 * 测试 Token 显示相关功能
 */

const { maskToken, maybeMaskToken } = require('../src/utils/secrets');

describe('Secrets Utility', () => {
  describe('maskToken', () => {
    it('应该加密长度大于 10 的 token', () => {
      const token = 'sk-ant-oat01-1234567890abcdef';
      const masked = maskToken(token);

      expect(masked).toBe('sk-ant-o***cdef');
      expect(masked.length).toBeLessThan(token.length);
    });

    it('应该对短 token 返回 ***', () => {
      const token = 'short';
      const masked = maskToken(token);

      expect(masked).toBe('***');
    });

    it('应该处理 null 或 undefined', () => {
      expect(maskToken(null)).toBeNull();
      expect(maskToken(undefined)).toBeUndefined();
    });

    it('应该处理非字符串类型', () => {
      expect(maskToken(123)).toBe(123);
      expect(maskToken({})).toEqual({});
    });

    it('应该去除前后空格', () => {
      const token = '  sk-ant-oat01-1234567890abcdef  ';
      const masked = maskToken(token);

      expect(masked).toBe('sk-ant-o***cdef');
    });

    it('应该保留前 8 位和后 4 位', () => {
      const token = 'abcdefghijklmnopqrstuvwxyz';
      const masked = maskToken(token);

      expect(masked).toBe('abcdefgh***wxyz');
    });
  });

  describe('maybeMaskToken', () => {
    it('应该在 showToken=false 时加密', () => {
      const token = 'sk-ant-oat01-1234567890abcdef';
      const masked = maybeMaskToken(token, false);

      expect(masked).toBe('sk-ant-o***cdef');
    });

    it('应该在 showToken=true 时显示完整 token', () => {
      const token = 'sk-ant-oat01-1234567890abcdef';
      const result = maybeMaskToken(token, true);

      expect(result).toBe(token);
    });

    it('应该默认加密 token', () => {
      const token = 'sk-ant-oat01-1234567890abcdef';
      const masked = maybeMaskToken(token);

      expect(masked).toBe('sk-ant-o***cdef');
    });

    it('应该处理空 token', () => {
      expect(maybeMaskToken(null, false)).toBeNull();
      expect(maybeMaskToken(undefined, false)).toBeUndefined();
      expect(maybeMaskToken('', false)).toBe('');
    });

    it('应该处理空 token 且 showToken=true', () => {
      expect(maybeMaskToken(null, true)).toBeNull();
      expect(maybeMaskToken(undefined, true)).toBeUndefined();
      expect(maybeMaskToken('', true)).toBe('');
    });
  });
});
