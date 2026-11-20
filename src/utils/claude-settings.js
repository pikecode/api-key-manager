const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { writeFileAtomic, writeJsonAtomic } = require('./atomic-file');

const CONFLICT_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL'
];

const SETTINGS_FILE_NAMES = ['settings.local.json', 'settings.json'];

function unique(array) {
  return Array.from(new Set(array.filter(Boolean)));
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
    pad(now.getSeconds())
  ].join('');
}

function resolveCandidatePaths() {
  const candidates = [];

  if (process.env.CLAUDE_SETTINGS_PATH) {
    candidates.push(process.env.CLAUDE_SETTINGS_PATH);
  }

  const cwd = process.cwd();
  if (cwd) {
    for (const fileName of SETTINGS_FILE_NAMES) {
      candidates.push(path.join(cwd, '.claude', fileName));
    }
  }

  const homeDir = os.homedir();
  if (homeDir) {
    for (const fileName of SETTINGS_FILE_NAMES) {
      candidates.push(path.join(process.env.CLAUDE_CONFIG_DIR || path.join(homeDir, '.claude'), fileName));
    }
  }

  if (process.platform === 'win32') {
    const baseDirs = unique([process.env.APPDATA, process.env.LOCALAPPDATA]);
    for (const baseDir of baseDirs) {
      if (!baseDir) {
        continue;
      }
      for (const fileName of SETTINGS_FILE_NAMES) {
        candidates.push(path.join(baseDir, 'claude', fileName));
      }
    }
  }

  return unique(candidates);
}

async function loadSettingsFile() {
  const candidates = resolveCandidatePaths();
  const files = [];
  for (const candidate of candidates) {
    try {
      if (await fs.pathExists(candidate)) {
        const data = await fs.readJson(candidate);
        files.push({ path: candidate, data });
      }
    } catch (error) {
      throw new Error(`读取 Claude 设置文件失败 (${candidate}): ${error.message}`);
    }
  }
  return files;
}

function detectConflictKeys(settings, provider) {
  if (!settings || typeof settings !== 'object') {
    return [];
  }
  const env = settings.env;
  if (!env || typeof env !== 'object') {
    return [];
  }

  const keys = provider?.compatibility?.thinkingMode === 'disabled'
    ? [...CONFLICT_ENV_KEYS, 'MAX_THINKING_TOKENS']
    : CONFLICT_ENV_KEYS;
  return keys.filter(key => Object.prototype.hasOwnProperty.call(env, key));
}

async function backupSettingsFile(filePath, snapshot = null) {
  const dir = path.dirname(filePath);
  const backupName = `${path.basename(filePath, '.json')}.backup-${timestampSuffix()}-${crypto.randomUUID()}.json`;
  const backupPath = path.join(dir, backupName);
  await writeFileAtomic(backupPath, snapshot ?? await fs.readFile(filePath), { mode: 0o600 });
  return backupPath;
}

function clearConflictKeys(settings, keys) {
  if (!settings || !settings.env) {
    return settings;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(settings.env, key)) {
      delete settings.env[key];
    }
  }

  if (Object.keys(settings.env).length === 0) {
    delete settings.env;
  }

  return settings;
}

async function saveSettingsFile(filePath, data) {
  await writeJsonAtomic(filePath, data, { spaces: 2, mode: 0o600 });
}

async function applySettingsCleanup(conflict, provider) {
  const { filePath } = conflict;
  const snapshot = await fs.readFile(filePath);
  const settings = JSON.parse(snapshot.toString('utf8').replace(/^\uFEFF/, ''));
  const keys = detectConflictKeys(settings, provider);
  if (keys.some(key => !conflict.keys.includes(key))) {
    throw new Error(`Claude 设置新增了未经确认的冲突变量，请重新启动后再处理：${filePath}`);
  }
  if (!keys.length) return null;

  const backupPath = await backupSettingsFile(filePath, snapshot);
  const updated = clearConflictKeys(settings, keys);
  await writeFileAtomic(filePath, JSON.stringify(updated, null, 2), {
    mode: 0o600,
    beforeRename: async () => {
      if (!snapshot.equals(await fs.readFile(filePath))) {
        throw new Error(`Claude 设置在写入前发生变化，请重试：${filePath}`);
      }
    }
  });
  return backupPath;
}

async function findSettingsConflict(provider) {
  const files = await loadSettingsFile();
  const conflicts = files.map(fileInfo => ({
    filePath: fileInfo.path,
    settings: fileInfo.data,
    keys: detectConflictKeys(fileInfo.data, provider)
  })).filter(conflict => conflict.keys.length);
  return conflicts.length ? { ...conflicts[0], conflicts } : null;
}

module.exports = {
  findSettingsConflict,
  backupSettingsFile,
  clearConflictKeys,
  saveSettingsFile,
  applySettingsCleanup
};
