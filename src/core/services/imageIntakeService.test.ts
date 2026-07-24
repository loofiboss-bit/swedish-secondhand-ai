import { describe, expect, it, vi } from 'vitest';
import type { PhotoAssessment } from '@core/types';
import { MAX_IMAGE_BYTES, intakeImageFiles, removeIntakeImage } from './imageIntakeService';

function assessment(imageIndex: number, existing: PhotoAssessment[]): PhotoAssessment {
  return {
    version: 1,
    imageIndex,
    role: imageIndex === 0 ? 'cover' : 'angle',
    width: 1200,
    height: 900,
    brightness: 0.5,
    contrast: 0.5,
    sharpness: 0.5,
    perceptualHash: `hash-${imageIndex}`,
    duplicateOfIndex: existing.length > 0 ? 0 : undefined,
    cropRisk: false,
    issues: existing.length > 0 ? ['duplicate'] : [],
    assessedAt: '2026-07-24T00:00:00.000Z',
  };
}

describe('imageIntakeService', () => {
  it('accepts valid files sequentially and preserves other files when one is rejected', async () => {
    const assess = vi.fn(async (_dataUrl, imageIndex, existing) =>
      assessment(imageIndex, existing),
    );
    const result = await intakeImageFiles(
      [
        new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
        new File(['bad'], 'bad.txt', { type: 'text/plain' }),
        new File(['second'], 'second.png', { type: 'image/png' }),
      ],
      undefined,
      assess,
    );

    expect(result.accepted.map((item) => item.fileName)).toEqual(['first.jpg', 'second.png']);
    expect(result.rejected).toEqual([{ fileName: 'bad.txt', code: 'type' }]);
    expect(result.assessments.map((item) => item.imageIndex)).toEqual([0, 1]);
    expect(assess).toHaveBeenNthCalledWith(2, expect.any(String), 1, [expect.any(Object)]);
  });

  it.each([
    [new File(['heic'], 'phone.heic', { type: 'image/heic' }), 'heic'],
    [new File(['mismatch'], 'photo.png', { type: 'image/jpeg' }), 'type'],
    [
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'large.webp', {
        type: 'image/webp',
      }),
      'size',
    ],
  ] as const)('rejects unsafe image input with a stable error code', async (file, code) => {
    const result = await intakeImageFiles([file], undefined, vi.fn());
    expect(result.rejected).toEqual([{ fileName: file.name, code }]);
  });

  it('rejects a seventh image without assessing or replacing existing images', async () => {
    const existing = Array.from({ length: 6 }, (_, index) => `data:image/png;base64,${index}`);
    const assess = vi.fn();
    const result = await intakeImageFiles(
      [new File(['seven'], 'seven.png', { type: 'image/png' })],
      { images: existing, assessments: [] },
      assess,
    );

    expect(result.images).toEqual(existing);
    expect(result.rejected).toEqual([{ fileName: 'seven.png', code: 'limit' }]);
    expect(assess).not.toHaveBeenCalled();
  });

  it('reindexes assessments and clears duplicate references after removal', () => {
    const first = assessment(0, []);
    const second = assessment(1, [first]);
    const result = removeIntakeImage(
      {
        images: ['first', 'second'],
        assessments: [first, second],
      },
      0,
    );

    expect(result.images).toEqual(['second']);
    expect(result.assessments).toEqual([
      expect.objectContaining({
        imageIndex: 0,
        duplicateOfIndex: undefined,
        issues: [],
      }),
    ]);
  });
});
