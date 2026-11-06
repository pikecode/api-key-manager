const crypto = require('crypto');

function codexProviderIdentity(config) {
  if (config.authMode === 'chatgpt_login' || !config.baseUrl) return 'openai';
  // 认证或端点变化后视为不同来源，不保存明文密钥。
  const digest = crypto.createHash('sha256').update(JSON.stringify([
    config.name, config.baseUrl, config.authMode || 'api_key', config.authToken || ''
  ])).digest('hex');
  return `akm_${digest}`;
}

function historyConfirmation(provider, config) {
  const target = codexProviderIdentity(config);
  if (/^akm_[a-f0-9]{64}$/.test(provider) && provider === target) {
    return '所选历史来自当前供应商配置，将创建新对话分支，原对话保留。是否继续？';
  }
  if ((/^akm_[a-f0-9]{64}$/.test(provider) && provider !== target) ||
      (provider === 'akm' && target === 'openai') ||
      (provider === 'openai' && target !== 'openai')) {
    return '所选历史来自其他供应商配置，恢复所需的历史内容将发送给当前供应商，并创建新对话分支。是否继续？';
  }
  return '无法确认所选历史是否来自当前供应商或账号。继续后，恢复所需的历史内容将由当前供应商处理，并创建新对话分支。是否继续？';
}

module.exports = { codexProviderIdentity, historyConfirmation };
