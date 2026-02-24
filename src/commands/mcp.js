/**
 * MCP Server Management Command
 * 管理 ~/.claude.json 中的 MCP 服务器配置
 * @module commands/mcp
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');
const { BaseCommand } = require('./BaseCommand');

const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');

// 预设 MCP 服务器模板
const MCP_PRESETS = [
  {
    name: 'Playwright',
    description: '浏览器自动化测试',
    config: {
      command: 'npx',
      args: ['-y', '@playwright/mcp@latest'],
      type: 'stdio'
    }
  },
  {
    name: 'filesystem',
    description: '文件系统访问',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', os.homedir()],
      type: 'stdio'
    }
  },
  {
    name: 'memory',
    description: '知识图谱记忆',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      type: 'stdio'
    }
  },
  {
    name: 'fetch',
    description: '网页内容获取',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-fetch'],
      type: 'stdio'
    }
  }
];

class McpManager extends BaseCommand {
  constructor() {
    super();
  }

  /**
   * 读取 ~/.claude.json
   */
  async _readClaudeJson() {
    if (!await fs.pathExists(CLAUDE_JSON_PATH)) {
      return {};
    }
    return await fs.readJson(CLAUDE_JSON_PATH);
  }

  /**
   * 写入 ~/.claude.json
   */
  async _writeClaudeJson(data) {
    await fs.writeJson(CLAUDE_JSON_PATH, data, { spaces: 2 });
  }

  /**
   * 获取 mcpServers 对象
   */
  _getMcpServers(data) {
    return data.mcpServers || {};
  }

  /**
   * 列出所有 MCP 服务器
   */
  async list() {
    const data = await this._readClaudeJson();
    const servers = this._getMcpServers(data);
    const names = Object.keys(servers);

    console.log(UIHelper.createTitle('MCP 服务器列表', '🔌'));
    console.log();

    if (names.length === 0) {
      Logger.info('暂无 MCP 服务器配置。使用 akm mcp add 添加。');
      return;
    }

    names.forEach(name => {
      const server = servers[name];
      const cmd = server.command || '(unknown)';
      const args = (server.args || []).join(' ');
      const envKeys = Object.keys(server.env || {});
      const envInfo = envKeys.length > 0 ? chalk.gray(` env: ${envKeys.join(', ')}`) : '';

      console.log(`  ${chalk.cyan('●')} ${chalk.bold(name)}`);
      console.log(`    ${chalk.gray('命令:')} ${cmd} ${args}`);
      if (server.type) {
        console.log(`    ${chalk.gray('类型:')} ${server.type}`);
      }
      if (envInfo) {
        console.log(`    ${envInfo}`);
      }
      console.log();
    });

    console.log(chalk.gray(`  共 ${names.length} 个 MCP 服务器`));
  }

  /**
   * 添加 MCP 服务器
   */
  async add() {
    console.log(UIHelper.createTitle('添加 MCP 服务器', '➕'));
    console.log();

    let sourceChoice;
    try {
      sourceChoice = await this.prompt([
        {
          type: 'list',
          name: 'source',
          message: '选择添加方式:',
          choices: [
            { name: '📦 从预设模板选择', value: 'preset' },
            { name: '✏️  手动配置', value: 'manual' },
            new inquirer.Separator(),
            { name: '取消', value: null }
          ]
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    if (!sourceChoice.source) {
      Logger.info('操作已取消。');
      return;
    }

    const data = await this._readClaudeJson();
    const servers = this._getMcpServers(data);

    if (sourceChoice.source === 'preset') {
      await this._addFromPreset(data, servers);
    } else {
      await this._addManual(data, servers);
    }
  }

  async _addFromPreset(data, servers) {
    // 过滤掉已存在的预设
    const available = MCP_PRESETS.filter(p => !servers[p.name]);

    if (available.length === 0) {
      Logger.info('所有预设模板已添加。可使用手动配置添加自定义服务器。');
      return;
    }

    let selection;
    try {
      selection = await this.prompt([
        {
          type: 'checkbox',
          name: 'presets',
          message: '选择要添加的 MCP 服务器:',
          choices: available.map(p => ({
            name: `${p.name} - ${p.description}`,
            value: p.name
          })),
          validate: input => input.length > 0 ? true : '请至少选择一个'
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    if (!data.mcpServers) {
      data.mcpServers = {};
    }

    selection.presets.forEach(name => {
      const preset = MCP_PRESETS.find(p => p.name === name);
      data.mcpServers[name] = { ...preset.config, env: {} };
    });

    await this._writeClaudeJson(data);
    Logger.success(`已添加 ${selection.presets.length} 个 MCP 服务器: ${selection.presets.join(', ')}`);
  }

  async _addManual(data, servers) {
    let config;
    try {
      config = await this.prompt([
        {
          type: 'input',
          name: 'name',
          message: '服务器名称:',
          validate: input => {
            if (!input || !input.trim()) return '名称不能为空';
            if (servers[input.trim()]) return `'${input.trim()}' 已存在`;
            return true;
          }
        },
        {
          type: 'input',
          name: 'command',
          message: '启动命令 (如 npx, node, python):',
          validate: input => input && input.trim() ? true : '命令不能为空'
        },
        {
          type: 'input',
          name: 'args',
          message: '命令参数 (空格分隔):',
          default: ''
        },
        {
          type: 'list',
          name: 'type',
          message: '通信类型:',
          choices: [
            { name: 'stdio (标准输入输出)', value: 'stdio' },
            { name: 'sse (Server-Sent Events)', value: 'sse' }
          ],
          default: 'stdio'
        },
        {
          type: 'input',
          name: 'env',
          message: '环境变量 (格式: KEY=VALUE, 多个用逗号分隔, 留空跳过):',
          default: ''
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    const name = config.name.trim();
    const args = config.args.trim() ? config.args.trim().split(/\s+/) : [];
    const env = {};
    if (config.env.trim()) {
      config.env.split(',').forEach(pair => {
        const [key, ...valueParts] = pair.trim().split('=');
        if (key) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    if (!data.mcpServers) {
      data.mcpServers = {};
    }

    data.mcpServers[name] = {
      command: config.command.trim(),
      args,
      env,
      type: config.type
    };

    await this._writeClaudeJson(data);
    Logger.success(`MCP 服务器 '${name}' 已添加。`);
  }

  /**
   * 编辑 MCP 服务器
   */
  async edit() {
    const data = await this._readClaudeJson();
    const servers = this._getMcpServers(data);
    const names = Object.keys(servers);

    if (names.length === 0) {
      Logger.warning('暂无 MCP 服务器配置。');
      return;
    }

    let selection;
    try {
      selection = await this.prompt([
        {
          type: 'list',
          name: 'name',
          message: '选择要编辑的 MCP 服务器:',
          choices: [
            ...names.map(n => ({
              name: `${n} ${chalk.gray('(' + (servers[n].command || '') + ')')}`,
              value: n
            })),
            new inquirer.Separator(),
            { name: '取消', value: null }
          ]
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    if (!selection.name) {
      Logger.info('操作已取消。');
      return;
    }

    const name = selection.name;
    const server = servers[name];

    let updates;
    try {
      updates = await this.prompt([
        {
          type: 'input',
          name: 'command',
          message: '启动命令:',
          default: server.command || '',
          validate: input => input && input.trim() ? true : '命令不能为空'
        },
        {
          type: 'input',
          name: 'args',
          message: '命令参数 (空格分隔):',
          default: (server.args || []).join(' ')
        },
        {
          type: 'list',
          name: 'type',
          message: '通信类型:',
          choices: [
            { name: 'stdio (标准输入输出)', value: 'stdio' },
            { name: 'sse (Server-Sent Events)', value: 'sse' }
          ],
          default: server.type || 'stdio'
        },
        {
          type: 'input',
          name: 'env',
          message: '环境变量 (KEY=VALUE, 逗号分隔):',
          default: Object.entries(server.env || {}).map(([k, v]) => `${k}=${v}`).join(', ')
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    const args = updates.args.trim() ? updates.args.trim().split(/\s+/) : [];
    const env = {};
    if (updates.env.trim()) {
      updates.env.split(',').forEach(pair => {
        const [key, ...valueParts] = pair.trim().split('=');
        if (key) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    data.mcpServers[name] = {
      command: updates.command.trim(),
      args,
      env,
      type: updates.type
    };

    await this._writeClaudeJson(data);
    Logger.success(`MCP 服务器 '${name}' 已更新。`);
  }

  /**
   * 删除 MCP 服务器
   */
  async remove() {
    const data = await this._readClaudeJson();
    const servers = this._getMcpServers(data);
    const names = Object.keys(servers);

    if (names.length === 0) {
      Logger.warning('暂无 MCP 服务器配置。');
      return;
    }

    let selection;
    try {
      selection = await this.prompt([
        {
          type: 'checkbox',
          name: 'names',
          message: '选择要删除的 MCP 服务器:',
          choices: names.map(n => ({
            name: `${n} ${chalk.gray('(' + (servers[n].command || '') + ' ' + (servers[n].args || []).join(' ') + ')')}`,
            value: n
          })),
          validate: input => input.length > 0 ? true : '请至少选择一个'
        }
      ]);
    } catch (error) {
      if (this.isEscCancelled(error)) return;
      throw error;
    }

    // 二次确认
    let confirm;
    try {
      confirm = await this.prompt([
        {
          type: 'confirm',
          name: 'ok',
          message: `确认删除 ${selection.names.length} 个 MCP 服务器: ${selection.names.join(', ')}？`,
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

    selection.names.forEach(name => {
      delete data.mcpServers[name];
    });

    await this._writeClaudeJson(data);
    Logger.success(`已删除 ${selection.names.length} 个 MCP 服务器: ${selection.names.join(', ')}`);
  }
}

const VALID_SUBCOMMANDS = ['list', 'add', 'edit', 'remove'];

async function mcpCommand(subcommand) {
  const manager = new McpManager();
  try {
    if (!VALID_SUBCOMMANDS.includes(subcommand)) {
      Logger.error(`未知子命令: ${subcommand}`);
      console.log(chalk.gray(`  可用子命令: ${VALID_SUBCOMMANDS.join(', ')}`));
      return;
    }
    await manager[subcommand]();
  } catch (error) {
    if (!manager.isEscCancelled(error)) {
      Logger.error(`MCP 操作失败: ${error.message}`);
    }
  } finally {
    manager.destroy();
  }
}

module.exports = { mcpCommand, McpManager, MCP_PRESETS };
