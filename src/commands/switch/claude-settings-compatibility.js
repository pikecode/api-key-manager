const path = require('path');
const { Logger } = require('../../utils/logger');
const { UIHelper } = require('../../utils/ui-helper');
const {
  findSettingsConflict,
  backupSettingsFile,
  clearConflictKeys,
  saveSettingsFile
} = require('../../utils/claude-settings');

async function ensureClaudeSettingsCompatibility(command, provider) {
  const conflict = await findSettingsConflict();
  if (!conflict) {
    return true;
  }

  const keyList = conflict.keys.map((key) => `• ${key}`).join('\n');
  const backupDir = path.dirname(conflict.filePath);

  command.clearScreen();
  console.log(UIHelper.createTitle('检测到环境变量冲突', UIHelper.icons.warning));
  console.log();
  console.log(UIHelper.createCard('冲突文件', conflict.filePath, UIHelper.icons.info));
  console.log();
  console.log(UIHelper.createCard('备份目录', `${backupDir}\n备份文件将命名为 settings.backup-YYYYMMDD_HHmmss.json`, UIHelper.icons.info));
  console.log();
  console.log(UIHelper.createCard('可能覆盖的变量', keyList, UIHelper.icons.warning));
  console.log();
  console.log(UIHelper.createTooltip('Claude 会优先读取该设置文件中的 env 配置，可能覆盖本次为供应商设置的变量。'));
  console.log();

  let answer;
  try {
    answer = await command.prompt([
      {
        type: 'list',
        name: 'action',
        message: `在 ${conflict.filePath} 中发现 env 配置会覆盖供应商 '${provider.displayName || provider.name}' 的变量，选择处理方式:`,
        choices: [
          { name: '🔧 备份并清空这些变量', value: 'fix' },
          { name: '⚠️ 忽略并继续（可能导致切换失败）', value: 'ignore' },
          { name: '❌ 取消启动', value: 'cancel' }
        ],
        default: 'fix'
      }
    ]);
  } catch (error) {
    if (command.isEscCancelled(error)) {
      Logger.info('已取消启动');
      return false;
    }
    throw error;
  }

  if (answer.action === 'fix') {
    return await fixSettingsConflict(command, conflict, backupDir);
  }

  if (answer.action === 'ignore') {
    Logger.warning(`已忽略 ${conflict.filePath} 中的冲突，Claude 可能仍会使用该文件里的旧变量。`);
    return true;
  }

  Logger.info('已取消启动');
  return false;
}

async function fixSettingsConflict(command, conflict, backupDir) {
  let confirmBackup;
  try {
    confirmBackup = await command.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `将在 ${backupDir} 中创建备份文件 (settings.backup-YYYYMMDD_HHmmss.json)，并清空冲突变量。是否继续?`,
        default: true
      }
    ]);
  } catch (error) {
    if (command.isEscCancelled(error)) {
      Logger.info('已取消启动');
      return false;
    }
    throw error;
  }

  if (!confirmBackup.confirmed) {
    Logger.info('已取消启动');
    return false;
  }

  try {
    const backupPath = await backupSettingsFile(conflict.filePath);
    const updatedSettings = clearConflictKeys(
      {
        ...conflict.settings,
        env: conflict.settings.env ? { ...conflict.settings.env } : undefined
      },
      conflict.keys
    );
    await saveSettingsFile(conflict.filePath, updatedSettings);
    Logger.success(`已将 ${conflict.filePath} 备份至 '${backupPath}' 并清空冲突变量。`);
  } catch (error) {
    throw new Error(`清理 Claude 设置文件失败: ${error.message}`);
  }

  return true;
}

module.exports = {
  ensureClaudeSettingsCompatibility,
  fixSettingsConflict
};
