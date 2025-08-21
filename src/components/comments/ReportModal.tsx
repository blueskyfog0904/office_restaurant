import React, { useState } from 'react';
import { XMarkIcon, FlagIcon } from '@heroicons/react/24/outline';
import { Comment, reportComment, ReportCommentData } from '../../services/commentApi';

interface ReportModalProps {
  comment: Comment;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ comment, onClose }) => {
  const [reason, setReason] = useState<ReportCommentData['reason']>('inappropriate');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasonOptions = [
    { value: 'spam', label: '스팸/광고' },
    { value: 'harassment', label: '괴롭힘/욕설' },
    { value: 'inappropriate', label: '부적절한 내용' },
    { value: 'misinformation', label: '허위정보' },
    { value: 'other', label: '기타' }
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await reportComment(comment.id, {
        reason,
        description: description.trim() || undefined
      });
      
      alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
      onClose();
    } catch (error) {
      console.error('신고 실패:', error);
      alert('신고 접수에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FlagIcon className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">댓글 신고</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 신고할 댓글 미리보기 */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {comment.author_avatar ? (
                <img
                  src={comment.author_avatar}
                  alt={comment.author_nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">
                  {comment.author_nickname}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <div 
                className="text-sm text-gray-700 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: comment.content_html }}
              />
            </div>
          </div>
        </div>

        {/* 신고 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 신고 사유 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                신고 사유 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {reasonOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={(e) => setReason(e.target.value as ReportCommentData['reason'])}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 상세 설명 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                상세 설명 (선택사항)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="신고 사유에 대한 자세한 설명을 작성해주세요..."
                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {description.length}/500
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-xs text-yellow-800">
                <strong>신고 전 확인사항:</strong>
                <br />
                • 신고는 신중하게 해주세요
                • 허위 신고 시 제재를 받을 수 있습니다
                • 검토 후 적절한 조치를 취하겠습니다
              </p>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FlagIcon className="w-4 h-4" />
              )}
              <span>{isSubmitting ? '신고 중...' : '신고하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
