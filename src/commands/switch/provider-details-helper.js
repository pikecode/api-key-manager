class ProviderDetailsHelper {
  static buildDetailsRows(provider, options = {}) {
    const {
      authModeDisplay = {},
      baseUrl,
      formatTime
    } = options;

    const baseUrlDisplay = provider.baseUrl
      || (provider.authMode === 'auth_token'
        ? baseUrl.OFFICIAL_DEFAULT
        : '⚠️ 未设置');

    return [
      ['供应商名称', provider.name],
      ['显示名称', provider.displayName],
      ['认证模式', authModeDisplay[provider.authMode] || provider.authMode],
      ['基础URL', baseUrlDisplay],
      ['认证令牌', provider.authToken || '未设置'],
      ['主模型', provider.models?.primary || '未设置'],
      ['快速模型', provider.models?.smallFast || '未设置'],
      ['创建时间', formatTime(provider.createdAt)],
      ['最后使用', formatTime(provider.lastUsed)],
      ['当前状态', provider.current ? '✅ 使用中' : '⚫ 未使用'],
      ['使用次数', provider.usageCount || 0]
    ];
  }

  static buildActionChoices(icons) {
    return [
      { name: `${icons.launch} 立即启动`, value: 'launch' },
      { name: `${icons.edit} 编辑供应商`, value: 'edit' },
      { name: `${icons.delete} 删除供应商`, value: 'remove' },
      { name: `${icons.back} 返回管理列表`, value: 'back' }
    ];
  }

  static formatLaunchArgs(provider) {
    if (!provider.launchArgs || provider.launchArgs.length === 0) {
      return null;
    }
    return provider.launchArgs.join(', ');
  }
}

module.exports = { ProviderDetailsHelper };
