const { Logger } = require('./logger');

function trackProcessStart(child, onStarted) {
  let task = Promise.resolve();
  child.on('spawn', () => {
    if (!onStarted) return;
    task = Promise.resolve().then(onStarted).catch(error => {
      // 统计保存失败不应中断已经启动的交互进程。
      Logger.warning(`进程已启动，但记录供应商使用状态失败: ${error.message}`);
    });
  });
  return () => task;
}

module.exports = { trackProcessStart };
