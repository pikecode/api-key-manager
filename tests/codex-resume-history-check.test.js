const { hasCodexSessionHistory, getCodexLaunchArgsWithHistory } = require('../src/utils/launch-args');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Session History Detection', () => {
  let originalCodexHome;

  beforeEach(() => {
    originalCodexHome = process.env.CODEX_HOME;
  });

  afterEach(() => {
    if (originalCodexHome) {
      process.env.CODEX_HOME = originalCodexHome;
    } else {
      delete process.env.CODEX_HOME;
    }
  });

  describe('Codex Session History', () => {
    it('应该在没有会话历史时返回 false', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      fs.ensureDirSync(tmpDir);

      try {
        process.env.CODEX_HOME = tmpDir;
        const hasHistory = await hasCodexSessionHistory();
        expect(hasHistory).toBe(false);
      } finally {
        fs.removeSync(tmpDir);
      }
    });

    it('应该在会话目录存在时返回 true', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      const sessionsDir = path.join(tmpDir, 'sessions', '2026', '08');
      fs.ensureDirSync(sessionsDir);

      try {
        process.env.CODEX_HOME = tmpDir;
        const hasHistory = await hasCodexSessionHistory();
        expect(hasHistory).toBe(true);
      } finally {
        fs.removeSync(tmpDir);
      }
    });

    it('应该在数据库文件存在且非空时返回 true', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      fs.ensureDirSync(tmpDir);
      const dbPath = path.join(tmpDir, 'thread_history_1.sqlite');
      fs.writeFileSync(dbPath, Buffer.alloc(1024));

      try {
        process.env.CODEX_HOME = tmpDir;
        const hasHistory = await hasCodexSessionHistory();
        expect(hasHistory).toBe(true);
      } finally {
        fs.removeSync(tmpDir);
      }
    });

    it('应该在 sessions 目录为空时返回 false', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      const sessionsDir = path.join(tmpDir, 'sessions');
      fs.ensureDirSync(sessionsDir);

      try {
        process.env.CODEX_HOME = tmpDir;
        const hasHistory = await hasCodexSessionHistory();
        expect(hasHistory).toBe(false);
      } finally {
        fs.removeSync(tmpDir);
      }
    });

    it('应该在数据库文件为空时返回 false', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      fs.ensureDirSync(tmpDir);
      const dbPath = path.join(tmpDir, 'thread_history_1.sqlite');
      fs.writeFileSync(dbPath, '');

      try {
        process.env.CODEX_HOME = tmpDir;
        const hasHistory = await hasCodexSessionHistory();
        expect(hasHistory).toBe(false);
      } finally {
        fs.removeSync(tmpDir);
      }
    });

    it('应该处理不存在的目录', async () => {
      const nonExistentDir = path.join(os.tmpdir(), `codex-nonexistent-${Date.now()}`);

      try {
        process.env.CODEX_HOME = nonExistentDir;
        const hasHistory = await hasCodexSessionHistory();
        expect(hasHistory).toBe(false);
      } finally {
        // 不需要清理，目录本来就不存在
      }
    });

    it('没有历史时应该禁用 resume 选项', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      fs.ensureDirSync(tmpDir);

      try {
        process.env.CODEX_HOME = tmpDir;
        const args = await getCodexLaunchArgsWithHistory(true);
        const resumeArg = args.find(arg => arg.name === 'resume');

        expect(resumeArg).toBeDefined();
        expect(resumeArg.disabled).toBe(true);
        expect(resumeArg.description).toContain('没有可用的会话历史');
      } finally {
        fs.removeSync(tmpDir);
      }
    });

    it('有历史时应该启用 resume 选项', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      const sessionsDir = path.join(tmpDir, 'sessions', '2026', '08');
      fs.ensureDirSync(sessionsDir);

      try {
        process.env.CODEX_HOME = tmpDir;
        const args = await getCodexLaunchArgsWithHistory(true);
        const resumeArg = args.find(arg => arg.name === 'resume');

        expect(resumeArg).toBeDefined();
        expect(resumeArg.disabled).toBeFalsy();
        expect(resumeArg.description).toBe('恢复之前的会话');
      } finally {
        fs.removeSync(tmpDir);
      }
    });

    it('禁用过滤时应该返回原始参数', async () => {
      const tmpDir = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
      fs.ensureDirSync(tmpDir);

      try {
        process.env.CODEX_HOME = tmpDir;
        const args = await getCodexLaunchArgsWithHistory(false);
        const resumeArg = args.find(arg => arg.name === 'resume');

        expect(resumeArg).toBeDefined();
        expect(resumeArg.disabled).toBeFalsy();
        expect(resumeArg.description).toBe('恢复之前的会话');
      } finally {
        fs.removeSync(tmpDir);
      }
    });
  });

  describe('Claude Code Session History', () => {
    it('Claude Code 参数应该始终可用 - 让用户自由选择', () => {
      // Claude Code 的 --continue 选项不再被禁用
      // 用户可以自由选择是否继续上次对话
      // 如果没有可用的会话，Claude Code 会自己处理
      const { getClaudeLaunchArgs } = require('../src/utils/launch-args');
      const args = getClaudeLaunchArgs();
      const continueArg = args.find(arg => arg.name === '--continue');

      expect(continueArg).toBeDefined();
      expect(continueArg.disabled).toBeFalsy();
      expect(continueArg.description).toBe('恢复上次的对话记录');
    });
  });
});

