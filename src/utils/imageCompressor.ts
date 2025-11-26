const MAX_FILE_SIZE = 500 * 1024; // 500KB
const QUALITY_STEPS = [0.8, 0.6, 0.4, 0.2];
const MAX_DIMENSION = 1920;

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

export const compressImage = async (file: File): Promise<CompressedImage> => {
  const originalSize = file.size;

  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드 가능합니다.');
  }

  if (originalSize <= MAX_FILE_SIZE) {
    const preview = URL.createObjectURL(file);
    return {
      file,
      preview,
      originalSize,
      compressedSize: originalSize,
    };
  }

  const img = await loadImage(file);
  const { width, height } = calculateDimensions(img.width, img.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context 생성 실패');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(img.src);

  const outputType = 'image/jpeg';
  let compressedBlob: Blob | null = null;

  for (const quality of QUALITY_STEPS) {
    compressedBlob = await canvasToBlob(canvas, outputType, quality);
    if (compressedBlob.size <= MAX_FILE_SIZE) {
      break;
    }
  }

  if (!compressedBlob || compressedBlob.size > MAX_FILE_SIZE) {
    let currentWidth = width;
    let currentHeight = height;

    while (currentWidth > 100 && currentHeight > 100) {
      currentWidth = Math.round(currentWidth * 0.8);
      currentHeight = Math.round(currentHeight * 0.8);

      canvas.width = currentWidth;
      canvas.height = currentHeight;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, currentWidth, currentHeight);
      ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

      compressedBlob = await canvasToBlob(canvas, outputType, 0.6);
      if (compressedBlob.size <= MAX_FILE_SIZE) {
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
  onProgress?: (current: number, total: number) => void
): Promise<CompressedImage[]> => {
  const results: CompressedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i]);
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

