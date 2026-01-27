/**
 * Benchmark Command
 * 多供应商性能测试和对比
 * @module commands/benchmark
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { ProviderStatusChecker } = require('../utils/provider-status-checker');
const { UIHelper } = require('../utils/ui-helper');

/**
 * 性能测试器
 */
class BenchmarkRunner {
  constructor() {
    this.statusChecker = new ProviderStatusChecker();
  }

  /**
   * 运行单个供应商的性能测试
   * @param {Object} provider - 供应商配置
   * @param {number} rounds - 测试轮数
   * @returns {Promise<Object>} 测试结果
   */
  async runTest(provider, rounds = 3) {
    const results = {
      provider: provider.name,
      displayName: provider.displayName,
      ideName: provider.ideName,
      rounds: [],
      average: 0,
      min: Infinity,
      max: 0,
      successRate: 0,
      errors: []
    };

    for (let i = 0; i < rounds; i++) {
      try {
        const status = await this.statusChecker.check(provider, { skipCache: true });

        const result = {
          round: i + 1,
          latency: status.latency,
          state: status.state,
          success: status.state === 'online'
        };

        results.rounds.push(result);

        if (status.latency !== null) {
          results.min = Math.min(results.min, status.latency);
          results.max = Math.max(results.max, status.latency);
        }

        // 间隔一下避免频繁请求
        if (i < rounds - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        results.rounds.push({
          round: i + 1,
          latency: null,
          state: 'error',
          success: false,
          error: error.message
        });
        results.errors.push(error.message);
      }
    }

    // 计算统计
    const successfulRounds = results.rounds.filter(r => r.success);
    results.successRate = (successfulRounds.length / rounds) * 100;

    if (successfulRounds.length > 0) {
      const totalLatency = successfulRounds.reduce((sum, r) => sum + r.latency, 0);
      results.average = totalLatency / successfulRounds.length;
    }

    if (results.min === Infinity) {
      results.min = 0;
    }

    return results;
  }

  /**
   * 运行多个供应商的性能测试
   * @param {Array} providers - 供应商列表
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 测试结果
   */
  async runBenchmark(providers, options = {}) {
    const { rounds = 3, parallel = false } = options;
    const results = [];

    if (parallel) {
      // 并行测试
      const testPromises = providers.map(provider => this.runTest(provider, rounds));
      results.push(...await Promise.all(testPromises));
    } else {
      // 串行测试
      for (const provider of providers) {
        const result = await this.runTest(provider, rounds);
        results.push(result);
      }
    }

    // 按平均延迟排序
    results.sort((a, b) => {
      if (a.successRate === 0) return 1;
      if (b.successRate === 0) return -1;
      return a.average - b.average;
    });

    return results;
  }

  /**
   * 生成性能测试报告
   * @param {Array} results - 测试结果
   * @returns {string} 报告内容
   */
  generateReport(results) {
    const lines = [];

    lines.push('# 供应商性能测试报告');
    lines.push('');
    lines.push(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`测试供应商数: ${results.length}`);
    lines.push(`测试轮数: ${results[0]?.rounds.length || 0}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // 排行榜
    lines.push('## 性能排行榜');
    lines.push('');
    lines.push('| 排名 | 供应商 | 平均延迟 | 最小延迟 | 最大延迟 | 成功率 |');
    lines.push('|------|--------|----------|----------|----------|--------|');

    results.forEach((result, index) => {
      const rank = index + 1;
      const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      const avgLatency = result.average > 0 ? `${Math.round(result.average)}ms` : 'N/A';
      const minLatency = result.min > 0 ? `${Math.round(result.min)}ms` : 'N/A';
      const maxLatency = result.max > 0 ? `${Math.round(result.max)}ms` : 'N/A';
      const successRate = `${Math.round(result.successRate)}%`;

      lines.push(`| ${rankMedal} | ${result.displayName} (${result.provider}) | ${avgLatency} | ${minLatency} | ${maxLatency} | ${successRate} |`);
    });

    lines.push('');
    lines.push('---');
    lines.push('');

    // 详细测试结果
    lines.push('## 详细测试结果');
    lines.push('');

    results.forEach(result => {
      lines.push(`### ${result.displayName} (${result.provider})`);
      lines.push('');
      lines.push(`- **IDE类型**: ${result.ideName === 'codex' ? 'Codex CLI' : 'Claude Code'}`);
      lines.push(`- **平均延迟**: ${result.average > 0 ? Math.round(result.average) + 'ms' : 'N/A'}`);
      lines.push(`- **延迟范围**: ${result.min > 0 ? Math.round(result.min) : 'N/A'}ms ~ ${result.max > 0 ? Math.round(result.max) : 'N/A'}ms`);
      lines.push(`- **成功率**: ${Math.round(result.successRate)}%`);
      lines.push('');

      // 各轮测试结果
      lines.push('**各轮测试结果:**');
      lines.push('');
      lines.push('| 轮次 | 状态 | 延迟 |');
      lines.push('|------|------|------|');

      result.rounds.forEach(round => {
        const status = round.success ? '✓ 成功' : '✗ 失败';
        const latency = round.latency !== null ? `${Math.round(round.latency)}ms` : 'N/A';
        lines.push(`| ${round.round} | ${status} | ${latency} |`);
      });

      if (result.errors.length > 0) {
        lines.push('');
        lines.push('**错误信息:**');
        result.errors.forEach(error => {
          lines.push(`- ${error}`);
        });
      }

      lines.push('');
    });

    lines.push('---');
    lines.push('');
    lines.push('_报告由 AKM (API Key Manager) 生成_');

    return lines.join('\n');
  }

