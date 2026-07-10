class ProviderChoicesHelper {
  static buildProviderChoices(providers, options = {}) {
    const {
      includeActions = false,
      statusMap = {},
      UIHelper,
      StatusHelper,
      chalk,
      Separator,
      icons = UIHelper?.icons || {}
    } = options;

    const lastUsedProvider = this.findLastUsedProvider(providers);
    const choices = providers.map(provider => this.buildProviderChoice(provider, {
      lastUsedProvider,
      statusMap,
      UIHelper,
      StatusHelper,
      chalk
    }));

    if (includeActions) {
      choices.push(
        new Separator(),
        { name: `${icons.back} 返回供应商选择`, value: 'back' },
        { name: `${icons.error} 退出`, value: 'exit' }
      );
    }

    return choices;
  }

  static buildProviderChoice(provider, options = {}) {
    const {
      lastUsedProvider,
      statusMap = {},
      UIHelper,
      StatusHelper,
      chalk
    } = options;
    const isLastUsed = lastUsedProvider && lastUsedProvider.name === provider.name;
    const availability = statusMap[provider.name];
    const icon = StatusHelper.getIconForState(availability?.state);
    const statusText = StatusHelper.formatAvailability(availability);
    const statusLabel = chalk.gray('-') + ' ' + statusText;
    const ideTag = provider.ideName === 'codex'
      ? chalk.cyan('[Codex]')
      : chalk.magenta('[Claude]');
    const lastUsedLabel = isLastUsed ? UIHelper.colors.muted(' --- 上次使用') : '';

    return {
      name: `${icon} ${ideTag} ${UIHelper.formatProvider(provider)}${lastUsedLabel} ${statusLabel}`,
      value: provider.name,
      short: provider.name
    };
  }

  static findLastUsedProvider(providers) {
    return providers.reduce((latest, current) => {
      if (!current || !current.lastUsed) {
        return latest;
      }
      if (!latest || !latest.lastUsed) {
        return current;
      }
      return new Date(current.lastUsed) > new Date(latest.lastUsed) ? current : latest;
    }, null);
  }
}

module.exports = { ProviderChoicesHelper };
