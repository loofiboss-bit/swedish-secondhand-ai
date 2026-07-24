export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_TIMEOUT_MS = 30_000;

export interface GeminiProviderConfig {
  readonly apiKey: string;
  readonly modelId: string;
  readonly timeoutMs?: number;
}

export type GeminiConfigResolver = () => Promise<GeminiProviderConfig>;
