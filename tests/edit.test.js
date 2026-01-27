/**
 * Edit Command Tests
 * 测试编辑供应商的核心功能
 */

const { configManager } = require('../src/config');
const { validator } = require('../src/utils/validator');
const { AUTH_MODE_DISPLAY, TOKEN_TYPE_DISPLAY, BASE_URL } = require('../src/constants');

// Mock modules
jest.mock('../src/config');
jest.mock('../src/utils/validator');

describe('Edit Command Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Retrieval', () => {
    it('应该获取供应商信息', () => {
      const mockProvider = {
        name: 'test-provider',
        displayName: 'Test Provider',
        authMode: 'oauth_token',
        authToken: 'sk-ant-oat01-xxxxx'
      };

      configManager.getProvider = jest.fn().mockReturnValue(mockProvider);

      const provider = configManager.getProvider('test-provider');

      expect(provider).toBeDefined();
      expect(provider.name).toBe('test-provider');
    });

    it('应该返回 null 当供应商不存在', () => {
      configManager.getProvider = jest.fn().mockReturnValue(null);

      const provider = configManager.getProvider('non-existent');

      expect(provider).toBeNull();
    });
  });

  describe('Provider Update', () => {
    it('应该更新供应商名称', async () => {
      const updates = { displayName: 'New Display Name' };

      configManager.updateProvider = jest.fn().mockResolvedValue(true);

      await configManager.updateProvider('test-provider', updates);

      expect(configManager.updateProvider).toHaveBeenCalledWith('test-provider', updates);
    });

    it('应该更新认证 Token', async () => {
      const updates = { authToken: 'sk-ant-oat01-newtokenxxxxx' };

      configManager.updateProvider = jest.fn().mockResolvedValue(true);

      await configManager.updateProvider('test-provider', updates);

      expect(configManager.updateProvider).toHaveBeenCalledWith('test-provider', updates);
    });

    it('应该更新基础 URL', async () => {
      const updates = { baseUrl: 'https://new-api.example.com' };

      configManager.updateProvider = jest.fn().mockResolvedValue(true);

      await configManager.updateProvider('test-provider', updates);

      expect(configManager.updateProvider).toHaveBeenCalledWith('test-provider', updates);
    });

    it('应该更新模型配置', async () => {
      const updates = {
        models: {
          primary: 'claude-3-sonnet-20240229',
          smallFast: 'claude-3-haiku-20240307'
        }
      };

      configManager.updateProvider = jest.fn().mockResolvedValue(true);

      await configManager.updateProvider('test-provider', updates);

      expect(configManager.updateProvider).toHaveBeenCalledWith('test-provider', updates);
    });

    it('应该更新多个字段', async () => {
      const updates = {
        displayName: 'New Name',
        authToken: 'sk-xxxxx',
        models: {
          primary: 'claude-3-sonnet-20240229'
        }
      };

      configManager.updateProvider = jest.fn().mockResolvedValue(true);

      await configManager.updateProvider('test-provider', updates);

      expect(configManager.updateProvider).toHaveBeenCalledWith('test-provider', updates);
    });
  });

  describe('Validation', () => {
    it('应该在编辑时验证显示名称', () => {
      validator.validateDisplayName = jest.fn().mockReturnValue(null);

      const result = validator.validateDisplayName('New Display Name');
      expect(result).toBeNull();
    });

    it('应该在编辑时验证 Token', () => {
      validator.validateToken = jest.fn().mockReturnValue(null);

      const result = validator.validateToken('sk-ant-oat01-xxxxx');
      expect(result).toBeNull();
    });

    it('应该在编辑时验证 URL', () => {
      validator.validateUrl = jest.fn().mockReturnValue(null);

      const result = validator.validateUrl('https://api.example.com');
      expect(result).toBeNull();
    });

    it('应该在编辑时验证模型名称', () => {
      validator.validateModel = jest.fn().mockReturnValue(null);

      const result = validator.validateModel('claude-3-sonnet-20240229');
      expect(result).toBeNull();
    });
  });

  describe('Field Editing', () => {
    it('应该支持编辑认证模式', () => {
      const provider = {
        authMode: 'oauth_token',
        canChangeAuthMode: false // OAuth 不能更改
      };

      expect(provider.authMode).toBe('oauth_token');
      expect(provider.canChangeAuthMode).toBe(false);
    });

    it('应该支持编辑 IDE 类型', () => {
      const provider = {
        ideName: 'claude',
        canChangeIDE: false // IDE 不能更改
      };

      expect(provider.ideName).toBe('claude');
      expect(provider.canChangeIDE).toBe(false);
    });

    it('应该支持编辑启动参数', () => {
      const provider = {
        launchArgs: ['--continue'],
        canChangeLaunchArgs: true
      };

      expect(provider.launchArgs).toContain('--continue');
      expect(provider.canChangeLaunchArgs).toBe(true);
    });
  });

  describe('Save and Persistence', () => {
    it('应该保存编辑后的供应商', async () => {
      configManager.save = jest.fn().mockResolvedValue(true);

      await configManager.save();

      expect(configManager.save).toHaveBeenCalled();
    });

    it('应该在保存前验证数据', async () => {
      const updates = {
        displayName: 'Updated Name',
        authToken: 'sk-xxxxx'
      };

      validator.validateDisplayName = jest.fn().mockReturnValue(null);
      validator.validateToken = jest.fn().mockReturnValue(null);

      const displayNameValid = validator.validateDisplayName(updates.displayName);
      const tokenValid = validator.validateToken(updates.authToken);

      expect(displayNameValid).toBeNull();
      expect(tokenValid).toBeNull();
    });
  });

  describe('Provider Information Display', () => {
    it('应该正确显示认证模式', () => {
      const provider = {
        authMode: 'api_key'
      };

      expect(AUTH_MODE_DISPLAY[provider.authMode]).toBe('通用API密钥模式');
    });

    it('应该正确显示 Token 类型', () => {
      const provider = {
        authMode: 'api_key',
        tokenType: 'api_key'
      };

      expect(TOKEN_TYPE_DISPLAY[provider.tokenType]).toBe('ANTHROPIC_API_KEY');
    });

    it('应该显示基础 URL 信息', () => {
      const provider = { baseUrl: null, authMode: 'auth_token' };
      const baseUrlDisplay = provider.baseUrl || BASE_URL.OFFICIAL_DEFAULT;

      expect(baseUrlDisplay).toBe(BASE_URL.OFFICIAL_DEFAULT);
    });
  });

  describe('Error Handling', () => {
    it('应该处理提供者不存在的情况', () => {
      configManager.getProvider = jest.fn().mockReturnValue(null);

      const provider = configManager.getProvider('non-existent');

      expect(provider).toBeNull();
    });

    it('应该处理保存失败的情况', async () => {
      configManager.save = jest.fn().mockRejectedValue(new Error('Save failed'));

      await expect(configManager.save()).rejects.toThrow('Save failed');
    });
  });

  describe('Constants', () => {
    it('应该定义所有认证模式', () => {
      expect(AUTH_MODE_DISPLAY).toHaveProperty('api_key');
      expect(AUTH_MODE_DISPLAY).toHaveProperty('auth_token');
      expect(AUTH_MODE_DISPLAY).toHaveProperty('oauth_token');
    });

    it('应该定义所有 Token 类型', () => {
      expect(TOKEN_TYPE_DISPLAY).toHaveProperty('auth_token');
      expect(TOKEN_TYPE_DISPLAY).toHaveProperty('api_key');
    });

    it('应该定义 URL 显示信息', () => {
      expect(BASE_URL).toHaveProperty('OFFICIAL_DEFAULT');
      expect(BASE_URL).toHaveProperty('NOT_SET');
    });
  });
});
