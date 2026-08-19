/**
 * Launch Args Helper
 * 启动参数辅助函数
 */

const { getClaudeLaunchArgs, getCodexLaunchArgs, checkExclusiveArgs } = require('../../utils/launch-args');

class LaunchArgsHelper {
  /**
   * 获取可用的启动参数
   * @param {boolean} isCodex - 是否是 Codex
   * @returns {Array} 启动参数列表
   */
  static getAvailableLaunchArgs(isCodex) {
    return isCodex ? getCodexLaunchArgs() : getClaudeLaunchArgs();
  }

  /**
   * 合并默认参数和自定义参数
   * @param {Array} availableArgs - 可用参数列表
   * @param {Array} defaultLaunchArgs - 默认启动参数
   * @returns {Array} 合并后的参数列表
   */
  static mergeArgsWithDefaults(availableArgs, defaultLaunchArgs) {
    const knownArgNames = new Set(availableArgs.map(arg => arg.name));
    const customLaunchArgs = defaultLaunchArgs
      .filter(arg => typeof arg === 'string' && !knownArgNames.has(arg));

    return [
      ...availableArgs.map(arg => ({
        ...arg,
        checked: defaultLaunchArgs.includes(arg.name) || Boolean(arg.checked)
      })),
      ...customLaunchArgs.map(name => ({
        name,
        label: name,
        description: '自定义启动参数',
        checked: true
      }))
    ];
  }

  /**
   * 验证启动参数是否有冲突
   * @param {Array} selectedArgs - 已选择的参数
   * @param {Array} availableArgs - 可用参数列表
   * @returns {string|null} 错误信息，无冲突返回 null
   */
  static validateArgsConflict(selectedArgs, availableArgs) {
    return checkExclusiveArgs(selectedArgs, availableArgs);
  }

  /**
   * 格式化参数选项用于显示
   * @param {Array} args - 参数列表
   * @param {Object} UIHelper - UI 辅助工具
   * @returns {Array} 格式化后的选项列表
   */
  static formatArgsForDisplay(args, UIHelper) {
    return args.map(arg => {
      const commandText = UIHelper.colors.muted(`(${arg.name})`);
      const descriptionText = arg.description
        ? ` ${UIHelper.colors.muted(arg.description)}`
        : '';

      const choice = {
        name: `${UIHelper.colors.accent(arg.label || arg.name)} ${commandText}${descriptionText}`,
        value: arg.name,
        checked: Boolean(arg.checked)
      };

      // 添加禁用状态支持
      if (arg.disabled) {
        choice.disabled = arg.disabled;
      }

      return choice;
    });
  }

  /**
   * 获取 IDE 显示名称
   * @param {boolean} isCodex - 是否是 Codex
   * @returns {string} IDE 显示名称
   */
  static getIDEDisplayName(isCodex) {
    return isCodex ? 'Codex CLI' : 'Claude Code';
  }
}

module.exports = { LaunchArgsHelper };
