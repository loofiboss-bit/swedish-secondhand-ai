/// <reference types="vite/client" />

type DesktopSecretId = 'gemini' | 'tradera';

interface DesktopSecretStatus {
  gemini: { configured: boolean };
  tradera: { configured: boolean };
  encryptionAvailable: boolean;
  backend?: string;
}

interface DesktopBridge {
  platform: string;
  secrets: {
    getStatus(): Promise<DesktopSecretStatus>;
    update(secretId: DesktopSecretId, value: string): Promise<DesktopSecretStatus>;
    delete(secretId: DesktopSecretId): Promise<DesktopSecretStatus>;
  };
  ai: {
    analyzeGemini(request: {
      prompt: string;
      images: string[];
      modelId: string;
    }): Promise<{ text?: string }>;
    testGeminiConnection(modelId: string): Promise<{ connected: boolean }>;
  };
  marketplace: {
    fetchTraderaComparables(request: { appId: number; query: string; limit: number }): Promise<{
      configured: boolean;
      data: unknown;
      cached?: boolean;
      fetchedAt?: string;
    }>;
  };
}

interface Window {
  desktop?: DesktopBridge;
}
