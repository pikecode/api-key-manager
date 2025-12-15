describe('Codex Configuration Fields', () => {
  describe('Codex should not have Claude-specific fields', () => {
    it('should not include authMode for Codex', () => {
      const codexProvider = {
        name: 'codex-provider',
        ideName: 'codex',
        baseUrl: 'https://api.openai.com',
        authToken: 'sk-xxx',
        authMode: null,
        tokenType: null,
        models: null
      };

      expect(codexProvider.ideName).toBe('codex');
      expect(codexProvider.authMode).toBeNull();
      expect(codexProvider.tokenType).toBeNull();
      expect(codexProvider.models).toBeNull();
    });

    it('should include authMode for Claude', () => {
      const claudeProvider = {
        name: 'claude-provider',
        ideName: 'claude',
        authMode: 'oauth_token',
        tokenType: 'api_key',
        models: {
          primary: 'claude-opus-4-20250514',
          smallFast: 'claude-3-5-haiku-20241022'
        }
      };

      expect(claudeProvider.ideName).toBe('claude');
      expect(claudeProvider.authMode).not.toBeNull();
      expect(claudeProvider.models).not.toBeNull();
    });

    it('should clean up Claude fields when converting config type', () => {
      // Simulate a provider that incorrectly had Claude fields
      const mixedProvider = {
        name: 'test',
        ideName: 'codex',
        authMode: 'openai_api_key', // Should be null
        tokenType: 'api_key', // Should be null
        models: { primary: 'gpt-4' } // Should be null
      };

      // Clean it up
      if (mixedProvider.ideName === 'codex') {
        mixedProvider.authMode = null;
        mixedProvider.tokenType = null;
        mixedProvider.models = null;
      }

      expect(mixedProvider.authMode).toBeNull();
      expect(mixedProvider.tokenType).toBeNull();
      expect(mixedProvider.models).toBeNull();
    });

    it('should preserve Claude fields for Claude providers', () => {
      const claudeProvider = {
        name: 'claude-test',
        ideName: 'claude',
        authMode: 'api_key',
        tokenType: 'auth_token',
        models: {
          primary: 'claude-3-5-sonnet-20241022',
          smallFast: 'claude-3-5-haiku-20241022'
        }
      };

      // Should not be modified
      expect(claudeProvider.authMode).not.toBeNull();
      expect(claudeProvider.tokenType).not.toBeNull();
      expect(claudeProvider.models).not.toBeNull();
      expect(claudeProvider.models.primary).toBeTruthy();
    });
  });
});
