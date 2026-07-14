const { getClaudeLaunchArgs } = require('./launch-args');
const { containsUnsafeTerminalCharacters } = require('./terminal-format');

const validator = {
  validateName(name) {
    if (!name || typeof name !== 'string') {
      return '供应商名称不能为空';
    }

    if (name.trim().length === 0) {
      return '供应商名称不能为空或只包含空格';
    }

    if (containsUnsafeTerminalCharacters(name)) {
      return '供应商名称不能包含控制字符';
    }

    // 禁止使用保留名称 (Windows)
    const reserved = [
      '__PROTO__',
      'PROTOTYPE',
      'CONSTRUCTOR',
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9'
    ];
    if (reserved.includes(name.toUpperCase())) {
      return '供应商名称不能使用系统保留名称';
    }

    if (name.length > 100) {
      return '供应商名称不能超过100个字符';
    }

    return null;
  },

  validateDisplayName(displayName) {
    // 允许空值，表示可选
    if (displayName === null || displayName === undefined || displayName === '') {
      return null;
    }

    if (typeof displayName !== 'string') {
      return '显示名称必须是字符串';
    }

    if (containsUnsafeTerminalCharacters(displayName)) {
      return '显示名称不能包含控制字符';
    }

    if (displayName.length > 100) {
      return '显示名称不能超过100个字符';
    }

    return null;
  },

  validateUrl(url, required = true) {
    if (url === null || url === undefined || url === '') {
      return required ? 'URL不能为空' : null;
    }

    if (typeof url !== 'string') {
      return 'URL必须是字符串';
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return '请输入有效的URL';
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return 'URL必须以http://或https://开头';
    }

    if (/[\x00-\x1F"\\]/.test(url)) {
      return 'URL包含不安全字符';
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isLoopback =
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      /^127(?:\.\d{1,3}){3}$/.test(hostname);

    if (parsedUrl.protocol === 'http:' && !isLoopback) {
      return '远程 API 地址必须使用 HTTPS；HTTP 仅允许 localhost 或回环地址';
    }

    return null;
  },

  validateToken(token) {
    if (!token || typeof token !== 'string') {
      return 'Token不能为空';
    }

    if (token.trim().length === 0) {
      return 'Token不能只包含空格';
    }

    if (containsUnsafeTerminalCharacters(token)) {
      return 'Token不能包含控制字符';
    }

    // 检测常见的占位符文本
    const placeholders = [
      'your-key-here',
      'your-token',
      'your_key',
      'your_token',
      'example',
      'test-key',
      'demo',
      'placeholder',
      'replace-me',
      'insert-key',
      'api-key-here',
      'token-here',
      'xxx',
      'yyy',
      'zzz',
      'abc123',
      '123456'
    ];
    const lowerToken = token.toLowerCase();
    if (placeholders.some(p => lowerToken.includes(p))) {
      return 'Token 似乎是占位符，请输入真实的 API Token';
    }

    return null;
  },

  validateModel(model) {
    // 允许空值，表示可选
    if (!model) {
      return null;
    }

    if (typeof model !== 'string') {
      return '模型名称必须是字符串';
    }

    if (model.trim().length === 0) {
      return '模型名称不能为空字符串';
    }

    if (model.length > 100) {
      return '模型名称不能超过100个字符';
    }

    return null;
  },

  getAvailableLaunchArgs() {
    return getClaudeLaunchArgs();
  }
};

module.exports = { validator };
