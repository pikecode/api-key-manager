const { ConfigManager } = require('../src/config');
const { validator } = require('../src/utils/validator');
const fs = require('fs-extra');

describe('ConfigManager', () => {
  let configManager;
  let testConfigPath;

  beforeEach(async () => {
    // 使用临时配置文件进行测试
    testConfigPath = './test-config.json';
    configManager = new ConfigManager();
    configManager.configPath = testConfigPath;

    // 初始化配置
    await configManager.load();
  });

  afterEach(async () => {
    // 清理测试文件
    const fs = require('fs-extra');
    if (await fs.pathExists(testConfigPath)) {
      await fs.remove(testConfigPath);
    }
  });

  describe('load', () => {
    test('should recover when config file contains non-object JSON value', async () => {
      const fs = require('fs-extra');
      await fs.writeFile(testConfigPath, 'null');

      configManager.isLoaded = false;
      configManager.config = null;
      configManager.lastModified = null;
      configManager.loadPromise = null;

      const config = await configManager.load(true);
      expect(config).toEqual(configManager.getDefaultConfig());

      const persisted = await fs.readJSON(testConfigPath);
      expect(persisted).toEqual(configManager.getDefaultConfig());
    });

    test('should recover when config file contains array JSON value', async () => {
      const fs = require('fs-extra');
      await fs.writeFile(testConfigPath, '[]');

      configManager.isLoaded = false;
      configManager.config = null;
      configManager.lastModified = null;
      configManager.loadPromise = null;

      const config = await configManager.load(true);
      expect(config).toEqual(configManager.getDefaultConfig());

      const persisted = await fs.readJSON(testConfigPath);
      expect(persisted).toEqual(configManager.getDefaultConfig());
    });

    test('结构错误的对象不会被加载或覆盖', async () => {
      const invalidConfig = {
        version: '1.0.0',
        currentProvider: 'broken',
        providers: {
          broken: {
            name: 'broken',
            ideName: 'claude',
            baseUrl: 12345
          }
        }
      };
      await fs.writeJson(testConfigPath, invalidConfig);
      configManager.isLoaded = false;
      configManager.config = null;

      await expect(configManager.load(true)).rejects.toThrow('配置 Schema 校验失败');
      expect(await fs.readJson(testConfigPath)).toEqual(invalidConfig);
    });

    test('currentProvider 必须指向存在的供应商', async () => {
      const invalidConfig = {
        version: '1.0.0',
        currentProvider: 'missing',
        providers: {}
      };
      await fs.writeJson(testConfigPath, invalidConfig);
      configManager.isLoaded = false;
      configManager.config = null;

      await expect(configManager.load(true)).rejects.toThrow('currentProvider');
      expect(await fs.readJson(testConfigPath)).toEqual(invalidConfig);
    });

    test('本地配置拒绝远程 HTTP 基础地址', async () => {
      const invalidConfig = {
        version: '1.0.0',
        currentProvider: 'insecure',
        providers: {
          insecure: {
            name: 'insecure',
            displayName: '不安全配置',
            ideName: 'claude',
            authMode: 'api_key',
            authToken: 'valid-token',
            baseUrl: 'http://api.example.com'
          }
        }
      };
      await fs.writeJson(testConfigPath, invalidConfig);
      configManager.isLoaded = false;
      configManager.config = null;

      await expect(configManager.load(true)).rejects.toThrow('HTTPS');
      expect(await fs.readJson(testConfigPath)).toEqual(invalidConfig);
    });
  });

  describe('save', () => {
    test('拒绝错误配置且保留磁盘上的最后有效版本', async () => {
      const before = await fs.readJson(testConfigPath);
      const invalidConfig = {
        version: '1.0.0',
        currentProvider: null,
        providers: []
      };

      await expect(configManager.save(invalidConfig)).rejects.toThrow('配置 Schema 校验失败');
      expect(await fs.readJson(testConfigPath)).toEqual(before);
    });

    test('检测到外部修改时拒绝覆盖最新配置', async () => {
      const externalConfig = {
        version: '1.0.0',
        currentProvider: null,
        providers: {}
      };
      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.writeJson(testConfigPath, externalConfig);

      const staleConfig = {
        ...externalConfig,
        version: 'stale-write'
      };

      await expect(configManager.save(staleConfig)).rejects.toThrow('其他进程修改');
      expect(await fs.readJson(testConfigPath)).toEqual(externalConfig);
    });
  });

  describe('addProvider', () => {
    test('should add provider successfully', async () => {
      const result = await configManager.addProvider('test', {
        displayName: 'Test Provider',
        baseUrl: 'https://test.com',
        authToken: 'test-token-123456'
      });

      expect(result).toBe(true);

      const config = await configManager.load();
      expect(config.providers.test).toBeDefined();
      expect(config.providers.test.name).toBe('test');
      expect(config.providers.test.displayName).toBe('Test Provider');
      expect(config.providers.test.baseUrl).toBe('https://test.com');
      expect(config.providers.test.authToken).toBe('test-token-123456');
    });

    test('should set first provider as current', async () => {
      await configManager.addProvider('test', {
        displayName: 'Test Provider',
        baseUrl: 'https://test.com',
        authToken: 'test-token-123456'
      });

      const config = await configManager.load();
      expect(config.providers.test.current).toBe(true);
      expect(config.currentProvider).toBe('test');
    });

    test('should preserve createdAt and current when overwriting provider', async () => {
      await configManager.addProvider('test', {
        displayName: 'Test Provider',
        baseUrl: 'https://test.com',
        authToken: 'test-token-123456'
      });

      const before = await configManager.load(true);
      const createdAt = before.providers.test.createdAt;
      const lastUsed = before.providers.test.lastUsed;

      await configManager.addProvider('test', {
        displayName: 'Updated Provider',
        baseUrl: 'https://test.com',
        authToken: 'new-token-123456',
        authMode: 'api_key'
      });

      const after = await configManager.load(true);
      expect(after.providers.test.createdAt).toBe(createdAt);
      expect(after.providers.test.lastUsed).toBe(lastUsed);
      expect(after.currentProvider).toBe('test');
      expect(after.providers.test.current).toBe(true);
    });

    test('should keep authMode null for codex provider', async () => {
      await configManager.addProvider('codex', {
        displayName: 'Codex CLI',
        ideName: 'codex',
        authMode: 'openai_api_key',
        authToken: 'sk-test-token-123456',
        baseUrl: null
      });

      const config = await configManager.load(true);
      expect(config.providers.codex.authMode).toBeNull();
    });
  });

  describe('removeProvider', () => {
    beforeEach(async () => {
      await configManager.addProvider('test', {
        displayName: 'Test Provider',
        baseUrl: 'https://test.com',
        authToken: 'test-token-123456'
      });
    });

    test('should remove provider successfully', async () => {
      const result = await configManager.removeProvider('test');

      expect(result).toBe(true);

      const config = await configManager.load();
      expect(config.providers.test).toBeUndefined();
    });

    test('should throw error for non-existent provider', async () => {
      await expect(configManager.removeProvider('non-existent')).rejects.toThrow(
        "供应商 'non-existent' 不存在"
      );
    });
  });

  describe('listProviders', () => {
    beforeEach(async () => {
      await configManager.addProvider('test1', {
        displayName: 'Test Provider 1',
        baseUrl: 'https://test1.com',
        authToken: 'test-token-1'
      });

      await configManager.addProvider('test2', {
        displayName: 'Test Provider 2',
        baseUrl: 'https://test2.com',
        authToken: 'test-token-2'
      });
    });

    test('should return all providers', () => {
      const providers = configManager.listProviders();

      expect(providers).toHaveLength(2);
      expect(providers[0].name).toBe('test1');
      expect(providers[1].name).toBe('test2');
    });
  });
});

