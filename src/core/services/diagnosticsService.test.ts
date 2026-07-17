import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS } from './settingsService';
import { createPrivacySafeDiagnostics } from './diagnosticsService';

describe('privacy-safe diagnostics', () => {
  it('exports only versions, statuses, and normalized error codes', () => {
    const result = createPrivacySafeDiagnostics(
      {
        settings: {
          ...DEFAULT_APP_SETTINGS,
          aiMode: 'gemini',
          secretStatus: { ...DEFAULT_APP_SETTINGS.secretStatus, geminiConfigured: true },
        },
        projectState: 'ready',
        errors: ['provider_authentication', 'save_failed', 'save_failed'],
      },
      new Date('2026-07-17T12:00:00.000Z'),
    );

    expect(result).toMatchObject({
      formatVersion: 1,
      persistence: { projectSchema: 4, migrationStatus: 'ready' },
      providers: { selectedMode: 'gemini', geminiConfigured: true },
      errorCodes: ['provider_authentication', 'save_failed'],
    });
    expect(JSON.stringify(result)).not.toMatch(/description|image|url|api.?key|secretValue/i);
  });
});
