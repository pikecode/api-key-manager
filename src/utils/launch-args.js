/**
 * 启动参数定义模块
 * 统一管理 Claude Code 和 Codex CLI 的启动参数
 */

const claudeLaunchArgs = [
  {
    name: '--continue',
    label: '继续上次对话',
    description: '恢复上次的对话记录',
    checked: false
  },
  {
    name: '--dangerously-skip-permissions',
    label: '最高权限',
    description: '仅在沙盒环境中使用',
    checked: false
  }
];

const codexLaunchArgs = [
  {
    name: 'resume',
    label: '继续上次对话',
    description: '恢复之前的会话',
    checked: false,
    isSubcommand: true
  },
  {
    name: '--full-auto',
    label: '全自动模式',
    description: '自动批准 + 工作区写入沙盒',
    checked: false,
    exclusive: ['--dangerously-bypass-approvals-and-sandbox']
  },
  {
    name: '--dangerously-bypass-approvals-and-sandbox',
    label: '跳过审批和沙盒',
    description: '危险：跳过所有安全检查',
    checked: false,
    exclusive: ['--full-auto']
  },
  {
    name: '--search',
    label: '启用网页搜索',
    description: '允许模型搜索网页',
    checked: false
  }
];

function getClaudeLaunchArgs() {
  return claudeLaunchArgs.map(arg => ({ ...arg }));
}

function getCodexLaunchArgs() {
  return codexLaunchArgs.map(arg => ({ ...arg }));
}

function getLaunchArgs(ideName) {
  return ideName === 'codex' ? getCodexLaunchArgs() : getClaudeLaunchArgs();
}

/**
 * 检查互斥参数
 * @param {string[]} selectedArgs - 选中的参数列表
 * @param {Array} availableArgs - 可用参数定义
 * @returns {string|null} 冲突错误信息或 null
 */
function checkExclusiveArgs(selectedArgs, availableArgs) {
  if (!selectedArgs || selectedArgs.length < 2) {
    return null;
  }

  for (const argDef of availableArgs) {
    if (!argDef.exclusive || !selectedArgs.includes(argDef.name)) {
      continue;
    }

    for (const exclusiveArg of argDef.exclusive) {
      if (selectedArgs.includes(exclusiveArg)) {
        const arg1 = availableArgs.find(a => a.name === argDef.name);
        const arg2 = availableArgs.find(a => a.name === exclusiveArg);
        return `"${arg1?.label || argDef.name}" 和 "${arg2?.label || exclusiveArg}" 不能同时选择`;
      }
    }
  }

  return null;
}

module.exports = {
  getClaudeLaunchArgs,
  getCodexLaunchArgs,
  getLaunchArgs,
  checkExclusiveArgs
};
