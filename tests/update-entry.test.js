const { spawnSync } = require('child_process');
const path = require('path');

test.each([0, 7])('更新交接完成后 CLI 退出为 %i，不再执行原命令', exitCode => {
  const script = `
    require('./src/utils/update-checker').checkForUpdates = async () => ${exitCode};
    require('./src/CommandRegistry').registry.executeCommand = async () => console.log('UNEXPECTED_COMMAND');
    process.argv = [process.execPath, require.resolve('./bin/akm'), 'list'];
    require('./bin/akm');
  `;
  const result = spawnSync(process.execPath, [], {
    input: script, cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 10000
  });
  expect(result.error).toBeUndefined();
  expect(result.stderr).toBe('');
  expect(result.status).toBe(exitCode);
  expect(result.stdout).not.toContain('UNEXPECTED_COMMAND');
});
