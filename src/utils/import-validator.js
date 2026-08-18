const Ajv = require('ajv');
const { validator } = require('./validator');
const { assertSafeImportLaunchArgs } = require('./launch-args');
const { containsUnsafeTerminalCharacters, escapeTerminalText } = require('./terminal-format');

const MAX_PROVIDERS = 200;

const nullableString = { type: ['string', 'null'], maxLength: 100 };
const launchArgsSchema = {
  type: 'array',
  maxItems: 16,
  uniqueItems: true,
  items: { type: 'string', maxLength: 200 }
};

const providerSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', maxLength: 100 },
    displayName: nullableString,
    alias: nullableString,
    ideName: { enum: ['claude', 'codex'] },
    authMode: { enum: ['api_key', 'api_token', 'auth_token', 'openai_api_key', 'chatgpt_login', null] },
    authToken: { type: ['string', 'null'], maxLength: 16384 },
    baseUrl: { type: ['string', 'null'], maxLength: 2048 },
    models: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        primary: nullableString,
        smallFast: nullableString
      }
    },
    launchArgs: launchArgsSchema,
    lastUsedArgs: {
      anyOf: [launchArgsSchema, { type: 'null' }]
    },
    current: { type: 'boolean' },
    usageCount: { type: 'integer', minimum: 0 },
    createdAt: nullableString,
    lastUsed: nullableString,
    importedAt: nullableString,
    tokenExpiry: nullableString,
    quota: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        used: { type: 'number', minimum: 0 },
        limit: { type: 'number', exclusiveMinimum: 0 }
      }
    },
    stats: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        totalSessions: { type: 'integer', minimum: 0 },
        totalDurationMs: { type: 'number', minimum: 0 },
        averageDurationMs: { type: 'number', minimum: 0 },
        lastSessionDuration: { type: 'number', minimum: 0 },
        firstUsed: nullableString
      }
    }
  }
};

const configSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['providers'],
  properties: {
    version: { type: 'string', maxLength: 20 },
    currentProvider: { type: ['string', 'null'], minLength: 1, maxLength: 100 },
    providers: {
      type: 'object',
      maxProperties: MAX_PROVIDERS,
      additionalProperties: providerSchema
    }
  }
};

const importSchema = {
  ...configSchema,
  properties: {
    ...configSchema.properties,
    exportedAt: { type: 'string', maxLength: 100 },
    secretsIncluded: { type: 'boolean' },
    providers: {
      ...configSchema.properties.providers,
      minProperties: 1
    }
  }
};

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateImportSchema = ajv.compile(importSchema);
const validateConfigSchema = ajv.compile(configSchema);

function formatSchemaErrors(errors = []) {
  return errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('；');
}

/**
 * 校验并标准化从文件读取的配置
 * @param {unknown} data - JSON 配置内容
 * @returns {object} 标准化后的导入数据
 */
function validateAndNormalizeData(data, source) {
  const schemaValidator = source === 'import' ? validateImportSchema : validateConfigSchema;
  if (!schemaValidator(data)) {
    throw new Error(`配置 Schema 校验失败: ${formatSchemaErrors(schemaValidator.errors)}`);
  }

  const normalizedProviders = {};
  for (const [name, provider] of Object.entries(data.providers)) {
    const safeName = escapeTerminalText(name);
    const nameError = validator.validateName(name);
    if (nameError) {
      throw new Error(`供应商名称 "${safeName}" 无效: ${nameError}`);
    }

    const ideName = provider.ideName || 'claude';
    const displayNameError = validator.validateDisplayName(provider.displayName);
    if (displayNameError) {
      throw new Error(`供应商 "${safeName}" 的显示名称无效: ${displayNameError}`);
    }

    if (provider.alias) {
      const aliasError = validator.validateName(provider.alias);
      if (aliasError) {
        throw new Error(`供应商 "${safeName}" 的别名无效: ${aliasError}`);
      }
    }

    const launchArgs = provider.launchArgs || [];
    const lastUsedArgs = provider.lastUsedArgs || [];

    // 外部导入保持安全默认值；本地显式配置允许连接远程 HTTP 代理。
    const baseUrlError = validator.validateUrl(provider.baseUrl, false, {
      allowInsecureHttp: source !== 'import'
    });
    if (baseUrlError) {
      throw new Error(`供应商 "${safeName}" 的基础 URL 无效: ${baseUrlError}`);
    }

    if (source === 'import') {
      assertSafeImportLaunchArgs(ideName, launchArgs);
      assertSafeImportLaunchArgs(ideName, lastUsedArgs);
      if (typeof provider.authToken === 'string' && provider.authToken.includes('***')) {
        throw new Error(`供应商 "${safeName}" 包含脱敏 Token，请重新设置密钥后再导入`);
      }
    }

    if (ideName === 'claude' && provider.authMode === 'openai_api_key') {
      throw new Error(`供应商 "${safeName}" 的认证模式与 IDE 类型不匹配`);
    }

    if (containsUnsafeTerminalCharacters(provider.authToken)) {
      throw new Error(`供应商 "${safeName}" 的 Token 不能包含控制字符`);
    }

    normalizedProviders[name] = {
      ...provider,
      name,
      ideName,
      authMode:
        ideName === 'codex'
          ? null
          : provider.authMode === 'api_token'
            ? 'auth_token'
            : provider.authMode || 'api_key',
      launchArgs,
      lastUsedArgs: provider.lastUsedArgs === null ? null : lastUsedArgs
    };
  }

  if (
    data.currentProvider !== null &&
    data.currentProvider !== undefined &&
    !Object.prototype.hasOwnProperty.call(normalizedProviders, data.currentProvider)
  ) {
    throw new Error(
      `currentProvider 指向不存在的供应商: ${escapeTerminalText(data.currentProvider)}`
    );
  }

  const currentProvider = data.currentProvider || null;
  for (const [name, provider] of Object.entries(normalizedProviders)) {
    provider.current = name === currentProvider;
  }

  return {
    ...data,
    providers: normalizedProviders
  };
}

function validateAndNormalizeImportData(data) {
  return validateAndNormalizeData(data, 'import');
}

function validateAndNormalizeConfigData(data) {
  return validateAndNormalizeData(data, 'local');
}

module.exports = {
  MAX_PROVIDERS,
  configSchema,
  importSchema,
  validateAndNormalizeConfigData,
  validateAndNormalizeImportData
};
