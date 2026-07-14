require('./utils/inquirer-setup');
const { switchCommand } = require('./commands/switch');
const { Logger } = require('./utils/logger');

/**
 * 主入口函数
 * @param {string} providerName - 供应商名称
 * @param {Object} options - 选项
 * @param {boolean} options.quick - 快速启动
 * @param {boolean} options.noArgs - 不使用任何启动参数
 */
async function main(providerName, options = {}) {
  try {
    if (providerName) {
      // 直接切换到指定供应商
      await switchCommand(providerName, options);
    } else {
      // 显示供应商选择界面
      await switchCommand(null, options);
    }
  } catch (error) {
    Logger.fatal(`程序执行失败: ${error.message}`);
  }
}

module.exports = { main };
