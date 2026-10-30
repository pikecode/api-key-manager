jest.mock('inquirer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const inquirer = require('inquirer');
const { listCodexHistory, selectCodexHistory } = require('../src/utils/codex-history');

describe('共享历史选择', () => {
  let root;
  const previous = process.env.CODEX_HOME;
  const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  beforeEach(async () => {
    jest.resetAllMocks();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-history-'));
    process.env.CODEX_HOME = root;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    await fs.outputFile(path.join(root, 'sessions', '2026', 'rollout.jsonl'), JSON.stringify({
      type: 'session_meta', payload: { id, cwd: '/project', timestamp: '2026-10-30', model_provider: 'other' }
    }) + '\n' + '原始内容，不应被修改');
  });
  afterEach(async () => {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    if (stdinTTY) Object.defineProperty(process.stdin, 'isTTY', stdinTTY);
    else delete process.stdin.isTTY;
    if (stdoutTTY) Object.defineProperty(process.stdout, 'isTTY', stdoutTTY);
    else delete process.stdout.isTTY;
    await fs.remove(root);
  });
  test('列出不同供应商的历史，跳过损坏文件', async () => {
    await fs.outputFile(path.join(root, 'sessions', 'broken.jsonl'), 'bad json');
    expect(await listCodexHistory()).toEqual([{ id, cwd: '/project', timestamp: '2026-10-30', provider: 'other' }]);
  });
  test('归档历史和大于 64 KiB 的元数据也能被读取', async () => {
    const archivedId = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
    await fs.outputFile(path.join(root, 'archived_sessions', 'large.jsonl'), JSON.stringify({
      type: 'session_meta', payload: { id: archivedId, instructions: '指令'.repeat(40000), timestamp: '2026-10-31' }
    }) + '\n');
    expect((await listCodexHistory()).map(item => item.id)).toEqual([archivedId, id]);
  });
  test('明确确认后分叉指定历史，不改原记录', async () => {
    inquirer.prompt.mockResolvedValueOnce({ sessionId: id }).mockResolvedValueOnce({ confirmed: true });
    const before = await fs.readFile(path.join(root, 'sessions', '2026', 'rollout.jsonl'));
    await expect(selectCodexHistory({ name: 'new-provider' }, ['resume', '--search'])).resolves.toEqual(['fork', id, '--search']);
    expect(inquirer.prompt.mock.calls[1][0]).toMatchObject({ default: false, message: expect.stringContaining('new-provider') });
    expect(await fs.readFile(path.join(root, 'sessions', '2026', 'rollout.jsonl'))).toEqual(before);
  });
  test('取消选择或拒绝发送上下文时不启动', async () => {
    inquirer.prompt.mockResolvedValueOnce({ sessionId: null });
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).resolves.toBeNull();
    inquirer.prompt.mockResolvedValueOnce({ sessionId: id }).mockResolvedValueOnce({ confirmed: false });
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).resolves.toBeNull();
  });
  test('无历史及非交互场景不偷偷选择历史', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).rejects.toThrow('交互终端');
    await fs.remove(path.join(root, 'sessions'));
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).rejects.toMatchObject({ code: 'SESSION_LOCKED' });
    await expect(selectCodexHistory({ name: 'a' }, ['--search'])).resolves.toEqual(['--search']);
  });
});
