/**
 * 环境变量工具函数
 * 提供 env-launcher.js 和 codex-launcher.js 共用的功能
 */

/**
 * 清理环境变量值，移除危险字符
 * @param {string} value - 要清理的值
 * @returns {string} 清理后的值
 */
function sanitizeEnvValue(value) {
  if (typeof value !== 'string') {
    throw new Error('环境变量值必须是字符串');
  }

  // 移除控制字符
  let cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // 检测可能的 shell 命令注入（允许 $ 因为 token 可能包含）
  // 只禁止明确的命令分隔符和反引号执行
  if (/[;&|`]/.test(cleaned)) {
    throw new Error('环境变量值包含潜在不安全的字符');
  }

  return cleaned;
}

/**
 * 清屏函数
 */
function clearTerminal() {
  if (!process.stdout || typeof process.stdout.write !== 'function') {
    return;
  }

  try {
    process.stdout.write('\x1bc');
  } catch (error) {
    // 某些终端可能不支持 RIS 序列，忽略即可
  }

  const sequence = process.platform === 'win32'
    ? '\x1b[3J\x1b[2J\x1b[0f'
    : '\x1b[3J\x1b[2J\x1b[H';
  try {
    process.stdout.write(sequence);
  } catch (error) {
    // 忽略清屏失败
  }
}

module.exports = { sanitizeEnvValue, clearTerminal };
