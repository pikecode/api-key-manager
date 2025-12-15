const spawn = require('cross-spawn');

/**
 * 清理环境变量值，移除危险字符
 * @param {string} value - 要清理的值
 * @returns {string} 清理后的值
 */
function sanitizeEnvValue(value) {
  if (typeof value !== 'string') {
    throw new Error('环境变量值必须是字符串');
  }

  // 移除控制字符
  let cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // 检测可能的 shell 命令注入
  if (/[;&|`$()]/.test(cleaned)) {
    throw new Error('环境变量值包含潜在不安全的字符');
  }

  return cleaned;
}

function clearTerminal() {
  if (!process.stdout || typeof process.stdout.write !== 'function') {
    return;
  }

  try {
    process.stdout.write('\x1bc');
  } catch (error) {
    // 某些终端可能不支持 RIS 序列，忽略即可
  }

  const sequence = process.platform === 'win32'
    ? '\x1b[3J\x1b[2J\x1b[0f'
    : '\x1b[3J\x1b[2J\x1b[H';
  try {
    process.stdout.write(sequence);
  } catch (error) {
    // 忽略清屏失败
  }
}

/**
 * 构建 Codex CLI 环境变量
 * @param {object} config - 供应商配置
 * @returns {object} 环境变量对象
 */
function buildCodexEnvVariables(config) {
  const env = { ...process.env };

  try {
    // Codex CLI 使用 OpenAI 环境变量
    if (config.authToken) {
      env.OPENAI_API_KEY = sanitizeEnvValue(config.authToken);
    }

    if (config.baseUrl) {
      env.OPENAI_BASE_URL = sanitizeEnvValue(config.baseUrl);
    }

    // 支持自定义模型
    if (config.models && config.models.primary) {
      env.OPENAI_MODEL = sanitizeEnvValue(config.models.primary);
    }

    return env;
  } catch (error) {
    throw new Error(`配置验证失败: ${error.message}\n请使用 'akm edit ${config.name}' 修复配置`);
  }
}

/**
 * 使用环境变量注入方式执行 Codex CLI
 * @param {object} config - 供应商配置
 * @param {string[]} launchArgs - 启动参数
 * @returns {Promise<void>}
 */
async function executeCodexWithEnv(config, launchArgs = []) {
  if (!config || config.ideName !== 'codex') {
    throw new Error('无效的 Codex 供应商配置');
  }

  if (!config.authToken) {
    throw new Error(`供应商 '${config.name}' 未配置 API Key，请使用 'akm edit ${config.name}' 添加`);
  }

  const env = buildCodexEnvVariables(config);

  // 处理参数：子命令放前面，选项放后面
  const rawArgs = Array.isArray(launchArgs) ? [...launchArgs] : [];
  const subcommands = rawArgs.filter(arg => !arg.startsWith('-'));
  const options = rawArgs.filter(arg => arg.startsWith('-'));
  const args = [...subcommands, ...options];

  clearTerminal();

  console.log('\n启动 Codex CLI...\n');

  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      stdio: 'inherit',
      env,
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Codex CLI 退出，退出代码: ${code}\n提示: 请检查 API 配置是否正确`));
      }
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('找不到 codex 命令\n请先安装 Codex CLI: npm i -g @openai/codex 或 brew install --cask codex'));
      } else {
        reject(new Error(`启动 Codex CLI 失败: ${error.message}`));
      }
    });
  });
}

module.exports = { executeCodexWithEnv, buildCodexEnvVariables };
