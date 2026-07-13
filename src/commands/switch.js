/**
 * Environment Switcher Command
 * 供应商切换和管理的主命令
 * @module commands/switch
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const Choices = require('inquirer/lib/objects/choices');
const { configManager } = require('../config');
const { Logger } = require('../utils/logger');
const { UIHelper } = require('../utils/ui-helper');
const { BaseCommand } = require('./BaseCommand');
const { validator } = require('../utils/validator');
const { ProviderStatusChecker } = require('../utils/provider-status-checker');
const { AUTH_MODE_DISPLAY, BASE_URL } = require('../constants');
const { StatusHelper } = require('./switch/status-helper');
const { LaunchArgsHelper } = require('./switch/launch-args-helper');
const { ProviderChoicesHelper } = require('./switch/provider-choices-helper');
const { ProviderDetailsHelper } = require('./switch/provider-details-helper');
const { ProviderEditQuestionsHelper } = require('./switch/provider-edit-questions-helper');
const { ensureClaudeSettingsCompatibility } = require('./switch/claude-settings-compatibility');
const { launchProviderProcess, markProviderAsCurrent } = require('./switch/provider-launcher');

/**
 * 环境切换器类
 * 提供交互式界面用于选择、切换、管理和启动 API 供应商
 * @extends BaseCommand
 */
class EnvSwitcher extends BaseCommand {
  constructor() {
    super();
    this.configManager = configManager;
    this.statusChecker = new ProviderStatusChecker();
    this.latestStatusMap = {};
    this.currentPromptContext = null;
    this.activeStatusRefresh = null;
    this.filter = null;
    this.filteredProviders = null;
    this._refreshTimer = null;
  }

  _getPageSize(itemCount) {
    const rows = process.stdout.rows || 24;
    const reserved = 8;
    return Math.min(itemCount, Math.max(5, rows - reserved));
  }

  async validateProvider(providerName) {
    await this.configManager.load();

    // 先尝试按名称查找，再尝试按别名查找
    let provider = this.configManager.getProvider(providerName);
    if (!provider) {
      provider = this.configManager.getProviderByNameOrAlias(providerName);
    }

    if (!provider) {
      throw new Error(`供应商 '${providerName}' 不存在\n使用 'akm list' 查看所有已配置的供应商`);
    }

    return provider;
  }

