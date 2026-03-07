import type { ItemFingerprint } from '@core/types';
import { settingsService } from './settingsService';
import { extractJson } from '@core/utils/json';

const SYSTEM_PROMPT = `You are a product analyzer for secondhand marketplace listings.
Return only valid JSON with these exact keys:
- title (string): concise product title
- category (string): product category
- brand (string): brand name or "Unknown"
- conditionGrade (string): one of new|like_new|good|fair|poor|unknown
- confidence (number): 0 to 1

Respond with JSON only, no other text.`;

export async function analyzeWithOllama(
  text: string,
  images: string[],
): Promise<Partial<ItemFingerprint>> {
  const settings = await settingsService.getSettings();
  const base = settings.ollamaBaseUrl ?? 'http://localhost:11434/v1';
  const model = settings.ollamaModel ?? 'llava';

  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };

  const content: ContentPart[] = [];
  if (text) content.push({ type: 'text', text });
  // Include up to 3 images (vision models)
  for (const img of images.slice(0, 3)) {
    content.push({ type: 'image_url', image_url: { url: img } });
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content as string) ?? '{}';
  return (extractJson(raw) as Partial<ItemFingerprint>) ?? {};
}
