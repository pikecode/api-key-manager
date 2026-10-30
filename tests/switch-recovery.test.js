jest.mock('../src/config');
jest.mock('../src/utils/ui-helper');
jest.mock('../src/utils/provider-status-checker');
jest.mock('../src/commands/switch/provider-launcher');
jest.mock('../src/commands/switch/claude-settings-compatibility');

const { EnvSwitcher } = require('../src/commands/switch');
const { launchProviderProcess, markProviderAsCurrent } = require('../src/commands/switch/provider-launcher');
const { ensureClaudeSettingsCompatibility } = require('../src/commands/switch/claude-settings-compatibility');

describe('实际启动流程的恢复行为', () => {
  let switcher;
  const inputTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const outputTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const provider = { name: 'official', ideName: 'codex', authMode: 'chatgpt_login' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    switcher = new EnvSwitcher();
    jest.spyOn(switcher, 'clearScreen').mockImplementation(() => {});
    jest.spyOn(switcher, 'prompt').mockResolvedValue({ startNew: false });
    markProviderAsCurrent.mockImplementation(async (_manager, selected) => selected);
    ensureClaudeSettingsCompatibility.mockResolvedValue(true);
    launchProviderProcess.mockResolvedValue();
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  });

  afterEach(() => {
    switcher.destroy();
    jest.restoreAllMocks();
    if (inputTTY) Object.defineProperty(process.stdin, 'isTTY', inputTTY);
    else delete process.stdin.isTTY;
    if (outputTTY) Object.defineProperty(process.stdout, 'isTTY', outputTTY);
    else delete process.stdout.isTTY;
  });

  test('强制登录后的已知恢复失败只重试一次，不再清理认证', async () => {
    switcher.forceRelogin = true;
    launchProviderProcess.mockRejectedValueOnce(Object.assign(new Error('历史被锁定'), { code: 'SESSION_LOCKED' }));
    await switcher.launchProvider(provider, ['resume', '--search']);
    expect(launchProviderProcess).toHaveBeenNthCalledWith(1, provider, ['resume', '--search'], { forceRelogin: true });
    expect(launchProviderProcess).toHaveBeenNthCalledWith(2, provider, ['--search'], { forceRelogin: false });
    expect(switcher.prompt).not.toHaveBeenCalled();
  });

  test.each(['codex', 'claude'])('未知的 %s 恢复错误默认不重试', async ideName => {
    launchProviderProcess.mockRejectedValueOnce(Object.assign(new Error('401 Unauthorized'), { code: 'RESUME_FAILED' }));
    await expect(switcher.launchProvider({ ...provider, ideName }, [ideName === 'codex' ? 'resume' : '--continue']))
      .rejects.toThrow('401 Unauthorized');
    expect(launchProviderProcess).toHaveBeenCalledTimes(1);
    expect(switcher.prompt).toHaveBeenCalledWith(expect.objectContaining({ default: false }));
  });

  test('用户选择新会话后去掉恢复参数', async () => {
    switcher.prompt.mockResolvedValue({ startNew: true });
    launchProviderProcess.mockRejectedValueOnce(Object.assign(new Error('未知错误'), { code: 'RESUME_FAILED' }));
    await switcher.launchProvider(provider, ['resume']);
    expect(launchProviderProcess).toHaveBeenNthCalledWith(2, provider, [], { forceRelogin: false });
  });

  test('非交互环境保留原错误，不询问或重试', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    launchProviderProcess.mockRejectedValueOnce(Object.assign(new Error('未知错误'), { code: 'RESUME_FAILED' }));
    await expect(switcher.launchProvider(provider, ['resume'])).rejects.toThrow('未知错误');
    expect(switcher.prompt).not.toHaveBeenCalled();
    expect(launchProviderProcess).toHaveBeenCalledTimes(1);
  });
});
