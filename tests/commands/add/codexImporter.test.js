/**
 * Tests for Codex configuration importer
 */

const fs = require('fs-extra');
const path = require('path');
const { importCodexConfig } = require('../../../src/commands/add/codexImporter');

// Mock codex-files module
jest.mock('../../../src/utils/codex-files', () => ({
  readCodexFiles: jest.fn(),
  extractBaseUrlFromConfigToml: jest.fn()
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  Logger: {
    success: jest.fn(),
    warning: jest.fn()
  }
}));

const { readCodexFiles, extractBaseUrlFromConfigToml } = require('../../../src/utils/codex-files');
const { Logger } = require('../../../src/utils/logger');

describe('codexImporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importCodexConfig', () => {
    it('should return null when auth.json is missing', async () => {
      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: null,
        configToml: null
      });

      const result = await importCodexConfig();

      expect(result).toBeNull();
      expect(Logger.warning).not.toHaveBeenCalled();
    });

    it('should return null when API key is missing from auth.json', async () => {
      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: JSON.stringify({ some_other_key: 'value' }),
        configToml: null
      });

      const result = await importCodexConfig();

      expect(result).toBeNull();
    });

    it('should extract API key from OPENAI_API_KEY field', async () => {
      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: JSON.stringify({ OPENAI_API_KEY: 'sk-test-key-123' }),
        configToml: null
      });

      const result = await importCodexConfig();

      expect(result).toEqual({
        apiKey: 'sk-test-key-123',
        baseUrl: null
      });
      expect(Logger.success).toHaveBeenCalledWith('成功从 /home/user/.codex 导入配置');
    });

    it('should extract API key from openai_api_key field', async () => {
      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: JSON.stringify({ openai_api_key: 'sk-test-key-456' }),
        configToml: null
      });

      const result = await importCodexConfig();

      expect(result).toEqual({
        apiKey: 'sk-test-key-456',
        baseUrl: null
      });
    });

    it('should extract API key from api_key field', async () => {
      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: JSON.stringify({ api_key: 'sk-test-key-789' }),
        configToml: null
      });

      const result = await importCodexConfig();

      expect(result).toEqual({
        apiKey: 'sk-test-key-789',
        baseUrl: null
      });
    });

    it('should extract base URL from config.toml using extractBaseUrlFromConfigToml', async () => {
      const configToml = 'model_provider = "akm"\n[model_providers.akm]\nbase_url = "https://api.example.com/v1"';

      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: JSON.stringify({ OPENAI_API_KEY: 'sk-test-key' }),
        configToml
      });

      extractBaseUrlFromConfigToml.mockReturnValue('https://api.example.com/v1');

      const result = await importCodexConfig();

      expect(result).toEqual({
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.example.com/v1'
      });
      expect(extractBaseUrlFromConfigToml).toHaveBeenCalledWith(configToml);
    });

    it('should fall back to legacy api_base_url format when extractBaseUrlFromConfigToml returns null', async () => {
      const configToml = 'api_base_url = "https://legacy.api.com"\nmodel = "gpt-4"';

      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: JSON.stringify({ OPENAI_API_KEY: 'sk-test-key' }),
        configToml
      });

      extractBaseUrlFromConfigToml.mockReturnValue(null);

      const result = await importCodexConfig();

      expect(result).toEqual({
        apiKey: 'sk-test-key',
        baseUrl: 'https://legacy.api.com'
      });
    });

    it('should handle errors gracefully and return null', async () => {
      readCodexFiles.mockRejectedValue(new Error('File read error'));

      const result = await importCodexConfig();

      expect(result).toBeNull();
      expect(Logger.warning).toHaveBeenCalledWith('导入配置失败: File read error');
    });

    it('should handle JSON parse errors', async () => {
      readCodexFiles.mockResolvedValue({
        codexHome: '/home/user/.codex',
        authJson: 'invalid json{',
        configToml: null
      });

      const result = await importCodexConfig();

      expect(result).toBeNull();
      expect(Logger.warning).toHaveBeenCalled();
    });
  });
});
