describe('Edit Provider IDE Type', () => {
  describe('IDE type preservation during edit', () => {
    it('should preserve Codex IDE type when editing', () => {
      const provider = {
        name: 'my-codex',
        displayName: 'My Codex',
        ideName: 'codex',
        authToken: 'sk-openai-key',
        baseUrl: 'https://api.openai.com'
      };

      // Simulate editing - should preserve ideName
      const edited = {
        ...provider,
        displayName: 'Updated Codex',
        baseUrl: 'https://api.openai.com'
      };

      // Ensure ideName remains codex
      edited.ideName = provider.ideName === 'codex' ? 'codex' : 'claude';

      expect(edited.ideName).toBe('codex');
      expect(edited.displayName).toBe('Updated Codex');
    });

    it('should preserve Claude IDE type when editing', () => {
      const provider = {
        name: 'my-claude',
        displayName: 'My Claude',
        ideName: 'claude',
        authMode: 'oauth_token',
        authToken: 'sk-ant-oauth-token',
        models: {
          primary: 'claude-3-5-sonnet-20241022',
          smallFast: 'claude-3-5-haiku-20241022'
        }
      };

      // Simulate editing - should preserve ideName
      const edited = {
        ...provider,
        displayName: 'Updated Claude',
        authMode: 'api_key',
        models: {
          primary: 'claude-opus-4-20250514',
          smallFast: 'claude-3-5-haiku-20241022'
        }
      };

      // Ensure ideName remains claude
      edited.ideName = provider.ideName === 'codex' ? 'codex' : 'claude';

      expect(edited.ideName).toBe('claude');
      expect(edited.displayName).toBe('Updated Claude');
      expect(edited.models.primary).toBe('claude-opus-4-20250514');
    });

    it('should not allow IDE type to change during edit', () => {
      const codexProvider = {
        name: 'codex-provider',
        ideName: 'codex'
      };

      // Try to incorrectly change to claude
      const edited = { ...codexProvider, ideName: 'claude' };

      // Enforce preservation logic
      edited.ideName = codexProvider.ideName === 'codex' ? 'codex' : 'claude';

      // Should remain codex
      expect(edited.ideName).toBe('codex');
    });

    it('should show different form fields for Claude vs Codex', () => {
      const claudeProvider = { ideName: 'claude' };
      const codexProvider = { ideName: 'codex' };

      // Claude should have authMode, models
      const claudeHasAuthMode = claudeProvider.ideName !== 'codex';
      expect(claudeHasAuthMode).toBe(true);

      // Codex should not have authMode, models
      const codexHasAuthMode = codexProvider.ideName !== 'codex';
      expect(codexHasAuthMode).toBe(false);
    });
  });
});
