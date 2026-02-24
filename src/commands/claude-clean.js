/**
 * Claude Clean Command
 * 分析并清理 ~/.claude.json 文件
 * @module commands/claude-clean
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { Logger } = require('../utils/logger');
const { BaseCommand } = require('./BaseCommand');

const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');

// 可清理的全局缓存字段（Claude Code 会自动重建）
const GLOBAL_CACHE_FIELDS = [
  'cachedStatsigGates',
  'cachedDynamicConfigs',
  'cachedGrowthBookFeatures',
  'clientDataCache'
];

// 可清理的项目统计字段（历史数据，不影响功能）
const PROJECT_STAT_FIELDS = [
  'lastAPIDuration', 'lastCost', 'lastDuration',
  'lastLinesAdded', 'lastLinesRemoved', 'lastSessionId',
  'lastToolDuration', 'lastTotalCacheCreationInputTokens',
  'lastTotalCacheReadInputTokens', 'lastTotalInputTokens',
  'lastTotalOutputTokens', 'lastTotalWebSearchRequests',
  'lastAPIDurationWithoutRetries', 'lastModelUsage',
  'lastFpsAverage', 'lastFpsLow1Pct', 'lastSessionMetrics'
];

// 可清理的项目缓存字段（会自动重建）
const PROJECT_CACHE_FIELDS = [
  'reactVulnerabilityCache',
  'exampleFiles',
  'exampleFilesGeneratedAt'
];

class ClaudeCleaner extends BaseCommand {
  constructor() {
    super();
  }

  /**
   * 分析 ~/.claude.json 并显示清理建议
   */
  async analyze() {
    if (!await fs.pathExists(CLAUDE_JSON_PATH)) {
      Logger.warning('~/.claude.json 不存在');
      return;
    }

    const data = await fs.readJson(CLAUDE_JSON_PATH);
    const totalSize = JSON.stringify(data).length;
    const projects = data.projects || {};
    const projectCount = Object.keys(projects).length;

    console.log(chalk.bold('\n📊 ~/.claude.json 分析报告\n'));
    console.log(chalk.gray(`  文件路径: ${CLAUDE_JSON_PATH}`));
    console.log(chalk.gray(`  文件大小: ${this._formatSize(totalSize)}`));
    console.log(chalk.gray(`  项目数量: ${projectCount} 个`));
    console.log();

    // 计算各方案可节省空间
    const globalCacheSize = this._calcFieldsSize(data, GLOBAL_CACHE_FIELDS);
    const statSize = this._calcProjectFieldsSize(projects, PROJECT_STAT_FIELDS);
    const projCacheSize = this._calcProjectFieldsSize(projects, PROJECT_CACHE_FIELDS);
    const staleProjects = this._findStaleProjects(projects);
    const staleSize = staleProjects.reduce((sum, p) => sum + JSON.stringify(projects[p]).length, 0);

    console.log(chalk.bold('  清理方案预估:'));
    console.log(chalk.green(`  ✦ 保守清理  - 清理全局缓存              节省 ${this._formatSize(globalCacheSize)}`));
    console.log(chalk.yellow(`  ✦ 中等清理  - 清理缓存 + 项目统计        节省 ${this._formatSize(globalCacheSize + statSize)}`));
    console.log(chalk.red(`  ✦ 激进清理  - 清理所有 + 删除过期项目     节省 ${this._formatSize(globalCacheSize + statSize + projCacheSize + staleSize)}`));
    console.log();

    if (staleProjects.length > 0) {
      console.log(chalk.gray(`  过期项目（路径不存在）: ${staleProjects.length} 个`));
      staleProjects.forEach(p => console.log(chalk.gray(`    - ${p}`)));
      console.log();
    }

    console.log(chalk.gray('  运行 akm claude clean 执行清理'));
  }

  /**
   * 交互式清理
   */
  async clean() {
    if (!await fs.pathExists(CLAUDE_JSON_PATH)) {
      Logger.warning('~/.claude.json 不存在');
      return;
    }

    const data = await fs.readJson(CLAUDE_JSON_PATH);
    const totalSize = JSON.stringify(data).length;
    const projects = data.projects || {};

    const globalCacheSize = this._calcFieldsSize(data, GLOBAL_CACHE_FIELDS);
    const statSize = this._calcProjectFieldsSize(projects, PROJECT_STAT_FIELDS);
    const projCacheSize = this._calcProjectFieldsSize(projects, PROJECT_CACHE_FIELDS);
    const staleProjects = this._findStaleProjects(projects);
    const staleSize = staleProjects.reduce((sum, p) => sum + JSON.stringify(projects[p]).length, 0);

    console.log(chalk.bold('\n🧹 清理 ~/.claude.json\n'));
    console.log(chalk.gray(`  当前大小: ${this._formatSize(totalSize)}`));
    console.log();

    let selection;
    try {
      selection = await this.prompt([
        {
          type: 'list',
          name: 'mode',
          message: '选择清理方案:',
          choices: [
            {
              name: `保守清理  - 只清理全局缓存 ${chalk.green('(节省 ' + this._formatSize(globalCacheSize) + ')')}`,
              value: 'conservative'
            },
            {
              name: `中等清理  - 清理缓存 + 项目统计 ${chalk.yellow('(节省 ' + this._formatSize(globalCacheSize + statSize) + ')')}`,
              value: 'moderate'
            },
            {
              name: `激进清理  - 清理所有 + 删除过期项目 ${chalk.red('(节省 ' + this._formatSize(globalCacheSize + statSize + projCacheSize + staleSize) + ')')}`,
              value: 'aggressive'
            },
            new inquirer.Separator(),
            { name: '取消', value: null }
          ]
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    if (!selection.mode) {
      Logger.info('操作已取消。');
      return;
    }

    // 二次确认
    let confirm;
    try {
      confirm = await this.prompt([
        {
          type: 'confirm',
          name: 'ok',
          message: `确认执行${selection.mode === 'conservative' ? '保守' : selection.mode === 'moderate' ? '中等' : '激进'}清理？（会自动备份）`,
          default: false
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    if (!confirm.ok) {
      Logger.info('操作已取消。');
      return;
    }

    // 备份
    const backupPath = CLAUDE_JSON_PATH + `.backup-${Date.now()}`;
    await fs.copy(CLAUDE_JSON_PATH, backupPath);
    Logger.success(`已备份到: ${backupPath}`);

    // 执行清理
    const cleaned = JSON.parse(JSON.stringify(data)); // 深拷贝

    // 所有方案都清理全局缓存
    GLOBAL_CACHE_FIELDS.forEach(f => { delete cleaned[f]; });

    if (selection.mode === 'moderate' || selection.mode === 'aggressive') {
      // 清理项目统计
      Object.keys(cleaned.projects || {}).forEach(p => {
        PROJECT_STAT_FIELDS.forEach(f => { delete cleaned.projects[p][f]; });
      });
    }

    if (selection.mode === 'aggressive') {
      // 清理项目缓存
      Object.keys(cleaned.projects || {}).forEach(p => {
        PROJECT_CACHE_FIELDS.forEach(f => { delete cleaned.projects[p][f]; });
      });
      // 删除过期项目
      staleProjects.forEach(p => { delete cleaned.projects[p]; });
    }

    await fs.writeJson(CLAUDE_JSON_PATH, cleaned, { spaces: 2 });

    const newSize = JSON.stringify(cleaned).length;
    const saved = totalSize - newSize;

    Logger.success('清理完成！');
    console.log(chalk.gray(`  清理前: ${this._formatSize(totalSize)}`));
    console.log(chalk.gray(`  清理后: ${this._formatSize(newSize)}`));
    console.log(chalk.green(`  节省了: ${this._formatSize(saved)} (${((saved / totalSize) * 100).toFixed(1)}%)`));
    if (selection.mode === 'aggressive' && staleProjects.length > 0) {
      console.log(chalk.gray(`  删除过期项目: ${staleProjects.length} 个`));
    }
  }

  _calcFieldsSize(obj, fields) {
    return fields.reduce((sum, f) => {
      return sum + (obj[f] !== undefined ? JSON.stringify(obj[f]).length : 0);
    }, 0);
  }

  _calcProjectFieldsSize(projects, fields) {
    let total = 0;
    Object.values(projects).forEach(proj => {
      fields.forEach(f => {
        if (proj[f] !== undefined) total += JSON.stringify(proj[f]).length;
      });
    });
    return total;
  }

  _findStaleProjects(projects) {
    return Object.keys(projects).filter(p => !fs.pathExistsSync('/' + p));
  }

  _formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  }
}

async function claudeCleanCommand(subcommand) {
  const cleaner = new ClaudeCleaner();
  try {
    if (subcommand === 'analyze') {
      await cleaner.analyze();
    } else {
      await cleaner.clean();
    }
  } catch (error) {
    if (!cleaner.isEscCancelled(error)) {
      Logger.error(`操作失败: ${error.message}`);
    }
  } finally {
    cleaner.destroy();
  }
}

module.exports = { claudeCleanCommand, ClaudeCleaner };
