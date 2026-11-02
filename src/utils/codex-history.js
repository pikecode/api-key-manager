const fs = require('fs-extra');
const path = require('path');
const { BaseCommand } = require('../commands/BaseCommand');
const { compactTerminalText, escapeTerminalText, listPageSize } = require('./terminal-format');
const { resolveCodexHome } = require('./codex-files');

async function listCodexHistory(root = resolveCodexHome()) {
  const history = [];
  async function scan(directory) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        // 只读头部元数据，避免把完整对话加载进内存或显示在列表中。
        let handle;
        try {
          try { handle = await fs.open(file, 'r'); }
          catch (error) { if (error.code === 'ENOENT') continue; throw error; }
          const chunks = [];
          let offset = 0;
          // 元数据可能包含长指令，分块读至首行结束，上限 4 MiB。
          while (offset < 4 * 1024 * 1024) {
            const buffer = Buffer.alloc(16384);
            const { bytesRead } = await fs.read(handle, buffer, 0, buffer.length, offset);
            if (!bytesRead) break;
            chunks.push(buffer.subarray(0, bytesRead));
            offset += bytesRead;
            if (buffer.subarray(0, bytesRead).includes(10)) break;
          }
          const line = Buffer.concat(chunks).toString('utf8').split('\n')[0];
          let meta;
          try { meta = JSON.parse(line); } catch { continue; }
          if (!meta || typeof meta !== 'object' || Array.isArray(meta)) continue;
          const data = meta.payload;
          if (meta.type !== 'session_meta' || !data || typeof data !== 'object' || Array.isArray(data) || typeof data.id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data.id)) continue;
          const stat = await fs.fstat(handle);
          history.push({ id: data.id, cwd: String(data.cwd || ''), timestamp: String(data.timestamp || meta.timestamp || ''), modifiedAt: stat.mtimeMs, provider: String(data.model_provider || '未知') });
        } finally {
          if (handle !== undefined) await fs.close(handle);
        }
      }
    }
  }
  await scan(path.join(root, 'sessions'));
  await scan(path.join(root, 'archived_sessions'));
  const unique = new Map();
  for (const item of history.sort((a, b) => b.modifiedAt - a.modifiedAt || a.id.localeCompare(b.id))) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  return [...unique.values()];
}

async function normalizeDirectory(directory) {
  if (!directory || !path.isAbsolute(directory)) return null;
  let resolved = path.resolve(directory);
  try { resolved = await fs.realpath(resolved); }
  catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

async function selectCodexHistory(config, args) {
  if (!args.includes('resume')) return args;
  const history = await listCodexHistory();
  if (!history.length) {
    const error = new Error('没有可用的 Codex 历史对话');
    error.code = 'SESSION_LOCKED';
    throw error;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('恢复历史需要交互终端，请交互选择历史或使用 --no-args 新建会话');
  const currentDirectory = await normalizeDirectory(process.cwd());
  const directories = new Map();
  const local = [];
  const other = [];
  for (const item of history) {
    if (!directories.has(item.cwd)) directories.set(item.cwd, await normalizeDirectory(item.cwd));
    (directories.get(item.cwd) === currentDirectory ? local : other).push(item);
  }
  const navigation = new BaseCommand();
  const limits = { local: 20, other: 20 };
  let showOther = false;
  let defaultId;
  try {
    let sessionId;
    while (true) {
      const group = showOther ? 'other' : 'local';
      const items = showOther ? other : local;
      const visible = items.slice(0, limits[group]);
      const choices = visible.map(item => ({
        name: compactTerminalText(`${item.id.slice(0, 8)} | ${new Date(item.modifiedAt).toLocaleString()} | ${path.basename(item.cwd) || '未知项目'} | ${item.provider}`),
        value: item.id
      }));
      if (items.length > visible.length) choices.push({ name: `加载更多（已显示 ${visible.length}/${items.length}）`, value: 'more' });
      choices.push({ name: '新建会话（不恢复历史）', value: 'new' });
      if (showOther) choices.push({ name: '返回当前文件夹', value: 'back' });
      else if (other.length) choices.push({ name: '查看其他项目历史', value: 'other' });
      choices.push({ name: '取消', value: null });
      ({ sessionId } = await navigation.promptWithESCAndDefault({
        type: 'list', name: 'sessionId', pageSize: listPageSize(choices.length),
        message: showOther ? '选择其他项目历史（ESC 返回）' : local.length ? '选择当前文件夹的历史对话（创建新分支，ESC 取消）' : '当前文件夹没有历史对话，可新建会话或查看其他项目',
        default: defaultId || visible[0]?.id || 'new', choices
      }, '', null, { sessionId: showOther ? 'back' : null }));
      defaultId = undefined;
      if (sessionId === 'more') {
        defaultId = items[limits[group]]?.id;
        limits[group] += 20;
        continue;
      }
      if (sessionId === 'other') { showOther = true; continue; }
      if (sessionId === 'back') { showOther = false; continue; }
      break;
    }
    if (sessionId === 'new') return args.filter(arg => arg !== 'resume');
    if (!sessionId) return null;
    const selected = history.find(item => item.id === sessionId);
    const details = `ID: ${selected.id}\n目录: ${escapeTerminalText(selected.cwd)}\n原供应商: ${escapeTerminalText(selected.provider)}\n创建时间: ${escapeTerminalText(selected.timestamp)}\n最近使用: ${new Date(selected.modifiedAt).toLocaleString()}`;
    const { confirmed } = await navigation.promptWithESCAndDefault({
      type: 'confirm', name: 'confirmed', default: false,
      message: `${details}\n将以供应商「${escapeTerminalText(config.displayName || config.name)}」处理所选历史上下文并创建新对话；若原供应商不同，历史内容会发送给新供应商。是否继续？`
    }, '', null, { confirmed: false });
    if (!confirmed) return null;
    return ['fork', sessionId, ...args.filter(arg => arg !== 'resume')];
  } finally {
    navigation.destroy();
  }
}

module.exports = { listCodexHistory, selectCodexHistory };
