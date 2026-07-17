import packageMetadata from '../../../package.json';
import type { AppErrorCode, AppSettings } from '@core/types';

export interface DiagnosticExportInput {
  settings: AppSettings;
  projectState: 'idle' | 'loading' | 'ready' | 'recovery';
  errors: Array<AppErrorCode | null | undefined>;
}

export interface PrivacySafeDiagnostics {
  formatVersion: 1;
  generatedAt: string;
  app: { version: string; platform: 'windows' | 'linux' | 'macos' | 'unknown' };
  persistence: { projectSchema: 4; migrationStatus: 'ready' | 'recovery' | 'pending' };
  providers: {
    selectedMode: AppSettings['aiMode'];
    geminiConfigured: boolean;
    ollamaConfigured: boolean;
    traderaConfigured: boolean;
    protectedStorageAvailable: boolean;
    secretMigrationStatus: AppSettings['secretStatus']['migrationStatus'];
  };
  errorCodes: AppErrorCode[];
}

function platformName(): PrivacySafeDiagnostics['app']['platform'] {
  const platform = window.desktop?.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'linux') return 'linux';
  if (platform === 'darwin') return 'macos';
  return 'unknown';
}

export function createPrivacySafeDiagnostics(
  input: DiagnosticExportInput,
  now = new Date(),
): PrivacySafeDiagnostics {
  return {
    formatVersion: 1,
    generatedAt: now.toISOString(),
    app: { version: packageMetadata.version, platform: platformName() },
    persistence: {
      projectSchema: 4,
      migrationStatus:
        input.projectState === 'ready'
          ? 'ready'
          : input.projectState === 'recovery'
            ? 'recovery'
            : 'pending',
    },
    providers: {
      selectedMode: input.settings.aiMode,
      geminiConfigured: input.settings.secretStatus.geminiConfigured,
      ollamaConfigured: Boolean(input.settings.ollamaBaseUrl && input.settings.ollamaModel),
      traderaConfigured: input.settings.secretStatus.traderaConfigured,
      protectedStorageAvailable: input.settings.secretStatus.encryptionAvailable,
      secretMigrationStatus: input.settings.secretStatus.migrationStatus,
    },
    errorCodes: [...new Set(input.errors.filter((code): code is AppErrorCode => Boolean(code)))],
  };
}

export const diagnosticsService = { create: createPrivacySafeDiagnostics };
