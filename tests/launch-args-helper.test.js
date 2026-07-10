/**
 * Launch Args Helper Tests
 * 测试启动参数辅助类
 */

const { LaunchArgsHelper } = require('../src/commands/switch/launch-args-helper');
const { UIHelper } = require('../src/utils/ui-helper');

describe('LaunchArgsHelper', () => {
  describe('getAvailableLaunchArgs', () => {
    it('应该为 Claude Code 返回正确的参数', () => {
      const args = LaunchArgsHelper.getAvailableLaunchArgs(false);

      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBeGreaterThan(0);
      expect(args[0]).toHaveProperty('name');
      expect(args[0]).toHaveProperty('label');
    });

    it('应该为 Codex 返回正确的参数', () => {
      const args = LaunchArgsHelper.getAvailableLaunchArgs(true);

      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBeGreaterThan(0);
      expect(args[0]).toHaveProperty('name');
    });
  });

  describe('mergeArgsWithDefaults', () => {
    it('应该合并默认参数', () => {
      const availableArgs = [
        { name: '--arg1', label: '参数1', checked: false },
        { name: '--arg2', label: '参数2', checked: false }
      ];
      const defaultLaunchArgs = ['--arg1'];

      const merged = LaunchArgsHelper.mergeArgsWithDefaults(availableArgs, defaultLaunchArgs);

      expect(merged[0].checked).toBe(true);  // --arg1 应该被选中
      expect(merged[1].checked).toBe(false); // --arg2 不应该被选中
    });

    it('应该添加自定义参数', () => {
      const availableArgs = [
        { name: '--arg1', label: '参数1', checked: false }
      ];
      const defaultLaunchArgs = ['--arg1', '--custom-arg'];

      const merged = LaunchArgsHelper.mergeArgsWithDefaults(availableArgs, defaultLaunchArgs);

      expect(merged.length).toBe(2);
      expect(merged[1].name).toBe('--custom-arg');
      expect(merged[1].description).toBe('自定义启动参数');
      expect(merged[1].checked).toBe(true);
    });

    it('应该过滤非字符串的默认参数', () => {
      const availableArgs = [
        { name: '--arg1', label: '参数1', checked: false }
      ];
      const defaultLaunchArgs = ['--arg1', 123, null, undefined];

      const merged = LaunchArgsHelper.mergeArgsWithDefaults(availableArgs, defaultLaunchArgs);

      expect(merged.length).toBe(1); // 只有 --arg1
    });

    it('应该处理空默认参数列表', () => {
      const availableArgs = [
        { name: '--arg1', label: '参数1', checked: false }
      ];
      const defaultLaunchArgs = [];

      const merged = LaunchArgsHelper.mergeArgsWithDefaults(availableArgs, defaultLaunchArgs);

      expect(merged.length).toBe(1);
      expect(merged[0].checked).toBe(false);
    });

    it('应该保留参数定义中的默认选中状态', () => {
      const availableArgs = [
        { name: '--arg1', label: '参数1', checked: true }
      ];
      const defaultLaunchArgs = [];

      const merged = LaunchArgsHelper.mergeArgsWithDefaults(availableArgs, defaultLaunchArgs);

      expect(merged[0].checked).toBe(true);
    });
  });

  describe('validateArgsConflict', () => {
    it('应该检测互斥参数冲突', () => {
      const selectedArgs = ['--full-auto', '--dangerously-bypass-approvals-and-sandbox'];
      const availableArgs = [
        { name: '--full-auto', exclusive: ['--dangerously-bypass-approvals-and-sandbox'] },
        { name: '--dangerously-bypass-approvals-and-sandbox', exclusive: ['--full-auto'] }
      ];

      const result = LaunchArgsHelper.validateArgsConflict(selectedArgs, availableArgs);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('应该允许非冲突参数', () => {
      const selectedArgs = ['--arg1', '--arg2'];
      const availableArgs = [
        { name: '--arg1' },
        { name: '--arg2' }
      ];

      const result = LaunchArgsHelper.validateArgsConflict(selectedArgs, availableArgs);

      expect(result).toBeNull();
    });
  });

  describe('formatArgsForDisplay', () => {
    it('应该格式化参数用于显示', () => {
      const args = [
        { name: '--arg1', label: '参数1', description: '测试参数', checked: true }
      ];

      const formatted = LaunchArgsHelper.formatArgsForDisplay(args, UIHelper);

      expect(formatted.length).toBe(1);
      expect(formatted[0]).toHaveProperty('name');
      expect(formatted[0]).toHaveProperty('value');
      expect(formatted[0]).toHaveProperty('checked');
      expect(formatted[0].value).toBe('--arg1');
      expect(formatted[0].checked).toBe(true);
    });

    it('应该处理没有 label 的参数', () => {
      const args = [
        { name: '--arg1', description: '测试', checked: false }
      ];

      const formatted = LaunchArgsHelper.formatArgsForDisplay(args, UIHelper);

      expect(formatted[0].value).toBe('--arg1');
    });

    it('应该处理没有 description 的参数', () => {
      const args = [
        { name: '--arg1', label: '参数1', checked: false }
      ];

      const formatted = LaunchArgsHelper.formatArgsForDisplay(args, UIHelper);

      expect(formatted[0].value).toBe('--arg1');
    });
  });

  describe('getIDEDisplayName', () => {
    it('应该返回 Claude Code 显示名称', () => {
      const name = LaunchArgsHelper.getIDEDisplayName(false);
      expect(name).toBe('Claude Code');
    });

    it('应该返回 Codex CLI 显示名称', () => {
      const name = LaunchArgsHelper.getIDEDisplayName(true);
      expect(name).toBe('Codex CLI');
    });
  });
});
