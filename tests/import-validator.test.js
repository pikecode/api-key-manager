const { validateAndNormalizeImportData } = require('../src/utils/import-validator');

function createProvider(overrides = {}) {
  return {
    displayName: '测试供应商',
    ideName: 'claude',
    authMode: 'api_key',
    authToken: 'sk-valid-token',
    baseUrl: 'https://api.example.com',
    launchArgs: ['--continue'],
    ...overrides
  };
}

describe('导入配置校验', () => {
  test('接受并标准化合法配置', () => {
    const result = validateAndNormalizeImportData({
      version: '1.0',
      providers: {
        primary: createProvider()
      },
      currentProvider: 'primary'
    });

    expect(result.providers.primary).toEqual(
      expect.objectContaining({
        name: 'primary',
        ideName: 'claude',
        launchArgs: ['--continue']
      })
    );
  });

  test('拒绝带有 shell 元字符的启动参数', () => {
    const data = {
      providers: {
        malicious: createProvider({ launchArgs: ['--continue; touch /tmp/pwned'] })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('不支持的启动参数');
  });

  test('拒绝不属于目标 IDE 的启动参数', () => {
    const data = {
      providers: {
        claude: createProvider({ launchArgs: ['--search'] })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('不支持的启动参数');
  });

  test.each([
    ['claude', '--dangerously-skip-permissions'],
    ['codex', '--dangerously-bypass-approvals-and-sandbox']
  ])('拒绝导入 %s 的最高权限参数', (ideName, dangerousArg) => {
    const data = {
      providers: {
        dangerous: createProvider({
          ideName,
          authMode: ideName === 'codex' ? null : 'api_key',
          launchArgs: [dangerousArg]
        })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('最高权限');
  });

  test('拒绝旧导出文件中的掩码 Token', () => {
    const data = {
      providers: {
        masked: createProvider({ authToken: 'sk-ant-p***3456' })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('脱敏 Token');
  });

  test('接受明确标记为不含密钥且 Token 为空的模板', () => {
    const data = {
      version: '2.0',
      secretsIncluded: false,
      providers: {
        template: createProvider({ authToken: null })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).not.toThrow();
  });

  test('拒绝可能污染对象原型的供应商名称', () => {
    const data = JSON.parse(
      '{"providers":{"__proto__":{"ideName":"claude","authToken":"sk-valid-token"}}}'
    );

    expect(() => validateAndNormalizeImportData(data)).toThrow('保留名称');
  });

  test('控制字符名称的错误消息不会保留原始终端序列', () => {
    const name = 'bad\x1b[31mname';

    try {
      validateAndNormalizeImportData({ providers: { [name]: createProvider() } });
      throw new Error('预期校验失败');
    } catch (error) {
      expect(error.message).toContain('bad\\u001b[31mname');
      expect(error.message).not.toContain('\x1b');
    }
  });

  test('拒绝 Token 中的终端控制字符', () => {
    const data = {
      providers: {
        unsafe: createProvider({ authToken: 'sk-valid\x1b[31m-token' })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('控制字符');
  });

  test('拒绝远程 HTTP 地址', () => {
    const data = {
      providers: {
        insecure: createProvider({ baseUrl: 'http://api.example.com' })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('HTTPS');
  });

  test('允许回环地址使用 HTTP', () => {
    const data = {
      providers: {
        local: createProvider({ baseUrl: 'http://127.0.0.1:8080/v1' })
      }
    };

    expect(() => validateAndNormalizeImportData(data)).not.toThrow();
  });

  test('拒绝指向不存在供应商的 currentProvider', () => {
    const data = {
      providers: {
        primary: createProvider()
      },
      currentProvider: 'missing'
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('currentProvider');
  });

  test('拒绝空 currentProvider', () => {
    const data = {
      providers: {
        primary: createProvider()
      },
      currentProvider: ''
    };

    expect(() => validateAndNormalizeImportData(data)).toThrow('Schema');
  });

  test('拒绝超过 200 个供应商的配置', () => {
    const providers = Object.fromEntries(
      Array.from({ length: 201 }, (_, index) => [`provider-${index}`, createProvider()])
    );

    expect(() => validateAndNormalizeImportData({ providers })).toThrow('Schema');
  });
});
