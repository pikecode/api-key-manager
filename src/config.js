const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

class ConfigManager {
  constructor() {
    this.configPath = path.join(os.homedir(), '.akm-config.json');
    this.config = null; // 延迟加载
    this.isLoaded = false;
    this.lastModified = null;
    this.loadPromise = null; // 防止并发加载
  }

  getDefaultConfig() {
    return {
      version: '1.0.0',
      currentProvider: null,
      providers: {}
    };
  }

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

  async addProvider(name, providerConfig) {
    await this.ensureLoaded();

    this.config.providers[name] = {
      name,
      displayName: providerConfig.displayName || name,
      ideName: providerConfig.ideName || 'claude', // 历史兼容性字段
      baseUrl: providerConfig.baseUrl,
      authToken: providerConfig.authToken,
      authMode: providerConfig.authMode || 'api_key',
      tokenType: providerConfig.tokenType || 'api_key', // 仅在 authMode 为 'api_key' 时使用
      launchArgs: providerConfig.launchArgs || [],
      models: {
        primary: providerConfig.primaryModel || null,
        smallFast: providerConfig.smallFastModel || null
      },
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      current: false
    };

    // 如果是第一个供应商或设置为默认，则设为当前供应商
    if (Object.keys(this.config.providers).length === 1 || providerConfig.setAsDefault) {
      // 重置所有供应商的current状态
      Object.keys(this.config.providers).forEach(key => {
        this.config.providers[key].current = false;
      });
      
      // 设置新的当前供应商
      this.config.providers[name].current = true;
      this.config.providers[name].lastUsed = new Date().toISOString();
      this.config.currentProvider = name;
    }

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

  getProvider(name) {
    // 同步方法，但需要先确保配置已加载
    if (!this.isLoaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }
    return this.config.providers[name];
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

module.exports = { ConfigManager };