  /**
   * 显示性能测试结果
   * @param {Array} results - 测试结果
   */
  displayResults(results) {
    console.log(chalk.blue('\n📊 性能测试排行榜'));
    console.log(chalk.gray('═'.repeat(80)));
    console.log();

    const currentProvider = configManager.getCurrentProvider();

    results.forEach((result, index) => {
      const rank = index + 1;
      const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      const isCurrent = result.provider === currentProvider?.name;
      const statusIcon = isCurrent ? '✅' : '🔹';
      const ideTag = result.ideName === 'codex' ? chalk.cyan('[Codex]') : chalk.magenta('[Claude]');
      const nameColor = isCurrent ? chalk.green : chalk.white;

      console.log(`${rankMedal} ${statusIcon} ${ideTag} ${nameColor(result.provider)} (${result.displayName})`);

      if (result.successRate > 0) {
        const avgColor = result.average < 1000 ? chalk.green : result.average < 3000 ? chalk.yellow : chalk.red;
        console.log(`   平均延迟: ${avgColor(Math.round(result.average) + 'ms')} | 范围: ${Math.round(result.min)}ms ~ ${Math.round(result.max)}ms | 成功率: ${chalk.cyan(Math.round(result.successRate) + '%')}`);
      } else {
        console.log(`   ${chalk.red('所有测试失败')}`);
        if (result.errors.length > 0) {
          console.log(`   错误: ${chalk.red(result.errors[0])}`);
        }
      }

      console.log();
    });

    // 统计总结
    console.log(chalk.gray('═'.repeat(80)));
    console.log(chalk.blue('统计总结:'));

    const successful = results.filter(r => r.successRate > 0);
    const fastest = results[0];
    const slowest = results[results.length - 1];

    console.log(`  可用供应商: ${chalk.cyan(successful.length)}/${results.length}`);
    if (successful.length > 0) {
      console.log(`  最快: ${chalk.green(fastest.displayName)} (${Math.round(fastest.average)}ms)`);
      if (successful.length > 1 && slowest.successRate > 0) {
        console.log(`  最慢: ${chalk.yellow(slowest.displayName)} (${Math.round(slowest.average)}ms)`);
      }
    }
  }
}

/**
 * 性能测试命令
 * @param {Object} options - 选项
 */
async function benchmarkCommand(options = {}) {
  try {
    await configManager.ensureLoaded();
    let providers = configManager.listProviders();

    // 应用过滤器
    if (options.filter === 'codex') {
      providers = providers.filter(p => p.ideName === 'codex');
    } else if (options.filter === 'claude') {
      providers = providers.filter(p => p.ideName !== 'codex');
    }

    if (providers.length === 0) {
      Logger.warning('暂无可测试的供应商');
      return;
    }

    const titleSuffix = options.filter === 'codex' ? ' (Codex CLI)' : (options.filter === 'claude' ? ' (Claude Code)' : '');
    console.log(chalk.blue(`\n🏁 性能测试${titleSuffix}`));
    console.log(chalk.gray('═'.repeat(80)));
    console.log();

    const rounds = options.rounds || 3;
    const parallel = options.parallel || false;

    console.log(chalk.yellow(`将测试 ${providers.length} 个供应商, 每个供应商 ${rounds} 轮`));
    console.log(chalk.yellow(`测试模式: ${parallel ? '并行' : '串行'}`));
    console.log();

    const runner = new BenchmarkRunner();

    let completedCount = 0;
    const total = providers.length * rounds;

    // 创建进度显示（仅在串行模式）
    let progressInterval;
    if (!parallel) {
      progressInterval = setInterval(() => {
        const percent = Math.round((completedCount / total) * 100);
        process.stdout.write(`\r测试中... ${completedCount}/${total} (${percent}%)`);
      }, 100);
    }

    try {
      const results = await runner.runBenchmark(providers, {
        rounds,
        parallel
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(50) + '\r');
      }

      // 显示结果
      runner.displayResults(results);

      // 保存报告
      if (options.report) {
        const reportContent = runner.generateReport(results);
        const reportPath = options.report === true
          ? path.join(os.homedir(), `.akm-benchmark-${Date.now()}.md`)
          : options.report;

        await fs.writeFile(reportPath, reportContent, 'utf8');
        console.log();
        console.log(chalk.green(`✓ 报告已保存到: ${reportPath}`));
      }

    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      Logger.error(`性能测试失败: ${error.message}`);
    }

  } catch (error) {
    Logger.error(`性能测试执行失败: ${error.message}`);
    throw error;
  }
}

module.exports = { benchmarkCommand, BenchmarkRunner };
