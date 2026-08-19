const spawn = require('cross-spawn');
const { sanitizeEnvValue, clearTerminal } = require('./env-utils');
const { applyCodexConfig, clearCodexAkmConfig } = require('./codex-files');
const { assertSupportedLaunchArgs } = require('./launch-args');
const { validator } = require('./validator');

/**
 * 构建 Codex CLI 环境变量
 * @param {object} config - 供应商配置
 * @returns {object} 环境变量对象
 */
function buildCodexEnvVariables(config) {
  const env = { ...process.env };

  delete env.OPENAI_API_KEY;
  delete env.OPENAI_BASE_URL;
  delete env.OPENAI_MODEL;

  try {
    // 确定认证模式，默认为 api_key（向后兼容）
    const authMode = config.authMode || 'api_key';

    // chatgpt_login 模式不设置环境变量，使用 Codex 官方登录
    if (authMode === 'chatgpt_login') {
      return env;
    }

    // api_key 模式使用 OpenAI 环境变量
    if (config.authToken) {
      env.OPENAI_API_KEY = sanitizeEnvValue(config.authToken);
    }

    if (config.baseUrl) {
      const baseUrlError = validator.validateUrl(config.baseUrl);
      if (baseUrlError) {
        throw new Error(baseUrlError);
      }
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

  // 确定认证模式，默认为 api_key（向后兼容）
  const authMode = config.authMode || 'api_key';

  // api_key 模式需要 authToken，chatgpt_login 模式不需要
  if (authMode === 'api_key' && !config.authToken) {
    throw new Error(`供应商 '${config.name}' 未配置 API Key，请使用 'akm edit ${config.name}' 添加`);
  }

  assertSupportedLaunchArgs('codex', launchArgs);

  // 在写入 Codex 配置文件前完成全部输入校验。
  const env = buildCodexEnvVariables(config);

  // 根据认证模式处理配置文件
  if (authMode === 'api_key') {
    // 写入 ~/.codex/config.toml 和 ~/.codex/auth.json
    // 确保 Codex CLI 使用 API Key 认证方式
    await applyCodexConfig(config);
  } else if (authMode === 'chatgpt_login') {
    // chatgpt_login 模式：清理 AKM 的配置，让 Codex 使用官方登录
    await clearCodexAkmConfig();
  }

  // 处理参数：子命令放前面，选项放后面
  const rawArgs = Array.isArray(launchArgs) ? [...launchArgs] : [];
  const subcommands = rawArgs.filter(arg => !arg.startsWith('-'));
  const options = rawArgs.filter(arg => arg.startsWith('-'));
  const args = [...subcommands, ...options];

  clearTerminal();

  if (authMode === 'chatgpt_login') {
    console.log('\n启动 Codex CLI (官方网页登录)...\n');
  } else {
    console.log('\n启动 Codex CLI...\n');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      stdio: ['inherit', 'inherit', 'pipe'],
      env,
      shell: false
    });

    let stderrOutput = '';

    // 捕获 stderr 用于检查错误信息
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderrOutput += output;
      process.stderr.write(data);
    });

    child.on('close', (code, signal) => {
      if (code === 0 || code === 130 || signal === 'SIGINT') {
        resolve();
      } else {
        // 检查是否是"会话被锁定"或"已有活跃写入者"的错误
        const errorOutput = stderrOutput.toLowerCase();
        const isResumeLaunch = rawArgs.includes('resume');
        const isSessionLockedError =
          errorOutput.includes('already has an active writer') ||
          errorOutput.includes('failed to resume session') ||
          errorOutput.includes('thread already has an active');

        if (isSessionLockedError || (isResumeLaunch && code === 1)) {
          const error = new Error('Codex 会话被锁定或无法恢复\n提示: 已尝试不带 resume 参数重新开始');
          error.code = 'SESSION_LOCKED';
          reject(error);
        } else {
          reject(new Error(`Codex CLI 异常退出，退出代码: ${code}\n提示: 请检查 API 配置是否正确`));
        }
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
