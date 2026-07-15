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
    fetchTraderaComparables(request: {
      baseUrl: string;
      query: string;
      category?: string;
      limit: number;
    }): Promise<{ configured: boolean; data: unknown }>;
  };
}

interface Window {
  desktop?: DesktopBridge;
}
