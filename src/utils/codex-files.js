const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { validator } = require('./validator');
const { writeFileAtomic } = require('./atomic-file');

const CODEX_DIR_NAME = '.codex';
const CONFIG_TOML_FILE = 'config.toml';
const AUTH_JSON_FILE = 'auth.json';
const BACKUP_DIR_NAME = 'akm-backups';
const SESSION_CACHE_DIR_NAME = 'akm-session-cache';
const BACKUP_LIMIT = 10;
let backupSequence = 0;

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
  const pad = num => String(num).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
    String(now.getMilliseconds()).padStart(3, '0')
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

async function setSecureDirectoryPermissions(directoryPath) {
  if (process.platform === 'win32') {
    return;
  }
  try {
    await fs.chmod(directoryPath, 0o700);
  } catch {
    // 权限收紧失败不应掩盖原始文件备份结果。
  }
}

async function readCodexFiles(codexHome = resolveCodexHome()) {
  const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);
  const configToml = (await fs.pathExists(configTomlPath))
    ? await fs.readFile(configTomlPath, 'utf8')
    : null;
  const authJson = (await fs.pathExists(authJsonPath))
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
  const backupDir = path.join(
    backupRoot,
    `backup-${timestampSuffix()}-${process.pid}-${backupSequence++}`
  );
  await fs.ensureDir(backupRoot);
  await setSecureDirectoryPermissions(backupRoot);
  await fs.ensureDir(backupDir);
  await setSecureDirectoryPermissions(backupDir);

  if (hasConfig) {
    const backupConfigPath = path.join(backupDir, CONFIG_TOML_FILE);
    await fs.copy(configTomlPath, backupConfigPath);
    await setSecurePermissions(backupConfigPath);
  }
  if (hasAuth) {
    const backupAuthPath = path.join(backupDir, AUTH_JSON_FILE);
    await fs.copy(authJsonPath, backupAuthPath);
    await setSecurePermissions(backupAuthPath);
  }

  const backupDirectories = (await fs.readdir(backupRoot))
    .filter(name => name.startsWith('backup-'))
    .sort()
    .reverse();
  await Promise.all(
    backupDirectories.slice(BACKUP_LIMIT).map(name => fs.remove(path.join(backupRoot, name)))
  );

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
 * 清理 AKM 写入的 model_provider 和对应 section，不修改用户自定义配置。
 * @param {string} configToml - 现有的 config.toml 内容
 * @returns {string} 清理后的 TOML 内容
 */
function removeAkmModelProvider(configToml) {
  if (!configToml) return configToml;

  const lines = configToml.split('\n');
  const result = [];
  let inSection = false;
  let skipAkmSection = false;

  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (sectionMatch) {
      inSection = true;
      skipAkmSection = sectionMatch[1] === 'model_providers.akm';
      if (skipAkmSection) {
        continue;
      }
    }

    if (skipAkmSection) {
      continue;
    }

    if (!inSection && /^\s*model_provider\s*=\s*["']akm["']\s*(?:#.*)?$/.test(line)) {
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

function setTopLevelModelProvider(configToml, providerKey) {
  const lines = configToml.split('\n');
  let beforeFirstSection = true;
  let replaced = false;

  const updated = lines.map(line => {
    if (/^\s*\[[^\]]+\]\s*(?:#.*)?$/.test(line)) {
      beforeFirstSection = false;
    }

    if (beforeFirstSection && /^\s*model_provider\s*=/.test(line)) {
      replaced = true;
      return line.replace(/^(\s*model_provider\s*=\s*)["'][^"'\n]*["']/, `$1"${providerKey}"`);
    }

    return line;
  });

  return replaced ? updated.join('\n') : `model_provider = "${providerKey}"\n${configToml}`;
}

function replaceAkmModelProviderSection(configToml, newSection) {
  const lines = configToml.split('\n');
  const result = [];
  let skipAkmSection = false;
  let inserted = false;

  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (sectionMatch) {
      skipAkmSection = sectionMatch[1] === 'model_providers.akm';
      if (skipAkmSection) {
        if (!inserted) {
          result.push(...newSection.split('\n'), '');
          inserted = true;
        }
        continue;
      }
    }

    if (!skipAkmSection) {
      result.push(line);
    }
  }

  if (inserted) {
    return result.join('\n');
  }

  return result.join('\n').trimEnd() + '\n\n' + newSection + '\n';
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
 * 更新 config.toml 中的 model_provider 和对应的 [model_providers.akm] section
 * 使用固定 key "akm" 管理 akm 切换的供应商，不影响用户其他自定义配置
 * @param {string} configToml - 现有的 config.toml 内容
 * @param {string} baseUrl - 新供应商的 base_url
 * @returns {string} 更新后的 config.toml 内容
 */
function updateModelProvider(configToml, baseUrl) {
  if (!configToml) configToml = '';

  const providerKey = 'akm';
  const newSection = [
    `[model_providers.${providerKey}]`,
    `name = "${providerKey}"`,
    `base_url = "${baseUrl}"`,
    'wire_api = "responses"',
    'requires_openai_auth = true'
  ].join('\n');

  const result = setTopLevelModelProvider(configToml, providerKey);
  return replaceAkmModelProviderSection(result, newSection);
}

/**
 * @param {string} apiKey - API Key
 * @returns {string} auth.json 内容
 */
function buildAuthJson(apiKey) {
  return JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: apiKey }, null, 2);
}

async function readExistingAuthJson(authJsonPath) {
  if (!(await fs.pathExists(authJsonPath))) {
    return {};
  }

  try {
    const data = await fs.readJson(authJsonPath);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('认证文件必须是 JSON 对象');
    }
    return data;
  } catch (error) {
    throw new Error(`Codex auth.json 格式无效，已停止写入: ${error.message}`);
  }
}

