import type { PhotoAssessment } from '@core/types';
import { photoAssessmentService } from './photoAssessmentService';

export const MAX_PROJECT_IMAGES = 6;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type ImageIntakeErrorCode = 'limit' | 'heic' | 'type' | 'size' | 'read' | 'decode';

export interface AcceptedImageIntake {
  fileName: string;
  dataUrl: string;
  assessment: PhotoAssessment;
}

export interface RejectedImageIntake {
  fileName: string;
  code: ImageIntakeErrorCode;
}

export interface ImageIntakeState {
  images: string[];
  assessments: PhotoAssessment[];
}

export interface ImageIntakeResult extends ImageIntakeState {
  accepted: AcceptedImageIntake[];
  rejected: RejectedImageIntake[];
}

type PhotoAssessor = (
  dataUrl: string,
  imageIndex: number,
  existing: PhotoAssessment[],
) => Promise<PhotoAssessment>;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function extension(fileName: string): string {
  return fileName.split('.').at(-1)?.toLocaleLowerCase() ?? '';
}

function validationError(file: File): ImageIntakeErrorCode | null {
  const fileExtension = extension(file.name);
  if (['heic', 'heif'].includes(fileExtension) || /image\/hei[cf]/i.test(file.type)) return 'heic';
  if (!MIME_BY_EXTENSION[fileExtension] || MIME_BY_EXTENSION[fileExtension] !== file.type)
    return 'type';
  if (file.size > MAX_IMAGE_BYTES) return 'size';
  return null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Image could not be read.'));
    reader.onerror = () => reject(reader.error ?? new Error('Image could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function intakeImageFiles(
  files: Iterable<File>,
  current: ImageIntakeState = { images: [], assessments: [] },
  assess: PhotoAssessor = (dataUrl, imageIndex, existing) =>
    photoAssessmentService.assessDataUrl(dataUrl, imageIndex, existing),
): Promise<ImageIntakeResult> {
  const images = [...current.images];
  const assessments = [...current.assessments];
  const accepted: AcceptedImageIntake[] = [];
  const rejected: RejectedImageIntake[] = [];

  for (const file of files) {
    if (images.length >= MAX_PROJECT_IMAGES) {
      rejected.push({ fileName: file.name, code: 'limit' });
      continue;
    }
    const error = validationError(file);
    if (error) {
      rejected.push({ fileName: file.name, code: error });
      continue;
    }

    let dataUrl: string;
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      rejected.push({ fileName: file.name, code: 'read' });
      continue;
    }

    try {
      const imageIndex = images.length;
      const assessment = {
        ...(await assess(dataUrl, imageIndex, [...assessments])),
        imageIndex,
      };
      images.push(dataUrl);
      assessments.push(assessment);
      accepted.push({ fileName: file.name, dataUrl, assessment });
    } catch {
      rejected.push({ fileName: file.name, code: 'decode' });
    }
  }

  return { images, assessments, accepted, rejected };
}

export function removeIntakeImage(current: ImageIntakeState, index: number): ImageIntakeState {
  return {
    images: current.images.filter((_, currentIndex) => currentIndex !== index),
    assessments: current.assessments
      .filter((assessment) => assessment.imageIndex !== index)
      .map((assessment) => ({
        ...assessment,
        imageIndex:
          assessment.imageIndex > index ? assessment.imageIndex - 1 : assessment.imageIndex,
        duplicateOfIndex:
          assessment.duplicateOfIndex === undefined || assessment.duplicateOfIndex === index
            ? undefined
            : assessment.duplicateOfIndex > index
              ? assessment.duplicateOfIndex - 1
              : assessment.duplicateOfIndex,
        issues:
          assessment.duplicateOfIndex === index
            ? assessment.issues.filter((issue) => issue !== 'duplicate')
            : assessment.issues,
      })),
  };
}

export const imageIntakeService = {
  intake: intakeImageFiles,
  remove: removeIntakeImage,
};