  async showLaunchArgsSelection(providerName) {
    try {
      this.clearScreen();
      const provider = await this.validateProvider(providerName);
      const isCodex = provider.ideName === 'codex';
      const availableArgs = LaunchArgsHelper.getAvailableLaunchArgs(isCodex);

      // 优先使用上次使用的参数，如果没有则使用默认的 launchArgs
      const defaultLaunchArgs = Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0
        ? provider.lastUsedArgs
        : (Array.isArray(provider.launchArgs) ? provider.launchArgs : []);

      const mergedArgs = LaunchArgsHelper.mergeArgsWithDefaults(availableArgs, defaultLaunchArgs);
      const ideDisplayName = LaunchArgsHelper.getIDEDisplayName(isCodex);

      console.log(UIHelper.createTitle('启动配置', UIHelper.icons.launch));
      console.log();
      console.log(UIHelper.createCard('供应商', UIHelper.formatProvider(provider), UIHelper.icons.info));
      console.log();
      console.log(UIHelper.createHintLine([
        ['空格', '切换选中'],
        ['A', '全选'],
        ['I', '反选'],
        ['Enter', `启动 ${ideDisplayName}`],
        ['ESC', '返回供应商选择']
      ]));
      console.log();

      // 设置 ESC 键监听
      const escListener = this.createESCListener(() => {
        Logger.info('返回供应商选择');
        this.showProviderSelection();
      }, '返回供应商选择');

      // 显示启动参数选择界面
      const choices = [
        {
          type: 'checkbox',
          name: 'selectedArgs',
          message: '选择启动参数:',
          choices: LaunchArgsHelper.formatArgsForDisplay(mergedArgs, UIHelper)
        }
      ];

      let answers;
      try {
        answers = await this.prompt(choices);
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      this.removeESCListener(escListener);

      // 检查互斥参数
      const conflictError = LaunchArgsHelper.validateArgsConflict(answers.selectedArgs, availableArgs);
      if (conflictError) {
        Logger.warning(conflictError);
        return await this.showLaunchArgsSelection(providerName);
      }

      await this.launchProvider(provider, answers.selectedArgs);

    } catch (error) {
      await this.handleError(error, '选择启动参数');
    }
  }

  async launchProvider(provider, selectedLaunchArgs) {
    try {
      const isCodex = provider.ideName === 'codex';

      // Claude Code 才需要检测设置冲突
      if (!isCodex) {
        const shouldContinue = await ensureClaudeSettingsCompatibility(this, provider);
        if (!shouldContinue) {
          return;
        }
      }

      this.clearScreen();
      console.log(UIHelper.createTitle('正在启动', UIHelper.icons.loading));
      console.log();
      const ideDisplayName = isCodex ? 'Codex CLI' : 'Claude Code';
      console.log(UIHelper.createCard('目标供应商', UIHelper.formatProvider(provider), UIHelper.icons.launch));

      if (selectedLaunchArgs.length > 0) {
        console.log(UIHelper.createCard('启动参数', selectedLaunchArgs.join(', '), UIHelper.icons.settings));
      }
      console.log();

      // 显示进度
      const loadingInterval = UIHelper.createLoadingAnimation('正在设置环境...');

      try {
        await markProviderAsCurrent(this.configManager, provider, selectedLaunchArgs);
        UIHelper.clearLoadingAnimation(loadingInterval);

        console.log(UIHelper.createCard('准备就绪', `环境配置完成，正在启动 🚀 ${ideDisplayName}...`, UIHelper.icons.success));
        console.log();
        await launchProviderProcess(provider, selectedLaunchArgs);

      } catch (error) {
        UIHelper.clearLoadingAnimation(loadingInterval);
        throw error;
      }

    } catch (error) {
      await this.handleError(error, '启动供应商');
    }
  }

  /**
   * 快速启动供应商（跳过参数选择）
   * @param {string} providerName - 供应商名称
   * @param {Object} options - 启动选项
   * @param {boolean} options.quick - 使用上次的启动参数
   * @param {boolean} options.noArgs - 不使用任何启动参数
   */
  /**
   * 快速启动供应商（跳过参数选择）
   * @param {string} providerName - 供应商名称或别名
   * @param {Object} options - 启动选项
   * @param {boolean} options.quick - 使用上次的启动参数
   * @param {boolean} options.noArgs - 不使用任何启动参数
   */
  async quickLaunchProvider(providerName, options) {
    try {
      await this.configManager.ensureLoaded();

      // 支持别名查找
      let provider = this.configManager.getProvider(providerName);
      if (!provider) {
        provider = this.configManager.getProviderByNameOrAlias(providerName);
      }

      if (!provider) {
        throw new Error(`供应商 '${providerName}' 不存在\n使用 'akm list' 查看所有已配置的供应商`);
      }

      // 确定使用的启动参数
      let selectedArgs;
      if (options.noArgs) {
        // 使用空参数
        selectedArgs = [];
        console.log(UIHelper.colors.muted('💡 使用空参数启动'));
      } else if (options.quick) {
        // 使用上次的启动参数或默认参数
        selectedArgs = Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0
          ? provider.lastUsedArgs
          : (Array.isArray(provider.launchArgs) ? provider.launchArgs : []);

        if (Array.isArray(provider.lastUsedArgs) && provider.lastUsedArgs.length > 0) {
          console.log(UIHelper.colors.muted('💡 使用上次的启动参数: ' + selectedArgs.join(' ')));
        } else {
          console.log(UIHelper.colors.muted('💡 使用默认启动参数: ' + (selectedArgs.length > 0 ? selectedArgs.join(' ') : '(无)')));
        }
      }

      // 直接启动供应商
      await this.launchProvider(provider, selectedArgs);

    } catch (error) {
      await this.handleError(error, '快速启动供应商');
    }
  }

  async showProviderSelection() {
    try {
      // 并行加载配置和准备界面
      let providers = await this.configManager.ensureLoaded().then(() => this.configManager.listProviders());

      // 应用过滤器
      if (this.filter === 'codex') {
        providers = providers.filter(p => p.ideName === 'codex');
      } else if (this.filter === 'claude') {
        providers = providers.filter(p => p.ideName !== 'codex');
      }

      // 保存过滤后的供应商列表用于状态更新
      this.filteredProviders = providers;

      const initialStatusMap = this._buildInitialStatusMap(providers);
      // 显示欢迎界面（立即渲染）
      this.showWelcomeScreen(providers, initialStatusMap, null);

      if (providers.length === 0) {
        if (this.filter) {
          const filterName = this.filter === 'codex' ? 'Codex CLI' : 'Claude Code';
          Logger.warning(`暂无 ${filterName} 供应商配置`);
        } else {
          Logger.warning('暂无配置的供应商');
        }
        Logger.info('请先运行 "akm add" 添加供应商配置');
        return;
      }

      const choices = this.createProviderChoices(providers, false, initialStatusMap);

      this.currentPromptContext = 'selection';

      // 异步更新供应商状态，不阻塞界面展示
      if (providers.length > 0) {
        this._startStatusRefresh(providers);
      }

      // 添加特殊选项
      choices.push(
        new inquirer.Separator(),
        { name: `${UIHelper.icons.add} 添加新供应商`, value: '__ADD__' },
        { name: `${UIHelper.icons.list} 供应商管理 (编辑/删除)`, value: '__MANAGE__' },
        { name: `${UIHelper.icons.config} 打开配置文件`, value: '__OPEN_CONFIG__' },
        { name: `${UIHelper.icons.error} 退出`, value: '__EXIT__' }
      );

      // 获取当前供应商作为默认选项
      const currentProvider = providers.find(p => p.current);
      const defaultChoice = currentProvider ? currentProvider.name : providers[0]?.name;

      // 构建提示信息
      const filterSuffix = this.filter === 'codex' ? ' (Codex CLI)' : (this.filter === 'claude' ? ' (Claude Code)' : '');
      const promptMessage = `请选择要切换的供应商${filterSuffix} (总计 ${providers.length} 个):`;

      // 设置 ESC 键监听
      const escListener = this.createESCListener(() => {
        Logger.info('退出程序');
        this.showExitScreen();
        this.destroy();
        process.exit(0);
      }, '退出程序');

      const answer = await this.prompt([
        {
          type: 'list',
          name: 'provider',
          message: promptMessage,
          choices,
          default: defaultChoice,
          pageSize: this._getPageSize(choices.length)
        }
      ]);

      if (answer.provider === '__OPEN_CONFIG__') {
        await this.openConfigFile();
        return await this.showProviderSelection();
      }

      const result = await this.handleSelection(answer.provider);
      this.currentPromptContext = null;
      return result;

    } catch (error) {
      await this.handleError(error, '显示供应商选择');
    } finally {
      if (this.currentPromptContext === 'selection') {
        this.currentPromptContext = null;
      }
      this._cancelStatusRefresh();
      this.filteredProviders = null; // 清除保存的供应商列表
    }
  }

  async openConfigFile() {
    const { openAKMConfigFile } = require('../utils/config-opener');
    try {
      await openAKMConfigFile();
    } catch (err) {
      Logger.error(`打开配置文件失败: ${err.message}`);
    }
  }

  showWelcomeScreen(providers, _statusMap = {}, statusError = null) {
    this.clearScreen();

    if (providers.length > 0) {
      console.log(UIHelper.colors.info(`总共 ${providers.length} 个供应商配置`));
    }

    if (statusError) {
      console.log();
      console.log(UIHelper.createCard('状态检测', `检测失败: ${statusError.message}`, UIHelper.icons.warning));
    }

    console.log();
    console.log(UIHelper.createHintLine([
      ['↑ / ↓', '选择供应商'],
      ['Enter', '确认'],
      ['Tab', '切换选项'],
      ['ESC', '退出程序'],
      ['Ctrl+C', '强制退出']
    ]));
    console.log();
  }

  async handleSelection(selection) {
    switch (selection) {
    case '__ADD__':
      // 使用CommandRegistry避免循环引用
      const { registry } = require('../CommandRegistry');
      return await registry.executeCommand('add');
    case '__MANAGE__':
      return await this.showManageMenu();
    case '__EXIT__':
      this.showExitScreen();
      this.destroy();
      process.exit(0);
    default:
      return await this.showLaunchArgsSelection(selection);
    }
  }

  async showQuickSettings() {
    this.clearScreen();
    console.log(UIHelper.createHintLine([
      ['↑ / ↓', '选择项目'],
      ['Enter', '确认'],
      ['ESC', '返回主菜单']
    ]));
    console.log();
    const choices = [
      { name: `${UIHelper.icons.search} 搜索供应商`, value: 'search' },
      { name: `${UIHelper.icons.info} 查看统计`, value: 'stats' },
      { name: `${UIHelper.icons.back} 返回主菜单`, value: 'back' }
    ];

    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('返回供应商选择');
      this.showProviderSelection();
    }, '返回供应商选择');

