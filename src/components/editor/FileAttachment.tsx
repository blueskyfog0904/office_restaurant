import React, { useRef, useState, useCallback } from 'react';
import { PaperClipIcon, XMarkIcon, PhotoIcon, DocumentIcon } from '@heroicons/react/24/outline';
import {
  processFile,
  formatFileSize,
  revokePreviewUrl,
  isAllowedFileType,
  isImageFile,
  ALLOWED_EXTENSIONS,
  MAX_TOTAL_SIZE,
  ProcessedFile,
} from '../../utils/imageUtils';

export interface AttachedFile extends ProcessedFile {
  id: string;
  selected: boolean;
}

interface FileAttachmentProps {
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  onInsertToContent: (urls: string[]) => void;
  disabled?: boolean;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
  files,
  onFilesChange,
  onInsertToContent,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const totalSize = files.reduce((acc, f) => acc + f.finalSize, 0);
  const selectedFiles = files.filter((f) => f.selected);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      setUploading(true);

      try {
        const newFiles: AttachedFile[] = [];

        for (const file of Array.from(selectedFiles)) {
          if (!isAllowedFileType(file)) {
            alert(`${file.name}: 지원하지 않는 파일 형식입니다.\n지원 형식: ${ALLOWED_EXTENSIONS.join(', ')}`);
            continue;
          }

          const currentTotal = totalSize + newFiles.reduce((acc, f) => acc + f.finalSize, 0);
          if (currentTotal + file.size > MAX_TOTAL_SIZE) {
            alert(`총 첨부 용량이 50MB를 초과합니다.`);
            break;
          }

          const processed = await processFile(file);
          newFiles.push({
            ...processed,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            selected: false,
          });
        }

        if (newFiles.length > 0) {
          onFilesChange([...files, ...newFiles]);
        }
      } catch (error) {
        console.error('파일 처리 중 오류:', error);
        alert('파일 처리 중 오류가 발생했습니다.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [files, onFilesChange, totalSize]
  );

  const handleToggleSelect = useCallback(
    (id: string) => {
      onFilesChange(
        files.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
      );
    },
    [files, onFilesChange]
  );

  const handleSelectAll = useCallback(() => {
    const allSelected = files.every((f) => f.selected);
    onFilesChange(files.map((f) => ({ ...f, selected: !allSelected })));
  }, [files, onFilesChange]);

  const handleDeleteSelected = useCallback(() => {
    const toDelete = files.filter((f) => f.selected);
    toDelete.forEach((f) => revokePreviewUrl(f.previewUrl));
    onFilesChange(files.filter((f) => !f.selected));
  }, [files, onFilesChange]);

  const handleInsertToContent = useCallback(() => {
    const imageUrls = selectedFiles
      .filter((f) => isImageFile(f.file))
      .map((f) => f.previewUrl);

    if (imageUrls.length === 0) {
      alert('본문에 삽입할 이미지가 없습니다.');
      return;
    }

    onInsertToContent(imageUrls);
    onFilesChange(files.map((f) => ({ ...f, selected: false })));
  }, [selectedFiles, onInsertToContent, files, onFilesChange]);

  const handleRemoveFile = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (file) {
        revokePreviewUrl(file.previewUrl);
      }
      onFilesChange(files.filter((f) => f.id !== id));
    },
    [files, onFilesChange]
  );

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperClipIcon className="h-4 w-4" />
          파일 첨부
        </button>
        <span className="text-xs text-gray-500">
          여기에 파일을 끌어 놓거나 파일 첨부 버튼을 클릭하세요.
        </span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200 flex items-center justify-between">
            <span>
              {files.length}개 첨부됨 ({formatFileSize(totalSize)} / {formatFileSize(MAX_TOTAL_SIZE)})
            </span>
            {files.some((f) => f.wasResized) && (
              <span className="text-xs text-blue-600">
                * 1MB 초과 이미지는 자동 리사이즈됨
              </span>
            )}
          </div>

          <div className="p-4 flex flex-wrap gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`relative group border rounded-md overflow-hidden ${
                  file.selected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
                }`}
                style={{ width: '100px' }}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => handleToggleSelect(file.id)}
                >
                  <input
                    type="checkbox"
                    checked={file.selected}
                    onChange={() => {}}
                    className="absolute top-1 left-1 z-10 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
                    {isImageFile(file.file) ? (
                      <img
                        src={file.previewUrl}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <DocumentIcon className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <div className="px-1 py-1 bg-white">
                    <p className="text-xs text-gray-600 truncate" title={file.file.name}>
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.finalSize)}
                      {file.wasResized && <span className="text-blue-500 ml-1">*</span>}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {files.every((f) => f.selected) ? '전체 해제' : '전체 선택'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInsertToContent}
                disabled={selectedFiles.filter((f) => isImageFile(f.file)).length === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PhotoIcon className="h-4 w-4" />
                본문삽입
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedFiles.length === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XMarkIcon className="h-4 w-4" />
                선택 삭제
              </button>
            </div>
          </div>
        </>
      )}

      {uploading && (
        <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          파일 처리 중...
        </div>
      )}
    </div>
  );
};

export default FileAttachment;


