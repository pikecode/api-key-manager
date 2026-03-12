/**
 * Helper for printing provider summary after creation.
 * Mirrors the original `printProviderSummary` logic but isolated.
 */
const chalk = require('chalk');
const { Logger } = require('../../utils/logger');
const { UIHelper } = require('../../utils/ui-helper');
const { UI_MESSAGES } = require('../../constants/ui');

async function printProviderSummary(adder, answers, launchArgs, modelConfig) {
  console.log(UIHelper.createTitle('供应商已创建', UIHelper.icons.success));
  console.log();
  console.log(chalk.gray(`  ${UI_MESSAGES.PROVIDER_NAME}: ${answers.name}`));
  console.log(chalk.gray(`  ${UI_MESSAGES.PROVIDER_IDE}: ${answers.ideName || 'claude'}`));
  if (answers.baseUrl) console.log(chalk.gray(`  ${UI_MESSAGES.PROVIDER_BASE_URL}: ${answers.baseUrl}`));
  if (answers.authToken) console.log(chalk.gray(`  ${UI_MESSAGES.PROVIDER_TOKEN}: ${answers.authToken}`));
  if (launchArgs && launchArgs.length) {
    console.log(chalk.gray(`  ${UI_MESSAGES.PROVIDER_LAUNCH_ARGS}:`));
    launchArgs.forEach(arg => console.log(chalk.gray(`    - ${arg}`)));
  }
  if (modelConfig && (modelConfig.primaryModel || modelConfig.smallFastModel)) {
    console.log(chalk.gray(`  ${UI_MESSAGES.PROVIDER_MODEL_CONFIG}:`));
    if (modelConfig.primaryModel) console.log(chalk.gray(`    ${UI_MESSAGES.PROVIDER_PRIMARY_MODEL}: ${modelConfig.primaryModel}`));
    if (modelConfig.smallFastModel) console.log(chalk.gray(`    ${UI_MESSAGES.PROVIDER_SMALL_FAST_MODEL}: ${modelConfig.smallFastModel}`));
  }
  Logger.success(UI_MESSAGES.ADD_PROVIDER_SUCCESS);
}

module.exports = { printProviderSummary };
