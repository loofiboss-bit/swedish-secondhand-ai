import type { AppErrorCode } from '@core/types';

export function normalizeAppError(error: unknown, fallback: AppErrorCode): AppErrorCode {
  if (typeof error !== 'object' || error === null) return fallback;
  const code = 'code' in error ? String(error.code) : '';
  if (code === 'authentication') return 'provider_authentication';
  if (code === 'model_not_found') return 'provider_model_missing';
  if (code === 'invalid_configuration') return 'provider_configuration_invalid';
  if (['network', 'timeout', 'rate_limit', 'capacity'].includes(code)) {
    return 'provider_unavailable';
  }
  return fallback;
}

export const appErrorService = { normalize: normalizeAppError };
