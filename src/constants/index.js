/**
 * 全局常量定义
 * 统一管理项目中重复出现的常量，提高可维护性
 */

// ============ 认证模式常量 ============

/**
 * 认证模式的显示名称映射
 */
const AUTH_MODE_DISPLAY = {
  api_key: 'API Key 模式',
  auth_token: 'Auth Token 模式'
};

/**
 * 认证模式详细说明（用于添加供应商时）
 */
const AUTH_MODE_DISPLAY_DETAILED = {
  api_key: 'API Key 模式 (ANTHROPIC_API_KEY)',
  auth_token: 'Auth Token 模式 (ANTHROPIC_AUTH_TOKEN)'
};

/**
 * 所有支持的认证模式列表
 */
const AUTH_MODES = ['api_key', 'auth_token'];

// ============ ESC 返回提示常量 ============

/**
 * ESC 导航提示消息
 */
const ESC_HINTS = {
  BACK_TO_PROVIDER_SELECTION: '返回供应商选择',
  BACK_TO_MANAGE_LIST: '返回管理列表',
  BACK_TO_QUICK_SETTINGS: '返回快速设置',
  BACK_TO_MAIN_MENU: '返回主菜单',
  EXIT_PROGRAM: '退出程序',
  CANCEL_ADD: '取消添加'
};

/**
 * ESC 日志消息
 */
const ESC_LOGS = {
  BACK_TO_PROVIDER_SELECTION: '返回供应商选择',
  BACK_TO_MANAGE_LIST: '返回管理列表',
  BACK_TO_QUICK_SETTINGS: '返回快速设置',
  BACK_TO_MAIN_MENU: '返回主菜单',
  EXIT_PROGRAM: '退出程序',
  CANCEL_ADD: '取消添加供应商',
  CANCEL_LAUNCH: '已取消启动'
};

// ============ IDE 类型常量 ============

/**
 * IDE 名称常量
 */
const IDE_NAMES = {
  CLAUDE: 'claude',
  CODEX: 'codex'
};

/**
 * IDE 显示名称
 */
const IDE_DISPLAY_NAMES = {
  claude: 'Claude Code',
  codex: 'Codex CLI'
};

// ============ 状态检查常量 ============

/**
 * 供应商状态
 */
const PROVIDER_STATUS = {
  ONLINE: 'online',
  DEGRADED: 'degraded',
  OFFLINE: 'offline',
  PENDING: 'pending',
  UNKNOWN: 'unknown'
};

/**
 * 状态图标映射
 */
const STATUS_ICONS = {
  online: '🟢',
  degraded: '🟡',
  offline: '🔴',
  pending: '⏳',
  unknown: '⚪'
};

/**
 * 状态颜色配置 (chalk 颜色名称)
 */
const STATUS_COLORS = {
  online: 'green',
  degraded: 'yellow',
  offline: 'red',
  pending: 'gray',
  unknown: 'gray'
};

// ============ 操作类型常量 ============

/**
 * 特殊选择值
 */
const SPECIAL_SELECTION = {
  ADD_PROVIDER: '__ADD__',
  MANAGE_PROVIDER: '__MANAGE__',
  OPEN_CONFIG: '__OPEN_CONFIG__',
  EXIT: '__EXIT__',
  BACK: 'back'
};

// ============ 配置相关常量 ============

/**
 * 基础 URL 相关的常量
 */
const BASE_URL = {
  OFFICIAL_DEFAULT: '✨ 官方默认服务器',
  NOT_SET: '⚠️ 未设置'
};

/**
 * 当前状态显示
 */
const CURRENT_STATUS = {
  IN_USE: '✅ 使用中',
  NOT_IN_USE: '⚫ 未使用'
};

// ============ 模型相关常量 ============

/**
 * 默认模型值
 */
const DEFAULT_MODELS = {
  NOT_SET: '未设置'
};

/**
 * 模型类型
 */
const MODEL_TYPES = {
  PRIMARY: 'primary',
  SMALL_FAST: 'smallFast'
};

// ============ 消息常量 ============

/**
 * 系统消息
 */
const MESSAGES = {
  CONFIGURATION_COMPLETE: '🎉 供应商添加完成！正在返回主界面...',
  NO_PROVIDER_CONFIGURED: '暂无配置的供应商',
  NO_CODEX_PROVIDER: '暂无 Codex CLI 供应商配置',
  NO_CLAUDE_PROVIDER: '暂无 Claude Code 供应商配置',
  ADD_FIRST_PROVIDER: '请先运行 "akm add" 添加供应商配置'
};

// ============ API 相关常量 ============

/**
 * API 请求配置
 */
const API_CONFIG = {
  // 请求超时时间（毫秒）
  DEFAULT_TIMEOUT: 5000,
  // 状态缓存时间（毫秒）
  CACHE_TTL: 30000,
  // 默认测试消息
  TEST_MESSAGE: '你好',
  // 默认最大 Token 数
  MAX_TOKENS: 32,
  // 默认模型
  DEFAULT_MODEL: 'claude-haiku-4-5-20251001'
};

/**
 * 环境变量名称
 */
const ENV_VARS = {
  ANTHROPIC_AUTH_TOKEN: 'ANTHROPIC_AUTH_TOKEN',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_BASE_URL: 'OPENAI_BASE_URL'
};

module.exports = {
  // 认证模式
  AUTH_MODE_DISPLAY,
  AUTH_MODE_DISPLAY_DETAILED,
  AUTH_MODES,

  // ESC 提示
  ESC_HINTS,
  ESC_LOGS,

  // IDE
  IDE_NAMES,
  IDE_DISPLAY_NAMES,

  // 状态
  PROVIDER_STATUS,
  STATUS_ICONS,
  STATUS_COLORS,

  // 操作
  SPECIAL_SELECTION,

  // 配置
  BASE_URL,
  CURRENT_STATUS,

  // 模型
  DEFAULT_MODELS,
  MODEL_TYPES,

  // 消息
  MESSAGES,

  // API
  API_CONFIG,
  ENV_VARS
};