async function shouldRemoveAuthJsonForChatGptLogin(authJsonPath) {
  if (!(await fs.pathExists(authJsonPath))) {
    return false;
  }

  let data;
  try {
    data = await fs.readJson(authJsonPath);
  } catch {
    return false;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  if (data.auth_mode && data.auth_mode !== 'apikey') {
    return false;
  }

  return data.auth_mode === 'apikey' || Object.prototype.hasOwnProperty.call(data, 'OPENAI_API_KEY');
}

function isChatGptLoginAuth(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      data.auth_mode &&
      data.auth_mode !== 'apikey' &&
      Object.prototype.hasOwnProperty.call(data, 'tokens')
  );
}

function normalizeSessionKey(sessionKey) {
  if (typeof sessionKey !== 'string' || sessionKey.trim().length === 0) {
    return null;
  }

  return sessionKey.trim();
}

function buildSessionCacheAuthPath(codexHome, sessionKey = null) {
  const normalizedKey = normalizeSessionKey(sessionKey);
  if (!normalizedKey) {
    return path.join(codexHome, SESSION_CACHE_DIR_NAME, AUTH_JSON_FILE);
  }

  const safePrefix = normalizedKey
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'official';
  const hash = crypto.createHash('sha256').update(normalizedKey).digest('hex').slice(0, 12);
  return path.join(codexHome, SESSION_CACHE_DIR_NAME, `${safePrefix}-${hash}.auth.json`);
}

async function readJsonObjectIfExists(filePath) {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }

  const data = await fs.readJson(filePath);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  return data;
}

async function cacheChatGptLoginAuth(codexHome, authData, sessionKey = null) {
  if (!isChatGptLoginAuth(authData)) {
    return null;
  }

  const cacheAuthPath = buildSessionCacheAuthPath(codexHome, sessionKey);
  const cacheDir = path.dirname(cacheAuthPath);
  await fs.ensureDir(cacheDir);
  await setSecureDirectoryPermissions(cacheDir);
  await writeFileAtomic(cacheAuthPath, JSON.stringify(authData, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  });
  await setSecurePermissions(cacheAuthPath);
  return cacheAuthPath;
}

async function cacheCurrentChatGptLoginAuth(codexHome, authJsonPath, sessionKey = null) {
  let authData;
  try {
    authData = await readJsonObjectIfExists(authJsonPath);
  } catch {
    return null;
  }

  return await cacheChatGptLoginAuth(codexHome, authData, sessionKey);
}

async function findCachedChatGptLoginAuth(codexHome, sessionKey = null) {
  const candidatePaths = [];
  if (normalizeSessionKey(sessionKey)) {
    candidatePaths.push(buildSessionCacheAuthPath(codexHome, sessionKey));
  } else {
    candidatePaths.push(buildSessionCacheAuthPath(codexHome));
  }

  for (const cacheAuthPath of candidatePaths) {
    try {
      const data = await readJsonObjectIfExists(cacheAuthPath);
      if (isChatGptLoginAuth(data)) {
        return cacheAuthPath;
      }
    } catch {
      // 忽略损坏缓存，继续尝试其他来源。
    }
  }

  return null;
}

