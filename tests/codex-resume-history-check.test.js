const { hasCodexSessionHistory, getCodexLaunchArgsWithHistory } = require('../src/utils/launch-args');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Codex Resume History Check', () => {
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
    fs.writeFileSync(dbPath, Buffer.alloc(1024)); // 创建 1KB 的文件

    try {
      process.env.CODEX_HOME = tmpDir;
      const hasHistory = await hasCodexSessionHistory();
      expect(hasHistory).toBe(true);
    } finally {
      fs.removeSync(tmpDir);
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
