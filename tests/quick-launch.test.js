/**
 * Quick Launch Mode Tests
 * 测试快速启动模式功能
 */

const { configManager } = require('../src/config');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Quick Launch Mode', () => {
  const testConfigPath = path.join(os.tmpdir(), '.akm-test-quick-launch.json');
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

  describe('快速启动参数选择逻辑', () => {
    it('使用 --no-args 应该返回空数组', () => {
      const options = { noArgs: true };
      const provider = {
        lastUsedArgs: ['--search'],
        launchArgs: ['--continue']
      };

      // 模拟 quickLaunchProvider 中的参数选择逻辑
      let selectedArgs;
      if (options.noArgs) {
        selectedArgs = [];
      } else if (options.quick) {
        selectedArgs = Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0
          ? provider.lastUsedArgs
          : (Array.isArray(provider.launchArgs) ? provider.launchArgs : []);
      }

      expect(selectedArgs).toEqual([]);
    });

    it('使用 --quick 且有 lastUsedArgs 应该返回 lastUsedArgs', () => {
      const options = { quick: true };
      const provider = {
        lastUsedArgs: ['--search', '--full-auto'],
        launchArgs: ['--continue']
      };

      // 模拟参数选择逻辑
      let selectedArgs;
      if (options.noArgs) {
        selectedArgs = [];
      } else if (options.quick) {
        selectedArgs = Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0
          ? provider.lastUsedArgs
          : (Array.isArray(provider.launchArgs) ? provider.launchArgs : []);
      }

      expect(selectedArgs).toEqual(['--search', '--full-auto']);
    });

    it('使用 --quick 但 lastUsedArgs 为空应该返回 launchArgs', () => {
      const options = { quick: true };
      const provider = {
        lastUsedArgs: [],
        launchArgs: ['--continue', '--search']
      };

      // 模拟参数选择逻辑
      let selectedArgs;
      if (options.noArgs) {
        selectedArgs = [];
      } else if (options.quick) {
        selectedArgs = Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0
          ? provider.lastUsedArgs
          : (Array.isArray(provider.launchArgs) ? provider.launchArgs : []);
      }

      expect(selectedArgs).toEqual(['--continue', '--search']);
    });

    it('使用 --quick 但没有 lastUsedArgs 应该返回 launchArgs', () => {
      const options = { quick: true };
      const provider = {
        launchArgs: ['--continue']
      };

      // 模拟参数选择逻辑
      let selectedArgs;
      if (options.noArgs) {
        selectedArgs = [];
      } else if (options.quick) {
        selectedArgs = Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0
          ? provider.lastUsedArgs
          : (Array.isArray(provider.launchArgs) ? provider.launchArgs : []);
      }

      expect(selectedArgs).toEqual(['--continue']);
    });

    it('noArgs 优先级高于 quick', () => {
      const options = { noArgs: true, quick: true };
      const provider = {
        lastUsedArgs: ['--search'],
        launchArgs: ['--continue']
      };

      // 模拟参数选择逻辑
      let selectedArgs;
      if (options.noArgs) {
        selectedArgs = [];
      } else if (options.quick) {
        selectedArgs = Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0
          ? provider.lastUsedArgs
          : (Array.isArray(provider.launchArgs) ? provider.launchArgs : []);
      }

      expect(selectedArgs).toEqual([]);
    });
  });

  describe('配置持久化', () => {
    it('快速启动后应该更新 lastUsedArgs', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: ['--continue']
      });

      // 模拟快速启动，使用空参数
      await configManager.updateLastUsedArgs('test-provider', []);

      // 验证
      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsedArgs).toEqual([]);
    });

    it('快速启动应该增加使用次数', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: []
      });

      const initialCount = configManager.getProvider('test-provider').usageCount;

      // 模拟快速启动
      await configManager.updateLastUsedArgs('test-provider', ['--search']);

      // 验证使用次数增加
      const provider = configManager.getProvider('test-provider');
      expect(provider.usageCount).toBe(initialCount + 1);
    });

    it('快速启动应该更新最后使用时间', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        launchArgs: []
      });

      const initialTime = configManager.getProvider('test-provider').lastUsed;

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));

      // 模拟快速启动
      await configManager.updateLastUsedArgs('test-provider', ['--continue']);

      // 验证最后使用时间更新
      const provider = configManager.getProvider('test-provider');
      expect(provider.lastUsed).not.toBe(initialTime);
      expect(new Date(provider.lastUsed).getTime()).toBeGreaterThan(new Date(initialTime).getTime());
    });
  });
});
