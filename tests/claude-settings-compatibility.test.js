/**
 * Claude Settings Compatibility Tests
 * 测试 Claude settings 环境变量冲突处理
 */

jest.mock('../src/utils/claude-settings', () => ({
  findSettingsConflict: jest.fn(),
  backupSettingsFile: jest.fn(),
  clearConflictKeys: jest.fn(),
  saveSettingsFile: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  Logger: {
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn()
  }
}));

jest.mock('../src/utils/ui-helper', () => ({
  UIHelper: {
    icons: {
      warning: '⚠️',
      info: 'ℹ️'
    },
    createTitle: jest.fn((title) => title),
    createCard: jest.fn((title, content) => `${title}:${content}`),
    createTooltip: jest.fn((text) => text)
  }
}));

const {
  ensureClaudeSettingsCompatibility
} = require('../src/commands/switch/claude-settings-compatibility');
const {
  findSettingsConflict,
  backupSettingsFile,
  clearConflictKeys,
  saveSettingsFile
} = require('../src/utils/claude-settings');
const { Logger } = require('../src/utils/logger');

describe('ensureClaudeSettingsCompatibility', () => {
  let command;
  const provider = {
    name: 'test-provider',
    displayName: 'Test Provider'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    command = {
      clearScreen: jest.fn(),
      prompt: jest.fn(),
      isEscCancelled: jest.fn((error) => error && error.code === 'ESC_CANCELLED')
    };
  });

  it('没有冲突时应该直接继续', async () => {
    findSettingsConflict.mockResolvedValue(null);

    const result = await ensureClaudeSettingsCompatibility(command, provider);

    expect(result).toBe(true);
    expect(command.clearScreen).not.toHaveBeenCalled();
    expect(command.prompt).not.toHaveBeenCalled();
  });

  it('用户选择忽略冲突时应该继续', async () => {
    findSettingsConflict.mockResolvedValue({
      filePath: '/tmp/.claude/settings.json',
      settings: { env: { ANTHROPIC_API_KEY: 'old-key' } },
      keys: ['ANTHROPIC_API_KEY']
    });
    command.prompt.mockResolvedValueOnce({ action: 'ignore' });

    const result = await ensureClaudeSettingsCompatibility(command, provider);

    expect(result).toBe(true);
    expect(Logger.warning).toHaveBeenCalledWith(expect.stringContaining('已忽略'));
    expect(backupSettingsFile).not.toHaveBeenCalled();
  });

  it('用户选择取消时应该停止启动', async () => {
    findSettingsConflict.mockResolvedValue({
      filePath: '/tmp/.claude/settings.json',
      settings: { env: { ANTHROPIC_API_KEY: 'old-key' } },
      keys: ['ANTHROPIC_API_KEY']
    });
    command.prompt.mockResolvedValueOnce({ action: 'cancel' });

    const result = await ensureClaudeSettingsCompatibility(command, provider);

    expect(result).toBe(false);
    expect(Logger.info).toHaveBeenCalledWith('已取消启动');
  });

  it('用户确认修复时应该备份并清空冲突变量', async () => {
    const conflict = {
      filePath: '/tmp/.claude/settings.json',
      settings: {
        env: {
          ANTHROPIC_API_KEY: 'old-key',
          OTHER_ENV: 'keep'
        }
      },
      keys: ['ANTHROPIC_API_KEY']
    };
    const updatedSettings = {
      env: {
        OTHER_ENV: 'keep'
      }
    };

    findSettingsConflict.mockResolvedValue(conflict);
    command.prompt
      .mockResolvedValueOnce({ action: 'fix' })
      .mockResolvedValueOnce({ confirmed: true });
    backupSettingsFile.mockResolvedValue('/tmp/.claude/settings.backup.json');
    clearConflictKeys.mockReturnValue(updatedSettings);

    const result = await ensureClaudeSettingsCompatibility(command, provider);

    expect(result).toBe(true);
    expect(backupSettingsFile).toHaveBeenCalledWith(conflict.filePath);
    expect(clearConflictKeys).toHaveBeenCalledWith(
      {
        ...conflict.settings,
        env: { ...conflict.settings.env }
      },
      conflict.keys
    );
    expect(saveSettingsFile).toHaveBeenCalledWith(conflict.filePath, updatedSettings);
    expect(Logger.success).toHaveBeenCalledWith(expect.stringContaining('已将'));
  });

  it('修复二次确认被拒绝时应该停止启动', async () => {
    findSettingsConflict.mockResolvedValue({
      filePath: '/tmp/.claude/settings.json',
      settings: { env: { ANTHROPIC_API_KEY: 'old-key' } },
      keys: ['ANTHROPIC_API_KEY']
    });
    command.prompt
      .mockResolvedValueOnce({ action: 'fix' })
      .mockResolvedValueOnce({ confirmed: false });

    const result = await ensureClaudeSettingsCompatibility(command, provider);

    expect(result).toBe(false);
    expect(Logger.info).toHaveBeenCalledWith('已取消启动');
    expect(backupSettingsFile).not.toHaveBeenCalled();
  });
});
