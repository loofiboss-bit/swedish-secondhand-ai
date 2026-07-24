import { AiProviderError } from '@core/ai/contracts';

export function getDesktopBridge(): DesktopBridge {
  if (!window.desktop) {
    throw new AiProviderError('This operation requires the desktop application.', {
      code: 'invalid_configuration',
    });
  }
  return window.desktop;
}

export function createDesktopGeminiClient() {
  return {
    async generateContent(request: {
      readonly model: string;
      readonly contents: {
        readonly parts: readonly (
          | { readonly text: string }
          | { readonly inlineData: { readonly mimeType: string; readonly data: string } }
        )[];
      };
    }): Promise<{ readonly text?: string }> {
      const prompt = request.contents.parts.find(
        (part): part is { readonly text: string } => 'text' in part,
      )?.text;
      if (!prompt) {
        throw new AiProviderError('Gemini analysis prompt is missing.', {
          code: 'invalid_configuration',
          providerId: 'gemini',
        });
      }
      const images = request.contents.parts.flatMap((part) =>
        'inlineData' in part
          ? [`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`]
          : [],
      );
      return getDesktopBridge().ai.analyzeGemini({
        prompt,
        images,
        modelId: request.model,
      });
    },
  };
}
