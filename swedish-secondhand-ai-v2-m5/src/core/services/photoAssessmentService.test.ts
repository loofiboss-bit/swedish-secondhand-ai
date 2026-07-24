import { describe, expect, it } from 'vitest';
import { assessPixels, measurePhoto } from './photoAssessmentService';

function pixels(width: number, height: number, value: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const channel = value(x, y);
      data.set([channel, channel, channel, 255], offset);
    }
  }
  return { width, height, data };
}

describe('photoAssessmentService', () => {
  it('measures brightness, contrast and local edge sharpness deterministically', () => {
    const checker = pixels(800, 800, (x, y) => ((x + y) % 2 === 0 ? 20 : 230));
    const metrics = measurePhoto(checker);
    expect(metrics.brightness).toBeGreaterThan(0.45);
    expect(metrics.contrast).toBeGreaterThan(0.7);
    expect(metrics.sharpness).toBeGreaterThan(0.9);
  });

  it('reports low-resolution, dark, flat and blurry photos', () => {
    const assessment = assessPixels(
      pixels(400, 300, () => 15),
      0,
      [],
      '2026-07-16T00:00:00Z',
    );
    expect(assessment.issues).toEqual(
      expect.arrayContaining(['low_resolution', 'too_dark', 'low_contrast', 'blurry']),
    );
  });

  it('finds perceptual duplicates and risky cover crops', () => {
    const image = pixels(1200, 600, (x) => Math.round((x / 1200) * 255));
    const first = assessPixels(image, 0, [], '2026-07-16T00:00:00Z');
    const second = assessPixels(image, 1, [first], '2026-07-16T00:00:01Z');
    expect(second.duplicateOfIndex).toBe(0);
    expect(second.issues).toEqual(expect.arrayContaining(['duplicate', 'crop_risk']));
  });
});
