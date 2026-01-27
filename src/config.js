const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

/**
 * @typedef {Object} ProviderConfig
 * @property {string} name - 供应商名称
 * @property {string} displayName - 显示名称
 * @property {string} ideName - IDE 名称 ('claude' 或 'codex')
 * @property {string} authMode - 认证模式
 * @property {string} authToken - 认证令牌
 * @property {string|null} baseUrl - API 基础 URL
 * @property {string|null} tokenType - Token 类型
 * @property {Object|null} models - 模型配置
 * @property {string[]} launchArgs - 启动参数
 * @property {boolean} current - 是否为当前供应商
 * @property {number} usageCount - 使用次数
 * @property {string} lastUsed - 最后使用时间
 * @property {string} createdAt - 创建时间
 */

/**
 * @typedef {Object} Config
 * @property {string} version - 配置版本
 * @property {string|null} currentProvider - 当前供应商名称
 * @property {Object.<string, ProviderConfig>} providers - 供应商配置对象
 */

/**
 * 配置管理器
 * 管理 API 供应商配置的加载、保存和操作
 */
class ConfigManager {
  constructor() {
    /** @type {string} 配置文件路径 */
    this.configPath = path.join(os.homedir(), '.akm-config.json');
    /** @type {Config|null} 配置数据 */
    this.config = null;
    /** @type {boolean} 是否已加载 */
    this.isLoaded = false;
    /** @type {Date|null} 最后修改时间 */
    this.lastModified = null;
    /** @type {Promise<Config>|null} 加载 Promise，防止并发加载 */
    this.loadPromise = null;
  }

  /**
   * 标准化可选字符串值
   * @private
   * @param {*} value - 输入值
   * @returns {string|null} 标准化后的值
   */
  _normalizeOptionalString(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  /**
   * 获取默认配置
   * @returns {Config} 默认配置对象
   */
  getDefaultConfig() {
    return {
      version: '1.0.0',
      currentProvider: null,
      providers: {}
    };
  }

  /**
   * 加载配置文件
   * @param {boolean} [forceReload=false] - 是否强制重新加载
   * @returns {Promise<Config>} 配置对象
   */
  async load(forceReload = false) {
    // 如果正在加载，等待当前加载完成
    if (this.loadPromise) {
      return await this.loadPromise;
    }

    // 如果已经加载且不是强制重载，直接返回缓存
    if (this.isLoaded && !forceReload) {
      // 检查文件是否被外部修改
      const needsReload = await this.checkIfModified();
      if (!needsReload) {
        return this.config;
      }
    }

    // 创建加载Promise
    this.loadPromise = this._performLoad();
    try {
      const result = await this.loadPromise;
      this.loadPromise = null;
      return result;
    } catch (error) {
      this.loadPromise = null;
      throw error;
    }
  }

  async _performLoad() {
    try {
      if (await fs.pathExists(this.configPath)) {
        // 检查并修复文件权限（仅 Unix 系统）
        await this._checkAndFixPermissions();

        let data;
        try {
          data = await fs.readJSON(this.configPath);
        } catch (jsonError) {
          // 配置文件损坏，创建备份并重置
          const backupPath = `${this.configPath}.corrupted.${Date.now()}`;
          await fs.copy(this.configPath, backupPath);
          console.log(chalk.yellow('⚠️  配置文件损坏，已备份到:'), backupPath);

          this.config = this.getDefaultConfig();
          await this._performSave();
          this.isLoaded = true;
          return this.config;
        }

        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          // 配置文件被写成非对象内容时，重置为默认配置
          this.config = this.getDefaultConfig();
          await this._performSave();
        } else {
          this.config = { ...this.getDefaultConfig(), ...data };
        }

        // 迁移旧的认证模式
        this._migrateAuthModes();
        // 修复 current 标记与 currentProvider 不一致的问题（兼容旧版本写入的脏数据）
        this._syncCurrentFlags();

        const stat = await fs.stat(this.configPath);
        this.lastModified = stat.mtime;
      } else {
        this.config = this.getDefaultConfig();
        await this._performSave();
      }
      this.isLoaded = true;
      return this.config;
    } catch (error) {
      if (error.message.includes('Unexpected end of JSON input')) {
        // 处理空文件或损坏的JSON文件
        this.config = this.getDefaultConfig();
        await this._performSave();
        this.isLoaded = true;
        return this.config;
      }
      console.error(chalk.red('❌ 加载配置失败:'), error.message);
      throw error;
    }
  }

