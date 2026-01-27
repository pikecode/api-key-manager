/**
 * Status Helper
 * 供应商状态管理辅助函数
 */

const chalk = require('chalk');

class StatusHelper {
  /**
   * 根据状态获取图标
   * @param {string} state - 状态 (online/degraded/offline/pending)
   * @returns {string} 状态图标
   */
  static getIconForState(state) {
    const iconMap = {
      online: '🟢',
      degraded: '🟡',
      offline: '🔴',
      pending: '⏳'
    };
    return iconMap[state] || '⚪';
  }

  /**
   * 格式化可用性状态显示
   * @param {Object} availability - 可用性对象 {state, label, latency}
   * @returns {string} 格式化后的状态文本
   */
  static formatAvailability(availability) {
    if (!availability) {
      return chalk.gray('测试中...');
    }

    const colorMap = {
      online: chalk.green,
      degraded: chalk.yellow,
      offline: chalk.red,
      pending: chalk.gray
    };

    const defaultLabelMap = {
      online: '可用',
      degraded: '有限可用',
      offline: '不可用',
      pending: '测试中...'
    };

    const color = colorMap[availability.state] || chalk.gray;
    const label = availability.label || defaultLabelMap[availability.state] || '未知';

    return color(label);
  }

  /**
   * 构建初始状态映射
   * @param {Array} providers - 供应商列表
   * @param {Object} cachedStatusMap - 缓存的状态映射
   * @returns {Object} 状态映射
   */
  static buildInitialStatusMap(providers, cachedStatusMap = {}) {
    const map = {};
    providers.forEach(provider => {
      map[provider.name] = cachedStatusMap[provider.name] || {
        state: 'pending',
        label: '测试中...',
        latency: null
      };
    });
    return map;
  }

  /**
   * 构建错误状态映射
   * @param {Array} providers - 供应商列表
   * @param {Error} error - 错误对象
   * @returns {Object} 错误状态映射
   */
  static buildErrorStatusMap(providers, error) {
    const message = error ? `检测失败: ${error.message}` : '检测失败';
    const map = {};
    providers.forEach(provider => {
      map[provider.name] = {
        state: 'offline',
        label: message,
        latency: null
      };
    });
    return map;
  }

  /**
   * 格式化延迟显示
   * @param {number} latency - 延迟毫秒数
   * @returns {string} 格式化后的延迟文本
   */
  static formatLatency(latency) {
    if (latency === null || latency === undefined) {
      return '';
    }

    if (latency < 100) {
      return chalk.green(`${latency}ms`);
    } else if (latency < 300) {
      return chalk.yellow(`${latency}ms`);
    } else {
      return chalk.red(`${latency}ms`);
    }
  }

  /**
   * 判断状态是否需要刷新
   * @param {Object} status - 状态对象
   * @param {number} maxAge - 最大有效期（毫秒）
   * @returns {boolean} 是否需要刷新
   */
  static needsRefresh(status, maxAge = 30000) {
    if (!status || !status.timestamp) {
      return true;
    }
    return Date.now() - status.timestamp > maxAge;
  }
}

module.exports = { StatusHelper };
