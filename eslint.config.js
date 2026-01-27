// ESLint v9 Flat Config
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Node.js built-ins
        URL: 'readonly',
        AbortController: 'readonly',
        fetch: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      // 代码风格
      'indent': ['error', 2],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],

      // 最佳实践
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',

      // 异步处理
      'no-async-promise-executor': 'warn',
      'require-await': 'off',

      // 可能的错误
      'no-unreachable': 'error',
      'no-constant-condition': 'warn',
      'no-case-declarations': 'off',
      'no-fallthrough': 'off',
      'no-control-regex': 'off',
      'no-useless-catch': 'off',
      'no-const-assign': 'error',
      'no-empty': 'warn'
    }
  },
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'dist/',
      '*.min.js'
    ]
  }
];
