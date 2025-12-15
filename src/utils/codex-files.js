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

module.exports = {
  resolveCodexHome,
  buildCodexPaths,
  readCodexFiles,
  applyCodexProfile,
  backupCodexFiles
};

