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

  // 检查是否已经设置了 preferred_auth_method
  const authMethodRegex = /^preferred_auth_method\s*=\s*["']?([^"'\n]+)["']?\s*$/m;
  const match = configToml.match(authMethodRegex);

  if (match) {
    if (match[1].trim() === 'apikey') {
      // 已经是 apikey，无需修改
      return configToml;
    }
    // 替换为 apikey
    return configToml.replace(authMethodRegex, 'preferred_auth_method = "apikey"');
  }

  // 没有找到 preferred_auth_method，在文件开头添加
  return 'preferred_auth_method = "apikey"\n' + configToml;
}

/**
 * 构建 auth.json 内容
 * @param {string} apiKey - API Key
 * @returns {string} auth.json 内容
 */
function buildAuthJson(apiKey) {
  return JSON.stringify({ api_key: apiKey }, null, 2);
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

  // 备份现有配置
  const backupDir = await backupCodexFiles(codexHome);

  // 读取现有 config.toml
  let existingConfigToml = null;
  if (await fs.pathExists(configTomlPath)) {
    existingConfigToml = await fs.readFile(configTomlPath, 'utf8');
  }

  // 确保设置了 preferred_auth_method = "apikey"
  const updatedConfigToml = ensureApiKeyAuthMethod(existingConfigToml);
  await fs.writeFile(configTomlPath, updatedConfigToml, 'utf8');
  await setSecurePermissions(configTomlPath);

  // 写入 auth.json
  const authJsonContent = buildAuthJson(config.authToken);
  await fs.writeFile(authJsonPath, authJsonContent, 'utf8');
  await setSecurePermissions(authJsonPath);

  return { codexHome, backupDir };
}

module.exports = {
  resolveCodexHome,
  buildCodexPaths,
  readCodexFiles,
  applyCodexProfile,
  applyCodexConfig,
  backupCodexFiles,
  ensureApiKeyAuthMethod,
  buildAuthJson
};

