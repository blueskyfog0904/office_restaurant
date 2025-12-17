const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export interface ProcessedFile {
  file: File;
  previewUrl: string;
  originalSize: number;
  finalSize: number;
  wasResized: boolean;
}

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const resizeImage = (file: File, maxSize: number = MAX_FILE_SIZE): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file) || file.size <= maxSize) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let { width, height } = img;
      let quality = 0.9;
      const ratio = Math.sqrt(maxSize / file.size);
      
      if (ratio < 1) {
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      const tryCompress = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 압축 실패'));
              return;
            }

            if (blob.size > maxSize && q > 0.1) {
              tryCompress(q - 0.1);
            } else {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            }
          },
          'image/jpeg',
          q
        );
      };

      tryCompress(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('이미지 로드 실패'));
    };

    img.src = URL.createObjectURL(file);
  });
};

export const processFile = async (file: File): Promise<ProcessedFile> => {
  const originalSize = file.size;
  let processedFile = file;
  let wasResized = false;

  if (isImageFile(file) && file.size > MAX_FILE_SIZE) {
    processedFile = await resizeImage(file);
    wasResized = true;
  }

  const previewUrl = URL.createObjectURL(processedFile);

  return {
    file: processedFile,
    previewUrl,
    originalSize,
    finalSize: processedFile.size,
    wasResized,
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
};

export const revokePreviewUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
];

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'gif', 'png', 'webp', 'pdf', 'zip'];

export const isAllowedFileType = (file: File): boolean => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_FILE_TYPES.includes(file.type);
};

export const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB


