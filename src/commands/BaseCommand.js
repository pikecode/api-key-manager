const chalk = require('chalk');
const inquirer = require('inquirer');
const { EscNavigationManager } = require('../navigation/EscNavigationManager');
const { Logger } = require('../utils/logger');

// 允许在 allowEmpty 启用时提交空字符串，而不是回退到默认值
const resolveInputPrompt = () => {
  const promptFromModule = inquirer.prompt && inquirer.prompt.prompts && inquirer.prompt.prompts.input;
  if (promptFromModule) {
    return promptFromModule;
  }
  const promptFromRoot = inquirer.prompts && inquirer.prompts.input;
  if (promptFromRoot) {
    return promptFromRoot;
  }
  try {
    return require('inquirer/lib/prompts/input');
  } catch {
    return null;
  }
};

const InputPrompt = resolveInputPrompt();
if (InputPrompt && !InputPrompt.prototype.__allowEmptyPatched) {
  const originalFilterInput = InputPrompt.prototype.filterInput;
  const originalRun = InputPrompt.prototype._run;

  InputPrompt.prototype.filterInput = function patchedFilterInput(input) {
    if (this.opt && this.opt.allowEmpty && this.status === 'touched' && input === '') {
      return '';
    }
    return originalFilterInput.call(this, input);
  };

  InputPrompt.prototype._run = function patchedRun(cb) {
    const result = originalRun.call(this, cb);

    if (!this.__defaultPrefilled && this.opt && this.opt.prefillDefault) {
      const defaultValue = this.opt.default;
      if (defaultValue !== undefined && defaultValue !== null) {
        const text = String(defaultValue);
        if (text.length > 0) {
          this.__defaultPrefilled = true;
          this.status = 'touched';
          this.rl.write(text);
          this.rl.cursor = text.length;
          this.render();
        }
      }
    }

    return result;
  };

  InputPrompt.prototype.__allowEmptyPatched = true;
}

const ESC_CANCELLED_ERROR_CODE = 'ESC_CANCELLED';

/**
 * 命令基类
 * 提供所有命令的通用功能，包括 ESC 键处理、提示交互等
 */
class BaseCommand {
  /**
   * 创建命令实例
   * @param {Object} [options={}] - 配置选项
   * @param {NodeJS.ReadStream} [options.input] - 输入流
   */
  constructor(options = {}) {
    const input = options.input || process.stdin;
    /** @type {EscNavigationManager} ESC 键管理器 */
    this.escManager = new EscNavigationManager(input);
    /** @type {Object|null} 当前活动的提示 */
    this.activePrompt = null;
  }

  /**
   * 检查错误是否为 ESC 取消错误
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否为 ESC 取消
   */
  isEscCancelled(error) {
    return Boolean(error && error.code === ESC_CANCELLED_ERROR_CODE);
  }

