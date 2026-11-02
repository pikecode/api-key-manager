const EventEmitter = require('events');

jest.mock('readline', () => ({
  emitKeypressEvents: jest.fn()
}));

const promptMockInstances = [];
jest.mock('inquirer', () => {
  const prompt = jest.fn(() => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const ui = { close: jest.fn() };
    promise.ui = ui;
    promptMockInstances.push({ promise, resolve, reject, ui });
    return promise;
  });
  prompt._instances = promptMockInstances;
  return { prompt };
});

jest.mock('../src/utils/logger', () => ({
  Logger: {
    error: jest.fn()
  }
}));

const { BaseCommand } = require('../src/commands/BaseCommand');
const inquirer = require('inquirer');

class FakeInput extends EventEmitter {
  constructor() {
    super();
    this.isTTY = true;
    this.isRaw = false;
  }

  setRawMode(value) {
    this.isRaw = value;
  }

  resume() {
    // noop for测试环境
  }
}

describe('BaseCommand ESC 集成', () => {
  let input;
  let baseCommand;
  let logSpy;
  let writeSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    input = new FakeInput();
    baseCommand = new BaseCommand({ input });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    promptMockInstances.length = 0;
    inquirer.prompt.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    logSpy.mockRestore();
    writeSpy.mockRestore();
  });

  test('按下ESC会打印提示并执行回调', async () => {
    const callback = jest.fn();
    baseCommand.createESCListener(callback, '返回测试');

    input.emit('data', '\u001b');
    jest.runAllTimers();
    await Promise.resolve();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('🔙 ESC键 - 返回测试'));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('嵌套错误处理保留最内层上下文且不重复输出', async () => {
    const { Logger } = require('../src/utils/logger');
    Logger.error.mockClear();
    const error = new Error('认证失败');
    await expect(baseCommand.handleError(error, '启动供应商')).rejects.toBe(error);
    await expect(baseCommand.handleError(error, '选择启动参数')).rejects.toBe(error);
    expect(error.message).toBe('启动供应商失败: 认证失败');
    expect(Logger.error).not.toHaveBeenCalled();
  });

  test('ESC 通知在返回下一菜单之前完成，不遗留延迟清屏', async () => {
    const callback = jest.fn();
    const first = baseCommand.promptWithESCAndDefault({ type: 'list', name: 'a', choices: ['a'] }, '返回', callback, null);
    input.emit('data', '\u001b');
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(promptMockInstances[0].ui.close).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toBeNull();
    const next = baseCommand.prompt({ type: 'list', name: 'b', choices: ['b'] });
    logSpy.mockClear();
    writeSpy.mockClear();
    jest.advanceTimersByTime(200);
    expect(promptMockInstances[1].ui.close).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();
    promptMockInstances[1].resolve({ b: 'b' });
    await next;
  });

  test('移除监听器后不触发回调', () => {
    const callback = jest.fn();
    const token = baseCommand.createESCListener(callback, '返回测试');

    baseCommand.removeESCListener(token);
    input.emit('data', '\u001b');
    jest.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });

  test('ESC触发时会关闭进行中的Prompt并返回取消错误', async () => {
    const promptPromise = baseCommand.prompt([{ type: 'input', name: 'demo' }]);
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    const [{ reject, ui }] = promptMockInstances;

    baseCommand.createESCListener(() => {}, '测试取消');
    input.emit('data', '\u001b');
    jest.runAllTimers();

    expect(ui.close).toHaveBeenCalledTimes(1);
    await expect(promptPromise).rejects.toMatchObject({ code: 'ESC_CANCELLED' });

    // 手动触发reject以防Promise未被处理
    reject(new Error('test cleanup'));
  });
});
