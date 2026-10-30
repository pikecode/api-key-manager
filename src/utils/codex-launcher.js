const spawn = require('cross-spawn');
const { sanitizeEnvValue, clearTerminal } = require('./env-utils');
const {
  applyCodexConfig,
  clearCodexAkmConfig,
  cacheCodexOfficialSession
} = require('./codex-files');
const { assertSupportedLaunchArgs } = require('./launch-args');
const { validator } = require('./validator');
const { acquireCodexLock } = require('./codex-lock');

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
 * @param {object} options - 启动选项
 * @param {boolean} options.forceRelogin - 是否强制清理官方登录态并重新网页登录
 * @returns {Promise<void>}
 */
async function executeCodexWithEnv(config, launchArgs = [], launchOptions = {}) {
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
  const releaseLock = await acquireCodexLock();
  try {
    // 根据认证模式处理配置文件
    if (authMode === 'api_key') {
      // 写入 ~/.codex/config.toml 和 ~/.codex/auth.json。
      await applyCodexConfig(config);
    } else if (authMode === 'chatgpt_login') {
      // 清理 AKM 的配置，让 Codex 使用官方登录。
      await clearCodexAkmConfig({
        sessionKey: config.name,
        forceRelogin: launchOptions.forceRelogin === true
      });
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

    return await new Promise((resolve, reject) => {
      const child = spawn('codex', args, {
        stdio: ['inherit', 'inherit', 'pipe'],
        env,
        shell: false
      });

      let stderrOutput = '';
      let spawnFailed = false;
      const forwardInterrupt = () => child.kill('SIGINT');
      const forwardTerminate = () => child.kill('SIGTERM');
      process.on('SIGINT', forwardInterrupt);
      process.on('SIGTERM', forwardTerminate);
      const cleanupSignals = () => {
        process.removeListener('SIGINT', forwardInterrupt);
        process.removeListener('SIGTERM', forwardTerminate);
      };

      // 捕获 stderr 用于检查错误信息
      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderrOutput += output;
        process.stderr.write(data);
      });

      child.on('close', async (code, signal) => {
        cleanupSignals();
        if (spawnFailed) return;
        try {
          if (authMode === 'chatgpt_login') {
            await cacheCodexOfficialSession({ sessionKey: config.name });
          }
        } catch (error) {
          reject(new Error(`保存 Codex 官方登录 Session 失败: ${error.message}`));
          return;
        }
        if (code === 0 || code === 130 || signal === 'SIGINT') {
          resolve();
        } else {
          // 只对明确的历史错误自动回退，未知错误交给用户决定。
          const errorOutput = stderrOutput.toLowerCase();
          const isSessionLockedError =
          errorOutput.includes('already has an active writer') ||
          errorOutput.includes('failed to resume session') ||
          errorOutput.includes('thread already has an active');

          if (isSessionLockedError) {
            const error = new Error('Codex 会话被锁定或无法恢复');
            error.code = 'SESSION_LOCKED';
            reject(error);
          } else {
            const error = new Error(`Codex CLI 异常退出，退出代码: ${code}${stderrOutput.trim() ? `\n${stderrOutput.trim()}` : ''}`);
            if (rawArgs.includes('resume') && code === 1) error.code = 'RESUME_FAILED';
            reject(error);
          }
        }
      });

      child.on('error', (error) => {
        spawnFailed = true;
        cleanupSignals();
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 codex 命令\n请先安装 Codex CLI: npm i -g @openai/codex 或 brew install --cask codex'));
        } else {
          reject(new Error(`启动 Codex CLI 失败: ${error.message}`));
        }
      });
    });
  } finally {
    await releaseLock();
  }
}

module.exports = { executeCodexWithEnv, buildCodexEnvVariables };
