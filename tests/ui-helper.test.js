/**
 * UI Helper Tests
 * 测试 UI 工具类
 */

const { UIHelper } = require('../src/utils/ui-helper');

describe('UIHelper', () => {
  describe('colors', () => {
    it('应该定义所有颜色主题', () => {
      expect(UIHelper.colors).toBeDefined();
      expect(UIHelper.colors.primary).toBeDefined();
      expect(UIHelper.colors.success).toBeDefined();
      expect(UIHelper.colors.error).toBeDefined();
      expect(UIHelper.colors.warning).toBeDefined();
    });
  });

  describe('icons', () => {
    it('应该定义所有图标', () => {
      expect(UIHelper.icons).toBeDefined();
      expect(UIHelper.icons.success).toBe('✅');
      expect(UIHelper.icons.error).toBe('❌');
      expect(UIHelper.icons.warning).toBe('⚠️');
      expect(UIHelper.icons.launch).toBe('🚀');
    });
  });

  describe('createTitle', () => {
    it('应该创建不带图标的标题', () => {
      const title = UIHelper.createTitle('测试标题');

      expect(title).toContain('测试标题');
      expect(title).toContain('╭');
      expect(title).toContain('╰');
    });

    it('应该创建带图标的标题', () => {
      const title = UIHelper.createTitle('测试标题', '🎯');

      expect(title).toContain('测试标题');
      expect(title).toContain('🎯');
    });
  });

  describe('createSeparator', () => {
    it('应该创建分隔线', () => {
      const separator = UIHelper.createSeparator();

      expect(separator).toBeDefined();
      expect(typeof separator).toBe('string');
      expect(separator.length).toBeGreaterThan(0);
    });
  });

  describe('createItem', () => {
    it('应该创建普通列表项', () => {
      const item = UIHelper.createItem('标签', '值', false);

      expect(item).toContain('标签');
      expect(item).toContain('•');
    });

    it('应该创建选中的列表项', () => {
      const item = UIHelper.createItem('标签', '值', true);

      expect(item).toContain('标签');
      expect(item).toContain('🎯');
    });
  });

  describe('createButton', () => {
    it('应该创建不带图标的按钮', () => {
      const button = UIHelper.createButton('按钮', 'action');

      expect(button).toContain('按钮');
    });

    it('应该创建带图标的按钮', () => {
      const button = UIHelper.createButton('按钮', 'action', '🚀');

      expect(button).toContain('按钮');
      expect(button).toContain('🚀');
    });
  });

  describe('createStatus', () => {
    it('应该创建状态显示', () => {
      const status = UIHelper.createStatus('online', '在线');

      expect(status).toBeDefined();
      expect(typeof status).toBe('string');
    });
  });

  describe('formatTime', () => {
    it('应该格式化时间戳', () => {
      const now = Date.now();
      const formatted = UIHelper.formatTime(now);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('应该格式化日期字符串', () => {
      const dateStr = '2025-01-27T10:00:00.000Z';
      const formatted = UIHelper.formatTime(dateStr);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('应该处理无效日期', () => {
      const formatted = UIHelper.formatTime('invalid');

      expect(formatted).toBeDefined();
    });

    it('应该处理 null', () => {
      const formatted = UIHelper.formatTime(null);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('createTable', () => {
    it('应该创建表格', () => {
      const headers = ['名称', '类型'];
      const rows = [['值1', '值2'], ['值3', '值4']];
      const table = UIHelper.createTable(headers, rows);

      expect(table).toBeDefined();
      expect(typeof table).toBe('string');
    });
  });

  describe('createMenu', () => {
    it('应该创建菜单', () => {
      const title = '菜单标题';
      const items = ['选项1', '选项2', '选项3'];
      const menu = UIHelper.createMenu(title, items);

      expect(menu).toBeDefined();
      expect(typeof menu).toBe('string');
    });
  });

  describe('createProgressBar', () => {
    it('应该创建进度条', () => {
      const progressBar = UIHelper.createProgressBar(50, 100);

      expect(progressBar).toBeDefined();
      expect(typeof progressBar).toBe('string');
    });
  });
});
