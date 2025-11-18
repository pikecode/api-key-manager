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

function buildEnvVariables(config) {
  const env = { ...process.env };

  try {
    // Claude Code 配置
    if (config.authMode === 'oauth_token') {
      env.CLAUDE_CODE_OAUTH_TOKEN = sanitizeEnvValue(config.authToken);
    } else if (config.authMode === 'api_key') {
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
      env.ANTHROPIC_BASE_URL = sanitizeEnvValue(config.baseUrl);
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
