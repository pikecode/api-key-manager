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

/**
 * 移除 config.toml 顶层（第一个 [section] 之前）的 api_base_url 字段
 * 只清理顶层，不影响 [model_providers.xxx] section 内的 base_url
 * @param {string} configToml - 现有的 config.toml 内容
 * @returns {string} 更新后的 config.toml 内容
 */
function removeTopLevelApiBaseUrl(configToml) {
  if (!configToml) return configToml;

  const sectionStart = configToml.search(/^\[/m);
  const topLevel = sectionStart === -1 ? configToml : configToml.slice(0, sectionStart);
  const rest = sectionStart === -1 ? '' : configToml.slice(sectionStart);

  const cleaned = topLevel.replace(/^api_base_url\s*=\s*["']?[^"'\n]*["']?\s*\n?/m, '');
  return cleaned + rest;
}

/**
 * 从 config.toml 中提取当前激活的 model_provider 的 base_url
 * 读取 model_provider 字段，再从对应的 [model_providers.<key>] section 中取 base_url
 * @param {string} configToml - config.toml 内容
 * @returns {string|null} base_url 或 null
 */
function extractBaseUrlFromConfigToml(configToml) {
  if (!configToml) return null;

  // 读取 model_provider = "xxx"
  const providerMatch = configToml.match(/^model_provider\s*=\s*["']([^"']+)["']/m);
  if (!providerMatch) return null;

  const providerKey = providerMatch[1];

  // 在对应 section 中找 base_url
  const sectionRegex = new RegExp(
    `\\[model_providers\\.${providerKey}\\][^\\[]*base_url\\s*=\\s*["']([^"']+)["']`,
    's'
  );
  const urlMatch = configToml.match(sectionRegex);
  return urlMatch ? urlMatch[1] : null;
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
 * 应用 Codex 配置（写入 auth.json，清理 config.toml 中的无效字段）
 * config.toml 由用户自己管理，akm 只负责：
 *   1. 写入 auth.json（API Key）
 *   2. 清理之前错误写入的顶层 api_base_url 字段
 * base_url 通过环境变量 OPENAI_BASE_URL 传递给 Codex 进程
 * @param {object} config - 供应商配置
 * @param {object} options - 选项
 * @returns {Promise<{codexHome: string}>}
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
  if (await fs.pathExists(configTomlPath)) {
    const existingToml = await fs.readFile(configTomlPath, 'utf8');
    const cleanedToml = removeTopLevelApiBaseUrl(existingToml);
    if (cleanedToml !== existingToml) {
      await fs.writeFile(configTomlPath, cleanedToml, 'utf8');
      await setSecurePermissions(configTomlPath);
    }
  }

  return { codexHome };
}

module.exports = {
  resolveCodexHome,
  buildCodexPaths,
  readCodexFiles,
  applyCodexConfig,
  backupCodexFiles,
  removeTopLevelApiBaseUrl,
  extractBaseUrlFromConfigToml,
  buildAuthJson
};
