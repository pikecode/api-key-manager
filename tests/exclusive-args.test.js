describe('Exclusive Arguments', () => {
  // 复制 switch.js 中的 checkExclusiveArgs 逻辑
  function checkExclusiveArgs(selectedArgs, availableArgs) {
    if (!selectedArgs || selectedArgs.length < 2) {
      return null;
    }

    for (const argDef of availableArgs) {
      if (!argDef.exclusive || !selectedArgs.includes(argDef.name)) {
        continue;
      }

      for (const exclusiveArg of argDef.exclusive) {
        if (selectedArgs.includes(exclusiveArg)) {
          const arg1 = availableArgs.find(a => a.name === argDef.name);
          const arg2 = availableArgs.find(a => a.name === exclusiveArg);
          return `"${arg1?.label || argDef.name}" 和 "${arg2?.label || exclusiveArg}" 不能同时选择`;
        }
      }
    }

    return null;
  }

  describe('checkExclusiveArgs logic', () => {
    it('should return null when no exclusive args conflict', () => {
      const args = ['--full-auto'];
      const availableArgs = [
        {
          name: '--full-auto',
          label: '全自动模式',
          exclusive: ['--dangerously-bypass-approvals-and-sandbox']
        },
        {
          name: '--dangerously-bypass-approvals-and-sandbox',
          label: '跳过审批和沙盒',
          exclusive: ['--full-auto']
        }
      ];

      const error = checkExclusiveArgs(args, availableArgs);
      expect(error).toBeNull();
    });

    it('should detect conflict between exclusive args', () => {
      const args = ['--full-auto', '--dangerously-bypass-approvals-and-sandbox'];
      const availableArgs = [
        {
          name: '--full-auto',
          label: '全自动模式',
          exclusive: ['--dangerously-bypass-approvals-and-sandbox']
        },
        {
          name: '--dangerously-bypass-approvals-and-sandbox',
          label: '跳过审批和沙盒',
          exclusive: ['--full-auto']
        }
      ];

      const error = checkExclusiveArgs(args, availableArgs);
      expect(error).toContain('全自动模式');
      expect(error).toContain('跳过审批和沙盒');
      expect(error).toContain('不能同时选择');
    });

    it('should return null for single argument', () => {
      const args = ['--search'];
      const availableArgs = [
        {
          name: '--search',
          label: '启用网页搜索',
          description: '允许模型搜索网页'
        }
      ];

      const error = checkExclusiveArgs(args, availableArgs);
      expect(error).toBeNull();
    });

    it('should return null for empty args', () => {
      const error = checkExclusiveArgs([], []);
      expect(error).toBeNull();
    });

    it('should return null for null args', () => {
      const error = checkExclusiveArgs(null, []);
      expect(error).toBeNull();
    });

    it('should handle args without exclusive definition', () => {
      const args = ['--search', '--continue'];
      const availableArgs = [
        {
          name: '--search',
          label: '启用网页搜索'
        },
        {
          name: '--continue',
          label: '继续对话'
        }
      ];

      const error = checkExclusiveArgs(args, availableArgs);
      expect(error).toBeNull();
    });

    it('should work with multiple exclusive pairs', () => {
      const args = ['arg1', 'arg2'];
      const availableArgs = [
        {
          name: 'arg1',
          label: 'Argument 1',
          exclusive: ['arg2']
        },
        {
          name: 'arg2',
          label: 'Argument 2',
          exclusive: ['arg1']
        }
      ];

      const error = checkExclusiveArgs(args, availableArgs);
      expect(error).toBeTruthy();
      expect(error).toContain('不能同时选择');
    });
  });
});
