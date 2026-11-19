const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { executeWithEnv } = require('../src/utils/env-launcher');

const unixTest = process.platform === 'win32' ? test.skip : test;
unixTest('real child receives provider settings and next launch retains original shell thinking', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-claude-child-'));
  const originalEnv = process.env;
  const output = path.join(directory, 'output.json');
  const executable = path.join(directory, 'claude');
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await fs.writeFile(executable, `#!${process.execPath}\nrequire('fs').writeFileSync(process.env.AKM_TEST_OUTPUT, JSON.stringify({args:process.argv.slice(2), thinking:process.env.MAX_THINKING_TOKENS, model:process.env.ANTHROPIC_MODEL, auth:process.env.ANTHROPIC_AUTH_TOKEN, key:process.env.ANTHROPIC_API_KEY}));\n`, { mode: 0o700 });
    process.env = { ...originalEnv, PATH: directory + path.delimiter + originalEnv.PATH, AKM_TEST_OUTPUT: output, MAX_THINKING_TOKENS: '1024' };
    const provider = { name: 'stub', authMode: 'api_key', authToken: 'fake-key', models: { primary: 'fake-model' } };
    await executeWithEnv({ ...provider, compatibility: { thinkingMode: 'disabled' } }, ['--continue']);
    expect(await fs.readJson(output)).toEqual({ args: ['--continue'], thinking: '0', model: 'fake-model', key: 'fake-key' });
    await executeWithEnv({ ...provider, authMode: 'auth_token' });
    expect(await fs.readJson(output)).toEqual({ args: [], thinking: '1024', model: 'fake-model', auth: 'fake-key' });
  } finally {
    process.env = originalEnv;
    log.mockRestore();
    await fs.remove(directory);
  }
});
