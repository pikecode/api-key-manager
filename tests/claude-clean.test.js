/**
 * Claude Clean Command Tests
 */

const path = require('path');

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  pathExistsSync: jest.fn().mockReturnValue(true),
  readJson: jest.fn(),
  writeJson: jest.fn().mockResolvedValue(undefined),
  copy: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/utils/logger', () => ({
  Logger: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

const fs = require('fs-extra');
const { ClaudeCleaner } = require('../src/commands/claude-clean');
const { Logger } = require('../src/utils/logger');

const mockData = {
  numStartups: 100,
  cachedStatsigGates: { a: 1, b: 2 },
  cachedDynamicConfigs: { c: 3 },
  cachedGrowthBookFeatures: { d: 4, e: 5 },
  clientDataCache: { f: 6 },
  projects: {
    'Users/test/project1': {
      lastAPIDuration: 1000,
      lastCost: 0.05,
      lastModelUsage: { 'claude-3': 10 },
      reactVulnerabilityCache: { detected: false },
      exampleFiles: ['a.js', 'b.js'],
      hasTrustDialogAccepted: true
    },
    'Users/test/project2': {
      lastDuration: 500,
      lastSessionMetrics: { fps: 60 },
      hasTrustDialogAccepted: false
    }
  }
};

describe('ClaudeCleaner', () => {
  let cleaner;

  beforeEach(() => {
    jest.resetAllMocks();
    cleaner = new ClaudeCleaner();
    cleaner.prompt = jest.fn();
    cleaner.isEscCancelled = jest.fn().mockReturnValue(false);
    cleaner.destroy = jest.fn();
    fs.pathExists.mockResolvedValue(true);
    fs.readJson.mockResolvedValue(JSON.parse(JSON.stringify(mockData)));
  });

  describe('analyze', () => {
    test('文件不存在时应该提示警告', async () => {
      fs.pathExists.mockResolvedValue(false);
      await cleaner.analyze();
      expect(Logger.warning).toHaveBeenCalledWith(expect.stringContaining('不存在'));
    });

    test('应该正常分析文件', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cleaner.analyze();
      expect(consoleSpy).toHaveBeenCalled();
      expect(fs.readJson).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('clean', () => {
    test('文件不存在时应该提示警告', async () => {
      fs.pathExists.mockResolvedValue(false);
      await cleaner.clean();
      expect(Logger.warning).toHaveBeenCalledWith(expect.stringContaining('不存在'));
    });

    test('用户取消时不应该写入文件', async () => {
      cleaner.prompt
        .mockResolvedValueOnce({ mode: 'conservative' })
        .mockResolvedValueOnce({ ok: false });
      await cleaner.clean();
      expect(fs.writeJson).not.toHaveBeenCalled();
    });

    test('保守清理应该只删除全局缓存字段', async () => {
      cleaner.prompt
        .mockResolvedValueOnce({ mode: 'conservative' })
        .mockResolvedValueOnce({ ok: true });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cleaner.clean();
      consoleSpy.mockRestore();

      expect(fs.copy).toHaveBeenCalled(); // 备份
      expect(fs.writeJson).toHaveBeenCalled();

      const written = fs.writeJson.mock.calls[0][1];
      expect(written.cachedStatsigGates).toBeUndefined();
      expect(written.cachedDynamicConfigs).toBeUndefined();
      expect(written.cachedGrowthBookFeatures).toBeUndefined();
      expect(written.clientDataCache).toBeUndefined();
      // 项目统计应该保留
      expect(written.projects['Users/test/project1'].lastAPIDuration).toBeDefined();
      expect(written.numStartups).toBe(100); // 非缓存字段保留
    });

    test('中等清理应该删除全局缓存和项目统计', async () => {
      cleaner.prompt
        .mockResolvedValueOnce({ mode: 'moderate' })
        .mockResolvedValueOnce({ ok: true });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cleaner.clean();
      consoleSpy.mockRestore();

      const written = fs.writeJson.mock.calls[0][1];
      expect(written.cachedStatsigGates).toBeUndefined();
      expect(written.projects['Users/test/project1'].lastAPIDuration).toBeUndefined();
      expect(written.projects['Users/test/project1'].lastModelUsage).toBeUndefined();
      // 项目缓存应该保留
      expect(written.projects['Users/test/project1'].reactVulnerabilityCache).toBeDefined();
      expect(written.projects['Users/test/project1'].hasTrustDialogAccepted).toBe(true);
    });

    test('激进清理应该删除所有可清理内容', async () => {
      fs.pathExistsSync.mockImplementation((p) => p === '/Users/test/project1');
      cleaner.prompt
        .mockResolvedValueOnce({ mode: 'aggressive' })
        .mockResolvedValueOnce({ ok: true });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cleaner.clean();
      consoleSpy.mockRestore();

      const written = fs.writeJson.mock.calls[0][1];
      expect(written.cachedStatsigGates).toBeUndefined();
      expect(written.projects['Users/test/project1'].lastAPIDuration).toBeUndefined();
      expect(written.projects['Users/test/project1'].reactVulnerabilityCache).toBeUndefined();
      expect(written.projects['Users/test/project1'].exampleFiles).toBeUndefined();
      // project2 路径不存在，应该被删除
      expect(written.projects['Users/test/project2']).toBeUndefined();
      // project1 路径存在，应该保留
      expect(written.projects['Users/test/project1']).toBeDefined();
    });

    test('清理后应该显示节省空间', async () => {
      cleaner.prompt
        .mockResolvedValueOnce({ mode: 'conservative' })
        .mockResolvedValueOnce({ ok: true });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cleaner.clean();

      expect(Logger.success).toHaveBeenCalledWith('清理完成！');
      consoleSpy.mockRestore();
    });
  });

  describe('_formatSize', () => {
    test('小于 1KB 显示 bytes', () => {
      expect(cleaner._formatSize(500)).toBe('500 B');
    });

    test('大于 1KB 显示 KB', () => {
      expect(cleaner._formatSize(2048)).toBe('2.0 KB');
    });
  });
});
