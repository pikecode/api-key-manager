/**
 * Tests for summary printer
 */

const chalk = require('chalk');
const { printProviderSummary } = require('../../../src/commands/add/summaryPrinter');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  Logger: {
    success: jest.fn()
  }
}));

// Mock UIHelper
jest.mock('../../../src/utils/ui-helper', () => ({
  UIHelper: {
    createTitle: jest.fn((title) => `=== ${title} ===`),
    icons: { success: '✓' }
  }
}));

const { Logger } = require('../../../src/utils/logger');

describe('summaryPrinter', () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('printProviderSummary', () => {
    it('should print basic provider summary', async () => {
      const answers = {
        name: 'test-provider',
        ideName: 'claude',
        baseUrl: 'https://api.test.com',
        authToken: 'sk-test-123'
      };
      const launchArgs = [];
      const modelConfig = { primaryModel: null, smallFastModel: null };

      await printProviderSummary(null, answers, launchArgs, modelConfig);

      expect(Logger.success).toHaveBeenCalledWith('供应商添加完成');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should print provider with launch args', async () => {
      const answers = {
        name: 'test-provider',
        ideName: 'claude',
        baseUrl: 'https://api.test.com',
        authToken: 'sk-test-123'
      };
      const launchArgs = ['--arg1', '--arg2'];
      const modelConfig = { primaryModel: null, smallFastModel: null };

      await printProviderSummary(null, answers, launchArgs, modelConfig);

      expect(Logger.success).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls.map(call => call[0]);
      const hasLaunchArgs = calls.some(call =>
        typeof call === 'string' && call.includes('启动参数')
      );
      expect(hasLaunchArgs).toBe(true);
    });

    it('should print provider with model config', async () => {
      const answers = {
        name: 'test-provider',
        ideName: 'claude',
        baseUrl: 'https://api.test.com',
        authToken: 'sk-test-123'
      };
      const launchArgs = [];
      const modelConfig = {
        primaryModel: 'claude-3-opus',
        smallFastModel: 'claude-3-haiku'
      };

      await printProviderSummary(null, answers, launchArgs, modelConfig);

      expect(Logger.success).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls.map(call => call[0]);
      const hasModelConfig = calls.some(call =>
        typeof call === 'string' && call.includes('模型配置')
      );
      expect(hasModelConfig).toBe(true);
    });

    it('should handle missing optional fields', async () => {
      const answers = {
        name: 'minimal-provider',
        ideName: 'claude'
      };
      const launchArgs = [];
      const modelConfig = { primaryModel: null, smallFastModel: null };

      await printProviderSummary(null, answers, launchArgs, modelConfig);

      expect(Logger.success).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
