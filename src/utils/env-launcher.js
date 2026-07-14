const spawn = require('cross-spawn');
const { sanitizeEnvValue, clearTerminal } = require('./env-utils');
const { assertSupportedLaunchArgs } = require('./launch-args');
const { validator } = require('./validator');

function buildEnvVariables(config) {
  const env = { ...process.env };

  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  delete env.ANTHROPIC_MODEL;
  delete env.ANTHROPIC_SMALL_FAST_MODEL;

  try {
    if (config.baseUrl) {
      const baseUrlError = validator.validateUrl(config.baseUrl);
      if (baseUrlError) {
        throw new Error(baseUrlError);
      }
    }

    // Claude Code 配置
    if (config.authMode === 'auth_token') {
      if (config.baseUrl) {
        env.ANTHROPIC_BASE_URL = sanitizeEnvValue(config.baseUrl);
      }
      env.ANTHROPIC_AUTH_TOKEN = sanitizeEnvValue(config.authToken);
    } else {
      // api_key 模式（默认）：baseUrl 为空时使用官方 Anthropic API
      if (config.baseUrl) {
        env.ANTHROPIC_BASE_URL = sanitizeEnvValue(config.baseUrl);
      }
      env.ANTHROPIC_API_KEY = sanitizeEnvValue(config.authToken);
    }

    if (config.models && config.models.primary) {
      env.ANTHROPIC_MODEL = sanitizeEnvValue(config.models.primary);
    }

    if (config.models && config.models.smallFast) {
      env.ANTHROPIC_SMALL_FAST_MODEL = sanitizeEnvValue(config.models.smallFast);
    }

    return env;
  } catch (error) {
    throw new Error(`配置验证失败: ${error.message}\n请使用 'akm edit ${config.name}' 修复配置`);
  }
}

async function executeWithEnv(config, launchArgs = []) {
  assertSupportedLaunchArgs('claude', launchArgs);
  const env = buildEnvVariables(config);
  const args = [...launchArgs];

  clearTerminal();

  console.log('\n启动 Claude Code...\n');

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      env,
      shell: false
    });

    child.on('close', (code) => {
      if (code === 0 || code === null || code === 130) {
        resolve();
      } else {
        reject(new Error(`Claude Code 异常退出，退出代码: ${code}\n提示: 请检查 API 配置是否正确`));
      }
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('找不到 claude 命令\n请确认已安装 Claude Code (https://claude.com/code)'));
      } else {
        reject(new Error(`启动 Claude Code 失败: ${error.message}`));
      }
    });
  });
}

module.exports = { executeWithEnv };
