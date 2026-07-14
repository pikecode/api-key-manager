const chalk = require('chalk');

const UNSAFE_TERMINAL_PATTERN = /[\x00-\x1F\x7F-\x9F\u202A-\u202E\u2066-\u2069]/;
const UNSAFE_TERMINAL_GLOBAL_PATTERN = /[\x00-\x1F\x7F-\x9F\u202A-\u202E\u2066-\u2069]/g;

function containsUnsafeTerminalCharacters(value) {
  return typeof value === 'string' && UNSAFE_TERMINAL_PATTERN.test(value);
}

function escapeTerminalText(value) {
  return String(value).replace(UNSAFE_TERMINAL_GLOBAL_PATTERN, character => {
    const code = character.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}

function detectTerminalCapabilities() {
  return {
    colors: Boolean(chalk.supportsColor),
    unicode: Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM === 'vscode'),
    colorDepth:
      typeof process.stdout.getColorDepth === 'function' ? process.stdout.getColorDepth() : 1
  };
}

function formatMessage(message, type = 'info') {
  const capabilities = detectTerminalCapabilities();

  if (!capabilities.colors) {
    const symbols = {
      success: '[OK]',
      error: '[错误]',
      warning: '[警告]',
      info: '[信息]'
    };
    return `${symbols[type] || '[信息]'} ${message}`;
  }

  const colorMap = {
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue
  };

  const symbols = capabilities.unicode
    ? { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
    : { success: '[OK]', error: '[ERROR]', warning: '[WARN]', info: '[INFO]' };

  const formatter = colorMap[type] || colorMap.info;
  const symbol = symbols[type] || symbols.info;
  return formatter(`${symbol} ${message}`);
}

module.exports = {
  containsUnsafeTerminalCharacters,
  escapeTerminalText,
  formatMessage
};