  /**
   * 显示交互式提示
   * @param {Array|Object} questions - Inquirer 问题配置
   * @returns {Promise<Object>} 用户答案
   */
  async prompt(questions) {
    const promptPromise = inquirer.prompt(questions);
    let settled = false;

    return await new Promise((resolve, reject) => {
      const cleanup = () => {
        if (this.activePrompt && this.activePrompt.promise === promptPromise) {
          this.activePrompt = null;
        }
      };

      const cancel = () => {
        if (settled) {
          return;
        }
        settled = true;
        if (promptPromise.ui && typeof promptPromise.ui.close === 'function') {
          promptPromise.ui.close();
        }
        cleanup();
        const error = new Error('操作已通过 ESC 取消');
        error.code = ESC_CANCELLED_ERROR_CODE;
        reject(error);
      };

      this.activePrompt = {
        promise: promptPromise,
        cancel
      };

      promptPromise
        .then((answers) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          resolve(answers);
        })
        .catch((error) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          reject(error);
        });
    });
  }

  cancelActivePrompt() {
    if (this.activePrompt && typeof this.activePrompt.cancel === 'function') {
      this.activePrompt.cancel();
    }
  }

  createESCListener(callback, returnMessage = '返回上级菜单', options = {}) {
    if (!this.escManager || !this.escManager.isSupported()) {
      return null;
    }

    const handler = this.escManager.register({
      once: options.once !== false,
      postDelay: typeof options.postDelay === 'number' ? options.postDelay : undefined,
      onTrigger: () => {
        this.cancelActivePrompt();
        this.clearScreen();
        if (returnMessage) {
          console.log(chalk.yellow(`🔙 ESC键 - ${returnMessage}`));
          console.log();
        }

        if (typeof callback === 'function') {
          const delay = typeof options.callbackDelay === 'number' ? options.callbackDelay : 50;
          setTimeout(() => {
            try {
              const result = callback();
              if (result && typeof result.catch === 'function') {
                result.catch((error) => {
                  if (!this.isEscCancelled(error)) {
                    Logger.error(`ESC回退回调执行失败: ${error.message}`);
                  }
                });
              }
            } catch (error) {
              if (!this.isEscCancelled(error)) {
                Logger.error(`ESC回退回调执行失败: ${error.message}`);
              }
            }
          }, delay);
        }
      }
    });

    return handler;
  }

  clearScreen() {
    const clearSequence = process.platform === 'win32'
      ? '\x1b[3J\x1b[2J\x1b[0f'
      : '\x1b[3J\x1b[2J\x1b[H';
    process.stdout.write(clearSequence);
  }

  removeESCListener(listener) {
    if (!listener || !this.escManager) {
      return;
    }

    this.escManager.unregister(listener);
  }

  cleanupAllListeners() {
    if (this.escManager) {
      this.escManager.reset();
    }
  }

  async handleError(error, context) {
    if (this.isEscCancelled(error)) {
      return;
    }
    Logger.error(`${context}失败: ${error.message}`);
    throw error;
  }

  async safeExecute(operation, context = '操作') {
    try {
      return await operation();
    } catch (error) {
      await this.handleError(error, context);
    } finally {
      this.cleanupAllListeners();
    }
  }

  /**
   * 带 ESC 监听的 prompt 执行
   * 自动处理 ESC 监听器的创建、移除和错误处理
   * @param {Array} questions - inquirer 问卷配置
   * @param {string} escMessage - ESC 返回信息
   * @param {Function} escCallback - ESC 按下时的回调函数
   * @returns {Promise<Object>} - prompt 答案
   */
  async promptWithESC(questions, escMessage, escCallback) {
    const escListener = this.createESCListener(escCallback, escMessage);
    try {
      return await this.prompt(questions);
    } catch (error) {
      if (this.isEscCancelled(error)) {
        this.removeESCListener(escListener);
        throw error;
      }
      throw error;
    } finally {
      this.removeESCListener(escListener);
    }
  }

  /**
   * 带 ESC 监听的 prompt 执行，支持返回默认值
   * @param {Array} questions - inquirer 问卷配置
   * @param {string} escMessage - ESC 返回信息
   * @param {Function} escCallback - ESC 按下时的回调函数
   * @param {*} escReturnValue - ESC 按下时返回的值
   * @returns {Promise<Object|*>} - prompt 答案或 escReturnValue
   */
  async promptWithESCAndDefault(questions, escMessage, escCallback, escReturnValue) {
    const escListener = this.createESCListener(escCallback, escMessage);
    try {
      return await this.prompt(questions);
    } catch (error) {
      if (this.isEscCancelled(error)) {
        this.removeESCListener(escListener);
        return escReturnValue;
      }
      throw error;
    } finally {
      this.removeESCListener(escListener);
    }
  }

  destroy() {
    this.cleanupAllListeners();
  }
}

module.exports = { BaseCommand, ESC_CANCELLED_ERROR_CODE };