describe('Launch Args Utilities', () => {
  describe('validateLaunchArgs', () => {
    const { validateLaunchArgs } = require('../src/utils/launch-args');

    it('应该允许有效的 Codex 参数', () => {
      const result = validateLaunchArgs('codex', ['resume']);
      expect(result).toBeNull();
    });

    it('应该拒绝无效的参数类型', () => {
      const result = validateLaunchArgs('codex', 'not-an-array');
      expect(result).toContain('必须是字符串数组');
    });

    it('应该拒绝不支持的参数', () => {
      const result = validateLaunchArgs('codex', ['--invalid-arg']);
      expect(result).toContain('不支持的启动参数');
    });

    it('应该允许有效的 Claude 参数', () => {
      const result = validateLaunchArgs('claude', ['--continue']);
      expect(result).toBeNull();
    });

    it('应该检查互斥参数冲突', () => {
      const result = validateLaunchArgs('codex', ['--full-auto', '--dangerously-bypass-approvals-and-sandbox']);
      expect(result).toContain('不能同时选择');
    });
  });

  describe('checkExclusiveArgs', () => {
    const { checkExclusiveArgs, getCodexLaunchArgs } = require('../src/utils/launch-args');

    it('应该在没有冲突时返回 null', () => {
      const args = getCodexLaunchArgs();
      const result = checkExclusiveArgs(['resume'], args);
      expect(result).toBeNull();
    });

    it('应该检测互斥参数冲突', () => {
      const args = getCodexLaunchArgs();
      const result = checkExclusiveArgs(['--full-auto', '--dangerously-bypass-approvals-and-sandbox'], args);
      expect(result).not.toBeNull();
      expect(result).toContain('不能同时选择');
    });

    it('参数少于 2 个时应该返回 null', () => {
      const args = getCodexLaunchArgs();
      const result = checkExclusiveArgs(['resume'], args);
      expect(result).toBeNull();
    });
  });

  describe('assertSupportedLaunchArgs', () => {
    const { assertSupportedLaunchArgs } = require('../src/utils/launch-args');

    it('应该允许有效的参数', () => {
      expect(() => {
        assertSupportedLaunchArgs('codex', ['resume']);
      }).not.toThrow();
    });

    it('应该抛出错误对于无效的参数', () => {
      expect(() => {
        assertSupportedLaunchArgs('codex', ['--invalid']);
      }).toThrow();
    });
  });

  describe('assertSafeImportLaunchArgs', () => {
    const { assertSafeImportLaunchArgs } = require('../src/utils/launch-args');

    it('应该允许安全的参数', () => {
      expect(() => {
        assertSafeImportLaunchArgs('codex', ['resume']);
      }).not.toThrow();
    });

    it('应该拒绝危险的参数', () => {
      expect(() => {
        assertSafeImportLaunchArgs('codex', ['--dangerously-bypass-approvals-and-sandbox']);
      }).toThrow('不能包含最高权限启动参数');
    });

    it('应该拒绝无效的参数', () => {
      expect(() => {
        assertSafeImportLaunchArgs('codex', ['--invalid']);
      }).toThrow('不支持的启动参数');
    });

    it('应该拒绝多个危险参数', () => {
      expect(() => {
        assertSafeImportLaunchArgs('codex', [
          '--dangerously-bypass-approvals-and-sandbox'
        ]);
      }).toThrow('不能包含最高权限启动参数');
    });

    it('Claude 危险参数也应该被拒绝', () => {
      expect(() => {
        assertSafeImportLaunchArgs('claude', ['--dangerously-skip-permissions']);
      }).toThrow('不能包含最高权限启动参数');
    });
  });

  describe('Launch Args Factory Functions', () => {
    const { getLaunchArgs, getCodexLaunchArgs, getClaudeLaunchArgs } = require('../src/utils/launch-args');

    it('getLaunchArgs 应该为 codex 返回 codex 参数', () => {
      const args = getLaunchArgs('codex');
      expect(args.some(arg => arg.name === 'resume')).toBe(true);
      expect(args.some(arg => arg.name === '--continue')).toBe(false);
    });

    it('getLaunchArgs 应该为 claude 返回 claude 参数', () => {
      const args = getLaunchArgs('claude');
      expect(args.some(arg => arg.name === '--continue')).toBe(true);
      expect(args.some(arg => arg.name === 'resume')).toBe(false);
    });

    it('getLaunchArgs 应该为非 codex 返回 claude 参数', () => {
      const args = getLaunchArgs('other');
      expect(args.some(arg => arg.name === '--continue')).toBe(true);
    });

    it('getCodexLaunchArgs 应该返回所有 codex 参数', () => {
      const args = getCodexLaunchArgs();
      expect(args.length).toBeGreaterThan(0);
      expect(args.some(arg => arg.name === 'resume')).toBe(true);
    });

    it('getClaudeLaunchArgs 应该返回所有 claude 参数', () => {
      const args = getClaudeLaunchArgs();
      expect(args.length).toBeGreaterThan(0);
      expect(args.some(arg => arg.name === '--continue')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    const { getCodexLaunchArgs, getClaudeLaunchArgs, checkExclusiveArgs } = require('../src/utils/launch-args');

    it('getCodexLaunchArgs 应该返回新对象而不是引用', () => {
      const args1 = getCodexLaunchArgs();
      const args2 = getCodexLaunchArgs();
      expect(args1).not.toBe(args2);
      expect(args1[0]).not.toBe(args2[0]);
    });

    it('getClaudeLaunchArgs 应该返回新对象而不是引用', () => {
      const args1 = getClaudeLaunchArgs();
      const args2 = getClaudeLaunchArgs();
      expect(args1).not.toBe(args2);
      expect(args1[0]).not.toBe(args2[0]);
    });

    it('checkExclusiveArgs 处理空数组', () => {
      const args = getCodexLaunchArgs();
      const result = checkExclusiveArgs([], args);
      expect(result).toBeNull();
    });

    it('checkExclusiveArgs 处理未定义的数组', () => {
      const args = getCodexLaunchArgs();
      const result = checkExclusiveArgs(undefined, args);
      expect(result).toBeNull();
    });

    it('checkExclusiveArgs 处理 null 数组', () => {
      const args = getCodexLaunchArgs();
      const result = checkExclusiveArgs(null, args);
      expect(result).toBeNull();
    });

    it('checkExclusiveArgs 处理有 exclusive 属性的参数', () => {
      const args = getCodexLaunchArgs();
      // 测试一个有 exclusive 属性的参数单独使用
      const result = checkExclusiveArgs(['--full-auto'], args);
      expect(result).toBeNull();
    });
  });
});
