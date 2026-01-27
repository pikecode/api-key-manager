/**
 * Launch Args Tests
 * 测试启动参数定义和验证
 */

const {
  getClaudeLaunchArgs,
  getCodexLaunchArgs,
  checkExclusiveArgs
} = require('../src/utils/launch-args');

describe('Launch Args', () => {
  describe('getClaudeLaunchArgs', () => {
    it('应该返回 Claude 启动参数列表', () => {
      const args = getClaudeLaunchArgs();

      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBeGreaterThan(0);
    });

    it('应该包含 --continue 参数', () => {
      const args = getClaudeLaunchArgs();
      const continueArg = args.find(arg => arg.name === '--continue');

      expect(continueArg).toBeDefined();
      expect(continueArg.label).toBeDefined();
      expect(continueArg.description).toBeDefined();
    });

    it('应该包含 --dangerously-skip-permissions 参数', () => {
      const args = getClaudeLaunchArgs();
      const dangerousArg = args.find(arg => arg.name === '--dangerously-skip-permissions');

      expect(dangerousArg).toBeDefined();
      expect(dangerousArg.label).toBe('最高权限');
    });

    it('所有参数应该有必需的字段', () => {
      const args = getClaudeLaunchArgs();

      args.forEach(arg => {
        expect(arg.name).toBeDefined();
        expect(typeof arg.name).toBe('string');
        expect(arg.label).toBeDefined();
        expect(arg.description).toBeDefined();
        expect(typeof arg.checked).toBe('boolean');
      });
    });
  });

  describe('getCodexLaunchArgs', () => {
    it('应该返回 Codex 启动参数列表', () => {
      const args = getCodexLaunchArgs();

      expect(Array.isArray(args)).toBe(true);
      expect(args.length).toBeGreaterThan(0);
    });

    it('应该包含 resume 子命令', () => {
      const args = getCodexLaunchArgs();
      const resumeArg = args.find(arg => arg.name === 'resume');

      expect(resumeArg).toBeDefined();
      expect(resumeArg.isSubcommand).toBe(true);
    });

    it('应该包含 --full-auto 参数', () => {
      const args = getCodexLaunchArgs();
      const fullAutoArg = args.find(arg => arg.name === '--full-auto');

      expect(fullAutoArg).toBeDefined();
      expect(fullAutoArg.exclusive).toBeDefined();
    });

    it('应该包含 --dangerously-bypass-approvals-and-sandbox 参数', () => {
      const args = getCodexLaunchArgs();
      const dangerousArg = args.find(arg => arg.name === '--dangerously-bypass-approvals-and-sandbox');

      expect(dangerousArg).toBeDefined();
      expect(dangerousArg.exclusive).toBeDefined();
    });

    it('应该包含 --search 参数', () => {
      const args = getCodexLaunchArgs();
      const searchArg = args.find(arg => arg.name === '--search');

      expect(searchArg).toBeDefined();
    });

    it('所有参数应该有必需的字段', () => {
      const args = getCodexLaunchArgs();

      args.forEach(arg => {
        expect(arg.name).toBeDefined();
        expect(typeof arg.name).toBe('string');
        expect(arg.label).toBeDefined();
        expect(arg.description).toBeDefined();
        expect(typeof arg.checked).toBe('boolean');
      });
    });
  });

  describe('checkExclusiveArgs', () => {
    it('应该检测互斥参数冲突', () => {
      const availableArgs = getCodexLaunchArgs();
      const selectedArgs = ['--full-auto', '--dangerously-bypass-approvals-and-sandbox'];

      const result = checkExclusiveArgs(selectedArgs, availableArgs);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('不能同时选择');
    });

    it('应该允许非互斥参数组合', () => {
      const availableArgs = getCodexLaunchArgs();
      const selectedArgs = ['--full-auto', '--search'];

      const result = checkExclusiveArgs(selectedArgs, availableArgs);

      expect(result).toBeNull();
    });

    it('应该允许单个参数', () => {
      const availableArgs = getCodexLaunchArgs();
      const selectedArgs = ['--full-auto'];

      const result = checkExclusiveArgs(selectedArgs, availableArgs);

      expect(result).toBeNull();
    });

    it('应该处理空参数列表', () => {
      const availableArgs = getCodexLaunchArgs();
      const selectedArgs = [];

      const result = checkExclusiveArgs(selectedArgs, availableArgs);

      expect(result).toBeNull();
    });

    it('应该处理不在定义中的参数', () => {
      const availableArgs = getCodexLaunchArgs();
      const selectedArgs = ['--unknown-arg'];

      const result = checkExclusiveArgs(selectedArgs, availableArgs);

      expect(result).toBeNull();
    });

    it('应该返回可读的冲突消息', () => {
      const availableArgs = getCodexLaunchArgs();
      const selectedArgs = ['--full-auto', '--dangerously-bypass-approvals-and-sandbox'];

      const result = checkExclusiveArgs(selectedArgs, availableArgs);

      expect(result).toContain('全自动模式');
      expect(result).toContain('跳过审批和沙盒');
    });
  });

  describe('参数一致性', () => {
    it('Claude 和 Codex 参数不应该重复', () => {
      const claudeArgs = getClaudeLaunchArgs();
      const codexArgs = getCodexLaunchArgs();

      const claudeNames = new Set(claudeArgs.map(arg => arg.name));
      const codexNames = new Set(codexArgs.map(arg => arg.name));

      const intersection = [...claudeNames].filter(name => codexNames.has(name));

      // 允许一些合理的重复（如果有的话），但不应该有太多
      expect(intersection.length).toBeLessThan(3);
    });

    it('互斥参数应该是双向的', () => {
      const codexArgs = getCodexLaunchArgs();

      codexArgs.forEach(arg => {
        if (arg.exclusive && Array.isArray(arg.exclusive)) {
          arg.exclusive.forEach(exclusiveName => {
            const exclusiveArg = codexArgs.find(a => a.name === exclusiveName);

            if (exclusiveArg && exclusiveArg.exclusive) {
              expect(exclusiveArg.exclusive).toContain(arg.name);
            }
          });
        }
      });
    });
  });
});
