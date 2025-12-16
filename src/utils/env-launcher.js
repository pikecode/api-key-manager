const spawn = require('cross-spawn');
const { sanitizeEnvValue, clearTerminal } = require('./env-utils');

function buildEnvVariables(config) {
  const env = { ...process.env };

  try {
    // Claude Code 配置
    if (config.authMode === 'oauth_token') {
      env.CLAUDE_CODE_OAUTH_TOKEN = sanitizeEnvValue(config.authToken);
    } else if (config.authMode === 'api_key') {
      if (!config.baseUrl) {
        throw new Error('未配置基础地址');
      }
      env.ANTHROPIC_BASE_URL = sanitizeEnvValue(config.baseUrl);
      // 根据 tokenType 选择设置哪种 token
      if (config.tokenType === 'auth_token') {
        env.ANTHROPIC_AUTH_TOKEN = sanitizeEnvValue(config.authToken);
      } else {
        // 默认使用 ANTHROPIC_API_KEY
        env.ANTHROPIC_API_KEY = sanitizeEnvValue(config.authToken);
      }
    } else {
      // auth_token 模式
      if (config.baseUrl) {
        env.ANTHROPIC_BASE_URL = sanitizeEnvValue(config.baseUrl);
      }
      env.ANTHROPIC_AUTH_TOKEN = sanitizeEnvValue(config.authToken);
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
  const env = buildEnvVariables(config);
  const args = [...launchArgs];

  clearTerminal();

  console.log('\n启动 Claude Code...\n');

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      env,
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Claude Code 退出，退出代码: ${code}\n提示: 请检查 API 配置是否正确`));
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
