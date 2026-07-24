export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';
export const DEFAULT_OLLAMA_MODEL = 'llava';
export const DEFAULT_OLLAMA_TIMEOUT_MS = 30_000;

export interface OllamaProviderConfig {
  readonly baseUrl: string;
  readonly modelId: string;
  readonly timeoutMs?: number;
}

export type OllamaConfigResolver = () => Promise<OllamaProviderConfig>;
