/**
 * MCP Server Management Tests
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const inquirer = require('inquirer');

// Mock dependencies
jest.mock('fs-extra');
jest.mock('inquirer');
jest.mock('../src/utils/logger', () => ({
  Logger: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));
jest.mock('../src/navigation/EscNavigationManager', () => ({
  EscNavigationManager: jest.fn().mockImplementation(() => ({
    isSupported: () => false,
    register: jest.fn(),
    unregister: jest.fn(),
    reset: jest.fn()
  }))
}));

const { McpManager, MCP_PRESETS, mcpCommand } = require('../src/commands/mcp');
const { Logger } = require('../src/utils/logger');
const { EscNavigationManager } = require('../src/navigation/EscNavigationManager');

const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');

describe('MCP Server Management', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Restore EscNavigationManager mock after resetAllMocks
    EscNavigationManager.mockImplementation(() => ({
      isSupported: () => false,
      register: jest.fn(),
      unregister: jest.fn(),
      reset: jest.fn()
    }));
  });

  describe('list', () => {
    it('should show empty message when no servers', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({});
      const manager = new McpManager();
      await manager.list();
      expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('暂无'));
    });

    it('should show empty when file missing', async () => {
      fs.pathExists.mockResolvedValue(false);
      const manager = new McpManager();
      await manager.list();
      expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('暂无'));
    });

    it('should list existing servers', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        mcpServers: {
          Playwright: { command: 'npx', args: ['-y', '@playwright/mcp@latest'], env: {}, type: 'stdio' }
        }
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const manager = new McpManager();
      await manager.list();
      const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Playwright');
      spy.mockRestore();
    });
  });

  describe('add - preset', () => {
    it('should add preset servers', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({});
      inquirer.prompt
        .mockResolvedValueOnce({ source: 'preset' })
        .mockResolvedValueOnce({ presets: ['Playwright'] });
      const manager = new McpManager();
      await manager.add();
      expect(fs.writeJson).toHaveBeenCalledWith(
        CLAUDE_JSON_PATH,
        expect.objectContaining({
          mcpServers: expect.objectContaining({
            Playwright: expect.objectContaining({ command: 'npx' })
          })
        }),
        { spaces: 2 }
      );
      expect(Logger.success).toHaveBeenCalledWith(expect.stringContaining('Playwright'));
    });

    it('should skip already existing presets', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        mcpServers: {
          Playwright: { command: 'npx', args: [], env: {}, type: 'stdio' },
          filesystem: { command: 'npx', args: [], env: {}, type: 'stdio' },
          memory: { command: 'npx', args: [], env: {}, type: 'stdio' },
          fetch: { command: 'npx', args: [], env: {}, type: 'stdio' }
        }
      });
      inquirer.prompt.mockResolvedValueOnce({ source: 'preset' });
      const manager = new McpManager();
      await manager.add();
      expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('所有预设模板已添加'));
    });
  });

  describe('add - manual', () => {
    it('should add manual server config', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({});
      inquirer.prompt
        .mockResolvedValueOnce({ source: 'manual' })
        .mockResolvedValueOnce({
          name: 'my-server',
          command: 'node',
          args: 'server.js --port 3000',
          type: 'stdio',
          env: 'API_KEY=test123'
        });
      const manager = new McpManager();
      await manager.add();
      expect(fs.writeJson).toHaveBeenCalledWith(
        CLAUDE_JSON_PATH,
        expect.objectContaining({
          mcpServers: {
            'my-server': {
              command: 'node',
              args: ['server.js', '--port', '3000'],
              env: { API_KEY: 'test123' },
              type: 'stdio'
            }
          }
        }),
        { spaces: 2 }
      );
    });
  });

  describe('add - cancel', () => {
    it('should handle cancel', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({});
      inquirer.prompt.mockResolvedValueOnce({ source: null });
      const manager = new McpManager();
      await manager.add();
      expect(Logger.info).toHaveBeenCalledWith('操作已取消。');
      expect(fs.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('edit', () => {
    it('should warn when no servers exist', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({});
      const manager = new McpManager();
      await manager.edit();
      expect(Logger.warning).toHaveBeenCalledWith(expect.stringContaining('暂无'));
    });

    it('should edit existing server', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        mcpServers: {
          'test-server': { command: 'node', args: ['old.js'], env: {}, type: 'stdio' }
        }
      });
      inquirer.prompt
        .mockResolvedValueOnce({ name: 'test-server' })
        .mockResolvedValueOnce({
          command: 'python',
          args: 'new.py --flag',
          type: 'sse',
          env: 'KEY=val'
        });
      const manager = new McpManager();
      await manager.edit();
      expect(fs.writeJson).toHaveBeenCalledWith(
        CLAUDE_JSON_PATH,
        expect.objectContaining({
          mcpServers: {
            'test-server': {
              command: 'python',
              args: ['new.py', '--flag'],
              env: { KEY: 'val' },
              type: 'sse'
            }
          }
        }),
        { spaces: 2 }
      );
      expect(Logger.success).toHaveBeenCalledWith(expect.stringContaining('test-server'));
    });

    it('should handle cancel on edit', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        mcpServers: { s1: { command: 'npx', args: [], env: {}, type: 'stdio' } }
      });
      inquirer.prompt.mockResolvedValueOnce({ name: null });
      const manager = new McpManager();
      await manager.edit();
      expect(Logger.info).toHaveBeenCalledWith('操作已取消。');
    });
  });

  describe('remove', () => {
    it('should warn when no servers exist', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({});
      const manager = new McpManager();
      await manager.remove();
      expect(Logger.warning).toHaveBeenCalledWith(expect.stringContaining('暂无'));
    });

    it('should remove selected servers', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        mcpServers: {
          server1: { command: 'npx', args: [], env: {}, type: 'stdio' },
          server2: { command: 'node', args: [], env: {}, type: 'stdio' }
        }
      });
      inquirer.prompt
        .mockResolvedValueOnce({ names: ['server1'] })
        .mockResolvedValueOnce({ ok: true });
      const manager = new McpManager();
      await manager.remove();
      const writeCall = fs.writeJson.mock.calls[0];
      expect(writeCall[1].mcpServers).not.toHaveProperty('server1');
      expect(writeCall[1].mcpServers).toHaveProperty('server2');
      expect(Logger.success).toHaveBeenCalledWith(expect.stringContaining('server1'));
    });

    it('should handle cancel on confirm', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        mcpServers: { server1: { command: 'npx', args: [], env: {}, type: 'stdio' } }
      });
      inquirer.prompt
        .mockResolvedValueOnce({ names: ['server1'] })
        .mockResolvedValueOnce({ ok: false });
      const manager = new McpManager();
      await manager.remove();
      expect(fs.writeJson).not.toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith('操作已取消。');
    });
  });

  describe('mcpCommand', () => {
    it('should handle invalid subcommand', async () => {
      fs.pathExists.mockResolvedValue(false);
      await mcpCommand('invalid');
      expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('未知子命令'));
    });
  });

  describe('MCP_PRESETS', () => {
    it('should have valid preset configs', () => {
      expect(MCP_PRESETS.length).toBeGreaterThan(0);
      MCP_PRESETS.forEach(preset => {
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset.config).toHaveProperty('command');
        expect(preset.config).toHaveProperty('args');
        expect(preset.config).toHaveProperty('type');
      });
    });
  });
});
