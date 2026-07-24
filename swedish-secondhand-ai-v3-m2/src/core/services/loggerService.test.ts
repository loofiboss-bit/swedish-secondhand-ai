import { describe, expect, it, vi } from 'vitest';
import { logger, sanitizeDiagnostic } from './loggerService';

describe('sanitized diagnostics', () => {
  it('redacts secret keys and recognizable credential values', () => {
    expect(
      sanitizeDiagnostic({
        apiKey: 'secret-value',
        nested: { authorization: 'Bearer abcdefghijklmnop' },
        message: 'request used AIza1234567890',
      }),
    ).toEqual({
      apiKey: '[redacted]',
      nested: { authorization: '[redacted]' },
      message: 'request used [redacted]',
    });
  });

  it('stores only normalized error metadata', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn(
      'Provider failed',
      Object.assign(new Error('secret in message'), { code: 'network' }),
    );

    expect(logger.getDiagnostics().at(-1)).toMatchObject({
      level: 'warn',
      message: 'Provider failed',
      metadata: { name: 'Error', code: 'network' },
    });
  });
});