async function clearCachedChatGptLoginAuth(codexHome, sessionKey = null) {
  const targetPaths = [buildSessionCacheAuthPath(codexHome, sessionKey)];
  if (normalizeSessionKey(sessionKey)) {
    targetPaths.push(buildSessionCacheAuthPath(codexHome));
  }

  await Promise.all([...new Set(targetPaths)].map(filePath => fs.remove(filePath)));
}

async function shouldRemoveAuthJsonForRelogin(authJsonPath) {
  if (!(await fs.pathExists(authJsonPath))) {
    return false;
  }

  try {
    const data = await readJsonObjectIfExists(authJsonPath);
    return isChatGptLoginAuth(data) || await shouldRemoveAuthJsonForChatGptLogin(authJsonPath);
  } catch {
    return false;
  }
}

async function findLatestChatGptLoginAuthBackup(codexHome) {
  const backupRoot = path.join(codexHome, BACKUP_DIR_NAME);
  if (!(await fs.pathExists(backupRoot))) {
    return null;
  }

  const backupDirectories = (await fs.readdir(backupRoot))
    .filter(name => name.startsWith('backup-'))
    .sort()
    .reverse();

  for (const backupName of backupDirectories) {
    const backupAuthPath = path.join(backupRoot, backupName, AUTH_JSON_FILE);
    if (!(await fs.pathExists(backupAuthPath))) {
      continue;
    }

    try {
      const data = await fs.readJson(backupAuthPath);
      if (isChatGptLoginAuth(data)) {
        return backupAuthPath;
      }
    } catch {
      // 跳过损坏的备份，继续寻找更早的可用登录态。
    }
  }

  return null;
}

async function findChatGptLoginAuthSource(codexHome, sessionKey = null) {
  const cachedAuth = await findCachedChatGptLoginAuth(codexHome, sessionKey);
  if (cachedAuth || normalizeSessionKey(sessionKey)) {
    return cachedAuth;
  }

  return await findLatestChatGptLoginAuthBackup(codexHome);
}

async function readFileSnapshot(filePath) {
  if (!(await fs.pathExists(filePath))) {
    return { exists: false, content: null, mode: 0o600 };
  }

  const [content, stat] = await Promise.all([
    fs.readFile(filePath),
    fs.stat(filePath)
  ]);
  return {
    exists: true,
    content,
    mode: stat.mode & 0o777
  };
}

async function restoreFileSnapshot(filePath, snapshot) {
  if (!snapshot.exists) {
    await fs.remove(filePath);
    return;
  }

  await writeFileAtomic(filePath, snapshot.content, { mode: snapshot.mode });
}

async function rollbackCodexFiles(paths, snapshots) {
  await Promise.all([
    restoreFileSnapshot(paths.authJsonPath, snapshots.authJson),
    restoreFileSnapshot(paths.configTomlPath, snapshots.configToml)
  ]);
}

/**
 * 应用 Codex 配置（写入 auth.json，更新 config.toml 中的 provider 路由）
 * akm 负责：
 *   1. 写入 auth.json（API Key）
 *   2. 更新 config.toml 中的 model_provider 和 [model_providers.akm] section
 *   3. 清理之前错误写入的顶层 api_base_url 字段
 * @param {object} config - 供应商配置
 * @param {object} options - 选项
 * @returns {Promise<{codexHome: string}>}
 */
async function applyCodexConfig(config, options = {}) {
  if (!config || !config.authToken) {
    throw new Error('Codex 配置缺少 API Key');
  }

  if (config.baseUrl) {
    const baseUrlError = validator.validateUrl(config.baseUrl);
    if (baseUrlError) {
      throw new Error(`Codex 基础 URL 无效: ${baseUrlError}`);
    }
  }

  const codexHome = await ensureCodexHome(options.codexHome);
  const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);

  const snapshots = {
    authJson: await readFileSnapshot(authJsonPath),
    configToml: await readFileSnapshot(configTomlPath)
  };

  // 所有旧文件必须在任何写入发生前完成校验和目标内容计算。
  const existingAuthJson = await readExistingAuthJson(authJsonPath);
  const authJsonContent = buildAuthJson(config.authToken);
  let nextConfigToml = null;
  const existingToml = snapshots.configToml.exists
    ? snapshots.configToml.content.toString('utf8')
    : '';

  if (config.baseUrl) {
    nextConfigToml = updateModelProvider(removeTopLevelApiBaseUrl(existingToml), config.baseUrl);
  } else if (snapshots.configToml.exists) {
    const cleanedToml = removeAkmModelProvider(removeTopLevelApiBaseUrl(existingToml));
    if (cleanedToml !== existingToml) {
      nextConfigToml = cleanedToml;
    }
  }

  // API Key 模式会覆盖 auth.json，先持久缓存官方网页登录态，避免备份轮转后丢失。
  await cacheChatGptLoginAuth(codexHome, existingAuthJson);

  // 修改用户 Codex 文件前保留最近备份，便于恢复登录态和自定义配置。
  await backupCodexFiles(codexHome);

  const writeFile = options.writeFile || writeFileAtomic;
  try {
    await writeFile(authJsonPath, authJsonContent, { encoding: 'utf8', mode: 0o600 });
    await setSecurePermissions(authJsonPath);

    if (nextConfigToml !== null) {
      await writeFile(configTomlPath, nextConfigToml, { encoding: 'utf8', mode: 0o600 });
      await setSecurePermissions(configTomlPath);
    }
  } catch (error) {
    try {
      await rollbackCodexFiles({ authJsonPath, configTomlPath }, snapshots);
    } catch (rollbackError) {
      throw new Error(
        `应用 Codex 配置失败且回滚失败: ${error.message}; ${rollbackError.message}`,
        { cause: error }
      );
    }
    throw new Error(`应用 Codex 配置失败，已恢复原文件: ${error.message}`, { cause: error });
  }

  return { codexHome };
}

