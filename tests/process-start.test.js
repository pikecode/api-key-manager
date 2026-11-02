const { EventEmitter } = require('events');
const { trackProcessStart } = require('../src/utils/process-start');
const { Logger } = require('../src/utils/logger');

test('记录失败单独提示，不中断已创建的子进程', async () => {
  const warning = jest.spyOn(Logger, 'warning').mockImplementation(() => {});
  try {
    const child = new EventEmitter();
    const wait = trackProcessStart(child, async () => { throw new Error('配置被占用'); });
    child.emit('spawn');
    await expect(wait()).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('配置被占用'));
  } finally {
    warning.mockRestore();
  }
});

test('启动失败或取消时不记录状态，没有回调也可正常结束', async () => {
  const child = new EventEmitter();
  const callback = jest.fn();
  await trackProcessStart(child, callback)();
  expect(callback).not.toHaveBeenCalled();
  const noCallback = new EventEmitter();
  const wait = trackProcessStart(noCallback);
  noCallback.emit('spawn');
  await expect(wait()).resolves.toBeUndefined();
});
