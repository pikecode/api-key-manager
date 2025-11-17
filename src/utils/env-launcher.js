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

  // Claude Code 配置（明确检查 ideName === 'claude'）
  // 注意：不再使用 !config.ideName 作为默认值，避免混淆
  if (config.ideName === 'claude') {
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
  // @openai/codex 支持两种认证方式：
  // 1. ChatGPT 登录（推荐）- 无需环境变量，使用交互式登录
  // 2. OpenAI API Key - 通过 OPENAI_API_KEY 环境变量
  if (config.ideName === 'codex') {
    if (config.authMode === 'api_key' && config.authToken) {
      // 使用 OpenAI API Key 方式
      // Codex 通过 OPENAI_API_KEY 环境变量读取 API 密钥
      env.OPENAI_API_KEY = config.authToken;

      // 如果指定了基础 URL（用于自定义 OpenAI 兼容的 API 端点）
      if (config.baseUrl) {
        env.OPENAI_API_BASE = config.baseUrl;
      }
    }
    // 如果是 chatgpt_login 模式，不需要设置环境变量
    // Codex 会启动交互式登录流程
  }

  return env;
}

async function executeWithEnv(config, launchArgs = []) {
  // 安全检查：确保 ideName 被明确设置
  if (!config.ideName) {
    throw new Error('供应商配置缺少 ideName 字段，无法启动 IDE');
  }

  const env = buildEnvVariables(config);
  const args = [...launchArgs];

  clearTerminal();

  // 根据 ideName 确定要启动的命令（claude 或 codex）
  // 这是关键的 IDE 选择点 - 避免任何混淆
  const isCodex = config.ideName === 'codex';
  const command = isCodex ? 'codex' : 'claude';
  const description = isCodex ? 'Codex' : 'Claude Code';
  const ideIcon = isCodex ? '⚙️' : '🚀';

  console.log(`\n启动 ${ideIcon} ${description}...\n`);

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
