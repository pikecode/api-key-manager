const { Anthropic, APIConnectionTimeoutError, APIConnectionError, APIError } = require('@anthropic-ai/sdk');
const { API_CONFIG } = require('../constants');

const STATUS_CACHE_MAX = 100;

// 状态缓存
const statusCache = new Map();

/**
 * @typedef {Object} StatusResult
 * @property {string} status - 状态 ('online', 'offline', 'degraded', 'pending', 'unknown')
 * @property {string} message - 状态消息
 * @property {number|null} responseTime - 响应时间（毫秒）
 */

/**
 * 供应商状态检查器
 * 检查 API 供应商的可用性和响应时间
 */
class ProviderStatusChecker {
  /**
   * 创建状态检查器实例
   * @param {Object} [options={}] - 配置选项
   * @param {number} [options.timeout] - 请求超时时间
   * @param {string} [options.testMessage] - 测试消息
   * @param {number} [options.maxTokens] - 最大 Token 数
   * @param {number} [options.cacheTTL] - 缓存过期时间
   */
  constructor(options = {}) {
    this.timeout = options.timeout ?? API_CONFIG.DEFAULT_TIMEOUT;
    this.testMessage = options.testMessage ?? API_CONFIG.TEST_MESSAGE;
    this.maxTokens = options.maxTokens ?? API_CONFIG.MAX_TOKENS;
    this.defaultModel = API_CONFIG.DEFAULT_MODEL;
    this.cacheTTL = options.cacheTTL ?? API_CONFIG.CACHE_TTL;
  }

  _getCacheKey(provider) {
    return `${provider.name}:${provider.authMode}:${provider.baseUrl || ''}`;
  }

