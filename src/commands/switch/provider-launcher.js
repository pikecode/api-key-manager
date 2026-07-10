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
  await configManager.activateProvider(provider.name, lastUsedArgs);
}

module.exports = {
  launchProviderProcess,
  markProviderAsCurrent
};
