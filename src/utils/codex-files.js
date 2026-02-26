const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const CODEX_DIR_NAME = '.codex';
const CONFIG_TOML_FILE = 'config.toml';
const AUTH_JSON_FILE = 'auth.json';
const BACKUP_DIR_NAME = 'akm-backups';

function resolveCodexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), CODEX_DIR_NAME);
}

function buildCodexPaths(codexHome = resolveCodexHome()) {
  return {
    codexHome,
    configTomlPath: path.join(codexHome, CONFIG_TOML_FILE),
    authJsonPath: path.join(codexHome, AUTH_JSON_FILE)
  };
}

function timestampSuffix() {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');
}

async function ensureCodexHome(codexHome = resolveCodexHome()) {
  await fs.ensureDir(codexHome);
  return codexHome;
}

async function setSecurePermissions(filePath) {
  if (process.platform === 'win32') {
    return;
  }
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // 忽略权限设置失败
  }
}

async function readCodexFiles(codexHome = resolveCodexHome()) {
  const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);
  const configToml = await fs.pathExists(configTomlPath)
    ? await fs.readFile(configTomlPath, 'utf8')
    : null;
  const authJson = await fs.pathExists(authJsonPath)
    ? await fs.readFile(authJsonPath, 'utf8')
    : null;

  return {
    codexHome,
    configToml,
    authJson
  };
}

async function backupCodexFiles(codexHome = resolveCodexHome()) {
  const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);
  const hasConfig = await fs.pathExists(configTomlPath);
  const hasAuth = await fs.pathExists(authJsonPath);
  if (!hasConfig && !hasAuth) {
    return null;
  }

  const backupRoot = path.join(codexHome, BACKUP_DIR_NAME);
  const backupDir = path.join(backupRoot, `backup-${timestampSuffix()}`);
  await fs.ensureDir(backupDir);

  if (hasConfig) {
    await fs.copy(configTomlPath, path.join(backupDir, CONFIG_TOML_FILE));
  }
  if (hasAuth) {
    await fs.copy(authJsonPath, path.join(backupDir, AUTH_JSON_FILE));
  }

  return backupDir;
}

async function applyCodexProfile(profile, options = {}) {
  if (!profile || (profile.configToml == null && profile.authJson == null)) {
    throw new Error('Codex 配置为空，无法切换');
  }

  const codexHome = await ensureCodexHome(profile.codexHome || options.codexHome);
  const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);

  const backupDir = await backupCodexFiles(codexHome);

  if (profile.configToml != null) {
    await fs.writeFile(configTomlPath, profile.configToml, 'utf8');
    await setSecurePermissions(configTomlPath);
  }

  if (profile.authJson != null) {
    await fs.writeFile(authJsonPath, profile.authJson, 'utf8');
    await setSecurePermissions(authJsonPath);
  }

  return { codexHome, backupDir };
}

/**
 * 确保 config.toml 中设置了 preferred_auth_method = "apikey"
 * @param {string} configToml - 现有的 config.toml 内容
 * @returns {string} 更新后的 config.toml 内容
 */
function ensureApiKeyAuthMethod(configToml) {
  if (!configToml) {
    // 如果没有 config.toml，创建一个最小配置
    return 'preferred_auth_method = "apikey"\n';
  }

  // 移除所有已存在的 preferred_auth_method 行（防止重复）
  const authMethodRegex = /^preferred_auth_method\s*=\s*["']?[^"'\n]*["']?\s*\n?/gm;
  let cleanedConfig = configToml.replace(authMethodRegex, '');

  // 清理可能存在的损坏字符（如孤立的 { 或空行堆积）
  cleanedConfig = cleanedConfig.replace(/^[{}]+\s*\n?/gm, '');
  cleanedConfig = cleanedConfig.replace(/^\n{3,}/gm, '\n\n');

  // 在文件开头添加 preferred_auth_method
  const newLine = 'preferred_auth_method = "apikey"\n';

  // 如果清理后为空，直接返回新配置
  if (!cleanedConfig.trim()) {
    return newLine;
  }

  return newLine + cleanedConfig;
}

/**
 * 更新 config.toml 中的 api_base_url
 * @param {string} configToml - 现有的 config.toml 内容
 * @param {string|null} baseUrl - API base URL，null 时移除该配置
 * @returns {string} 更新后的 config.toml 内容
 */
function updateApiBaseUrl(configToml, baseUrl) {
  if (!configToml) {
    configToml = '';
  }

  // 匹配 api_base_url 配置行
  const baseUrlRegex = /^api_base_url\s*=\s*["']?[^"'\n]*["']?\s*\n?/m;

  if (baseUrl) {
    // 需要设置 api_base_url
    const newLine = `api_base_url = "${baseUrl}"`;

    if (configToml.match(baseUrlRegex)) {
      // 替换现有的
      return configToml.replace(baseUrlRegex, newLine + '\n');
    }
    // 空配置，直接返回新行
    if (configToml.length === 0) {
      return newLine + '\n';
    }
    // 找到第一个 section [xxx]，在它之前插入
    const sectionMatch = configToml.match(/^\[/m);
    if (sectionMatch) {
      const insertPos = configToml.indexOf(sectionMatch[0]);
      const before = configToml.slice(0, insertPos);
      const after = configToml.slice(insertPos);
      // 确保前面有换行分隔
      const separator = before.endsWith('\n') ? '' : '\n';
      return before + separator + newLine + '\n\n' + after;
    }
    // 没有 section，在文件末尾添加
    const separator = configToml.endsWith('\n') ? '' : '\n';
    return configToml + separator + newLine + '\n';
  } else {
    // 移除 api_base_url（使用官方 API）
    return configToml.replace(baseUrlRegex, '');
  }
}

/**
 * 构建 auth.json 内容
 * @param {string} apiKey - API Key
 * @returns {string} auth.json 内容
 */
function buildAuthJson(apiKey) {
  return JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2);
}

/**
 * 应用 Codex 配置（写入 config.toml 和 auth.json）
 * 用于切换供应商时确保配置文件正确
 * @param {object} config - 供应商配置
 * @param {object} options - 选项
 * @returns {Promise<{codexHome: string, backupDir: string|null}>}
 */
async function applyCodexConfig(config, options = {}) {
  if (!config || !config.authToken) {
    throw new Error('Codex 配置缺少 API Key');
  }

  const codexHome = await ensureCodexHome(options.codexHome);
  const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);

  // 写入 auth.json（API Key）
  const authJsonContent = buildAuthJson(config.authToken);
  await fs.writeFile(authJsonPath, authJsonContent, 'utf8');
  await setSecurePermissions(authJsonPath);

  // 清理 config.toml 中 akm 之前错误写入的顶层 api_base_url 字段
  // Codex 的 base_url 在 [model_providers.<key>] section 里，akm 不应修改
  if (await fs.pathExists(configTomlPath)) {
    const existingToml = await fs.readFile(configTomlPath, 'utf8');
    const cleanedToml = updateApiBaseUrl(existingToml, null); // 移除顶层 api_base_url
    if (cleanedToml !== existingToml) {
      await fs.writeFile(configTomlPath, cleanedToml, 'utf8');
      await setSecurePermissions(configTomlPath);
    }
  }

  return { codexHome, backupDir: null };
}

module.exports = {
  resolveCodexHome,
  buildCodexPaths,
  readCodexFiles,
  applyCodexProfile,
  applyCodexConfig,
  backupCodexFiles,
  ensureApiKeyAuthMethod,
  updateApiBaseUrl,
  buildAuthJson
};

