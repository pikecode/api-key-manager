/**
 * Health Checker
 * 配置健康检查和告警
 * @module utils/health-checker
 */

const chalk = require('chalk');
const { ProviderStatusChecker } = require('./provider-status-checker');

/**
 * 健康检查器
 */
class HealthChecker {
  constructor() {
    this.statusChecker = new ProviderStatusChecker();
  }

  /**
   * 检查 Token 有效期
   * @param {Object} provider - 供应商配置
   * @returns {Object} 检查结果
   */
  checkTokenExpiry(provider) {
    const result = {
      status: 'ok',
      level: 'info',
      message: '',
      daysUntilExpiry: null
    };

    // 如果配置中有过期时间
    if (provider.tokenExpiry) {
      const expiryDate = new Date(provider.tokenExpiry);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

      result.daysUntilExpiry = daysUntilExpiry;

      if (daysUntilExpiry < 0) {
        result.status = 'expired';
        result.level = 'error';
        result.message = `Token 已过期 ${Math.abs(daysUntilExpiry)} 天`;
      } else if (daysUntilExpiry <= 3) {
        result.status = 'critical';
        result.level = 'error';
        result.message = `Token 将在 ${daysUntilExpiry} 天后过期，请尽快更新`;
      } else if (daysUntilExpiry <= 7) {
        result.status = 'warning';
        result.level = 'warning';
        result.message = `Token 将在 ${daysUntilExpiry} 天后过期`;
      } else if (daysUntilExpiry <= 30) {
        result.status = 'notice';
        result.level = 'info';
        result.message = `Token 将在 ${daysUntilExpiry} 天后过期`;
      } else {
        result.message = `Token 有效期还有 ${daysUntilExpiry} 天`;
      }
    }

    return result;
  }

  /**
   * 检查使用配额
   * @param {Object} provider - 供应商配置
   * @returns {Object} 检查结果
   */
  checkQuota(provider) {
    const result = {
      status: 'ok',
      level: 'info',
      message: '',
      usagePercent: null
    };

    // 如果配置中有配额信息
    if (provider.quota && provider.quota.limit) {
      const used = provider.quota.used || 0;
      const limit = provider.quota.limit;
      const usagePercent = Math.round((used / limit) * 100);

      result.usagePercent = usagePercent;

      if (usagePercent >= 100) {
        result.status = 'exceeded';
        result.level = 'error';
        result.message = `配额已用完 (${used}/${limit})`;
      } else if (usagePercent >= 90) {
        result.status = 'critical';
        result.level = 'error';
        result.message = `配额即将用完 ${usagePercent}% (${used}/${limit})`;
      } else if (usagePercent >= 75) {
        result.status = 'warning';
        result.level = 'warning';
        result.message = `配额使用较高 ${usagePercent}% (${used}/${limit})`;
      } else if (usagePercent >= 50) {
        result.status = 'notice';
        result.level = 'info';
        result.message = `配额使用 ${usagePercent}% (${used}/${limit})`;
      } else {
        result.message = `配额充足 ${usagePercent}% (${used}/${limit})`;
      }
    }

    return result;
  }

  /**
   * 检查最后使用时间
   * @param {Object} provider - 供应商配置
   * @returns {Object} 检查结果
   */
  checkLastUsed(provider) {
    const result = {
      status: 'ok',
      level: 'info',
      message: '',
      daysSinceLastUse: null
    };

    if (provider.lastUsed) {
      const lastUsedDate = new Date(provider.lastUsed);
      const now = new Date();
      const daysSinceLastUse = Math.floor((now - lastUsedDate) / (1000 * 60 * 60 * 24));

      result.daysSinceLastUse = daysSinceLastUse;

      if (daysSinceLastUse > 90) {
        result.status = 'stale';
        result.level = 'warning';
        result.message = `已 ${daysSinceLastUse} 天未使用，可能需要验证或清理`;
      } else if (daysSinceLastUse > 30) {
        result.status = 'inactive';
        result.level = 'info';
        result.message = `已 ${daysSinceLastUse} 天未使用`;
      } else {
        result.message = `最近使用于 ${daysSinceLastUse} 天前`;
      }
    } else {
      result.status = 'never';
      result.level = 'info';
      result.message = '从未使用过';
    }

    return result;
  }

