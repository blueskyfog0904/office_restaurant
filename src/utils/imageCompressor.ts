const DEFAULT_MAX_FILE_SIZE = 500 * 1024; // 500KB (리뷰 업로드 등 기존 동작 기본값)
const DEFAULT_QUALITY_STEPS = [0.8, 0.6, 0.4, 0.2];
const DEFAULT_MAX_DIMENSION = 1920;

export type CompressImageOptions = {
  maxFileSizeBytes?: number;
  maxDimension?: number;
  qualitySteps?: number[];
  outputType?: 'image/jpeg';
  backgroundColor?: string;
};

export interface CompressedImage {
  file: File;
  preview: string;
  originalSize: number;
  compressedSize: number;
}

const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

const calculateDimensions = (
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob 변환 실패'));
        }
      },
      type,
      quality
    );
  });
};

export const compressImage = async (file: File, options?: CompressImageOptions): Promise<CompressedImage> => {
  const originalSize = file.size;
  const maxFileSizeBytes = options?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const qualitySteps = options?.qualitySteps ?? DEFAULT_QUALITY_STEPS;
  const outputType = options?.outputType ?? 'image/jpeg';
  const backgroundColor = options?.backgroundColor ?? '#FFFFFF';

  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드 가능합니다.');
  }

  if (originalSize <= maxFileSizeBytes) {
    const preview = URL.createObjectURL(file);
    return {
      file,
      preview,
      originalSize,
      compressedSize: originalSize,
    };
  }

  const img = await loadImage(file);
  const { width, height } = calculateDimensions(img.width, img.height, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context 생성 실패');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(img.src);

  let compressedBlob: Blob | null = null;

  for (const quality of qualitySteps) {
    compressedBlob = await canvasToBlob(canvas, outputType, quality);
    if (compressedBlob.size <= maxFileSizeBytes) {
      break;
    }
  }

  if (!compressedBlob || compressedBlob.size > maxFileSizeBytes) {
    let currentWidth = width;
    let currentHeight = height;

    while (currentWidth > 100 && currentHeight > 100) {
      currentWidth = Math.round(currentWidth * 0.8);
      currentHeight = Math.round(currentHeight * 0.8);

      canvas.width = currentWidth;
      canvas.height = currentHeight;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, currentWidth, currentHeight);
      ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

      compressedBlob = await canvasToBlob(canvas, outputType, 0.6);
      if (compressedBlob.size <= maxFileSizeBytes) {
        break;
      }
    }
  }

  if (!compressedBlob) {
    throw new Error('이미지 압축 실패');
  }

  const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
  const compressedFile = new File([compressedBlob], fileName, {
    type: outputType,
    lastModified: Date.now(),
  });

  const preview = URL.createObjectURL(compressedBlob);

  return {
    file: compressedFile,
    preview,
    originalSize,
    compressedSize: compressedBlob.size,
  };
};

export const compressImages = async (
  files: File[],
  options?: CompressImageOptions,
  onProgress?: (current: number, total: number) => void
): Promise<CompressedImage[]> => {
  const results: CompressedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i], options);
    results.push(compressed);
    onProgress?.(i + 1, files.length);
  }

  return results;
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'JPG, PNG, WEBP, GIF 형식만 지원합니다.',
    };
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: '파일 크기는 20MB 이하여야 합니다.',
    };
  }

  return { valid: true };
};

export const revokePreviewUrl = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

