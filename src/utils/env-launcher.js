const spawn = require('cross-spawn');

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

function buildEnvVariables(config) {
  const env = { ...process.env };

  // Claude Code 配置
  if (config.ideName === 'claude' || !config.ideName) {
    if (config.authMode === 'oauth_token') {
      env.CLAUDE_CODE_OAUTH_TOKEN = config.authToken;
    } else if (config.authMode === 'api_key') {
      env.ANTHROPIC_BASE_URL = config.baseUrl;
      // 根据 tokenType 选择设置哪种 token
      if (config.tokenType === 'auth_token') {
        env.ANTHROPIC_AUTH_TOKEN = config.authToken;
      } else {
        // 默认使用 ANTHROPIC_API_KEY
        env.ANTHROPIC_API_KEY = config.authToken;
      }
    } else {
      // auth_token 模式
      env.ANTHROPIC_BASE_URL = config.baseUrl;
      env.ANTHROPIC_AUTH_TOKEN = config.authToken;
    }

    if (config.models && config.models.primary) {
      env.ANTHROPIC_MODEL = config.models.primary;
    }

    if (config.models && config.models.smallFast) {
      env.ANTHROPIC_SMALL_FAST_MODEL = config.models.smallFast;
    }
  }

  // Codex 配置
  if (config.ideName === 'codex') {
    // Codex 使用环境变量来传递 API 密钥和配置
    if (config.authMode === 'api_key' || config.authMode === 'auth_token') {
      // Codex 支持通过环境变量设置 API 密钥
      env.CODEX_API_KEY = config.authToken;

      // 如果指定了基础 URL（用于自定义 API 端点）
      if (config.baseUrl) {
        env.CODEX_API_BASE = config.baseUrl;
      }
    }

    // Codex 模型配置
    if (config.models && config.models.primary) {
      env.CODEX_MODEL = config.models.primary;
    }
  }

  return env;
}

async function executeWithEnv(config, launchArgs = []) {
  const env = buildEnvVariables(config);
  const args = [...launchArgs];

  clearTerminal();

  // 确定要启动的命令（claude 或 codex）
  const command = config.ideName === 'codex' ? 'codex' : 'claude';
  const description = config.ideName === 'codex' ? 'Codex' : 'Claude Code';

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description} 退出，代码: ${code}`));
      }
    });

    child.on('error', reject);
  });
}

module.exports = { executeWithEnv };
