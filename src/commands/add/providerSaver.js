/**
 * Helper for saving a new provider and printing a summary.
 * This mirrors the original `saveProvider` implementation but is split
 * into a dedicated module to keep each file under 50 lines.
 */

const { Logger } = require('../../utils/logger');
const { UIHelper } = require('../../utils/ui-helper');
const { promptCodexLaunchArgs, promptLaunchArgs, promptModelConfig } = require('./prompts');
const { printProviderSummary } = require('./summaryPrinter');
const { registry } = require('../../CommandRegistry');

/**
 * Save the provider configuration.
 * @param {BaseCommand} adder - ProviderAdder instance (provides configManager, prompts, etc.)
 * @param {Object} answers - Collected answers from the prompts.
 */
async function saveProvider(adder, answers) {
  try {
    await adder.configManager.load();

    // 如果已经存在同名供应商，询问是否覆盖
    if (adder.configManager.getProvider(answers.name)) {
      const shouldOverwrite = await adder.confirmOverwrite(answers.name);
      if (!shouldOverwrite) {
        Logger.warning('操作已取消');
        return;
      }
    }

    // 处理启动参数
    let launchArgs = [];
    if (answers.ideName === 'codex') {
      launchArgs = answers.configureCodexLaunchArgs
        ? await promptCodexLaunchArgs(adder)
        : [];
    } else {
      launchArgs = answers.configureLaunchArgs
        ? await promptLaunchArgs(adder)
        : [];
    }

    // 处理模型配置（仅非 Codex）
    let modelConfig = { primaryModel: null, smallFastModel: null };
    if (answers.configureModels) {
      modelConfig = await promptModelConfig(adder);
    }

    // 保存到配置管理器（保持不可变写法在 configManager 中实现）
    await adder.configManager.addProvider(answers.name, {
      displayName: answers.displayName || answers.name,
      ideName: answers.ideName || 'claude',
      baseUrl: answers.baseUrl,
      authToken: answers.authToken,
      authMode: answers.authMode,
      codexFiles: answers.codexFiles || null,
      launchArgs,
      primaryModel: modelConfig.primaryModel,
      smallFastModel: modelConfig.smallFastModel,
      setAsDefault: answers.setAsDefault
    });

    // 打印摘要并返回主界面
    await printProviderSummary(adder, answers, launchArgs, modelConfig);
    await adder.pauseBeforeReturn();

    return await registry.executeCommand('switch');
  } catch (error) {
    if (adder.isEscCancelled(error)) return;
    Logger.error(`添加供应商失败: ${error.message}`);
    throw error;
  }
}

module.exports = { saveProvider };
