const chalk = require('chalk');

class UIHelper {
  // 创建标题

  // 创建标题
  static createTitle(text, icon = '') {
    const fullIcon = icon ? `${icon} ` : '';
    return chalk.bold.cyan(`\n╭─────────────────────────────────────╮\n│ ${fullIcon}${chalk.white(text)}\n╰─────────────────────────────────────╯`);
  }

  // 创建分隔线
  static createSeparator() {
    return chalk.gray('─'.repeat(45));
  }

  // 创建项目列表
  static createItem(label, value, isSelected = false) {
    const icon = isSelected ? UIHelper.icons.current : '•';
    const color = isSelected ? UIHelper.colors.primary : UIHelper.colors.info;
    return `${color(icon)} ${label}`;
  }

  // 创建操作按钮
  static createButton(label, action, icon = '') {
    const fullIcon = icon ? `${icon} ` : '';
    return `${UIHelper.colors.accent(fullIcon)}${UIHelper.colors.info(label)}`;
  }

  // 创建状态指示器
  static createStatus(status, label) {
    const statusConfig = {
      current: { icon: UIHelper.icons.current, color: UIHelper.colors.success },
      active: { icon: chalk.green('●'), color: UIHelper.colors.success },
      inactive: { icon: chalk.gray('·'), color: UIHelper.colors.muted },
      loading: { icon: UIHelper.icons.loading, color: UIHelper.colors.warning },
      error: { icon: UIHelper.icons.error, color: UIHelper.colors.error }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    return `${config.color(config.icon)} ${UIHelper.colors.info(label)}`;
  }

  // 格式化供应商信息
  static formatProvider(provider) {
    const status = provider.current ? 'current' : 'inactive';
    const statusText = UIHelper.createStatus(status, provider.name);
    const displayName = UIHelper.colors.secondary(`(${provider.displayName})`);

    return `${statusText} ${displayName}`;
  }

  // 创建进度条
  static createProgressBar(current, total, width = 30) {
    const progress = Math.floor((current / total) * width);
    const empty = width - progress;
    const filled = '█'.repeat(progress);
    const emptySpace = '░'.repeat(empty);
    const percentage = Math.floor((current / total) * 100);

    return `${UIHelper.colors.primary(filled)}${UIHelper.colors.muted(emptySpace)} ${UIHelper.colors.info(percentage + '%')}`;
  }

  // 创建表格
  static createTable(headers, rows) {
    const columnWidths = headers.map(header => Math.max(header.length, ...rows.map(row => String(row[headers.indexOf(header)]).length)));

    let result = '';

    // 表头
    const headerRow = headers.map((header, i) => header.padEnd(columnWidths[i])).join(' │ ');
    result += `${UIHelper.colors.primary(headerRow)}\n`;

    // 分隔线
    const separator = columnWidths.map(width => '─'.repeat(width)).join('─┼─');
    result += `${UIHelper.colors.muted(separator)}\n`;

    // 数据行
    rows.forEach(row => {
      const dataRow = row.map((cell, i) => String(cell).padEnd(columnWidths[i])).join(' │ ');
      result += `${UIHelper.colors.info(dataRow)}\n`;
    });

    return result;
  }

  // 剥离 ANSI 转义码后的可见字符长度
  static _visibleLength(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '').length;
  }

  // 创建卡片式布局
  static createCard(title, content, icon = '') {
    const lines = content.split('\n');
    const maxLineLength = Math.max(...lines.map(line => UIHelper._visibleLength(line)));
    const iconPrefix = icon ? `${icon} ` : '';
    const titleVisible = UIHelper._visibleLength(title);
    const horizontalBorder = '─'.repeat(maxLineLength + 4);

    let result = `${UIHelper.colors.primary(`┌─${horizontalBorder}─┐`)}\n`;
    result += `${UIHelper.colors.primary('│')}  ${chalk.bold.white(iconPrefix)}${chalk.bold.white(title)}${' '.repeat(Math.max(0, maxLineLength - titleVisible - iconPrefix.length))}  ${UIHelper.colors.primary('│')}\n`;
    result += `${UIHelper.colors.primary('├─')}${UIHelper.colors.muted(horizontalBorder)}${UIHelper.colors.primary('─┤')}\n`;

    lines.forEach(line => {
      result += `${UIHelper.colors.primary('│')}  ${UIHelper.colors.info(line)}${' '.repeat(Math.max(0, maxLineLength - UIHelper._visibleLength(line)))}  ${UIHelper.colors.primary('│')}\n`;
    });

    result += `${UIHelper.colors.primary('└─')}${UIHelper.colors.muted(horizontalBorder)}${UIHelper.colors.primary('─┘')}`;
    return result;
  }

