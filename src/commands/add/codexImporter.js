/**
 * Codex configuration importer.
 * Reads existing Codex config from ~/.codex and extracts API key and base URL.
 */

const { Logger } = require('../../utils/logger');
const { readCodexFiles, extractBaseUrlFromConfigToml } = require('../../utils/codex-files');

/**
 * Import Codex configuration from ~/.codex directory.
 * @returns {Promise<{apiKey: string, baseUrl: string|null}|null>}
 */
async function importCodexConfig() {
  try {
    const codexFiles = await readCodexFiles();

    if (!codexFiles.authJson) {
      return null;
    }

    // 解析 auth.json 获取 API Key
    const authData = JSON.parse(codexFiles.authJson);
    const apiKey = authData.api_key || authData.openai_api_key || authData.OPENAI_API_KEY;

    if (!apiKey) {
      return null;
    }

    // 从 config.toml 中读取当前激活 provider 的 base_url
    let baseUrl = null;
    if (codexFiles.configToml) {
      baseUrl = extractBaseUrlFromConfigToml(codexFiles.configToml);
      if (!baseUrl) {
        // 兼容旧格式（akm 之前错误写入的顶层字段）
        const legacyMatch = codexFiles.configToml.match(/^api_base_url\s*=\s*["']([^"']+)["']/m);
        if (legacyMatch) baseUrl = legacyMatch[1];
      }
    }

    Logger.success(`成功从 ${codexFiles.codexHome} 导入配置`);
    return { apiKey, baseUrl };
  } catch (error) {
    Logger.warning(`导入配置失败: ${error.message}`);
    return null;
  }
}

module.exports = { importCodexConfig };