describe('validator', () => {
  describe('validateName', () => {
    test('should accept valid names', () => {
      expect(validator.validateName('test')).toBeNull();
      expect(validator.validateName('test_provider')).toBeNull();
      expect(validator.validateName('test-provider')).toBeNull();
      expect(validator.validateName('test123')).toBeNull();
      expect(validator.validateName('Claude Official')).toBeNull();
      expect(validator.validateName('我的Claude供应商')).toBeNull();
      expect(validator.validateName('Provider@Company.com')).toBeNull();
      expect(validator.validateName('🚀 Fast Provider')).toBeNull();
    });

    test('should reject invalid names', () => {
      expect(validator.validateName('')).toBe('供应商名称不能为空');
      expect(validator.validateName('   ')).toBe('供应商名称不能为空或只包含空格');
      expect(validator.validateName('a'.repeat(101))).toBe('供应商名称不能超过100个字符');
      expect(validator.validateName('bad\x1bname')).toBe('供应商名称不能包含控制字符');
      expect(validator.validateName('__proto__')).toBe('供应商名称不能使用系统保留名称');
    });
  });

  describe('validateUrl', () => {
    test('should accept valid URLs', () => {
      expect(validator.validateUrl('https://example.com')).toBeNull();
      expect(validator.validateUrl('http://127.0.0.1:8080')).toBeNull();
      expect(validator.validateUrl('https://api.example.com/v1')).toBeNull();
    });

    test('should reject invalid URLs', () => {
      expect(validator.validateUrl('')).toBe('URL不能为空');
      expect(validator.validateUrl('not-a-url')).toBe('请输入有效的URL');
      expect(validator.validateUrl('ftp://example.com')).toBe('URL必须以http://或https://开头');
      expect(validator.validateUrl('http://example.com')).toContain('HTTPS');
    });
  });

  describe('validateToken', () => {
    test('should accept valid tokens', () => {
      expect(validator.validateToken('sk-ant-api03-real-valid-token-abcdefgh')).toBeNull();
      expect(validator.validateToken('valid-production-token-string')).toBeNull();
      expect(validator.validateToken('a'.repeat(5000))).toBeNull();
    });

    test('should reject invalid tokens', () => {
      expect(validator.validateToken('')).toBe('Token不能为空');
      expect(validator.validateToken('your-key-here')).toContain('占位符');
      expect(validator.validateToken('test-key-123456')).toContain('占位符');
      expect(validator.validateToken('api-key-here')).toContain('占位符');
    });
  });

  describe('validateModel', () => {
    test('should accept valid model names', () => {
      expect(validator.validateModel('kimi-k2-turbo-preview')).toBeNull();
      expect(validator.validateModel('gpt-4-turbo')).toBeNull();
      expect(validator.validateModel('claude-3-sonnet')).toBeNull();
      expect(validator.validateModel('')).toBeNull(); // 允许空值
      expect(validator.validateModel(null)).toBeNull(); // 允许null
      expect(validator.validateModel(undefined)).toBeNull(); // 允许undefined
    });

    test('should reject invalid model names', () => {
      expect(validator.validateModel('   ')).toBe('模型名称不能为空字符串');
      expect(validator.validateModel(123)).toBe('模型名称必须是字符串');
      expect(validator.validateModel('a'.repeat(101))).toBe('模型名称不能超过100个字符');
    });
  });
});
