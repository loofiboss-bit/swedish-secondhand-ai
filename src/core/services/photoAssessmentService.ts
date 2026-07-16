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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 40_000_000;

function assertSafeDimensions(width: number, height: number): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new Error('Image dimensions exceed the local safety limit.');
  }
}

function bytesFromDataUrl(dataUrl: string): { mimeType: string; bytes: Uint8Array } {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) throw new Error('Image data is not a supported encoded image.');
  const maxEncodedLength = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
  if (match[2].length > maxEncodedLength) throw new Error('Image data exceeds the local limit.');
  const binary = atob(match[2]);
  if (binary.length > MAX_IMAGE_BYTES) throw new Error('Image data exceeds the local limit.');
  return {
    mimeType: match[1].toLowerCase(),
    bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  };
}

function pngDimensions(bytes: Uint8Array): [number, number] | null {
  if (
    bytes.length < 24 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

function jpegDimensions(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const startOfFrame = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 1 >= bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (startOfFrame.has(marker)) {
      return [
        (bytes[offset + 5] << 8) | bytes[offset + 6],
        (bytes[offset + 3] << 8) | bytes[offset + 4],
      ];
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): [number, number] | null {
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));
  if (bytes.length < 30 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP') return null;
  const type = ascii(12, 4);
  if (type === 'VP8X') {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return [width, height];
  }
  if (type === 'VP8L' && bytes[20] === 0x2f) {
    const width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
    const height = 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10);
    return [width, height];
  }
  if (type === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return [((bytes[27] << 8) | bytes[26]) & 0x3fff, ((bytes[29] << 8) | bytes[28]) & 0x3fff];
  }
  return null;
}

export function inspectImageDataUrl(dataUrl: string): { width: number; height: number } {
  const { mimeType, bytes } = bytesFromDataUrl(dataUrl);
  const dimensions =
    mimeType === 'image/png'
      ? pngDimensions(bytes)
      : mimeType === 'image/jpeg'
        ? jpegDimensions(bytes)
        : webpDimensions(bytes);
  if (!dimensions) throw new Error('Image dimensions could not be read safely.');
  assertSafeDimensions(dimensions[0], dimensions[1]);
  return { width: dimensions[0], height: dimensions[1] };
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
  const inspected = inspectImageDataUrl(dataUrl);
  const image = new Image();
  image.src = dataUrl;
  if (typeof image.decode === 'function') await image.decode();
  else {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image could not be decoded.'));
    });
  }
  assertSafeDimensions(image.naturalWidth, image.naturalHeight);
  if (image.naturalWidth !== inspected.width || image.naturalHeight !== inspected.height) {
    throw new Error('Decoded image dimensions do not match the image header.');
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
