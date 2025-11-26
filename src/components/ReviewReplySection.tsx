import React, { useState } from 'react';
import { ChatBubbleLeftIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { ReviewReply } from '../types';
import { createReply, updateReply, deleteReply } from '../services/reviewReplyService';

interface ReviewReplySectionProps {
  reviewId: string;
  reviewAuthorId: string;
  replies: ReviewReply[];
  replyCount: number;
  isLoggedIn: boolean;
  currentUserId?: string;
  onRepliesChange: (replies: ReviewReply[]) => void;
}

const ReviewReplySection: React.FC<ReviewReplySectionProps> = ({
  reviewId,
  reviewAuthorId,
  replies,
  replyCount,
  isLoggedIn,
  currentUserId,
  onRepliesChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReply = async (parentId?: string) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    const content = parentId ? replyContent : replyContent;
    if (!content.trim()) {
      alert('답글 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const newReply = await createReply(reviewId, content, parentId);
      
      if (parentId) {
        const updatedReplies = replies.map(r => {
          if (r.id === parentId) {
            return { ...r, replies: [...(r.replies || []), newReply] };
          }
          return r;
        });
        onRepliesChange(updatedReplies);
      } else {
        onRepliesChange([...replies, { ...newReply, replies: [] }]);
      }

      setReplyContent('');
      setShowReplyForm(false);
      setReplyingToId(null);
      setExpanded(true);
    } catch (error) {
      console.error('답글 작성 실패:', error);
      alert(error instanceof Error ? error.message : '답글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReply = async (replyId: string, isChild: boolean, parentId?: string) => {
    if (!editContent.trim()) {
      alert('답글 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateReply(replyId, editContent);

      if (isChild && parentId) {
        const updatedReplies = replies.map(r => {
          if (r.id === parentId) {
            return {
              ...r,
              replies: r.replies?.map(child => 
                child.id === replyId ? { ...child, ...updated } : child
              ),
            };
          }
          return r;
        });
        onRepliesChange(updatedReplies);
      } else {
        const updatedReplies = replies.map(r =>
          r.id === replyId ? { ...r, ...updated } : r
        );
        onRepliesChange(updatedReplies);
      }

      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('답글 수정 실패:', error);
      alert(error instanceof Error ? error.message : '답글 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: string, isChild: boolean, parentId?: string) => {
    if (!window.confirm('이 답글을 삭제하시겠습니까?')) return;

    try {
      await deleteReply(replyId);

      if (isChild && parentId) {
        const updatedReplies = replies.map(r => {
          if (r.id === parentId) {
            return {
              ...r,
              replies: r.replies?.filter(child => child.id !== replyId),
            };
          }
          return r;
        });
        onRepliesChange(updatedReplies);
      } else {
        onRepliesChange(replies.filter(r => r.id !== replyId));
      }
    } catch (error) {
      console.error('답글 삭제 실패:', error);
      alert(error instanceof Error ? error.message : '답글 삭제에 실패했습니다.');
    }
  };

  const startEdit = (reply: ReviewReply) => {
    setEditingId(reply.id);
    setEditContent(reply.content);
    setReplyingToId(null);
    setShowReplyForm(false);
  };

  const startReplyTo = (parentId: string) => {
    setReplyingToId(parentId);
    setReplyContent('');
    setEditingId(null);
    setShowReplyForm(false);
  };

  const renderReplyItem = (reply: ReviewReply, isChild: boolean = false, parentId?: string) => {
    const isAuthor = reply.user_id === reviewAuthorId;
    const isOwn = reply.user_id === currentUserId;
    const isEditing = editingId === reply.id;

    return (
      <div
        key={reply.id}
        className={`${isChild ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}
      >
        <div className="py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {reply.nickname?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {reply.nickname || '익명'}
                  </span>
                  {isAuthor && (
                    <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded">
                      작성자
                    </span>
                  )}
                  {reply.is_edited && (
                    <span className="text-xs text-gray-400">(수정됨)</span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(reply.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
            {isOwn && !isEditing && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(reply)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="수정"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteReply(reply.id, isChild, parentId)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="삭제"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                rows={2}
                maxLength={1000}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setEditingId(null); setEditContent(''); }}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  취소
                </button>
                <button
                  onClick={() => handleEditReply(reply.id, isChild, parentId)}
                  disabled={submitting}
                  className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                >
                  {submitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {reply.content}
            </p>
          )}

          {!isChild && !isEditing && isLoggedIn && (
            <button
              onClick={() => startReplyTo(reply.id)}
              className="mt-2 text-xs text-gray-500 hover:text-primary-600"
            >
              답글 달기
            </button>
          )}
        </div>

        {replyingToId === reply.id && (
          <div className="ml-8 mt-2 mb-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="답글을 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              rows={2}
              maxLength={1000}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setReplyingToId(null); setReplyContent(''); }}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                취소
              </button>
              <button
                onClick={() => handleSubmitReply(reply.id)}
                disabled={submitting || !replyContent.trim()}
                className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        )}

        {reply.replies && reply.replies.length > 0 && (
          <div className="space-y-1">
            {reply.replies.map(child => renderReplyItem(child, true, reply.id))}
          </div>
        )}
      </div>
    );
  };

  const totalReplies = replies.reduce(
    (sum, r) => sum + 1 + (r.replies?.length || 0),
    0
  );

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChatBubbleLeftIcon className="h-4 w-4" />
          <span>답글 {totalReplies > 0 ? totalReplies : replyCount}개</span>
          {totalReplies > 0 && (
            expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>

        {isLoggedIn && !showReplyForm && (
          <button
            onClick={() => { setShowReplyForm(true); setReplyingToId(null); setEditingId(null); }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            답글 작성
          </button>
        )}
      </div>

      {showReplyForm && (
        <div className="mt-3">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="답글을 입력하세요..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">{replyContent.length}/1000</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReplyForm(false); setReplyContent(''); }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                취소
              </button>
              <button
                onClick={() => handleSubmitReply()}
                disabled={submitting || !replyContent.trim()}
                className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {expanded && replies.length > 0 && (
        <div className="mt-3 border-t border-gray-100 divide-y divide-gray-100">
          {replies.map(reply => renderReplyItem(reply))}
        </div>
      )}
    </div>
  );
};

export default ReviewReplySection;