  async _checkAndFixPermissions() {
    // Windows 不支持 Unix 文件权限
    if (process.platform === 'win32') {
      return;
    }

    try {
      const stat = await fs.stat(this.configPath);
      const mode = stat.mode & 0o777;

      // 检查权限是否为 600 (仅所有者可读写) 或 400 (仅所有者可读)
      if (mode !== 0o600 && mode !== 0o400) {
        console.log(chalk.yellow('⚠️  配置文件权限不安全:'), mode.toString(8), chalk.gray('建议: 0600'));

        try {
          await fs.chmod(this.configPath, 0o600);
          console.log(chalk.green('✅ 已自动修复文件权限为: 0600'));
        } catch (chmodError) {
          console.log(chalk.red('❌ 无法自动修复权限，请手动执行:'));
          console.log(chalk.gray(`   chmod 600 ${this.configPath}`));
        }
      }
    } catch (error) {
      // 忽略权限检查错误，不影响主流程
    }
  }

  _migrateAuthModes() {
    // 迁移旧配置以保持向后兼容
    if (this.config.providers) {
      Object.keys(this.config.providers).forEach(key => {
        const provider = this.config.providers[key];

        // 迁移旧的 api_token 模式到新的 auth_token 模式
        if (provider.authMode === 'api_token') {
          provider.authMode = 'auth_token';
        }

        // 为旧配置添加 ideName 字段（历史兼容性字段，默认为 'claude'）
        if (!provider.ideName) {
          provider.ideName = 'claude';
        }
      });
    }
  }

  async checkIfModified() {
    try {
      if (!this.lastModified || !await fs.pathExists(this.configPath)) {
        return true;
      }
      const stat = await fs.stat(this.configPath);
      return stat.mtime > this.lastModified;
    } catch (error) {
      return true; // 出错时重新加载
    }
  }

  async save(config = this.config) {
    // 确保配置已加载
    await this.ensureLoaded();
    if (config) {
      this.config = config;
    }
    return await this._performSave();
  }

  async _performSave() {
    try {
      // 保存前确保迁移已应用
      this._migrateAuthModes();
      await fs.writeJSON(this.configPath, this.config, { spaces: 2 });

      // 设置文件权限为 600 (仅所有者可读写)
      if (process.platform !== 'win32') {
        await fs.chmod(this.configPath, 0o600);
      }

      // 更新最后修改时间
      const stat = await fs.stat(this.configPath);
      this.lastModified = stat.mtime;
      return true;
    } catch (error) {
      console.error(chalk.red('❌ 保存配置失败:'), error.message);
      throw error;
    }
  }

  // 确保配置已加载的辅助方法
  async ensureLoaded() {
    if (!this.isLoaded) {
      await this.load();
    }
  }

  _syncCurrentFlags() {
    if (!this.config || !this.config.providers) {
      return;
    }

    const current = this.config.currentProvider;
    const providers = this.config.providers;
    const keys = Object.keys(providers);

    if (current && providers[current]) {
      keys.forEach((key) => {
        providers[key].current = key === current;
      });
      return;
    }

    keys.forEach((key) => {
      providers[key].current = false;
    });
  }

