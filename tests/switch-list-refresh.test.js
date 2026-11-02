const Choices = require('inquirer/lib/objects/choices');
const { EnvSwitcher } = require('../src/commands/switch');

describe('列表状态刷新', () => {
  let switcher;
  let prompt;
  beforeEach(() => {
    jest.useFakeTimers();
    switcher = new EnvSwitcher();
    switcher.currentPromptContext = 'manage';
    switcher.filteredProviders = [{ name: 'a' }, { name: 'b' }];
    switcher.activeStatusRefresh = Symbol('refresh');
    prompt = { opt: { choices: new Choices([{ name: 'a', value: 'a' }, { name: 'b', value: 'b' }]) }, selected: 1, render: jest.fn() };
    switcher.activePrompt = { promise: { ui: { activePrompt: prompt } } };
    jest.spyOn(switcher, 'createProviderChoices').mockImplementation(providers => providers.map(p => ({ name: `${p.name} ready`, value: p.name })));
  });
  afterEach(() => {
    switcher._cancelStatusRefresh();
    switcher.activePrompt = null;
    switcher.destroy();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  test('更新状态保持顺序和选中值，相同内容不重绘', () => {
    switcher._refreshPromptChoices(prompt, switcher.filteredProviders, {});
    expect(prompt.opt.choices.realChoices.map(c => c.value)).toEqual(['a', 'b']);
    expect(prompt.opt.choices.getChoice(prompt.selected).value).toBe('b');
    switcher._refreshPromptChoices(prompt, switcher.filteredProviders, {});
    expect(prompt.render).toHaveBeenCalledTimes(1);
  });
  test('连续回调不会无限延后刷新，读取最新状态', () => {
    const refresh = jest.spyOn(switcher, '_refreshPromptChoices');
    switcher._applyIncrementalStatus('a', {}, switcher.activeStatusRefresh);
    jest.advanceTimersByTime(60);
    switcher.latestStatusMap = { b: { status: 'ready' } };
    switcher._applyIncrementalStatus('b', {}, switcher.activeStatusRefresh);
    jest.advanceTimersByTime(20);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(prompt, switcher.filteredProviders, switcher.latestStatusMap);
  });
  test('检测失败后清除待刷新任务，保留错误提示', () => {
    switcher._applyIncrementalStatus('a', {}, switcher.activeStatusRefresh);
    switcher._applyStatusUpdate(switcher.filteredProviders, {}, new Error('offline'), switcher.activeStatusRefresh);
    jest.advanceTimersByTime(100);
    expect(prompt.render).toHaveBeenCalledTimes(1);
    expect(prompt.opt.message).toContain('状态检测失败');
  });
  test.each(['answered', 'replaced', 'cancelled'])('离开旧提示后不刷新：%s', state => {
    switcher._applyIncrementalStatus('a', {}, switcher.activeStatusRefresh);
    if (state === 'answered') prompt.status = 'answered';
    if (state === 'replaced') switcher.activePrompt.promise.ui.activePrompt = { ...prompt };
    if (state === 'cancelled') switcher._cancelStatusRefresh();
    jest.advanceTimersByTime(100);
    expect(prompt.render).not.toHaveBeenCalled();
  });
});
