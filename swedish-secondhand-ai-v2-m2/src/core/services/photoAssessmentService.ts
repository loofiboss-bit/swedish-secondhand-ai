import type { PhotoAssessment, PhotoIssue } from '@core/types';

export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface PhotoMetrics {
  brightness: number;
  contrast: number;
  sharpness: number;
  perceptualHash: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function luminance(data: Uint8ClampedArray, offset: number): number {
  return data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
}

export function measurePhoto(image: PixelImage): PhotoMetrics {
  const pixelCount = image.width * image.height;
  if (pixelCount <= 0 || image.data.length < pixelCount * 4) {
    return { brightness: 0, contrast: 0, sharpness: 0, perceptualHash: '0' };
  }

  const step = Math.max(1, Math.floor(pixelCount / 65_536));
  let count = 0;
  let sum = 0;
  let sumSquares = 0;
  let edgeSum = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += step) {
    const value = luminance(image.data, pixel * 4);
    sum += value;
    sumSquares += value * value;
    count += 1;
    if (pixel % image.width < image.width - step && pixel + step < pixelCount) {
      edgeSum += Math.abs(value - luminance(image.data, (pixel + step) * 4));
    }
  }

  const mean = sum / count;
  const variance = Math.max(0, sumSquares / count - mean * mean);
  const sampleValues: number[] = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const sampleX = Math.min(image.width - 1, Math.floor(((x + 0.5) / 8) * image.width));
      const sampleY = Math.min(image.height - 1, Math.floor(((y + 0.5) / 8) * image.height));
      sampleValues.push(luminance(image.data, (sampleY * image.width + sampleX) * 4));
    }
  }
  const sampleMean = sampleValues.reduce((total, value) => total + value, 0) / sampleValues.length;
  const bits = sampleValues.map((value) => (value >= sampleMean ? '1' : '0')).join('');
  const perceptualHash = Array.from({ length: 16 }, (_, index) =>
    Number.parseInt(bits.slice(index * 4, index * 4 + 4), 2).toString(16),
  ).join('');

  return {
    brightness: clamp(mean / 255),
    contrast: clamp(Math.sqrt(variance) / 128),
    sharpness: clamp(edgeSum / Math.max(1, count - 1) / 64),
    perceptualHash,
  };
}

function hammingDistance(left: string, right: string): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const xor = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += xor.toString(2).replaceAll('0', '').length;
  }
  return distance;
}

export function assessPixels(
  image: PixelImage,
  imageIndex: number,
  previous: PhotoAssessment[] = [],
  assessedAt = new Date().toISOString(),
): PhotoAssessment {
  const metrics = measurePhoto(image);
  const issues: PhotoIssue[] = [];
  if (Math.min(image.width, image.height) < 600) issues.push('low_resolution');
  if (metrics.brightness < 0.22) issues.push('too_dark');
  if (metrics.brightness > 0.9) issues.push('too_bright');
  if (metrics.contrast < 0.1) issues.push('low_contrast');
  if (metrics.sharpness < 0.035) issues.push('blurry');
  const ratio = image.width / Math.max(1, image.height);
  const cropRisk = ratio < 0.55 || ratio > 1.85;
  if (cropRisk) issues.push('crop_risk');
  const duplicate = previous.find(
    (assessment) =>
      hammingDistance(assessment.perceptualHash, metrics.perceptualHash) <= 3 &&
      Math.abs(assessment.brightness - metrics.brightness) < 0.08 &&
      Math.abs(assessment.contrast - metrics.contrast) < 0.08,
  );
  if (duplicate) issues.push('duplicate');

  return {
    version: 1,
    imageIndex,
    role: imageIndex === 0 ? 'cover' : 'angle',
    width: image.width,
    height: image.height,
    ...metrics,
    duplicateOfIndex: duplicate?.imageIndex,
    cropRisk,
    issues,
    assessedAt,
  };
}

async function decodeImage(dataUrl: string): Promise<PixelImage> {
  const image = new Image();
  image.src = dataUrl;
  if (typeof image.decode === 'function') await image.decode();
  else {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image could not be decoded.'));
    });
  }
  if (
    image.naturalWidth <= 0 ||
    image.naturalHeight <= 0 ||
    image.naturalWidth > 12_000 ||
    image.naturalHeight > 12_000 ||
    image.naturalWidth * image.naturalHeight > 40_000_000
  ) {
    throw new Error('Image dimensions exceed the local safety limit.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image quality could not be measured.');
  context.drawImage(image, 0, 0);
  return {
    width: canvas.width,
    height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

export const photoAssessmentService = {
  assessDataUrl: async (
    dataUrl: string,
    imageIndex: number,
    previous: PhotoAssessment[] = [],
  ): Promise<PhotoAssessment> => assessPixels(await decodeImage(dataUrl), imageIndex, previous),
};