  async addProvider(name, providerConfig) {
    await this.ensureLoaded();

    const existing = this.config.providers[name];
    const now = new Date().toISOString();

    const ideName = providerConfig.ideName || existing?.ideName || 'claude';
    const isCodex = ideName === 'codex';

    const baseUrl = this._normalizeOptionalString(
      providerConfig.baseUrl !== undefined ? providerConfig.baseUrl : existing?.baseUrl
    );

    const authToken = providerConfig.authToken !== undefined ? providerConfig.authToken : existing?.authToken;

    const launchArgs = Array.isArray(providerConfig.launchArgs)
      ? providerConfig.launchArgs
      : (existing?.launchArgs || []);

    // 处理别名
    const alias = providerConfig.alias !== undefined
      ? this._normalizeOptionalString(providerConfig.alias)
      : (existing?.alias || null);

    // 基础字段
    this.config.providers[name] = {
      name,
      displayName: providerConfig.displayName || existing?.displayName || name,
      alias,
      ideName,
      baseUrl,
      authToken,
      launchArgs,
      lastUsedArgs: existing?.lastUsedArgs || null,
      createdAt: existing?.createdAt || now,
      lastUsed: existing?.lastUsed || now,
      usageCount: existing?.usageCount || 0,
      current: Boolean(existing?.current || this.config.currentProvider === name)
    };

    // Claude Code 特定字段
    if (!isCodex) {
      const authMode = providerConfig.authMode || existing?.authMode || 'api_key';
      const tokenType = authMode === 'api_key'
        ? (providerConfig.tokenType ?? existing?.tokenType ?? 'api_key')
        : null;
      const primaryModel = providerConfig.primaryModel !== undefined
        ? providerConfig.primaryModel
        : (existing?.models?.primary ?? null);
      const smallFastModel = providerConfig.smallFastModel !== undefined
        ? providerConfig.smallFastModel
        : (existing?.models?.smallFast ?? null);

      this.config.providers[name].authMode = authMode;
      this.config.providers[name].tokenType = tokenType;
      this.config.providers[name].models = {
        primary: primaryModel,
        smallFast: smallFastModel
      };
    } else {
      // Codex 不需要这些字段，设置为 null 以保持向后兼容
      this.config.providers[name].authMode = null;
      this.config.providers[name].tokenType = null;
      this.config.providers[name].models = null;
    }

    // 如果是第一个供应商或设置为默认，则设为当前供应商
    const shouldSetCurrent = (!existing && Object.keys(this.config.providers).length === 1) || providerConfig.setAsDefault;
    if (shouldSetCurrent) {
      this.config.currentProvider = name;
      this.config.providers[name].lastUsed = now;
    }

    // 保证 current 标记与 currentProvider 一致，避免出现多个 current 或丢失 current 的情况
    this._syncCurrentFlags();

    return await this.save();
  }

  async removeProvider(name) {
    await this.ensureLoaded();

    if (!this.config.providers[name]) {
      throw new Error(`供应商 '${name}' 不存在\n使用 'akm list' 查看所有已配置的供应商`);
    }

    delete this.config.providers[name];

    // 如果删除的是当前供应商，清空当前供应商
    if (this.config.currentProvider === name) {
      this.config.currentProvider = null;
    }

    return await this.save();
  }

  async setCurrentProvider(name) {
    await this.ensureLoaded();

    if (!this.config.providers[name]) {
      throw new Error(`供应商 '${name}' 不存在\n使用 'akm list' 查看所有已配置的供应商`);
    }

    // 重置所有供应商的current状态
    Object.keys(this.config.providers).forEach(key => {
      this.config.providers[key].current = false;
    });

    // 设置新的当前供应商
    this.config.providers[name].current = true;
    this.config.providers[name].lastUsed = new Date().toISOString();
    this.config.currentProvider = name;

    return await this.save();
  }

  /**
   * 更新供应商的上次使用启动参数
   * @param {string} name - 供应商名称
   * @param {string[]} args - 启动参数数组
   * @returns {Promise<void>}
   */
  async updateLastUsedArgs(name, args) {
    await this.ensureLoaded();

    if (!this.config.providers[name]) {
      throw new Error(`供应商 '${name}' 不存在`);
    }

    // 更新上次使用的启动参数
    this.config.providers[name].lastUsedArgs = args;
    this.config.providers[name].lastUsed = new Date().toISOString();

    // 增加使用次数
    this.config.providers[name].usageCount = (this.config.providers[name].usageCount || 0) + 1;

    return await this.save();
  }

  /**
   * 记录供应商使用会话
   * @param {string} name - 供应商名称
   * @param {number} durationMs - 使用时长（毫秒）
   */
  async recordUsageSession(name, durationMs = 0) {
    await this.ensureLoaded();

    if (!this.config.providers[name]) {
      throw new Error(`供应商 '${name}' 不存在`);
    }

    const provider = this.config.providers[name];

    // 初始化统计数据
    if (!provider.stats) {
      provider.stats = {
        totalSessions: 0,
        totalDurationMs: 0,
        averageDurationMs: 0,
        lastSessionDuration: 0,
        firstUsed: new Date().toISOString()
      };
    }

    // 更新统计
    provider.stats.totalSessions = (provider.stats.totalSessions || 0) + 1;
    provider.stats.totalDurationMs = (provider.stats.totalDurationMs || 0) + durationMs;
    provider.stats.lastSessionDuration = durationMs;
    provider.stats.averageDurationMs = Math.round(
      provider.stats.totalDurationMs / provider.stats.totalSessions
    );

    // 更新最后使用时间
    provider.lastUsed = new Date().toISOString();

    return await this.save();
  }

