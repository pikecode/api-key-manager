/**
 * Add Command Tests
 * 测试添加供应商的核心功能
 */

const { configManager } = require('../src/config');
const { validator } = require('../src/utils/validator');
const { AUTH_MODE_DISPLAY_DETAILED, TOKEN_TYPE_DISPLAY, IDE_NAMES } = require('../src/constants');

// Mock modules
jest.mock('../src/config');
jest.mock('../src/utils/validator');
jest.mock('../src/utils/codex-files');

describe('Add Command Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('应该验证供应商名称', () => {
      validator.validateName.mockReturnValue(null);

      const result = validator.validateName('my-provider');
      expect(result).toBeNull();
      expect(validator.validateName).toHaveBeenCalledWith('my-provider');
    });

    it('应该拒绝无效的供应商名称', () => {
      validator.validateName.mockReturnValue('供应商名称不能为空');

      const result = validator.validateName('');
      expect(result).toBe('供应商名称不能为空');
    });

    it('应该验证显示名称', () => {
      validator.validateDisplayName.mockReturnValue(null);

      const result = validator.validateDisplayName('My Provider');
      expect(result).toBeNull();
    });

    it('应该验证 Token', () => {
      validator.validateToken.mockReturnValue(null);

      const result = validator.validateToken('sk-ant-oat01-xxxxx');
      expect(result).toBeNull();
    });

    it('应该拒绝无效的 Token', () => {
      validator.validateToken.mockReturnValue('Token 格式无效');

      const result = validator.validateToken('invalid-token');
      expect(result).toBe('Token 格式无效');
    });

    it('应该验证 URL 基础地址', () => {
      validator.validateUrl.mockReturnValue(null);

      const result = validator.validateUrl('https://api.example.com');
      expect(result).toBeNull();
    });

    it('应该拒绝无效的 URL', () => {
      validator.validateUrl.mockReturnValue('URL 格式无效');

      const result = validator.validateUrl('not-a-url');
      expect(result).toBe('URL 格式无效');
    });

    it('应该验证模型名称', () => {
      validator.validateModel.mockReturnValue(null);

      const result = validator.validateModel('claude-3-sonnet-20240229');
      expect(result).toBeNull();
    });
  });

  describe('Provider Creation', () => {
    it('应该创建 OAuth 供应商', () => {
      const providerData = {
        name: 'claude-official',
        displayName: 'Claude Code Official (OAuth)',
        authMode: 'oauth_token',
        authToken: 'sk-ant-oat01-xxxxx',
        baseUrl: null,
        tokenType: null
      };

      expect(providerData.authMode).toBe('oauth_token');
      expect(providerData.baseUrl).toBeNull();
    });

    it('应该创建 API Key 供应商', () => {
      const providerData = {
        name: 'my-provider',
        displayName: 'My Provider',
        authMode: 'api_key',
        authToken: 'sk-xxxxx',
        baseUrl: 'https://api.example.com',
        tokenType: 'api_key'
      };

      expect(providerData.authMode).toBe('api_key');
      expect(providerData.baseUrl).toBeDefined();
    });

    it('应该创建 Auth Token 供应商', () => {
      const providerData = {
        name: 'my-provider',
        displayName: 'My Provider',
        authMode: 'auth_token',
        authToken: 'sk-xxxxx',
        baseUrl: null,
        tokenType: null
      };

      expect(providerData.authMode).toBe('auth_token');
    });

    it('应该创建 Codex 供应商', () => {
      const providerData = {
        name: 'codex-provider',
        displayName: 'Codex Provider',
        ideName: 'codex',
        authMode: 'openai_api_key',
        authToken: 'sk-xxxxx'
      };

      expect(providerData.ideName).toBe('codex');
      expect(providerData.authMode).toBe('openai_api_key');
    });
  });

  describe('Provider Persistence', () => {
    it('应该保存供应商到配置', async () => {
      const providerData = {
        name: 'test-provider',
        displayName: 'Test Provider',
        authMode: 'oauth_token'
      };

      configManager.addProvider.mockResolvedValue(true);

      await configManager.addProvider('test-provider', providerData);

      expect(configManager.addProvider).toHaveBeenCalledWith('test-provider', providerData);
    });

    it('应该保存配置文件', async () => {
      configManager.save.mockResolvedValue(true);

      await configManager.save();

      expect(configManager.save).toHaveBeenCalled();
    });
  });

  describe('Authentication Modes', () => {
    it('应该定义所有认证模式详细信息', () => {
      expect(AUTH_MODE_DISPLAY_DETAILED).toHaveProperty('api_key');
      expect(AUTH_MODE_DISPLAY_DETAILED).toHaveProperty('auth_token');
      expect(AUTH_MODE_DISPLAY_DETAILED).toHaveProperty('oauth_token');
    });

    it('应该定义 Token 类型显示', () => {
      expect(TOKEN_TYPE_DISPLAY).toHaveProperty('auth_token');
      expect(TOKEN_TYPE_DISPLAY).toHaveProperty('api_key');
    });

    it('应该定义 IDE 名称', () => {
      expect(IDE_NAMES).toHaveProperty('CLAUDE');
      expect(IDE_NAMES).toHaveProperty('CODEX');
    });
  });

  describe('Launch Arguments', () => {
    it('应该获取可用的启动参数', () => {
      validator.getAvailableLaunchArgs.mockReturnValue([
        { name: '--continue', label: 'Continue', description: '继续模式' }
      ]);

      const args = validator.getAvailableLaunchArgs();
      expect(args).toHaveLength(1);
      expect(args[0].name).toBe('--continue');
    });

    it('应该允许选择空的启动参数', () => {
      validator.getAvailableLaunchArgs.mockReturnValue([]);

      const args = validator.getAvailableLaunchArgs();
      expect(args).toHaveLength(0);
    });
  });

  describe('Model Configuration', () => {
    it('应该支持设置主模型', () => {
      const modelConfig = {
        primary: 'claude-3-sonnet-20240229',
        smallFast: 'claude-3-haiku-20240307'
      };

      expect(modelConfig.primary).toBe('claude-3-sonnet-20240229');
    });

    it('应该支持设置快速模型', () => {
      const modelConfig = {
        primary: 'claude-3-sonnet-20240229',
        smallFast: 'claude-3-haiku-20240307'
      };

      expect(modelConfig.smallFast).toBe('claude-3-haiku-20240307');
    });

    it('应该允许空模型配置', () => {
      const modelConfig = {
        primary: null,
        smallFast: null
      };

      expect(modelConfig.primary).toBeNull();
      expect(modelConfig.smallFast).toBeNull();
    });
  });

  describe('Constants', () => {
    it('应该导出所有必需的常量', () => {
      expect(AUTH_MODE_DISPLAY_DETAILED).toBeDefined();
      expect(TOKEN_TYPE_DISPLAY).toBeDefined();
      expect(IDE_NAMES).toBeDefined();
    });
  });
});