    let answer;
    try {
      answer = await this.prompt([
        {
          type: 'list',
          name: 'setting',
          message: '快速设置:',
          choices,
          pageSize: 8
        }
      ]);
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }

    this.removeESCListener(escListener);

    switch (answer.setting) {
    case 'search':
      return await this.showSearchProvider();
    case 'batch':
      return await this.showBatchEdit();
    case 'global':
      return await this.showGlobalSettings();
    case 'stats':
      return await this.showStatistics();
    case 'back':
      return await this.showProviderSelection();
    }
  }

  async showBatchEdit() {
    this.clearScreen();
    console.log(UIHelper.createTitle('批量编辑', UIHelper.icons.edit));
    console.log();
    console.log(UIHelper.createTooltip('此功能正在开发中...'));
    console.log();
    console.log(UIHelper.createHintLine([
      ['Enter', '返回上一页'],
      ['ESC', '返回快速设置']
    ]));
    console.log();

    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('返回快速设置');
      this.showQuickSettings();
    }, '返回快速设置');

    try {
      await this.prompt([
        {
          type: 'input',
          name: 'continue',
          message: '按回车键返回...'
        }
      ]);
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }

    this.removeESCListener(escListener);

    return await this.showQuickSettings();
  }

  async showGlobalSettings() {
    this.clearScreen();
    console.log(UIHelper.createTitle('全局设置', UIHelper.icons.settings));
    console.log();
    console.log(UIHelper.createTooltip('此功能正在开发中...'));
    console.log();
    console.log(UIHelper.createHintLine([
      ['Enter', '返回上一页'],
      ['ESC', '返回快速设置']
    ]));
    console.log();

    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('返回快速设置');
      this.showQuickSettings();
    }, '返回快速设置');

    try {
      await this.prompt([
        {
          type: 'input',
          name: 'continue',
          message: '按回车键返回...'
        }
      ]);
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }

    this.removeESCListener(escListener);

    return await this.showQuickSettings();
  }

  async showSearchProvider() {
    this.clearScreen();
    console.log(UIHelper.createHintLine([
      ['Enter', '执行搜索'],
      ['ESC', '返回快速设置']
    ]));
    console.log(UIHelper.createTooltip('示例: claude、demo 或供应商别名'));
    console.log();
    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('返回快速设置');
      this.showQuickSettings();
    }, '返回快速设置');

    let answer;
    try {
      answer = await this.prompt([
        {
          type: 'input',
          name: 'search',
          message: '输入供应商名称搜索:',
          validate: input => input.trim() !== '' || '请输入搜索内容'
        }
      ]);
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }

    this.removeESCListener(escListener);

    await this.configManager.load();
    const providers = this.configManager.listProviders();
    const searchResults = providers.filter(p =>
      p.name.toLowerCase().includes(answer.search.toLowerCase()) ||
      p.displayName.toLowerCase().includes(answer.search.toLowerCase())
    );

    if (searchResults.length === 0) {
      Logger.warning(`未找到匹配"${answer.search}"的供应商，请重新搜索`);
      return await this.showSearchProvider();
    }

    const choices = ProviderChoicesHelper.buildProviderChoices(searchResults, {
      statusMap: this._buildInitialStatusMap(searchResults),
      UIHelper,
      StatusHelper,
      chalk,
      Separator: inquirer.Separator
    });

    choices.push(
      new inquirer.Separator(),
      { name: `${UIHelper.icons.back} 返回设置`, value: 'back' }
    );

    // 获取当前供应商作为默认选项（在搜索结果中）
    const currentProvider = searchResults.find(p => p.current);
    const defaultChoice = currentProvider ? currentProvider.name : searchResults[0]?.name;

    // 设置 ESC 键监听
    const escListener2 = this.createESCListener(() => {
      Logger.info('返回快速设置');
      this.showQuickSettings();
    }, '返回快速设置');

    console.log();
    console.log(UIHelper.createHintLine([
      ['↑ / ↓', '选择结果'],
      ['Enter', '查看详情'],
      ['ESC', '返回快速设置']
    ]));

    let result;
    try {
      result = await this.prompt([
        {
          type: 'list',
          name: 'provider',
          message: '搜索结果:',
          choices,
          default: defaultChoice,
          pageSize: 10
        }
      ]);
    } catch (error) {
      this.removeESCListener(escListener2);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }

    this.removeESCListener(escListener2);

    if (result.provider === 'back') {
      return await this.showQuickSettings();
    }

    return await this.showProviderDetails(result.provider);
  }

  async showStatistics() {
    await this.configManager.load();
    const providers = this.configManager.listProviders();
    this.clearScreen();

    const totalProviders = providers.length;
    const currentProvider = providers.find(p => p.current);
    const totalUsage = providers.reduce((sum, p) => sum + (p.usageCount || 0), 0);
    const mostUsed = providers.reduce((max, p) => (p.usageCount || 0) > (max.usageCount || 0) ? p : max, providers[0]);

    console.log(UIHelper.createTitle('使用统计', UIHelper.icons.info));
    console.log();

    const stats = [
      ['总供应商数', totalProviders],
      ['当前供应商', currentProvider ? currentProvider.displayName : '无'],
      ['总使用次数', totalUsage],
      ['最常用供应商', mostUsed ? mostUsed.displayName : '无'],
      ['创建时间', providers.length > 0 ? UIHelper.formatTime(providers[0].createdAt) : '无']
    ];

    console.log(UIHelper.createTable(['项目', '数据'], stats));
    console.log();
    // 设置 ESC 键监听
    const escListener = this.createESCListener(() => {
      Logger.info('返回快速设置');
      this.showQuickSettings();
    }, '返回快速设置');

    try {
      await this.prompt([
        {
          type: 'list',
          name: 'action',
          message: '操作:',
          choices: [{ name: `${UIHelper.icons.back} 返回`, value: 'back' }]
        }
      ]);
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }

    this.removeESCListener(escListener);
    return await this.showQuickSettings();
  }

  showExitScreen() {
    this.clearScreen();
    console.log(UIHelper.createTitle('感谢使用', UIHelper.icons.home));
    console.log();
    console.log(UIHelper.colors.info('再见！期待下次使用 🎉'));
    console.log();
  }

  async showHelp() {
    this.clearScreen();
    console.log(UIHelper.createTitle('快捷键帮助', UIHelper.icons.info));
    console.log();

    const sections = [
      {
        title: '通用操作',
        items: [
          UIHelper.createShortcutHint('↑ / ↓', '在选项中移动'),
          UIHelper.createShortcutHint('Enter', '确认/继续'),
          UIHelper.createShortcutHint('ESC', '返回上一层'),
          UIHelper.createShortcutHint('Ctrl+C', '随时强制退出')
        ]
      },
      {
        title: '供应商列表',
        items: [
          UIHelper.createShortcutHint('Tab', '切换特殊选项'),
          UIHelper.createShortcutHint('A', '在启动参数列表中全选'),
          UIHelper.createShortcutHint('I', '在启动参数列表中反选')
        ]
      },
      {
        title: '搜索界面',
        items: [
          UIHelper.createShortcutHint('Enter', '执行搜索或确认结果'),
          UIHelper.createShortcutHint('ESC', '取消搜索返回上一页')
        ]
      }
    ];

    sections.forEach(section => {
      console.log(UIHelper.createCard(section.title, section.items.join('\n'), UIHelper.icons.info));
      console.log();
    });

    const escListener = this.createESCListener(() => {
      Logger.info('返回主菜单');
      this.showProviderSelection();
    }, '返回主菜单');

    console.log(UIHelper.createHintLine([
      ['Enter', '返回主菜单'],
      ['ESC', '返回主菜单']
    ]));
    console.log();

    try {
      await this.prompt([
        {
          type: 'list',
          name: 'action',
          message: '操作:',
          choices: [{ name: `${UIHelper.icons.back} 返回主菜单`, value: 'back' }]
        }
      ]);
    } catch (error) {
      this.removeESCListener(escListener);
      if (this.isEscCancelled(error)) {
        return;
      }
      throw error;
    }

    this.removeESCListener(escListener);
    return await this.showProviderSelection();
  }

  async showManageMenu() {
    let escListener;
    try {
      await this.configManager.load();
      const providers = this.configManager.listProviders();
      this.clearScreen();
      console.log(UIHelper.createHintLine([
        ['↑ / ↓', '选择供应商或操作'],
        ['Enter', '确认'],
        ['ESC', '返回主菜单']
      ]));
      console.log();

      console.log(UIHelper.createTitle('供应商管理', UIHelper.icons.list));
      console.log();

      if (providers.length === 0) {
        console.log(UIHelper.createCard('提示', '暂无配置的供应商\n请先运行 "akm add" 添加供应商配置', UIHelper.icons.warning));
        return await this.showProviderSelection();
      }

      const statusMap = this._buildInitialStatusMap(providers);
      const choices = this.createProviderChoices(providers, true, statusMap);

      this.currentPromptContext = 'manage';
      // 管理界面显示所有供应商，更新 filteredProviders 以保持一致
      this.filteredProviders = providers;

      if (providers.length > 0) {
        this._startStatusRefresh(providers);
      }

      // 设置 ESC 键监听
      escListener = this.createESCListener(() => {
        Logger.info('返回供应商选择');
        this.showProviderSelection();
      }, '返回供应商选择');

      let answer;
      try {
        answer = await this.prompt([
          {
            type: 'list',
            name: 'action',
            message: `选择供应商或操作 (总计 ${providers.length} 个):`,
            choices,
            pageSize: this._getPageSize(choices.length)
          }
        ]);
      } catch (error) {
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      this.removeESCListener(escListener);

      this._cancelStatusRefresh();

      const result = await this.handleManageAction(answer.action);
      this.currentPromptContext = null;
      return result;

    } catch (error) {
      await this.handleError(error, '显示供应商管理');
    } finally {
      if (this.currentPromptContext === 'manage') {
        this.currentPromptContext = null;
      }
      this._cancelStatusRefresh();
    }
  }

  createProviderChoices(providers, includeActions = false, statusMap = {}) {
    return ProviderChoicesHelper.buildProviderChoices(providers, {
      includeActions,
      statusMap,
      UIHelper,
      StatusHelper,
      chalk,
      Separator: inquirer.Separator
    });
  }

  _iconForState(state) {
    return StatusHelper.getIconForState(state);
  }

  _formatAvailability(availability) {
    return StatusHelper.formatAvailability(availability);
  }

  _buildInitialStatusMap(providers) {
    return StatusHelper.buildInitialStatusMap(providers, this.latestStatusMap || {});
  }

  _buildErrorStatusMap(providers, error) {
    return StatusHelper.buildErrorStatusMap(providers, error);
  }

  _startStatusRefresh(providers) {
    this._cancelStatusRefresh();

    const refreshToken = Symbol('statusRefresh');
    this.activeStatusRefresh = refreshToken;

    const latestMap = { ...this.latestStatusMap };
    this.statusChecker
      .checkAllStreaming(providers, (providerName, status) => {
        if (this.activeStatusRefresh !== refreshToken) {
          return;
        }
        latestMap[providerName] = status;
        this.latestStatusMap = latestMap;
        this._applyIncrementalStatus(providerName, status, refreshToken);
      })
      .then(finalMap => {
        if (this.activeStatusRefresh !== refreshToken) {
          return;
        }
        this.latestStatusMap = finalMap;
      })
      .catch(error => {
        if (this.activeStatusRefresh !== refreshToken) {
          return;
        }
        Logger.error(`供应商状态检测失败: ${error.message}`);
        const fallback = this._buildErrorStatusMap(providers, error);
        Object.assign(latestMap, fallback);
        this.latestStatusMap = latestMap;
        this._applyStatusUpdate(providers, fallback, error, refreshToken);
      });
  }

  _cancelStatusRefresh() {
    this.activeStatusRefresh = null;
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  _applyStatusUpdate(providers, statusMap, error, refreshToken = null) {
    if (refreshToken && this.activeStatusRefresh !== refreshToken) {
      return;
    }
    if (this.currentPromptContext !== 'selection' && this.currentPromptContext !== 'manage') {
      return;
    }

    const activePrompt = this.activePrompt?.promise?.ui?.activePrompt;
    if (!activePrompt || activePrompt.status === 'answered') {
      return;
    }

    this._refreshPromptChoices(activePrompt, providers, statusMap, { hasError: Boolean(error) });
  }

  _applyIncrementalStatus(providerName, status, refreshToken) {
    if (refreshToken && this.activeStatusRefresh !== refreshToken) {
      return;
    }
    if (this.currentPromptContext !== 'selection' && this.currentPromptContext !== 'manage') {
      return;
    }

    const activePrompt = this.activePrompt?.promise?.ui?.activePrompt;
    if (!activePrompt || activePrompt.status === 'answered') {
      return;
    }

    // 节流：80ms 内的多次回调合并为一次 render，避免高频刷新导致 ANSI 光标错位
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = null;
      if (this.activeStatusRefresh !== refreshToken) return;
      const activeP = this.activePrompt?.promise?.ui?.activePrompt;
      if (!activeP || activeP.status === 'answered') return;
      const providers = this.filteredProviders || this.configManager.listProviders();
      const statusMap = this.latestStatusMap || {};
      this._refreshPromptChoices(activeP, providers, statusMap);
    }, 80);
  }

  _refreshPromptChoices(activePrompt, providers, statusMap, options = {}) {
    const includeActions = this.currentPromptContext === 'manage';
    const updatedChoicesBase = this.createProviderChoices(providers, includeActions, statusMap);
    const updatedChoices = [...updatedChoicesBase];

    if (!includeActions) {
      updatedChoices.push(
        new inquirer.Separator(),
        { name: `${UIHelper.icons.add} 添加新供应商`, value: '__ADD__' },
        { name: `${UIHelper.icons.list} 供应商管理 (编辑/删除)`, value: '__MANAGE__' },
        { name: `${UIHelper.icons.config} 打开配置文件`, value: '__OPEN_CONFIG__' },
        { name: `${UIHelper.icons.error} 退出`, value: '__EXIT__' }
      );
    }

    const previousValue = this._getActivePromptPreviousValue(activePrompt);

    activePrompt.opt.choices = new Choices(updatedChoices, activePrompt.answers);

    this._restorePromptSelection(activePrompt, previousValue);
    activePrompt.opt.message = this._buildStatusPromptMessage(providers.length, options.hasError);

    activePrompt.render();
  }

  _getActivePromptPreviousValue(activePrompt) {
    try {
      return activePrompt.opt.choices?.getChoice(activePrompt.selected)?.value ?? null;
    } catch {
      return null;
    }
  }

  _restorePromptSelection(activePrompt, previousValue) {
    if (previousValue != null) {
      const newIndex = activePrompt.opt.choices.realChoices.findIndex(choice => choice.value === previousValue);
      if (newIndex >= 0) {
        activePrompt.selected = newIndex;
      } else if (activePrompt.selected >= activePrompt.opt.choices.realLength) {
        activePrompt.selected = Math.max(activePrompt.opt.choices.realLength - 1, 0);
      }
    } else if (activePrompt.selected >= activePrompt.opt.choices.realLength) {
      activePrompt.selected = Math.max(activePrompt.opt.choices.realLength - 1, 0);
    }
  }

  _buildStatusPromptMessage(providerCount, hasError = false) {
    const errorSuffix = hasError ? '，状态检测失败，使用默认配置' : '';
    if (this.currentPromptContext === 'selection') {
      return `请选择要切换的供应商 (总计 ${providerCount} 个${errorSuffix}):`;
    }
    if (this.currentPromptContext === 'manage') {
      return `选择供应商或操作 (总计 ${providerCount} 个${errorSuffix}):`;
    }
    return '';
  }

  async handleManageAction(action) {
    switch (action) {
    case 'back':
      return await this.showProviderSelection();
    case 'exit':
      Logger.info('👋 再见！');
      this.destroy();
      process.exit(0);
    default:
      // 如果选择的是供应商名称，显示该供应商的详细信息
      return await this.showProviderDetails(action);
    }
  }

  async showProviderDetails(providerName) {
    let escListener;
    try {
      const provider = await this.validateProvider(providerName);
      this.clearScreen();

      console.log(UIHelper.createTitle('供应商详情', UIHelper.icons.info));
      console.log();
      console.log(UIHelper.createHintLine([
        ['↑ / ↓', '选择操作'],
        ['Enter', '确认'],
        ['ESC', '返回管理列表']
      ]));
      console.log();

      const details = ProviderDetailsHelper.buildDetailsRows(provider, {
        authModeDisplay: AUTH_MODE_DISPLAY,
        baseUrl: BASE_URL,
        formatTime: UIHelper.formatTime
      });

      console.log(UIHelper.createTable(['项目', '信息'], details));
      console.log();

      const launchArgsText = ProviderDetailsHelper.formatLaunchArgs(provider);
      if (launchArgsText) {
        console.log(UIHelper.createCard('默认启动参数', launchArgsText, UIHelper.icons.settings));
        console.log();
      }

      // 设置 ESC 键监听
      escListener = this.createESCListener(() => {
        Logger.info('返回管理列表');
        this.showManageMenu();
      }, '返回管理列表');

      let answer;
      try {
        answer = await this.prompt([
          {
            type: 'list',
            name: 'action',
            message: '选择操作:',
            choices: ProviderDetailsHelper.buildActionChoices(UIHelper.icons)
          }
        ]);
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      switch (answer.action) {
      case 'back':
        // 移除 ESC 键监听
        this.removeESCListener(escListener);
        return await this.showManageMenu();
      case 'edit':
        // 移除 ESC 键监听
        this.removeESCListener(escListener);
        return await this.editProvider(providerName);
      case 'remove':
        // 移除 ESC 键监听
        this.removeESCListener(escListener);
        return await this.removeProvider(providerName);
      case 'launch':
        // 移除 ESC 键监听
        this.removeESCListener(escListener);
        return await this.showLaunchArgsSelection(providerName);
      }

    } catch (error) {
      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      await this.handleError(error, '显示供应商详情');
    }
  }

  async editProvider(providerName) {
    let escListener;
    try {
      await this.configManager.load();
      let provider = this.configManager.getProvider(providerName);
      this.clearScreen();

      if (!provider) {
        Logger.error(`供应商 '${providerName}' 不存在`);
        return await this.showManageMenu();
      }

      // 设置 ESC 键监听
      escListener = this.createESCListener(() => {
        Logger.info('取消编辑供应商');
        this.showManageMenu();
      }, '取消编辑');

      // 根据 IDE 类型构建不同的问卷
      const isCodex = provider.ideName === 'codex';
      const questions = ProviderEditQuestionsHelper.buildQuestions(provider, validator);

      let answers;
      try {
        answers = await this.prompt(questions);
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      const originalName = provider.name;
      const newName = answers.name;

      // 处理重命名逻辑
      if (newName !== originalName) {
        await this.configManager.ensureLoaded();
        const providersMap = this.configManager.config.providers;

        // 如果新名称已存在且不是当前供应商，则报错
        if (providersMap[newName]) {
          Logger.error(`供应商名称 '${newName}' 已存在，请使用其他名称`);
          return await this.showManageMenu();
        }

        providersMap[newName] = {
          ...provider,
          name: newName
        };

        delete providersMap[originalName];

        if (this.configManager.config.currentProvider === originalName) {
          this.configManager.config.currentProvider = newName;
          providersMap[newName].current = true;
        }

        provider = providersMap[newName];
      }

      // 更新供应商配置
      provider.displayName = newName;
      provider.baseUrl = answers.baseUrl;
      provider.authToken = answers.authToken;

      // Claude Code 特定的更新
      if (!isCodex) {
        provider.authMode = answers.authMode;

        // 更新模型配置
        if (!provider.models) {
          provider.models = {};
        }
        provider.models.primary = answers.primaryModel || null;
        provider.models.smallFast = answers.smallFastModel || null;
      } else {
        // 确保 Codex 配置不包含 Claude 特定字段
        provider.authMode = null;
        provider.models = null;
      }

      // 确保 ideName 不被改变
      provider.ideName = isCodex ? 'codex' : 'claude';

      await this.configManager.save();
      Logger.success(`供应商 '${newName}' 已更新`);

      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      return await this.showManageMenu();

    } catch (error) {
      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      Logger.error(`编辑供应商失败: ${error.message}`);
      throw error;
    }
  }

  async removeProvider(providerName) {
    let escListener;
    try {
      await this.configManager.load();
      const provider = this.configManager.getProvider(providerName);
      this.clearScreen();

      if (!provider) {
        Logger.error(`供应商 '${providerName}' 不存在`);
        return await this.showManageMenu();
      }

      // 设置 ESC 键监听
      escListener = this.createESCListener(() => {
        Logger.info('取消删除供应商');
        this.showManageMenu();
      }, '取消删除');

      let confirm;
      try {
        confirm = await this.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `确定要删除供应商 '${providerName}' 吗?`,
            default: false
          }
        ]);
      } catch (error) {
        this.removeESCListener(escListener);
        if (this.isEscCancelled(error)) {
          return;
        }
        throw error;
      }

      if (confirm.confirmed) {
        await this.configManager.removeProvider(providerName);
        Logger.success(`供应商 '${providerName}' 已删除`);
      } else {
        Logger.info('删除操作已取消');
      }

      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      return await this.showManageMenu();

    } catch (error) {
      // 移除 ESC 键监听
      this.removeESCListener(escListener);
      Logger.error(`删除供应商失败: ${error.message}`);
      throw error;
    }
  }
}

async function switchCommand(providerName, options = {}) {
  const switcher = new EnvSwitcher();
  switcher.filter = options.filter || null;

  try {
    if (providerName) {
      // 如果指定了 quick 或 noArgs 选项，直接启动
      if (options.quick || options.noArgs) {
        await switcher.quickLaunchProvider(providerName, options);
      } else {
        await switcher.showLaunchArgsSelection(providerName);
      }
    } else {
      await switcher.showProviderSelection();
    }
  } finally {
    // 确保资源清理
    switcher.destroy();
  }
}

async function editCommand(providerName) {
  const switcher = new EnvSwitcher();

  try {
    await switcher.editProvider(providerName);
  } finally {
    // 确保资源清理
    switcher.destroy();
  }
}

module.exports = { switchCommand, editCommand, EnvSwitcher };
