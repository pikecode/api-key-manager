const path = require('path');

function resolveShell(shell = process.env.SHELL) {
  if (shell) {
    return path.basename(shell).toLowerCase();
  }
  return process.platform === 'win32' ? 'cmd' : 'sh';
}

function quotePosix(value) {
  const escaped = String(value).replace(/'/g, String.raw`'\''`);
  return `'${escaped}'`;
}

function quotePowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function formatShellAssignment(name, value, shell = resolveShell()) {
  const normalizedShell = resolveShell(shell);
  if (normalizedShell === 'cmd' || normalizedShell === 'cmd.exe') {
    return `set "${name}=${String(value).replace(/["%]/g, char => `%${char}`)}"`;
  }

  if (normalizedShell === 'powershell' || normalizedShell === 'pwsh') {
    return `$env:${name} = ${quotePowerShell(value)}`;
  }

  return `export ${name}=${quotePosix(value)}`;
}

module.exports = { resolveShell, formatShellAssignment };
