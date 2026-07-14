const { formatShellAssignment, resolveShell } = require('../src/utils/shell-snippets');

describe('shell snippets', () => {
  test('生成 POSIX shell 安全赋值', () => {
    expect(formatShellAssignment('API_KEY', "a'b", 'zsh')).toBe("export API_KEY='a'\\''b'");
  });

  test('生成 PowerShell 赋值', () => {
    expect(formatShellAssignment('API_KEY', "a'b", 'powershell')).toBe("$env:API_KEY = 'a''b'");
  });

  test('生成 cmd 赋值', () => {
    expect(formatShellAssignment('API_KEY', 'a%b', 'cmd')).toBe('set "API_KEY=a%%b"');
  });

  test('从 shell 路径解析名称', () => {
    expect(resolveShell('/bin/bash')).toBe('bash');
  });
});
