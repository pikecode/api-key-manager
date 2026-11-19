function thinkingModeQuestion(provider = {}) {
  return {
    type: 'list',
    name: 'thinkingMode',
    message: 'Thinking 兼容模式:',
    choices: [
      { name: '默认（保留客户端及 shell 设置）', value: 'default' },
      { name: '禁用显式 thinking（用于不兼容的供应商）', value: 'disabled' }
    ],
    default: provider.compatibility?.thinkingMode || 'default'
  };
}

module.exports = { thinkingModeQuestion };
