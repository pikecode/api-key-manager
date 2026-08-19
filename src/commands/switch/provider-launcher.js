const { executeWithEnv } = require('../../utils/env-launcher');
const { executeCodexWithEnv } = require('../../utils/codex-launcher');

async function launchProviderProcess(provider, selectedLaunchArgs) {
  if (provider.ideName === 'codex') {
    await executeCodexWithEnv(provider, selectedLaunchArgs);
    return;
  }

  await executeWithEnv(provider, selectedLaunchArgs);
}

async function markProviderAsCurrent(configManager, provider, lastUsedArgs = []) {
  if (typeof configManager.load === 'function') {
    await configManager.load(true);
  }

  const latestProvider =
    typeof configManager.getProvider === 'function'
      ? configManager.getProvider(provider.name)
      : provider;

  if (!latestProvider) {
    throw new Error(`供应商 '${provider.name}' 不存在\n使用 'akm list' 查看所有已配置的供应商`);
  }

  await configManager.activateProvider(latestProvider.name, lastUsedArgs);
  return typeof configManager.getProvider === 'function'
    ? configManager.getProvider(latestProvider.name)
    : latestProvider;
}

module.exports = {
  launchProviderProcess,
  markProviderAsCurrent
};
