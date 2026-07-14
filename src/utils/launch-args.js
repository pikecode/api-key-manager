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

const dangerousImportArgs = new Set([
  '--dangerously-skip-permissions',
  '--dangerously-bypass-approvals-and-sandbox'
]);

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
 * 校验启动参数是否属于当前支持列表
 * @param {string} ideName - IDE 名称
 * @param {string[]} selectedArgs - 待校验参数
 * @returns {string|null} 校验错误，合法时返回 null
 */
function validateLaunchArgs(ideName, selectedArgs) {
  if (!Array.isArray(selectedArgs)) {
    return '启动参数必须是字符串数组';
  }

  const availableArgs = getLaunchArgs(ideName);
  const allowedArgs = new Set(availableArgs.map(arg => arg.name));
  const invalidArgs = selectedArgs.filter(arg => typeof arg !== 'string' || !allowedArgs.has(arg));

  if (invalidArgs.length > 0) {
    const printableArgs = invalidArgs.map(arg => {
      const serialized = JSON.stringify(arg);
      return serialized === undefined ? String(arg) : serialized;
    });
    return `不支持的启动参数: ${printableArgs.join(', ')}`;
  }

  return checkExclusiveArgs(selectedArgs, availableArgs);
}

/**
 * 断言启动参数合法，供配置导入和子进程启动边界复用
 * @param {string} ideName - IDE 名称
 * @param {string[]} selectedArgs - 待校验参数
 */
function assertSupportedLaunchArgs(ideName, selectedArgs) {
  const error = validateLaunchArgs(ideName, selectedArgs);
  if (error) {
    throw new Error(error);
  }
}

/**
 * 外部配置不得静默启用跳过审批或沙盒的最高权限参数。
 * @param {string} ideName - IDE 名称
 * @param {string[]} selectedArgs - 导入配置中的启动参数
 */
function assertSafeImportLaunchArgs(ideName, selectedArgs) {
  assertSupportedLaunchArgs(ideName, selectedArgs);
  const dangerousArgs = selectedArgs.filter(arg => dangerousImportArgs.has(arg));
  if (dangerousArgs.length > 0) {
    throw new Error(`导入配置不能包含最高权限启动参数: ${dangerousArgs.join(', ')}`);
  }
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
  checkExclusiveArgs,
  validateLaunchArgs,
  assertSupportedLaunchArgs,
  assertSafeImportLaunchArgs
};
