/**
 * Remember Args Tests
 * 测试智能记忆启动参数功能
 */

const { configManager } = require('../src/config');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Remember Launch Args', () => {
  const testConfigPath = path.join(os.tmpdir(), '.akm-test-remember-args.json');
  let originalConfigPath;

  beforeEach(async () => {
    // 保存原始配置路径
    originalConfigPath = configManager.configPath;
    // 使用测试配置路径
    configManager.configPath = testConfigPath;
    configManager.config = null;
    configManager.isLoaded = false;

    // 创建测试配置
    await fs.writeJson(testConfigPath, {
      version: '1.0.0',
      currentProvider: null,
      providers: {}
    });
  });

  afterEach(async () => {
    // 恢复原始配置路径
    configManager.configPath = originalConfigPath;
    configManager.config = null;
    configManager.isLoaded = false;

    // 清理测试文件
    await fs.remove(testConfigPath);
  });

  describe('updateLastUsedArgs', () => {
    it('应该保存上次使用的启动参数', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: ['--continue']
      });

      // 更新上次使用的参数
      await configManager.updateLastUsedArgs('test-provider', ['--continue', '--search']);

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsedArgs).toEqual(['--continue', '--search']);
    });

    it('应该更新使用次数', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: []
      });

      const initialCount = configManager.getProvider('test-provider').usageCount;

      // 更新上次使用的参数
      await configManager.updateLastUsedArgs('test-provider', ['--continue']);

      // 验证使用次数增加
      const provider = configManager.getProvider('test-provider');
      expect(provider.usageCount).toBe(initialCount + 1);
    });

    it('应该更新最后使用时间', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: []
      });

      const initialTime = configManager.getProvider('test-provider').lastUsed;

      // 等待一小段时间确保时间不同
      await new Promise(resolve => setTimeout(resolve, 10));

      // 更新上次使用的参数
      await configManager.updateLastUsedArgs('test-provider', ['--continue']);

      // 验证最后使用时间更新
      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsed).not.toBe(initialTime);
      expect(new Date(provider.lastUsed).getTime()).toBeGreaterThan(new Date(initialTime).getTime());
    });

    it('应该保存空参数数组', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: ['--continue']
      });

      // 更新为空参数
      await configManager.updateLastUsedArgs('test-provider', []);

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsedArgs).toEqual([]);
    });

    it('应该抛出错误当供应商不存在时', async () => {
      await expect(
        configManager.updateLastUsedArgs('non-existent', ['--continue'])
      ).rejects.toThrow('供应商 \'non-existent\' 不存在');
    });

    it('应该在多次更新时保持最新值', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: []
      });

      // 第一次更新
      await configManager.updateLastUsedArgs('test-provider', ['--continue']);
      expect(configManager.getProvider('test-provider').lastUsedArgs).toEqual(['--continue']);

      // 第二次更新
      await configManager.updateLastUsedArgs('test-provider', ['--search', '--full-auto']);
      expect(configManager.getProvider('test-provider').lastUsedArgs).toEqual(['--search', '--full-auto']);

      // 第三次更新
      await configManager.updateLastUsedArgs('test-provider', []);
      expect(configManager.getProvider('test-provider').lastUsedArgs).toEqual([]);
    });
  });

  describe('addProvider with lastUsedArgs', () => {
    it('应该保留现有的 lastUsedArgs', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: []
      });

      // 更新 lastUsedArgs
      await configManager.updateLastUsedArgs('test-provider', ['--continue']);

      // 再次添加（更新）供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Updated Provider',
        authToken: 'new-token'
      });

      // 验证 lastUsedArgs 保留
      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsedArgs).toEqual(['--continue']);
    });

    it('新添加的供应商 lastUsedArgs 应为 null', async () => {
      // 添加供应商
      await configManager.addProvider('new-provider', {
        displayName: 'New Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: ['--continue']
      });

      // 验证 lastUsedArgs 为 null
      const provider = configManager.getProvider('new-provider');
      expect(provider.lastUsedArgs).toBeNull();
    });
  });

  describe('lastUsedArgs persistence', () => {
    it('应该持久化 lastUsedArgs 到文件', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: []
      });

      // 更新 lastUsedArgs
      await configManager.updateLastUsedArgs('test-provider', ['--continue', '--search']);

      // 重新加载配置
      configManager.config = null;
      configManager.isLoaded = false;
      await configManager.load();

      // 验证持久化
      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsedArgs).toEqual(['--continue', '--search']);
    });
  });
});
