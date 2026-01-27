/**
 * Alias System Tests
 * 测试别名系统功能
 */

const { configManager } = require('../src/config');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Alias System', () => {
  const testConfigPath = path.join(os.tmpdir(), '.akm-test-alias.json');
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

  describe('addProvider with alias', () => {
    it('应该保存供应商别名', async () => {
      // 添加供应商带别名
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'tp'
      });

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.alias).toBe('tp');
    });

    it('应该允许空别名', async () => {
      // 添加供应商不带别名
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token'
      });

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.alias).toBeNull();
    });

    it('应该规范化空字符串别名为 null', async () => {
      // 添加供应商带空字符串别名
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: '   '
      });

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.alias).toBeNull();
    });

    it('更新供应商时应该保留别名', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'tp'
      });

      // 更新供应商（不指定 alias）
      await configManager.addProvider('test-provider', {
        displayName: 'Updated Provider',
        authToken: 'new-token'
      });

      // 验证别名保留
      const provider = configManager.getProvider('test-provider');
      expect(provider.alias).toBe('tp');
    });

    it('应该允许更新别名', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'tp'
      });

      // 更新别名
      await configManager.addProvider('test-provider', {
        alias: 'test'
      });

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.alias).toBe('test');
    });

    it('应该允许删除别名', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'tp'
      });

      // 删除别名
      await configManager.addProvider('test-provider', {
        alias: null
      });

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.alias).toBeNull();
    });
  });

  describe('getProviderByNameOrAlias', () => {
    it('应该通过名称查找供应商', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'tp'
      });

      // 通过名称查找
      const provider = configManager.getProviderByNameOrAlias('test-provider');
      expect(provider).not.toBeNull();
      expect(provider.name).toBe('test-provider');
    });

    it('应该通过别名查找供应商', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'tp'
      });

      // 通过别名查找
      const provider = configManager.getProviderByNameOrAlias('tp');
      expect(provider).not.toBeNull();
      expect(provider.name).toBe('test-provider');
    });

    it('别名查找应该不区分大小写', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'MyAlias'
      });

      // 通过不同大小写的别名查找
      const provider1 = configManager.getProviderByNameOrAlias('myalias');
      const provider2 = configManager.getProviderByNameOrAlias('MYALIAS');
      const provider3 = configManager.getProviderByNameOrAlias('MyAlias');

      expect(provider1).not.toBeNull();
      expect(provider1.name).toBe('test-provider');
      expect(provider2).not.toBeNull();
      expect(provider2.name).toBe('test-provider');
      expect(provider3).not.toBeNull();
      expect(provider3.name).toBe('test-provider');
    });

    it('找不到时应该返回 null', async () => {
      // 确保配置已加载
      await configManager.ensureLoaded();

      // 尝试查找不存在的供应商
      const provider = configManager.getProviderByNameOrAlias('non-existent');
      expect(provider).toBeNull();
    });

    it('没有别名时应该正常工作', async () => {
      // 添加供应商不带别名
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token'
      });

      // 通过名称查找
      const provider1 = configManager.getProviderByNameOrAlias('test-provider');
      expect(provider1).not.toBeNull();

      // 尝试通过别名查找（应该返回 null）
      const provider2 = configManager.getProviderByNameOrAlias('some-alias');
      expect(provider2).toBeNull();
    });
  });

  describe('别名持久化', () => {
    it('应该持久化别名到文件', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        alias: 'tp'
      });

      // 重新加载配置
      configManager.config = null;
      configManager.isLoaded = false;
      await configManager.load();

      // 验证持久化
      const provider = configManager.getProvider('test-provider');
      expect(provider.alias).toBe('tp');
    });
  });

  describe('多供应商别名', () => {
    it('应该支持多个供应商有不同的别名', async () => {
      // 添加多个供应商
      await configManager.addProvider('provider-1', {
        displayName: 'Provider 1',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-1',
        alias: 'p1'
      });

      await configManager.addProvider('provider-2', {
        displayName: 'Provider 2',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-2',
        alias: 'p2'
      });

      await configManager.addProvider('provider-3', {
        displayName: 'Provider 3',
        ideName: 'codex',
        authToken: 'token-3',
        alias: 'p3'
      });

      // 通过别名查找
      const p1 = configManager.getProviderByNameOrAlias('p1');
      const p2 = configManager.getProviderByNameOrAlias('p2');
      const p3 = configManager.getProviderByNameOrAlias('p3');

      expect(p1.name).toBe('provider-1');
      expect(p2.name).toBe('provider-2');
      expect(p3.name).toBe('provider-3');
    });
  });
});
