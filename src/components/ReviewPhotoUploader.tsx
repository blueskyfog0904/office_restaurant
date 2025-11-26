import React, { useState, useRef, useCallback } from 'react';
import {
  PhotoIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { validateImageFile, formatFileSize, revokePreviewUrl } from '../utils/imageCompressor';
import { preparePhotosForUpload, PendingPhoto } from '../services/reviewPhotoService';

interface ReviewPhotoUploaderProps {
  maxPhotos?: number;
  onPhotosChange: (photos: PendingPhoto[]) => void;
  existingCount?: number;
  disabled?: boolean;
}

const ReviewPhotoUploader: React.FC<ReviewPhotoUploaderProps> = ({
  maxPhotos = 10,
  onPhotosChange,
  existingCount = 0,
  disabled = false,
}) => {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxPhotos - existingCount - pendingPhotos.length;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      if (fileArray.length > remainingSlots) {
        setError(`최대 ${remainingSlots}장까지 추가할 수 있습니다.`);
        return;
      }

      const validFiles: File[] = [];
      for (const file of fileArray) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          setError(validation.error || '유효하지 않은 파일입니다.');
          return;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setIsProcessing(true);
      setProcessingProgress({ current: 0, total: validFiles.length });

      try {
        const newPhotos = await preparePhotosForUpload(validFiles, (current, total) => {
          setProcessingProgress({ current, total });
        });

        const updatedPhotos = [...pendingPhotos, ...newPhotos];
        setPendingPhotos(updatedPhotos);
        onPhotosChange(updatedPhotos);
      } catch (err) {
        setError(err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
        setProcessingProgress({ current: 0, total: 0 });
      }
    },
    [pendingPhotos, remainingSlots, onPhotosChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || remainingSlots <= 0) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, remainingSlots, handleFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const handleRemovePhoto = useCallback(
    (photoId: string) => {
      const photoToRemove = pendingPhotos.find((p) => p.id === photoId);
      if (photoToRemove) {
        revokePreviewUrl(photoToRemove.preview);
      }

      const updatedPhotos = pendingPhotos.filter((p) => p.id !== photoId);
      setPendingPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
      setError(null);
    },
    [pendingPhotos, onPhotosChange]
  );

  const handleClickUpload = () => {
    if (!disabled && remainingSlots > 0) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || remainingSlots <= 0}
      />

      <div
        onClick={handleClickUpload}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || remainingSlots <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <ArrowPathIcon className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="mt-2 text-sm text-gray-600">
              이미지 처리 중... ({processingProgress.current}/{processingProgress.total})
            </p>
            <div className="w-full max-w-xs mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(processingProgress.current / processingProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {remainingSlots > 0 ? (
                <>
                  클릭하거나 사진을 드래그하여 업로드
                  <br />
                  <span className="text-xs text-gray-500">
                    JPG, PNG, WEBP, GIF (최대 {remainingSlots}장 추가 가능)
                  </span>
                </>
              ) : (
                <span className="text-orange-600">최대 {maxPhotos}장까지 업로드 가능합니다.</span>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              500KB 초과 시 자동 압축됩니다
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pendingPhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {pendingPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
            >
              <img
                src={photo.preview}
                alt={`업로드 예정 사진 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity" />
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                {formatFileSize(photo.compressed.compressedSize)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 text-right">
        {existingCount + pendingPhotos.length} / {maxPhotos}장
      </div>
    </div>
  );
};

export default ReviewPhotoUploader;

