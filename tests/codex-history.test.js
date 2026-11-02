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
    jest.spyOn(process, 'cwd').mockReturnValue('/project');
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'akm-history-'));
    process.env.CODEX_HOME = root;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    await fs.outputFile(path.join(root, 'sessions', '2026', 'rollout.jsonl'), JSON.stringify({
      type: 'session_meta', payload: { id, cwd: '/project', timestamp: '2026-10-30', model_provider: 'other' }
    }) + '\n' + '原始内容，不应被修改');
  });
  afterEach(async () => {
    jest.restoreAllMocks();
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
    expect(await listCodexHistory()).toEqual([{ id, cwd: '/project', timestamp: '2026-10-30', modifiedAt: expect.any(Number), provider: 'other' }]);
  });
  test.each([null, [], 42, 'text', { type: 'session_meta', payload: null }, { type: 'session_meta', payload: { id: 123 } }])('跳过非法元数据 %j 而不影响正常历史', async metadata => {
    await fs.outputFile(path.join(root, 'sessions', 'invalid.jsonl'), JSON.stringify(metadata) + '\n');
    expect((await listCodexHistory()).map(item => item.id)).toEqual([id]);
  });

  test('按最近修改时间排序，同 ID 保留最近修改的记录', async () => {
    const secondId = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
    const original = path.join(root, 'sessions', '2026', 'rollout.jsonl');
    const second = path.join(root, 'sessions', 'second.jsonl');
    const duplicate = path.join(root, 'archived_sessions', 'duplicate.jsonl');
    await fs.outputFile(second, JSON.stringify({ type: 'session_meta', payload: { id: secondId, timestamp: '2026-11-01' } }) + '\n');
    await fs.outputFile(duplicate, JSON.stringify({ type: 'session_meta', payload: { id, cwd: '/older-copy' } }) + '\n');
    await fs.utimes(duplicate, new Date(), new Date('2026-10-01'));
    await fs.utimes(second, new Date(), new Date('2026-11-01'));
    await fs.utimes(original, new Date(), new Date('2026-11-02'));
    const result = await listCodexHistory();
    expect(result.map(item => item.id)).toEqual([id, secondId]);
    expect(result[0].cwd).toBe('/project');
    expect(result[0].timestamp).toBe('2026-10-30');
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
    expect(inquirer.prompt.mock.calls[0][0].default).toBe(id);
    expect(await fs.readFile(path.join(root, 'sessions', '2026', 'rollout.jsonl'))).toEqual(before);
  });

  async function addHistory(sessionId, cwd, date) {
    const file = path.join(root, 'sessions', `${sessionId}.jsonl`);
    await fs.outputFile(file, JSON.stringify({ type: 'session_meta', payload: { id: sessionId, cwd } }) + '\n');
    if (date) await fs.utimes(file, new Date(), new Date(date));
  }

  test('历史分批显示，加载后选中新增批次第一项', async () => {
    for (let index = 0; index < 25; index++) {
      await addHistory(`${index.toString(16).padStart(8, '0')}-bbbb-cccc-dddd-eeeeeeeeeeee`, '/project', '2026-01-01');
    }
    inquirer.prompt.mockResolvedValueOnce({ sessionId: 'more' }).mockResolvedValueOnce({ sessionId: null });
    await selectCodexHistory({ name: 'a' }, ['resume']);
    const first = inquirer.prompt.mock.calls[0][0];
    const second = inquirer.prompt.mock.calls[1][0];
    expect(first.choices.filter(c => /^[0-9a-f]{8}-/.test(c.value || ''))).toHaveLength(20);
    expect(second.choices.filter(c => /^[0-9a-f]{8}-/.test(c.value || ''))).toHaveLength(26);
    expect(second.default).toBe(second.choices[20].value);
    expect(second.choices.some(c => c.value === 'more')).toBe(false);
    expect(first.choices[0].name).not.toContain(id);
  });
  test('其他项目 ESC 返回，当前目录 ESC 取消', async () => {
    await addHistory('bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee', '/other');
    const escape = Object.assign(new Error('cancel'), { code: 'ESC_CANCELLED' });
    inquirer.prompt.mockResolvedValueOnce({ sessionId: 'other' }).mockRejectedValueOnce(escape).mockRejectedValueOnce(escape);
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).resolves.toBeNull();
    expect(inquirer.prompt.mock.calls[2][0].default).toBe(id);
  });
  test('确认页展示完整信息，ESC 不启动分支', async () => {
    inquirer.prompt.mockResolvedValueOnce({ sessionId: id }).mockRejectedValueOnce(Object.assign(new Error('cancel'), { code: 'ESC_CANCELLED' }));
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).resolves.toBeNull();
    expect(inquirer.prompt.mock.calls[1][0].message).toContain(id);
    expect(inquirer.prompt.mock.calls[1][0].message).toContain('/project');
  });

  test('只显示当前目录历史，默认选中其中最近修改的一条', async () => {
    const recent = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
    const outside = 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee';
    await fs.utimes(path.join(root, 'sessions', '2026', 'rollout.jsonl'), new Date(), new Date('2026-01-01'));
    await addHistory(recent, '/project/sub/..', '2026-11-01');
    await addHistory(outside, '/elsewhere/project', '2026-11-02');
    inquirer.prompt.mockResolvedValueOnce({ sessionId: null });
    await selectCodexHistory({ name: 'a' }, ['resume']);
    const question = inquirer.prompt.mock.calls[0][0];
    expect(question.default).toBe(recent);
    expect(question.choices.slice(0, 2).map(choice => choice.value)).toEqual([recent, id]);
    expect(question.choices.some(choice => choice.value === outside)).toBe(false);
    expect(question.choices.some(choice => choice.value === 'other')).toBe(true);
  });

  test('没有当前目录历史时默认新建，不自动发送其他项目上下文', async () => {
    process.cwd.mockReturnValue('/different');
    inquirer.prompt.mockResolvedValueOnce({ sessionId: 'new' });
    await expect(selectCodexHistory({ name: 'a' }, ['resume', '--search'])).resolves.toEqual(['--search']);
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(inquirer.prompt.mock.calls[0][0]).toMatchObject({ default: 'new', message: expect.stringContaining('没有历史') });
  });

  test('可主动查看其他项目历史，仍需确认目标供应商', async () => {
    process.cwd.mockReturnValue('/different');
    inquirer.prompt.mockResolvedValueOnce({ sessionId: 'other' })
      .mockResolvedValueOnce({ sessionId: id }).mockResolvedValueOnce({ confirmed: true });
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).resolves.toEqual(['fork', id]);
    expect(inquirer.prompt.mock.calls[1][0].choices.some(choice => choice.value === id)).toBe(true);
    expect(inquirer.prompt.mock.calls[2][0]).toMatchObject({ default: false, name: 'confirmed' });
  });

  test('其他项目列表可以返回当前目录，取消不启动', async () => {
    process.cwd.mockReturnValue('/different');
    inquirer.prompt.mockResolvedValueOnce({ sessionId: 'other' })
      .mockResolvedValueOnce({ sessionId: 'back' }).mockResolvedValueOnce({ sessionId: null });
    await expect(selectCodexHistory({ name: 'a' }, ['resume'])).resolves.toBeNull();
    expect(inquirer.prompt.mock.calls[2][0].default).toBe('new');
  });

  test('实际目录与符号链接视为同一目录，缺失或相对路径不匹配当前目录', async () => {
    const project = path.join(root, 'project');
    const alias = path.join(root, 'alias');
    await fs.ensureDir(project);
    await fs.symlink(project, alias, process.platform === 'win32' ? 'junction' : 'dir');
    process.cwd.mockReturnValue(project);
    const linked = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
    await addHistory(linked, alias + path.sep);
    await addHistory('cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee', '');
    await addHistory('dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee', 'project');
    inquirer.prompt.mockResolvedValueOnce({ sessionId: null });
    await selectCodexHistory({ name: 'a' }, ['resume']);
    const question = inquirer.prompt.mock.calls[0][0];
    expect(question.default).toBe(linked);
    expect(question.choices.filter(choice => /^[a-f0-9-]{36}$/.test(choice.value || '')).map(choice => choice.value)).toEqual([linked]);
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
