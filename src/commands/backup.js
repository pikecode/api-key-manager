/**
 * Backup Manager Command
 * 配置备份和恢复管理
 * @module commands/backup
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');

/**
 * 备份管理器类
 * 用于导出、导入和管理供应商配置备份
 */
class BackupManager {
  /**
   * 创建备份管理器实例
   */
  constructor() {
    this.configManager = configManager;
  }

  /**
   * 导出配置到指定文件
   * @param {string} outputPath - 输出文件路径
   * @param {object} options - 选项
   */
  async export(outputPath, options = {}) {
    try {
      await this.configManager.ensureLoaded();
      const config = this.configManager.config;

      if (!config.providers || Object.keys(config.providers).length === 0) {
        Logger.warning('没有供应商配置可导出');
        return;
      }

      // 准备导出数据
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        providers: config.providers,
        currentProvider: config.currentProvider
      };

      // 如果需要脱敏
      if (options.mask) {
        exportData.providers = this.maskTokens(exportData.providers);
      }

      // 确定输出路径
      const finalPath = outputPath || `akm-config-${this.getTimestamp()}.json`;
      const absolutePath = path.isAbsolute(finalPath) ? finalPath : path.join(process.cwd(), finalPath);

      // 写入文件
      await fs.writeJson(absolutePath, exportData, { spaces: 2 });

      Logger.success(`配置已导出到: ${absolutePath}`);
      console.log(chalk.gray(`  供应商数量: ${Object.keys(config.providers).length}`));
      if (options.mask) {
        console.log(chalk.yellow('  注意: Token 已脱敏，导入后需要重新设置'));
      }

    } catch (error) {
      Logger.error(`导出配置失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从文件导入配置
   * @param {string} inputPath - 输入文件路径
   * @param {object} options - 选项
   */
  async import(inputPath, options = {}) {
    try {
      if (!inputPath) {
        Logger.error('请指定要导入的配置文件路径');
        return;
      }

      const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);

      if (!await fs.pathExists(absolutePath)) {
        Logger.error(`文件不存在: ${absolutePath}`);
        return;
      }

      const importData = await fs.readJson(absolutePath);

      // 验证导入数据
      if (!importData.providers || typeof importData.providers !== 'object') {
        Logger.error('无效的配置文件格式');
        return;
      }

      await this.configManager.ensureLoaded();

      // 导入前自动备份当前配置
      await this.backup();

      const importedCount = Object.keys(importData.providers).length;
      let addedCount = 0;
      let skippedCount = 0;

      for (const [name, provider] of Object.entries(importData.providers)) {
        const exists = this.configManager.getProvider(name);

        if (exists && !options.overwrite) {
          Logger.warning(`供应商 "${name}" 已存在，跳过 (使用 --overwrite 覆盖)`);
          skippedCount++;
          continue;
        }

        // 添加或更新供应商
        this.configManager.config.providers[name] = {
          ...provider,
          name,
          importedAt: new Date().toISOString()
        };
        addedCount++;
      }

      // 如果设置了 currentProvider 且该供应商存在
      if (importData.currentProvider && this.configManager.config.providers[importData.currentProvider]) {
        if (!this.configManager.config.currentProvider || options.overwrite) {
          this.configManager.config.currentProvider = importData.currentProvider;
        }
      }

      await this.configManager.save();

      Logger.success('配置导入完成');
      console.log(chalk.gray(`  导入文件: ${absolutePath}`));
      console.log(chalk.gray(`  成功导入: ${addedCount} 个供应商`));
      if (skippedCount > 0) {
        console.log(chalk.yellow(`  跳过: ${skippedCount} 个已存在的供应商`));
      }

    } catch (error) {
      Logger.error(`导入配置失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 备份当前配置
   * @param {string} backupDir - 备份目录
   */
  async backup(backupDir) {
    try {
      await this.configManager.ensureLoaded();

      // 确定备份目录
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const defaultBackupDir = path.join(homeDir, '.akm-backups');
      const finalDir = backupDir || defaultBackupDir;

      // 确保备份目录存在
      await fs.ensureDir(finalDir);

      // 生成备份文件名
      const backupFileName = `akm-backup-${this.getTimestamp()}.json`;
      const backupPath = path.join(finalDir, backupFileName);

      // 读取原始配置文件
      const configPath = this.configManager.configPath;
      if (!await fs.pathExists(configPath)) {
        Logger.warning('配置文件不存在，无需备份');
        return;
      }

      // 复制配置文件
      await fs.copy(configPath, backupPath);

      Logger.success(`配置已备份到: ${backupPath}`);

      // 清理旧备份（保留最近 10 个）
      await this.cleanOldBackups(finalDir, 10);

    } catch (error) {
      Logger.error(`备份配置失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 列出所有备份
   * @param {string} backupDir - 备份目录
   */
  async listBackups(backupDir) {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const defaultBackupDir = path.join(homeDir, '.akm-backups');
      const finalDir = backupDir || defaultBackupDir;

      if (!await fs.pathExists(finalDir)) {
        Logger.warning('备份目录不存在');
        return;
      }

      const files = await fs.readdir(finalDir);
      const backups = files
        .filter(f => f.startsWith('akm-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (backups.length === 0) {
        Logger.warning('没有找到备份文件');
        return;
      }

      console.log(chalk.blue('\n备份列表:'));
      console.log(chalk.gray('═'.repeat(60)));

      for (const backup of backups) {
        const backupPath = path.join(finalDir, backup);
        const stat = await fs.stat(backupPath);
        const size = (stat.size / 1024).toFixed(2);
        console.log(chalk.white(`  ${backup}`));
        console.log(chalk.gray(`    大小: ${size} KB | 时间: ${stat.mtime.toLocaleString()}`));
      }

      console.log(chalk.gray('═'.repeat(60)));
      console.log(chalk.blue(`总计: ${backups.length} 个备份`));
      console.log(chalk.gray(`备份目录: ${finalDir}`));

    } catch (error) {
      Logger.error(`列出备份失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从备份恢复
   * @param {string} backupFile - 备份文件路径或名称
   */
  async restore(backupFile) {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const defaultBackupDir = path.join(homeDir, '.akm-backups');

      let backupPath;
      if (path.isAbsolute(backupFile)) {
        backupPath = backupFile;
      } else if (backupFile.includes('/') || backupFile.includes('\\')) {
        backupPath = path.join(process.cwd(), backupFile);
      } else {
        // 假设是备份目录中的文件名
        backupPath = path.join(defaultBackupDir, backupFile);
      }

      if (!await fs.pathExists(backupPath)) {
        Logger.error(`备份文件不存在: ${backupPath}`);
        return;
      }

      // 先备份当前配置
      await this.backup();

      // 恢复备份
      const configPath = this.configManager.configPath;
      await fs.copy(backupPath, configPath);

      Logger.success(`配置已从备份恢复: ${backupPath}`);

    } catch (error) {
      Logger.error(`恢复备份失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清理旧备份
   */
  async cleanOldBackups(backupDir, keepCount) {
    const files = await fs.readdir(backupDir);
    const backups = files
      .filter(f => f.startsWith('akm-backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      for (const file of toDelete) {
        await fs.remove(path.join(backupDir, file));
      }
      if (toDelete.length > 0) {
        Logger.info(`已清理 ${toDelete.length} 个旧备份`);
      }
    }
  }

  /**
   * Token 脱敏处理
   */
  maskTokens(providers) {
    const masked = {};
    for (const [name, provider] of Object.entries(providers)) {
      masked[name] = {
        ...provider,
        authToken: provider.authToken ? this.maskToken(provider.authToken) : null
      };
    }
    return masked;
  }

  maskToken(token) {
    if (!token || token.length < 10) return '***';
    return token.substring(0, 8) + '***' + token.substring(token.length - 4);
  }

  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  }
}

async function exportCommand(outputPath, options) {
  const manager = new BackupManager();
  await manager.export(outputPath, options);
}

async function importCommand(inputPath, options) {
  const manager = new BackupManager();
  await manager.import(inputPath, options);
}

async function backupCommand(options) {
  const manager = new BackupManager();

  if (options.list) {
    await manager.listBackups(options.dir);
  } else if (options.restore) {
    await manager.restore(options.restore);
  } else {
    await manager.backup(options.dir);
  }
}

module.exports = { exportCommand, importCommand, backupCommand, BackupManager };