/**
 * 清理 AKM 的 Codex 配置，让 Codex 使用官方网页登录
 * 删除 auth.json（这样 Codex 会提示登录）
 * 清理 config.toml 中的 [model_providers.akm] 配置
 * @param {object} options - 选项
 * @returns {Promise<{codexHome: string}>}
 */
async function clearCodexAkmConfig(options = {}) {
  try {
    const codexHome = await ensureCodexHome(options.codexHome);
    const { configTomlPath, authJsonPath } = buildCodexPaths(codexHome);
    const sessionKey = normalizeSessionKey(options.sessionKey);
    const forceRelogin = options.forceRelogin === true;
    const cachedAuthPath = forceRelogin ? null : await findChatGptLoginAuthSource(codexHome, sessionKey);

    // 备份当前配置
    await backupCodexFiles(codexHome);
    if (forceRelogin) {
      await clearCachedChatGptLoginAuth(codexHome, sessionKey);
    } else if (!sessionKey) {
      await cacheCurrentChatGptLoginAuth(codexHome, authJsonPath, sessionKey);
    }

    // 只移除 API Key 认证文件，避免破坏 Codex 官方网页登录态。
    const shouldRemoveAuthJson = forceRelogin
      ? await shouldRemoveAuthJsonForRelogin(authJsonPath)
      : sessionKey
        ? await shouldRemoveAuthJsonForRelogin(authJsonPath)
        : await shouldRemoveAuthJsonForChatGptLogin(authJsonPath);
    const shouldRestoreCachedAuth =
      Boolean(cachedAuthPath) && (!(await fs.pathExists(authJsonPath)) || shouldRemoveAuthJson);

    if (shouldRemoveAuthJson || shouldRestoreCachedAuth) {
      if (shouldRestoreCachedAuth) {
        await fs.copy(cachedAuthPath, authJsonPath);
        await setSecurePermissions(authJsonPath);
        await cacheCurrentChatGptLoginAuth(codexHome, authJsonPath, sessionKey);
      } else {
        await fs.remove(authJsonPath);
      }
    }

    // 清理 config.toml 中的 AKM 配置
    if (await fs.pathExists(configTomlPath)) {
      const existingToml = await fs.readFile(configTomlPath, 'utf8');
      const cleanedToml = removeAkmModelProvider(removeTopLevelApiBaseUrl(existingToml));

      if (cleanedToml !== existingToml) {
        await writeFileAtomic(configTomlPath, cleanedToml, { encoding: 'utf8', mode: 0o600 });
        await setSecurePermissions(configTomlPath);
      }
    }

    return { codexHome };
  } catch (error) {
    throw new Error(`清理 Codex AKM 配置失败: ${error.message}`, { cause: error });
  }
}

async function cacheCodexOfficialSession(options = {}) {
  const codexHome = await ensureCodexHome(options.codexHome);
  const { authJsonPath } = buildCodexPaths(codexHome);
  return await cacheCurrentChatGptLoginAuth(codexHome, authJsonPath, options.sessionKey);
}

module.exports = {
  resolveCodexHome,
  buildCodexPaths,
  readCodexFiles,
  applyCodexConfig,
  clearCodexAkmConfig,
  cacheCodexOfficialSession,
  backupCodexFiles,
  removeTopLevelApiBaseUrl,
  removeAkmModelProvider,
  extractBaseUrlFromConfigToml,
  updateModelProvider,
  buildAuthJson
};
