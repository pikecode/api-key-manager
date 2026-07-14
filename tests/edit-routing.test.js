const canonical = require('../src/commands/switch');
const legacy = require('../src/commands/edit');

describe('统一编辑命令路由', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('旧模块路径转发到统一 editCommand', () => {
    expect(legacy.editCommand).toBe(canonical.editCommand);
  });

  test('未指定供应商时进入管理列表', async () => {
    const manageSpy = jest
      .spyOn(canonical.EnvSwitcher.prototype, 'showManageMenu')
      .mockResolvedValue();

    await canonical.editCommand();

    expect(manageSpy).toHaveBeenCalledTimes(1);
  });

  test('指定供应商时直接进入统一编辑器', async () => {
    const editSpy = jest
      .spyOn(canonical.EnvSwitcher.prototype, 'editProvider')
      .mockResolvedValue();

    await canonical.editCommand('provider-name');

    expect(editSpy).toHaveBeenCalledWith('provider-name');
  });
});
