/**
 * UI 文案常量
 * 集中管理所有用户界面文本，便于维护和本地化
 */

const UI_MESSAGES = {
  // 通用操作
  CANCEL: '取消',
  CONFIRM: '确认',
  BACK: '返回',
  SKIP: '跳过',

  // ESC 键提示
  ESC_CANCEL: '取消操作',
  ESC_BACK_TO_MENU: '返回上级菜单',
  ESC_CANCEL_ADD: '取消添加',
  ESC_CANCEL_CLONE: '取消克隆',
  ESC_CANCEL_EDIT: '取消编辑',
  ESC_SKIP_CONFIG: '跳过配置',

  // 添加供应商
  ADD_PROVIDER_TITLE: '添加新供应商',
  ADD_PROVIDER_TOOLTIP: '请填写供应商配置信息',
  ADD_PROVIDER_STEP_1: '填写供应商信息',
  ADD_PROVIDER_STEP_2_LAUNCH_ARGS: '可选: 配置启动参数',
  ADD_PROVIDER_STEP_2_MODELS: '可选: 配置模型参数',
  ADD_PROVIDER_SUCCESS: '供应商添加完成',
  ADD_PROVIDER_CANCELLED: '取消添加供应商',

  // 克隆供应商
  CLONE_PROVIDER_TITLE: '克隆供应商',
  CLONE_PROVIDER_SUCCESS: '供应商克隆成功！',
  CLONE_PROVIDER_CANCELLED: '取消克隆供应商',

  // 配置启动参数
  CONFIG_LAUNCH_ARGS_TITLE: '配置启动参数',
  CONFIG_LAUNCH_ARGS_TOOLTIP: '选择要使用的启动参数',
  CONFIG_LAUNCH_ARGS_SKIP: '跳过启动参数配置',

  // 配置 Codex 启动参数
  CONFIG_CODEX_LAUNCH_ARGS_TITLE: '配置 Codex 启动参数',
  CONFIG_CODEX_LAUNCH_ARGS_TOOLTIP: '选择要使用的 Codex 启动参数',
  CONFIG_CODEX_LAUNCH_ARGS_SKIP: '跳过 Codex 启动参数配置',

  // 配置模型参数
  CONFIG_MODELS_TITLE: '配置模型参数',
  CONFIG_MODELS_TOOLTIP: '配置主模型和快速模型（可选）',
  CONFIG_MODELS_SKIP: '跳过模型参数配置',

  // 键盘提示
  HINT_ENTER: 'Enter',
  HINT_ENTER_DESC: '确认输入',
  HINT_TAB: 'Tab',
  HINT_TAB_DESC: '切换字段',
  HINT_ESC: 'ESC',
  HINT_ESC_CANCEL: '取消添加',
  HINT_ESC_SKIP: '跳过配置',
  HINT_SPACE: '空格',
  HINT_SPACE_DESC: '切换选中',
  HINT_A: 'A',
  HINT_A_DESC: '全选',
  HINT_I: 'I',
  HINT_I_DESC: '反选',
  HINT_ENTER_CONFIRM: '确认选择',

  // 提示信息
  SELECT_IDE: '选择要管理的 IDE:',
  IMPORT_FROM_CODEX: '是否从现有 Codex 配置导入?',
  IMPORT_FROM_CODEX_EXISTING: '从 ~/.codex 导入现有配置',
  IMPORT_FROM_CODEX_MANUAL: '手动输入配置',
  INPUT_PROVIDER_NAME: '请输入供应商名称:',
  SELECT_AUTH_MODE: '选择认证模式:',
  INPUT_BASE_URL: '请输入 API 基础URL (ANTHROPIC_BASE_URL):',
  INPUT_OPENAI_BASE_URL: '请输入 OpenAI API 基础URL (如使用官方API可留空):',
  INPUT_TOKEN: '请输入 Token',
  INPUT_OPENAI_API_KEY: '请输入 OpenAI API Key (OPENAI_API_KEY):',
  SET_AS_DEFAULT: '是否设置为当前供应商?',
  CONFIGURE_LAUNCH_ARGS: '是否配置启动参数?',
  CONFIGURE_CODEX_LAUNCH_ARGS: '是否配置 Codex 启动参数?',
  CONFIGURE_MODELS: '是否配置模型参数?',
  SELECT_LAUNCH_ARGS: '请选择启动参数:',
  INPUT_PRIMARY_MODEL: '主模型 (ANTHROPIC_MODEL)：',
  INPUT_SMALL_FAST_MODEL: '快速模型 (ANTHROPIC_SMALL_FAST_MODEL)：',

  // IDE 选项
  IDE_CLAUDE_CODE: 'Claude Code (Anthropic)',
  IDE_CODEX: 'Codex CLI (OpenAI)',

  // 认证模式
  AUTH_MODE_API_KEY: '🔑 ANTHROPIC_API_KEY - 大多数第三方代理使用',
  AUTH_MODE_AUTH_TOKEN: '🔐 ANTHROPIC_AUTH_TOKEN - 部分服务商使用',
  AUTH_MODE_CODEX_API_KEY: '🔑 API Key - 使用 OpenAI API Key',
  AUTH_MODE_CODEX_CHATGPT_LOGIN: '🌐 官方网页登录 - 使用 OpenAI 账号登录',

  // Codex 特定提示
  SELECT_CODEX_AUTH_MODE: '选择 Codex 认证方式:',
  CODEX_CHATGPT_LOGIN_INFO: '使用官方 OpenAI 网页登录，Codex 启动时会打开浏览器',
  CODEX_API_KEY_INFO: '使用 API Key 方式，支持官方或第三方代理',

  // 操作结果
  OPERATION_CANCELLED: '操作已取消',
  OPERATION_SUCCESS: '操作成功',

  // 供应商信息显示
  PROVIDER_NAME: '名称',
  PROVIDER_IDE: 'IDE',
  PROVIDER_BASE_URL: '基础 URL',
  PROVIDER_TOKEN: 'Token',
  PROVIDER_LAUNCH_ARGS: '启动参数',
  PROVIDER_MODEL_CONFIG: '模型配置',
  PROVIDER_PRIMARY_MODEL: '主模型',
  PROVIDER_SMALL_FAST_MODEL: '快速模型'
};

module.exports = { UI_MESSAGES };
