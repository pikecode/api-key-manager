const spawn = require('cross-spawn');
const { sanitizeEnvValue, clearTerminal } = require('./env-utils');
const { applyCodexConfig } = require('./codex-files');

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

  // 写入 ~/.codex/config.toml 和 ~/.codex/auth.json
  // 确保 Codex CLI 使用 API Key 认证方式
  // 这样用户也可以直接运行 `codex` 命令而无需通过 akm
  await applyCodexConfig(config);

  // 同时设置环境变量，确保兼容性
  // 环境变量优先级更高，作为双重保障
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