  _getCachedStatus(provider) {
    const key = this._getCacheKey(provider);
    const cached = statusCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.status;
    }
    return null;
  }

  _setCachedStatus(provider, status) {
    const key = this._getCacheKey(provider);
    if (statusCache.size >= STATUS_CACHE_MAX) {
      const oldest = [...statusCache.keys()].slice(0, 20);
      oldest.forEach(k => statusCache.delete(k));
    }
    statusCache.set(key, { status, timestamp: Date.now() });
  }

  clearCache() {
    statusCache.clear();
  }

  async check(provider, options = {}) {
    if (!provider) {
      return this._result('unknown', '未找到配置', null);
    }

    // 检查缓存（除非明确跳过）
    if (!options.skipCache) {
      const cached = this._getCachedStatus(provider);
      if (cached) {
        return cached;
      }
    }

    if (provider.ideName === 'codex') {
      const result = await this._checkCodex(provider);
      this._setCachedStatus(provider, result);
      return result;
    }

    // auth_token 模式可留空 baseUrl（使用官方默认 API）
    // api_key 模式需要 baseUrl（用于自定义端点/代理）
    if (provider.authMode === 'auth_token' && !provider.baseUrl) {
      // 对于官方 Anthropic API 的 auth_token 模式，不需要 baseUrl
      // 直接使用官方 API
    } else if (!provider.baseUrl && provider.authMode !== 'auth_token') {
      return this._result('unknown', '未配置基础地址', null);
    }

    if (!provider.authToken) {
      return this._result('unknown', '未配置认证信息', null);
    }

    const model = this._resolveModel(provider);
    try {
      const performCheck = async () => {
        const client = this._createClient(provider);
        if (!client) {
          return this._result('unknown', '认证模式不受支持', null);
        }

        const start = process.hrtime.bigint();
        const response = await client.messages.create({
          model,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: this.testMessage
            }
          ]
        }, { timeout: this.timeout });
        const latency = Number(process.hrtime.bigint() - start) / 1e6;

        const text = this._extractText(response);
        if (!text) {
          return this._result('online', `可用 ${latency.toFixed(0)}ms (无文本响应)`, latency);
        }

        return this._result('online', `可用 ${latency.toFixed(0)}ms`, latency);
      };

      const result = await performCheck();
      this._setCachedStatus(provider, result);
      return result;
    } catch (error) {
      const result = this._handleError(error);
      this._setCachedStatus(provider, result);
      return result;
    }
  }

  async checkAll(providers) {
    const entries = await Promise.all(
      providers.map(async provider => {
        const status = await this.check(provider);
        return [provider.name, status];
      })
    );
    return Object.fromEntries(entries);
  }

  checkAllStreaming(providers, onUpdate) {
    const results = {};
    const tasks = providers.map(async provider => {
      try {
        const status = await this.check(provider);
        results[provider.name] = status;
        if (typeof onUpdate === 'function') {
          onUpdate(provider.name, status, null);
        }
      } catch (error) {
        const fallback = this._result('offline', `检测失败: ${error.message}`, null);
        results[provider.name] = fallback;
        if (typeof onUpdate === 'function') {
          onUpdate(provider.name, fallback, error);
        }
      }
    });

    return Promise.all(tasks).then(() => results);
  }

  _createClient(provider) {
    const clientOptions = {};

    if (provider.authMode === 'api_key') {
      // api_key 模式：使用 ANTHROPIC_API_KEY
      if (provider.baseUrl) {
        clientOptions.baseURL = provider.baseUrl;
      }
      clientOptions.apiKey = provider.authToken;
    } else if (provider.authMode === 'auth_token') {
      clientOptions.authToken = provider.authToken;
      if (provider.baseUrl) {
        clientOptions.baseURL = provider.baseUrl;
      }
    } else {
      return null;
    }

    return new Anthropic(clientOptions);
  }

  _resolveModel(provider) {
    if (provider.models?.primary) {
      return provider.models.primary;
    }
    if (provider.models?.smallFast) {
      return provider.models.smallFast;
    }
    return this.defaultModel;
  }

  _extractText(response) {
    if (!response) {
      return '';
    }

    // 兼容部分供应商返回字符串内容
    if (typeof response.content === 'string') {
      return response.content.trim();
    }

    if (Array.isArray(response.content)) {
      const textFields = ['text', 'thinking', 'output_text', 'argument', 'result'];
      const textParts = [];

      for (const block of response.content) {
        if (!block) continue;
        if (typeof block === 'string') {
          textParts.push(block);
          continue;
        }
        for (const field of textFields) {
          if (typeof block[field] === 'string' && block[field].trim()) {
            textParts.push(block[field]);
          }
        }
      }

      const combined = textParts
        .map(part => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
      if (combined) {
        return combined;
      }
    }

    if (typeof response.output_text === 'string' && response.output_text.trim()) {
      return response.output_text.trim();
    }

    if (typeof response.completion === 'string' && response.completion.trim()) {
      return response.completion.trim();
    }

    return '';
  }


  _handleError(error) {
    if (error instanceof APIConnectionTimeoutError) {
      return this._result('offline', '请求超时', null);
    }

    if (error instanceof APIConnectionError) {
      return this._result('offline', '网络连接失败', null);
    }

    if (error instanceof APIError) {
      if (error.status >= 500) {
        return this._result('degraded', `服务异常 (${error.status})`, null);
      }
      if (error.status === 401 || error.status === 403) {
        return this._result('offline', `认证失败 (${error.status})`, null);
      }
      if (error.status === 404) {
        return this._result('offline', '接口不存在 (404)', null);
      }
      if (error.status === 400) {
        // 400 错误可能是因为认证方式不对
        const message = error.message || '';
        if (message.includes('auth') || message.includes('authentication')) {
          return this._result('offline', `认证配置错误 (${error.status})`, null);
        }
        return this._result('offline', `请求参数错误 (${error.status})`, null);
      }
      return this._result('offline', `请求失败 (${error.status})`, null);
    }

    if (error?.name === 'AbortError') {
      return this._result('offline', '请求超时', null);
    }

    return this._result('offline', `检测失败: ${error?.message || '未知错误'}`, null);
  }

  _result(state, label, latency) {
    return { state, label, latency };
  }

  async _checkCodex(provider) {
    if (!provider.authToken) {
      return this._result('unknown', '未配置 API Key', null);
    }

    const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
    const modelsUrl = `${baseUrl.replace(/\/$/, '')}/models`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const start = process.hrtime.bigint();
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.authToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      const latency = Number(process.hrtime.bigint() - start) / 1e6;

      clearTimeout(timeoutId);

      if (response.ok) {
        return this._result('online', `可用 ${latency.toFixed(0)}ms`, latency);
      }

      if (response.status === 401 || response.status === 403) {
        return this._result('offline', `认证失败 (${response.status})`, null);
      }

      if (response.status >= 500) {
        return this._result('degraded', `服务异常 (${response.status})`, null);
      }

      return this._result('offline', `请求失败 (${response.status})`, null);
    } catch (error) {
      if (error.name === 'AbortError') {
        return this._result('offline', '请求超时', null);
      }
      return this._result('offline', `检测失败: ${error.message}`, null);
    }
  }
}

module.exports = { ProviderStatusChecker };