  // 创建操作菜单
  static createMenu(title, options) {
    let result = `${UIHelper.createTitle(title, UIHelper.icons.list)}\n\n`;

    options.forEach((option, index) => {
      const number = UIHelper.colors.muted(`[${index + 1}]`);
      const icon = option.icon || '•';
      const description = option.description ? UIHelper.colors.muted(` - ${option.description}`) : '';
      result += `${number} ${UIHelper.colors.accent(icon)} ${UIHelper.colors.info(option.label)}${description}\n`;
    });

    result += `\n${UIHelper.colors.muted(UIHelper.createSeparator())}\n`;
    result += `${UIHelper.colors.warning('请选择操作 (输入数字): ')}`;

    return result;
  }

  // 创建确认对话框
  static createConfirmDialog(message, options = ['确认', '取消']) {
    return `${UIHelper.colors.warning(message)}\n\n` +
           `${UIHelper.colors.success('[Y]')} ${UIHelper.colors.info(options[0])}  ` +
           `${UIHelper.colors.error('[N]')} ${UIHelper.colors.info(options[1])}`;
  }

  // 格式化时间
  static formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)} 天前`;

    return date.toLocaleDateString('zh-CN');
  }

  // 创建搜索框
  static createSearchBox(placeholder = '搜索...') {
    return `${UIHelper.colors.info(UIHelper.icons.search)} ${UIHelper.colors.muted(placeholder)}`;
  }

  // 创建提示框
  static createTooltip(text) {
    return `${UIHelper.colors.muted('💡 ' + text)}`;
  }

  // 创建加载动画
  static createLoadingAnimation(text = '加载中...') {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    return setInterval(() => {
      process.stdout.write(`\r${UIHelper.colors.warning(frames[frameIndex])} ${UIHelper.colors.info(text)}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 100);
  }

  // 清除加载动画
  static clearLoadingAnimation(interval) {
    clearInterval(interval);
    process.stdout.write('\r');
  }

  // 创建快捷键提示
  static createShortcutHint(key, action) {
    return `${UIHelper.colors.muted('[')}${UIHelper.colors.primary(key)}${UIHelper.colors.muted(']')} ${UIHelper.colors.info(action)}`;
  }

  // 创建 ESC 键提示
  static createESCHint(action = '返回') {
    return `${UIHelper.colors.muted('[')}${UIHelper.colors.primary('ESC')}${UIHelper.colors.muted(']')} ${UIHelper.colors.info(action)}`;
  }

  // 创建提示行
  static createHintLine(pairs = []) {
    if (!pairs.length) {
      return '';
    }
    const hints = pairs.map(([key, action]) => UIHelper.createShortcutHint(key, action));
    return `${UIHelper.colors.muted('提示: ')}${hints.join(UIHelper.colors.muted(' · '))}`;
  }

  // 创建步骤指示
  static createStepIndicator(current, total, label) {
    const prefix = UIHelper.colors.muted(`步骤 ${current}/${total}`);
    const title = label ? ` ${UIHelper.colors.info(label)}` : '';
    return `${prefix}${title}`;
  }
}

// 颜色主题
UIHelper.colors = {
  primary: chalk.cyan,
  secondary: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.white,
  muted: chalk.gray,
  accent: chalk.magenta
};

// 图标
UIHelper.icons = {
  success: '✓',
  error: '✗',
  warning: '!',
  info: 'i',
  loading: '…',
  arrow: '→',
  back: '←',
  home: '~',
  settings: '*',
  add: '+',
  edit: '~',
  delete: '-',
  launch: '▶',
  list: '≡',
  config: '#',
  current: '›',
  search: '?'
};

module.exports = { UIHelper };