  /**
   * 获取使用统计信息
   * @param {string|null} name - 供应商名称，null 表示获取所有
   * @returns {Object} 统计信息
   */
  getUsageStats(name = null) {
    if (!this.isLoaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    if (name) {
      const provider = this.getProvider(name);
      if (!provider) {
        return null;
      }
      return {
        name: provider.name,
        displayName: provider.displayName,
        usageCount: provider.usageCount || 0,
        lastUsed: provider.lastUsed || null,
        stats: provider.stats || null
      };
    }

    // 返回所有供应商的统计
    const allStats = Object.entries(this.config.providers).map(([name, provider]) => ({
      name,
      displayName: provider.displayName,
      usageCount: provider.usageCount || 0,
      lastUsed: provider.lastUsed || null,
      stats: provider.stats || null
    }));

    // 按使用次数降序排序
    return allStats.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  }

  /**
   * 获取智能推荐的供应商列表
   * @param {Object} options - 选项
   * @param {number} options.limit - 返回数量限制
   * @param {string|null} options.filter - 过滤器 ('codex', 'claude', 或 null)
   * @returns {Array} 推荐的供应商列表
   */
  getRecommendedProviders(options = {}) {
    if (!this.isLoaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const { limit = 5, filter = null } = options;
    let providers = this.listProviders();

    // 应用过滤器
    if (filter === 'codex') {
      providers = providers.filter(p => p.ideName === 'codex');
    } else if (filter === 'claude') {
      providers = providers.filter(p => p.ideName !== 'codex');
    }

    // 计算推荐分数
    const scoredProviders = providers.map(provider => {
      let score = 0;

      // 使用次数权重 (40%)
      const usageCount = provider.usageCount || 0;
      score += usageCount * 0.4;

      // 最近使用时间权重 (30%)
      if (provider.lastUsed) {
        const daysSinceLastUse = (Date.now() - new Date(provider.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
        // 越近使用分数越高，超过30天分数衰减
        const recencyScore = Math.max(0, 30 - daysSinceLastUse) / 30;
        score += recencyScore * 30;
      }

      // 会话平均时长权重 (20%)
      if (provider.stats?.averageDurationMs) {
        // 平均使用时长越长，说明使用越频繁，最高20分
        const avgMinutes = provider.stats.averageDurationMs / (1000 * 60);
        const durationScore = Math.min(avgMinutes / 60, 1) * 20; // 最多1小时算满分
        score += durationScore;
      }

      // 总会话数权重 (10%)
      if (provider.stats?.totalSessions) {
        score += Math.min(provider.stats.totalSessions / 10, 1) * 10;
      }

      return {
        ...provider,
        recommendScore: Math.round(score * 100) / 100
      };
    });

    // 按推荐分数降序排序并限制数量
    return scoredProviders
      .sort((a, b) => b.recommendScore - a.recommendScore)
      .slice(0, limit);
  }

  getProvider(name) {
    // 同步方法，但需要先确保配置已加载
    if (!this.isLoaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }
    return this.config.providers[name];
  }

  /**
   * 通过名称或别名获取供应商
   * @param {string} nameOrAlias - 供应商名称或别名
   * @returns {ProviderConfig|null} 供应商配置对象，未找到返回 null
   */
  getProviderByNameOrAlias(nameOrAlias) {
    // 同步方法，但需要先确保配置已加载
    if (!this.isLoaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    // 先尝试按名称查找
    if (this.config.providers[nameOrAlias]) {
      return this.config.providers[nameOrAlias];
    }

    // 再尝试按别名查找
    const providerEntry = Object.entries(this.config.providers).find(
      ([_, provider]) => provider.alias && provider.alias.toLowerCase() === nameOrAlias.toLowerCase()
    );

    return providerEntry ? providerEntry[1] : null;
  }

  listProviders() {
    // 同步方法，但需要先确保配置已加载
    if (!this.isLoaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }
    return Object.keys(this.config.providers).map(name => ({
      name,
      ...this.config.providers[name]
    }));
  }

  getCurrentProvider() {
    // 同步方法，但需要先确保配置已加载
    if (!this.isLoaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }
    if (!this.config.currentProvider) {
      return null;
    }
    return this.getProvider(this.config.currentProvider);
  }

  async reset() {
    this.config = this.getDefaultConfig();
    this.isLoaded = true;
    return await this._performSave();
  }
}

// 单例实例
const configManager = new ConfigManager();

module.exports = { ConfigManager, configManager };
