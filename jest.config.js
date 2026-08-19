module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov'],
  coverageThreshold: {
    './src/utils/codex-files.js': { statements: 90, branches: 80, functions: 90, lines: 90 },
    './src/utils/codex-launcher.js': { statements: 90, branches: 80, functions: 90, lines: 90 },
    './src/utils/env-launcher.js': { statements: 95, branches: 90, functions: 100, lines: 95 },
    './src/utils/import-validator.js': { statements: 85, branches: 60, lines: 85 },
    './src/utils/launch-args.js': { statements: 90, branches: 82, functions: 95, lines: 90 }
  }
};
