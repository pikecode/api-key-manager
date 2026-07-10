/**
 * Status Helper Tests
 * 测试状态辅助类
 */

// Mock chalk before requiring StatusHelper
jest.mock('chalk', () => ({
  green: jest.fn(text => text),
  yellow: jest.fn(text => text),
  red: jest.fn(text => text),
  gray: jest.fn(text => text)
}));

const { StatusHelper } = require('../src/commands/switch/status-helper');
const chalk = require('chalk');

describe('StatusHelper', () => {
  describe('getIconForState', () => {
    it('应该返回在线状态图标', () => {
      expect(StatusHelper.getIconForState('online')).toBe('●');
    });

    it('应该返回降级状态图标', () => {
      expect(StatusHelper.getIconForState('degraded')).toBe('◐');
    });

    it('应该返回离线状态图标', () => {
      expect(StatusHelper.getIconForState('offline')).toBe('○');
    });

    it('应该返回等待状态图标', () => {
      expect(StatusHelper.getIconForState('pending')).toBe('…');
    });

    it('应该返回未知状态的默认图标', () => {
      expect(StatusHelper.getIconForState('unknown')).toBe('·');
      expect(StatusHelper.getIconForState(null)).toBe('·');
      expect(StatusHelper.getIconForState(undefined)).toBe('·');
    });
  });

  describe('formatAvailability', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('应该格式化在线状态', () => {
      const availability = { state: 'online', label: '正常', latency: 50 };
      const result = StatusHelper.formatAvailability(availability);

      expect(chalk.green).toHaveBeenCalledWith('正常');
      expect(result).toBe('正常');
    });

    it('应该格式化降级状态', () => {
      const availability = { state: 'degraded', label: '部分可用', latency: 200 };
      StatusHelper.formatAvailability(availability);

      expect(chalk.yellow).toHaveBeenCalledWith('部分可用');
    });

    it('应该格式化离线状态', () => {
      const availability = { state: 'offline', label: '不可用', latency: null };
      StatusHelper.formatAvailability(availability);

      expect(chalk.red).toHaveBeenCalledWith('不可用');
    });

    it('应该格式化等待状态', () => {
      const availability = { state: 'pending', label: '检测中', latency: null };
      StatusHelper.formatAvailability(availability);

      expect(chalk.gray).toHaveBeenCalledWith('检测中');
    });

    it('应该使用默认标签', () => {
      const availability = { state: 'online', latency: 50 };
      StatusHelper.formatAvailability(availability);

      expect(chalk.green).toHaveBeenCalledWith('可用');
    });

    it('应该处理 null 可用性', () => {
      const result = StatusHelper.formatAvailability(null);

      expect(chalk.gray).toHaveBeenCalledWith('测试中...');
      expect(result).toBe('测试中...');
    });

    it('应该处理未知状态', () => {
      const availability = { state: 'unknown', label: '未知' };
      StatusHelper.formatAvailability(availability);

      expect(chalk.gray).toHaveBeenCalledWith('未知');
    });
  });

  describe('buildInitialStatusMap', () => {
    it('应该为所有供应商创建初始状态', () => {
      const providers = [
        { name: 'provider1' },
        { name: 'provider2' }
      ];

      const statusMap = StatusHelper.buildInitialStatusMap(providers);

      expect(statusMap).toHaveProperty('provider1');
      expect(statusMap).toHaveProperty('provider2');
      expect(statusMap.provider1).toEqual({
        state: 'pending',
        label: '测试中...',
        latency: null
      });
    });

    it('应该使用缓存的状态', () => {
      const providers = [{ name: 'provider1' }];
      const cachedStatus = {
        provider1: { state: 'online', label: '可用', latency: 50 }
      };

      const statusMap = StatusHelper.buildInitialStatusMap(providers, cachedStatus);

      expect(statusMap.provider1).toEqual(cachedStatus.provider1);
    });

    it('应该处理空供应商列表', () => {
      const statusMap = StatusHelper.buildInitialStatusMap([]);

      expect(Object.keys(statusMap).length).toBe(0);
    });

    it('应该为没有缓存的供应商使用默认状态', () => {
      const providers = [
        { name: 'provider1' },
        { name: 'provider2' }
      ];
      const cachedStatus = {
        provider1: { state: 'online', label: '可用', latency: 50 }
      };

      const statusMap = StatusHelper.buildInitialStatusMap(providers, cachedStatus);

      expect(statusMap.provider1.state).toBe('online');
      expect(statusMap.provider2.state).toBe('pending');
    });
  });

  describe('buildErrorStatusMap', () => {
    it('应该为所有供应商创建错误状态', () => {
      const providers = [
        { name: 'provider1' },
        { name: 'provider2' }
      ];
      const error = new Error('网络错误');

      const statusMap = StatusHelper.buildErrorStatusMap(providers, error);

      expect(statusMap.provider1).toEqual({
        state: 'offline',
        label: '检测失败: 网络错误',
        latency: null
      });
      expect(statusMap.provider2).toEqual({
        state: 'offline',
        label: '检测失败: 网络错误',
        latency: null
      });
    });

    it('应该处理没有错误对象的情况', () => {
      const providers = [{ name: 'provider1' }];

      const statusMap = StatusHelper.buildErrorStatusMap(providers, null);

      expect(statusMap.provider1.label).toBe('检测失败');
    });

    it('应该处理空供应商列表', () => {
      const statusMap = StatusHelper.buildErrorStatusMap([], new Error('test'));

      expect(Object.keys(statusMap).length).toBe(0);
    });
  });

  describe('formatLatency', () => {
    it('应该格式化低延迟为绿色', () => {
      StatusHelper.formatLatency(50);
      expect(chalk.green).toHaveBeenCalledWith('50ms');
    });

    it('应该格式化中等延迟为黄色', () => {
      StatusHelper.formatLatency(150);
      expect(chalk.yellow).toHaveBeenCalledWith('150ms');
    });

    it('应该格式化高延迟为红色', () => {
      StatusHelper.formatLatency(500);
      expect(chalk.red).toHaveBeenCalledWith('500ms');
    });

    it('应该处理 null 延迟', () => {
      const result = StatusHelper.formatLatency(null);
      expect(result).toBe('');
    });

    it('应该处理 undefined 延迟', () => {
      const result = StatusHelper.formatLatency(undefined);
      expect(result).toBe('');
    });
  });

  describe('needsRefresh', () => {
    it('应该检测需要刷新的状态', () => {
      const oldStatus = {
        state: 'online',
        timestamp: Date.now() - 40000 // 40 秒前
      };

      expect(StatusHelper.needsRefresh(oldStatus, 30000)).toBe(true);
    });

    it('应该检测不需要刷新的状态', () => {
      const recentStatus = {
        state: 'online',
        timestamp: Date.now() - 10000 // 10 秒前
      };

      expect(StatusHelper.needsRefresh(recentStatus, 30000)).toBe(false);
    });

    it('应该标记没有时间戳的状态需要刷新', () => {
      const status = { state: 'online' };

      expect(StatusHelper.needsRefresh(status)).toBe(true);
    });

    it('应该标记 null 状态需要刷新', () => {
      expect(StatusHelper.needsRefresh(null)).toBe(true);
    });
  });
});
