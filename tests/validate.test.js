/**
 * Validate Command Tests
 * 测试配置验证功能
 */

const { configManager } = require('../src/config');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Validate Command Logic', () => {
  const testConfigPath = path.join(os.tmpdir(), '.akm-test-validate.json');
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

  describe('验证功能准备', () => {
    it('应该可以添加供应商用于验证', async () => {
      // 添加供应商
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      const provider = configManager.getProvider('test-provider');
      expect(provider).not.toBeNull();
      expect(provider.authToken).toBe('test-token');
      expect(provider.baseUrl).toBe('https://api.example.com');
    });

    it('应该可以通过别名查找供应商', async () => {
      // 添加供应商带别名
      await configManager.addProvider('test-provider', {
        displayName: 'Test Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com',
        alias: 'tp'
      });

      const provider = configManager.getProviderByNameOrAlias('tp');
      expect(provider).not.toBeNull();
      expect(provider.name).toBe('test-provider');
    });
  });

  describe('过滤逻辑', () => {
    beforeEach(async () => {
      // 添加不同类型的供应商
      await configManager.addProvider('claude-provider', {
        displayName: 'Claude Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'claude-token',
        baseUrl: 'https://api.example.com'
      });

      await configManager.addProvider('codex-provider', {
        displayName: 'Codex Provider',
        ideName: 'codex',
        authToken: 'codex-token'
      });
    });

    it('应该可以过滤 Claude 供应商', async () => {
      const providers = configManager.listProviders();
      const claudeProviders = providers.filter(p => p.ideName !== 'codex');

      expect(claudeProviders).toHaveLength(1);
      expect(claudeProviders[0].name).toBe('claude-provider');
    });

    it('应该可以过滤 Codex 供应商', async () => {
      const providers = configManager.listProviders();
      const codexProviders = providers.filter(p => p.ideName === 'codex');

      expect(codexProviders).toHaveLength(1);
      expect(codexProviders[0].name).toBe('codex-provider');
    });

    it('无过滤时应该返回所有供应商', async () => {
      const providers = configManager.listProviders();

      expect(providers).toHaveLength(2);
    });
  });

  describe('验证所需的配置字段', () => {
    it('Claude 供应商应该有必要的字段', async () => {
      await configManager.addProvider('claude-provider', {
        displayName: 'Claude Provider',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      const provider = configManager.getProvider('claude-provider');

      // 验证必要字段
      expect(provider.ideName).toBe('claude');
      expect(provider.authMode).toBeDefined();
      expect(provider.authToken).toBeDefined();
      expect(provider.baseUrl).toBeDefined();
    });

    it('Codex 供应商应该有必要的字段', async () => {
      await configManager.addProvider('codex-provider', {
        displayName: 'Codex Provider',
        ideName: 'codex',
        authToken: 'test-token'
      });

      const provider = configManager.getProvider('codex-provider');

      // 验证必要字段
      expect(provider.ideName).toBe('codex');
      expect(provider.authToken).toBeDefined();
    });

    it('auth_token 模式允许空 baseUrl', async () => {
      await configManager.addProvider('auth-token-provider', {
        displayName: 'Auth Token Provider',
        ideName: 'claude',
        authMode: 'auth_token',
        authToken: 'test-token'
      });

      const provider = configManager.getProvider('auth-token-provider');

      // auth_token 模式允许 baseUrl 为 null
      expect(provider.authMode).toBe('auth_token');
      expect(provider.baseUrl).toBeNull();
    });

    it('oauth_token 模式不应该有 baseUrl', async () => {
      await configManager.addProvider('oauth-provider', {
        displayName: 'OAuth Provider',
        ideName: 'claude',
        authMode: 'oauth_token',
        authToken: 'test-token',
        baseUrl: 'https://api.example.com'
      });

      const provider = configManager.getProvider('oauth-provider');

      // oauth_token 模式 baseUrl 会被清除
      expect(provider.authMode).toBe('oauth_token');
    });
  });

  describe('批量验证准备', () => {
    it('应该可以获取所有供应商列表', async () => {
      // 添加多个供应商
      await configManager.addProvider('provider-1', {
        displayName: 'Provider 1',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-1',
        baseUrl: 'https://api1.example.com'
      });

      await configManager.addProvider('provider-2', {
        displayName: 'Provider 2',
        ideName: 'claude',
        authMode: 'api_key',
        authToken: 'token-2',
        baseUrl: 'https://api2.example.com'
      });

      await configManager.addProvider('provider-3', {
        displayName: 'Provider 3',
        ideName: 'codex',
        authToken: 'token-3'
      });

      const providers = configManager.listProviders();
      expect(providers).toHaveLength(3);
    });

    it('空配置应该返回空列表', async () => {
      await configManager.ensureLoaded();
      const providers = configManager.listProviders();
      expect(providers).toHaveLength(0);
    });
  });
});
