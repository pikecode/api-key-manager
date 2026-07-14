const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { BackupManager } = require('../src/commands/backup');

function createProvider(overrides = {}) {
  return {
    name: 'primary',
    displayName: '主要供应商',
    ideName: 'claude',
    authMode: 'api_key',
    authToken: 'sk-ant-production-secret-123456',
    baseUrl: 'https://api.example.com',
    launchArgs: ['--continue'],
    lastUsedArgs: [],
    current: true,
    usageCount: 0,
    ...overrides
  };
}

describe('备份与导入导出命令', () => {
  let tempDir;
  let config;
  let fakeConfigManager;
  let manager;
  let logSpy;
  let errorSpy;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-backup-test-'));
    config = {
      version: '1.0.0',
      currentProvider: 'primary',
      providers: {
        primary: createProvider()
      }
    };
    fakeConfigManager = {
      config,
      configPath: path.join(tempDir, '.akm-config.json'),
      ensureLoaded: jest.fn().mockResolvedValue(),
      getProvider: jest.fn(name => config.providers[name]),
      save: jest.fn().mockResolvedValue(true)
    };
    manager = new BackupManager(fakeConfigManager);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    await fs.remove(tempDir);
  });

  test('默认导出彻底移除 Token 并设置安全权限', async () => {
    const outputPath = path.join(tempDir, 'export.json');

    await manager.export(outputPath);

    const exported = await fs.readJson(outputPath);
    expect(exported.secretsIncluded).toBe(false);
    expect(exported.providers.primary.authToken).toBeNull();
    if (process.platform !== 'win32') {
      const mode = (await fs.stat(outputPath)).mode & 0o777;
      expect(mode).toBe(0o600);
    }
  });

  test('只有显式 includeSecrets 才导出完整 Token', async () => {
    const outputPath = path.join(tempDir, 'full-export.json');

    await manager.export(outputPath, { includeSecrets: true });

    const exported = await fs.readJson(outputPath);
    expect(exported.secretsIncluded).toBe(true);
    expect(exported.providers.primary.authToken).toBe('sk-ant-production-secret-123456');
  });

  test('mask 参数与旧版本保持兼容并优先于 includeSecrets', async () => {
    const outputPath = path.join(tempDir, 'masked-export.json');

    await manager.export(outputPath, { includeSecrets: true, mask: true });

    const exported = await fs.readJson(outputPath);
    expect(exported.secretsIncluded).toBe(false);
    expect(exported.providers.primary.authToken).toBeNull();
  });

  test('导出 dry-run 不会写入文件并返回摘要', async () => {
    const outputPath = path.join(tempDir, 'preview.json');

    await manager.export(outputPath, { dryRun: true, includeSecrets: true });

    expect(await fs.pathExists(outputPath)).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"operation": "export"'));
  });

  test('默认导出的无密钥模板可以重新导入', async () => {
    const outputPath = path.join(tempDir, 'template.json');
    await manager.export(outputPath);
    config.providers = {};
    config.currentProvider = null;
    manager.backup = jest.fn().mockResolvedValue();

    await manager.import(outputPath);

    expect(config.providers.primary.authToken).toBeNull();
    expect(fakeConfigManager.save).toHaveBeenCalledTimes(1);
  });

  test('恶意导入在备份和保存前被拒绝', async () => {
    const inputPath = path.join(tempDir, 'malicious.json');
    await fs.writeJson(inputPath, {
      providers: {
        malicious: createProvider({
          name: 'malicious',
          launchArgs: ['--continue; echo injected']
        })
      }
    });
    manager.backup = jest.fn();

    await expect(manager.import(inputPath)).rejects.toThrow('不支持的启动参数');
    expect(manager.backup).not.toHaveBeenCalled();
    expect(fakeConfigManager.save).not.toHaveBeenCalled();
  });

  test('导入文件超过 5 MB 时在解析前拒绝', async () => {
    const inputPath = path.join(tempDir, 'oversized.json');
    await fs.writeFile(inputPath, Buffer.alloc(5 * 1024 * 1024 + 1, 0x20));
    manager.backup = jest.fn();

    await expect(manager.import(inputPath)).rejects.toThrow('5 MB');
    expect(manager.backup).not.toHaveBeenCalled();
    expect(fakeConfigManager.save).not.toHaveBeenCalled();
  });

  test('导入 dry-run 只返回冲突摘要，不备份或保存', async () => {
    const inputPath = path.join(tempDir, 'preview-import.json');
    await fs.writeJson(inputPath, {
      providers: {
        primary: createProvider()
      },
      currentProvider: 'primary'
    });
    manager.backup = jest.fn();

    await manager.import(inputPath, { dryRun: true });

    expect(manager.backup).not.toHaveBeenCalled();
    expect(fakeConfigManager.save).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"operation": "import"'));
  });

  test('合法配置完成标准化后再保存', async () => {
    const inputPath = path.join(tempDir, 'valid.json');
    config.providers = {};
    config.currentProvider = null;
    await fs.writeJson(inputPath, {
      version: '1.0',
      providers: {
        imported: createProvider({
          name: undefined,
          displayName: '导入供应商',
          current: undefined
        })
      },
      currentProvider: 'imported'
    });
    manager.backup = jest.fn().mockResolvedValue();

    await manager.import(inputPath);

    expect(config.providers.imported).toEqual(
      expect.objectContaining({
        name: 'imported',
        ideName: 'claude',
        importedAt: expect.any(String)
      })
    );
    expect(config.currentProvider).toBe('imported');
    expect(fakeConfigManager.save).toHaveBeenCalledTimes(1);
  });

  test('时间戳格式稳定', () => {
    expect(manager.getTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
  });

  test('同一时间戳内连续备份不会覆盖', async () => {
    await fs.writeJson(fakeConfigManager.configPath, config);
    manager.getTimestamp = jest.fn().mockReturnValue('2026-07-14T10-00-00-000Z');

    await manager.backup(tempDir);
    await manager.backup(tempDir);

    const backups = (await fs.readdir(tempDir)).filter(name => name.startsWith('akm-backup-'));
    expect(backups).toHaveLength(2);
  });

  test('恢复前拒绝结构无效的备份', async () => {
    const backupPath = path.join(tempDir, 'invalid-backup.json');
    await fs.writeJson(backupPath, { providers: [] });
    manager.backup = jest.fn();

    await expect(manager.restore(backupPath)).rejects.toThrow('配置 Schema 校验失败');
    expect(manager.backup).not.toHaveBeenCalled();
    expect(fakeConfigManager.save).not.toHaveBeenCalled();
  });

  test('合法备份通过 ConfigManager 原子保存', async () => {
    const backupPath = path.join(tempDir, 'valid-backup.json');
    const restoredConfig = {
      version: '1.0.0',
      currentProvider: 'restored',
      providers: {
        restored: createProvider({ name: 'restored', current: true })
      }
    };
    await fs.writeJson(backupPath, restoredConfig);
    manager.backup = jest.fn().mockResolvedValue();

    await manager.restore(backupPath);

    expect(manager.backup).toHaveBeenCalledTimes(1);
    expect(fakeConfigManager.save).toHaveBeenCalledWith(
      expect.objectContaining({ currentProvider: 'restored' })
    );
  });
});
