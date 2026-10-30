jest.mock('../src/config');

const { configManager } = require('../src/config');
const { EnvSwitcher } = require('../src/commands/switch');

describe('供应商查找入口', () => {
  let switcher;
  beforeEach(() => {
    jest.resetAllMocks();
    configManager.load.mockResolvedValue();
    switcher = new EnvSwitcher();
  });
  afterEach(() => switcher.destroy());

  test('按名称查找前加载配置，返回实际供应商', async () => {
    const provider = { name: 'work', ideName: 'codex' };
    configManager.getProvider.mockReturnValue(provider);
    await expect(switcher.validateProvider('work')).resolves.toBe(provider);
    expect(configManager.load).toHaveBeenCalledTimes(1);
    expect(configManager.getProvider).toHaveBeenCalledWith('work');
    expect(configManager.getProviderByNameOrAlias).not.toHaveBeenCalled();
  });

  test('名称不存在时使用别名查找', async () => {
    const provider = { name: 'work', alias: 'w' };
    configManager.getProviderByNameOrAlias.mockReturnValue(provider);
    await expect(switcher.validateProvider('w')).resolves.toBe(provider);
    expect(configManager.getProviderByNameOrAlias).toHaveBeenCalledWith('w');
  });

  test('名称和别名均不存在时返回可操作的错误', async () => {
    await expect(switcher.validateProvider('missing')).rejects.toThrow("供应商 'missing' 不存在");
  });

  test('配置加载失败时不使用旧供应商', async () => {
    configManager.load.mockRejectedValueOnce(new Error('读取失败'));
    await expect(switcher.validateProvider('work')).rejects.toThrow('读取失败');
    expect(configManager.getProvider).not.toHaveBeenCalled();
  });
});
