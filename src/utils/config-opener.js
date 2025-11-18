const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AKM_CONFIG_FILE = path.join(os.homedir(), '.akm-config.json');

function ensureConfigExists() {
  return fs.pathExists(AKM_CONFIG_FILE);
}

function openFileWithDefaultApp(filePath) {
  return new Promise((resolve, reject) => {
    let command;
    let args = [];

    if (process.platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', '', filePath];
    } else if (process.platform === 'darwin') {
      command = 'open';
      args = [filePath];
    } else {
      command = 'xdg-open';
      args = [filePath];
    }

    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', reject);
    child.unref();
    resolve();
  });
}

async function openAKMConfigFile() {
  if (!(await ensureConfigExists())) {
    throw new Error('未找到配置文件 ~/.akm-config.json\n请先运行 \'akm add\' 创建第一个供应商配置');
  }

  try {
    await openFileWithDefaultApp(AKM_CONFIG_FILE);
  } catch (error) {
    throw new Error(`无法打开配置文件: ${error.message}\n配置文件位置: ${AKM_CONFIG_FILE}`);
  }
}

module.exports = {
  openAKMConfigFile
};
