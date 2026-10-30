const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
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
          const data = meta.payload;
          if (meta.type !== 'session_meta' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data?.id)) continue;
          history.push({ id: data.id, cwd: String(data.cwd || ''), timestamp: String(data.timestamp || meta.timestamp || ''), provider: String(data.model_provider || '未知') });
        } finally {
          if (handle !== undefined) await fs.close(handle);
        }
      }
    }
  }
  await scan(path.join(root, 'sessions'));
  await scan(path.join(root, 'archived_sessions'));
  return [...new Map(history.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(item => [item.id, item])).values()];
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
  const { sessionId } = await inquirer.prompt({
    type: 'list', name: 'sessionId', message: '选择历史对话（创建新分支，原记录保留）', pageSize: 15,
    choices: [
      { name: '取消', value: null },
      ...history.map(item => ({ name: `${item.timestamp} | ${item.cwd} | ${item.provider} | ${item.id}`, value: item.id }))
    ]
  });
  if (!sessionId) return null;
  const { confirmed } = await inquirer.prompt({
    type: 'confirm', name: 'confirmed', default: false,
    message: `将以供应商「${config.displayName || config.name}」处理所选历史上下文并创建新对话；若原供应商不同，历史内容会发送给新供应商。是否继续？`
  });
  if (!confirmed) return null;
  return ['fork', sessionId, ...args.filter(arg => arg !== 'resume')];
}

module.exports = { listCodexHistory, selectCodexHistory };
