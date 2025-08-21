import React, { useState } from 'react';
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import { ShareData } from '../utils/socialShare';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareData: ShareData;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareData }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopyContent = async () => {
    // 공유할 내용 전체를 텍스트로 구성
    const content = `${shareData.title}\n\n${shareData.description}\n\n${shareData.url}`;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // 클립보드 API가 지원되지 않는 경우 fallback
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">공유하기</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6">
          {/* 공유 정보 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 mb-2">공유할 내용</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-1">{shareData.title}</h5>
              <p className="text-sm text-gray-600 mb-2">{shareData.description}</p>
              <p className="text-xs text-gray-500 truncate">{shareData.url}</p>
            </div>
          </div>

          {/* 링크 복사 버튼 */}
          <div>
            <button
              onClick={handleCopyContent}
              className="w-full flex items-center justify-center p-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <LinkIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">
                {copySuccess ? '복사 완료!' : '링크 복사'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;