  /**
   * 检查 API 连接性
   * @param {Object} provider - 供应商配置
   * @returns {Promise<Object>} 检查结果
   */
  async checkConnectivity(provider) {
    const result = {
      status: 'ok',
      level: 'info',
      message: '',
      latency: null
    };

    try {
      const status = await this.statusChecker.check(provider, { skipCache: true });

      result.latency = status.latency;

      if (status.state === 'offline') {
        result.status = 'offline';
        result.level = 'error';
        result.message = 'API 无法连接';
      } else if (status.state === 'degraded') {
        result.status = 'degraded';
        result.level = 'warning';
        result.message = 'API 响应缓慢';
      } else if (status.state === 'online') {
        if (status.latency > 5000) {
          result.status = 'slow';
          result.level = 'warning';
          result.message = `API 响应较慢 (${Math.round(status.latency)}ms)`;
        } else {
          result.status = 'online';
          result.message = `API 正常 (${Math.round(status.latency)}ms)`;
        }
      } else {
        result.status = 'unknown';
        result.level = 'warning';
        result.message = 'API 状态未知';
      }
    } catch (error) {
      result.status = 'error';
      result.level = 'error';
      result.message = `检查失败: ${error.message}`;
    }

    return result;
  }

  /**
   * 执行完整健康检查
   * @param {Object} provider - 供应商配置
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 检查结果
   */
  async performHealthCheck(provider, options = {}) {
    const results = {
      provider: provider.name,
      displayName: provider.displayName,
      overallStatus: 'ok',
      checks: {}
    };

    // Token 过期检查
    results.checks.tokenExpiry = this.checkTokenExpiry(provider);

    // 配额检查
    results.checks.quota = this.checkQuota(provider);

    // 最后使用时间检查
    results.checks.lastUsed = this.checkLastUsed(provider);

    // API 连接性检查（可选，因为比较慢）
    if (options.checkConnectivity !== false) {
      results.checks.connectivity = await this.checkConnectivity(provider);
    }

    // 确定整体状态
    const levels = Object.values(results.checks).map(c => c.level);
    if (levels.includes('error')) {
      results.overallStatus = 'error';
    } else if (levels.includes('warning')) {
      results.overallStatus = 'warning';
    } else if (levels.includes('info')) {
      results.overallStatus = 'info';
    }

    return results;
  }

  /**
   * 格式化健康检查报告
   * @param {Object} results - 检查结果
   * @returns {string} 格式化的报告
   */
  formatHealthReport(results) {
    const lines = [];

    // 标题
    const statusIcon = this._getStatusIcon(results.overallStatus);
    const statusColor = this._getStatusColor(results.overallStatus);
    lines.push(statusColor(`${statusIcon} ${results.displayName} (${results.provider})`));
    lines.push('');

    // 各项检查结果
    Object.entries(results.checks).forEach(([checkName, result]) => {
      if (result.message) {
        const icon = this._getLevelIcon(result.level);
        const color = this._getLevelColor(result.level);
        const label = this._getCheckLabel(checkName);
        lines.push(`  ${icon} ${label}: ${color(result.message)}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * 获取状态图标
   * @private
   */
  _getStatusIcon(status) {
    switch (status) {
      case 'ok':
      case 'info':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '?';
    }
  }

  /**
   * 获取状态颜色
   * @private
   */
  _getStatusColor(status) {
    switch (status) {
      case 'ok':
      case 'info':
        return chalk.green;
      case 'warning':
        return chalk.yellow;
      case 'error':
        return chalk.red;
      default:
        return chalk.gray;
    }
  }

  /**
   * 获取级别图标
   * @private
   */
  _getLevelIcon(level) {
    switch (level) {
      case 'info':
        return 'ℹ';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '·';
    }
  }

  /**
   * 获取级别颜色
   * @private
   */
  _getLevelColor(level) {
    switch (level) {
      case 'info':
        return chalk.blue;
      case 'warning':
        return chalk.yellow;
      case 'error':
        return chalk.red;
      default:
        return chalk.gray;
    }
  }

  /**
   * 获取检查标签
   * @private
   */
  _getCheckLabel(checkName) {
    const labels = {
      tokenExpiry: 'Token 有效期',
      quota: 'API 配额',
      lastUsed: '最后使用',
      connectivity: 'API 连接'
    };
    return labels[checkName] || checkName;
  }
}

module.exports = { HealthChecker };
