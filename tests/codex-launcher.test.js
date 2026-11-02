jest.mock('cross-spawn');
jest.mock('../src/utils/env-utils');
jest.mock('../src/utils/codex-runtime');
jest.mock('../src/utils/codex-history');
const { EventEmitter } = require('events');
const spawn = require('cross-spawn');
const { prepareCodexRuntime } = require('../src/utils/codex-runtime');
const { selectCodexHistory } = require('../src/utils/codex-history');
const { sanitizeEnvValue } = require('../src/utils/env-utils');
const { executeCodexWithEnv, buildCodexEnvVariables } = require('../src/utils/codex-launcher');

const config = { name: 'work', ideName: 'codex', authMode: 'api_key', authToken: 'fake-key', baseUrl: 'https://example.com/v1' };
const official = { name: 'official', ideName: 'codex', authMode: 'chatgpt_login' };

describe('Codex 隔离启动', () => {
  let child;
  let release;
  const originalEnv = process.env;
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    sanitizeEnvValue.mockImplementation(value => value);
    selectCodexHistory.mockImplementation(async (_config, args) => args);
    release = jest.fn().mockResolvedValue();
    prepareCodexRuntime.mockResolvedValue({ home: '/isolated/work', release });
    child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = jest.fn();
    spawn.mockReturnValue(child);
  });
  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test('只修改子进程环境，使用供应商独立目录及文件认证', async () => {
    process.env.CODEX_HOME = '/original';
    const run = executeCodexWithEnv(config, ['--search', 'resume']);
    await tick();
    const [command, args, options] = spawn.mock.calls[0];
    expect(command).toBe('codex');
    expect(args.slice(0, 2)).toEqual(['resume', '--search']);
    expect(args).toContain('cli_auth_credentials_store="file"');
    expect(options.env.CODEX_HOME).toBe('/isolated/work');
    expect(options.env.OPENAI_API_KEY).toBe('fake-key');
    expect(options.shell).toBe(false);
    expect(process.env.CODEX_HOME).toBe('/original');
    child.emit('close', 0);
    await run;
    expect(release).toHaveBeenCalledTimes(1);
  });

  test('官方启动清理继承的 API 环境变量，转发重新登录选项', async () => {
    process.env.OPENAI_API_KEY = 'stale';
    process.env.OPENAI_BASE_URL = 'stale';
    process.env.OPENAI_MODEL = 'stale';
    const run = executeCodexWithEnv(official, [], { forceRelogin: true });
    await tick();
    expect(prepareCodexRuntime).toHaveBeenCalledWith(official, { forceRelogin: true });
    const [, args, { env }] = spawn.mock.calls[0];
    expect(args).toContain('model_provider="openai"');
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.OPENAI_BASE_URL).toBeUndefined();
    expect(env.OPENAI_MODEL).toBeUndefined();
    child.emit('close', 0);
    await run;
  });

  test('选择历史后启动指定分支，保留当前供应商配置', async () => {
    selectCodexHistory.mockResolvedValue(['fork', 'selected-id', '--search']);
    const run = executeCodexWithEnv(config, ['resume', '--search']);
    await tick();
    expect(spawn.mock.calls[0][1].slice(0, 3)).toEqual(['fork', 'selected-id', '--search']);
    expect(spawn.mock.calls[0][1]).toContain('model_provider="akm"');
    child.emit('close', 0);
    await run;
  });

  test('取消历史选择不创建目录或进程', async () => {
    selectCodexHistory.mockResolvedValue(null);
    const onStarted = jest.fn();
    await executeCodexWithEnv(config, ['resume'], { onStarted });
    expect(onStarted).not.toHaveBeenCalled();
    expect(prepareCodexRuntime).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  test('子进程创建后才记录状态，关闭前等待记录完成', async () => {
    const onStarted = jest.fn().mockResolvedValue();
    const run = executeCodexWithEnv(config, [], { onStarted });
    await tick();
    expect(onStarted).not.toHaveBeenCalled();
    child.emit('spawn');
    child.emit('close', 0);
    await run;
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  test.each([null, { ideName: 'claude' }])('拒绝无效供应商 %j', async value => {
    await expect(executeCodexWithEnv(value)).rejects.toThrow('无效');
  });
  test('缺失密钥和不支持的参数在初始化前失败', async () => {
    await expect(executeCodexWithEnv({ ...config, authToken: '' })).rejects.toThrow('未配置');
    await expect(executeCodexWithEnv(config, ['unknown'])).rejects.toThrow('不支持');
    expect(prepareCodexRuntime).not.toHaveBeenCalled();
  });
  test('初始化失败不启动进程', async () => {
    prepareCodexRuntime.mockRejectedValue(new Error('初始化失败'));
    await expect(executeCodexWithEnv(config)).rejects.toThrow('初始化失败');
    expect(spawn).not.toHaveBeenCalled();
  });
  test.each(['ENOENT', 'EACCES'])('启动失败 %s 后释放运行记录', async code => {
    const run = executeCodexWithEnv(config);
    const expected = expect(run).rejects.toThrow(code === 'ENOENT' ? '找不到 codex' : '启动 Codex CLI 失败');
    await tick();
    child.emit('error', Object.assign(new Error('spawn failed'), { code }));
    child.emit('close', -1);
    await expected;
    expect(release).toHaveBeenCalledTimes(1);
  });
  test.each(['SIGINT', 'SIGTERM'])('转发 %s 并清理监听', async signal => {
    const listeners = process.listenerCount(signal);
    const run = executeCodexWithEnv(config).catch(error => error);
    await tick();
    process.emit(signal);
    expect(child.kill).toHaveBeenCalledWith(signal);
    child.emit('close', null, signal);
    await run;
    expect(process.listenerCount(signal)).toBe(listeners);
    expect(release).toHaveBeenCalledTimes(1);
  });
  test('退出码 130 视为正常中断', async () => {
    const run = executeCodexWithEnv(config);
    await tick();
    child.emit('close', 130);
    await expect(run).resolves.toBeUndefined();
  });
  test.each([
    [['resume'], 'thread already has an active writer', 'SESSION_LOCKED'],
    [['resume'], '401 Unauthorized', 'RESUME_FAILED'],
    [[], '', undefined]
  ])('保留实际错误并区分恢复错误 %#', async (args, output, code) => {
    const run = executeCodexWithEnv(config, args);
    const expected = expect(run).rejects.toMatchObject(code ? { code } : { message: expect.stringContaining('退出代码: 1') });
    await tick();
    child.stderr.emit('data', Buffer.from(output));
    child.emit('close', 1);
    await expected;
  });
  test('分叉失败不能静默丢弃历史', async () => {
    selectCodexHistory.mockResolvedValue(['fork', 'selected-id']);
    const run = executeCodexWithEnv(config, ['resume']);
    const expected = expect(run).rejects.toMatchObject({ code: 'RESUME_FAILED' });
    await tick();
    child.stderr.emit('data', Buffer.from('failed to resume session'));
    child.emit('close', 1);
    await expected;
  });
  test('环境变量支持模型配置、缺省认证模式与空 URL', () => {
    expect(buildCodexEnvVariables({ name: 'test', authToken: 'key', models: { primary: 'model' } })).toMatchObject({ OPENAI_API_KEY: 'key', OPENAI_MODEL: 'model' });
    expect(buildCodexEnvVariables({}).OPENAI_API_KEY).toBeUndefined();
    expect(() => buildCodexEnvVariables({ name: 'test', baseUrl: 'invalid' })).toThrow('配置验证失败');
  });
});
