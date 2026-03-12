const { getClaudeLaunchArgs } = require('./launch-args');

const validator = {
  validateName(name) {
    if (!name || typeof name !== 'string') {
      return '供应商名称不能为空';
    }

    if (name.trim().length === 0) {
      return '供应商名称不能为空或只包含空格';
    }

    // 禁止文件系统特殊字符
    if (/[<>:"/\\|?*\x00-\x1F]/.test(name)) {
      return '供应商名称包含非法字符 (不能包含: < > : " / \\ | ? *)';
    }

    // 禁止使用保留名称 (Windows)
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
      'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
      'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reserved.includes(name.toUpperCase())) {
      return '供应商名称不能使用系统保留名称';
    }

    // 禁止以点或空格开头/结尾 (Windows 限制)
    if (/^[. ]|[. ]$/.test(name)) {
      return '供应商名称不能以点或空格开头/结尾';
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

    if (displayName.length > 100) {
      return '显示名称不能超过100个字符';
    }

    return null;
  },

  validateUrl(url, required = true) {
    if (!url || typeof url !== 'string') {
      return required ? 'URL不能为空' : null;
    }

    try {
      new URL(url);
    } catch (error) {
      return '请输入有效的URL';
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'URL必须以http://或https://开头';
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

    if (token.trim().length < 10) {
      return 'Token长度不能少于10个字符';
    }

    // 检测常见的占位符文本
    const placeholders = [
      'your-key-here', 'your-token', 'your_key', 'your_token',
      'example', 'test-key', 'demo', 'placeholder', 'replace-me',
      'insert-key', 'api-key-here', 'token-here', 'xxx', 'yyy',
      'zzz', 'abc123', '123456'
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
