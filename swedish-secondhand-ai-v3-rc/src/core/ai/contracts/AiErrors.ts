import type { AiProviderId } from './AiProvider';

export type AiProviderErrorCode =
  | 'provider_not_found'
  | 'provider_already_registered'
  | 'authentication'
  | 'rate_limit'
  | 'timeout'
  | 'cancellation'
  | 'network'
  | 'unsupported_capability'
  | 'model_not_found'
  | 'invalid_response'
  | 'schema_validation'
  | 'invalid_configuration'
  | 'unknown';

export interface AiProviderErrorOptions {
  readonly code: AiProviderErrorCode;
  readonly providerId?: AiProviderId;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly providerId?: AiProviderId;
  readonly retryable: boolean;

  constructor(message: string, options: AiProviderErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'AiProviderError';
    this.code = options.code;
    this.providerId = options.providerId;
    this.retryable = options.retryable ?? false;
  }
}
