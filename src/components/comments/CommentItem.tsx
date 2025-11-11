import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  FlagIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Comment } from '../../services/commentApi';
import { useAuth } from '../../contexts/AuthContext';

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onLike: (commentId: string) => void;
  onReport: (comment: Comment) => void;
  onToggleReplies?: (commentId: string) => void;
  showReplies?: boolean;
  isReply?: boolean;
  children?: React.ReactNode;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onReport,
  onToggleReplies,
  showReplies = true,
  isReply = false,
  children
}) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const canEdit = isOwner;
  const canDelete = isOwner; // 또는 관리자 권한 체크

  // 작성자 배지
  const getAuthorBadge = () => {
    if (comment.author_role === 'admin') {
      return <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">관리자</span>;
    }
    if (comment.author_role === 'moderator') {
      return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">운영자</span>;
    }
    return null;
  };

  // 상대 시간 표시
  const getRelativeTime = () => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), {
        addSuffix: true,
        locale: ko
      });
    } catch {
      return '방금 전';
    }
  };

  // 절대 시간 표시 (툴팁용)
  const getAbsoluteTime = () => {
    try {
      return format(new Date(comment.created_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
    } catch {
      return '';
    }
  };

  return (
    <div className={`${isReply ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* 아바타 */}
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {comment.author_avatar ? (
                <img
                  src={comment.author_avatar}
                  alt={comment.author_nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {/* 작성자 정보 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">
                  {comment.author_nickname}
                </span>
                {getAuthorBadge()}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span
                  className="cursor-pointer hover:text-gray-700"
                  title={getAbsoluteTime()}
                >
                  {getRelativeTime()}
                </span>
                {comment.is_edited && (
                  <span className="text-gray-400">(수정됨)</span>
                )}
              </div>
            </div>
          </div>

          {/* 메뉴 버튼 */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <EllipsisVerticalIcon className="w-4 h-4 text-gray-400" />
              </button>

              {/* 드롭다운 메뉴 */}
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-32">
                  {canEdit && (
                    <button
                      onClick={() => {
                        onEdit(comment);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      수정
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        onDelete(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      삭제
                    </button>
                  )}
                  {!isOwner && (
                    <button
                      onClick={() => {
                        onReport(comment);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                    >
                      <FlagIcon className="w-4 h-4" />
                      신고
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 댓글 내용 */}
        <div className="mb-3">
          {comment.status === 'deleted' ? (
            <p className="text-gray-500 italic">삭제된 댓글입니다.</p>
          ) : (
            <div
              className="text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: comment.content_html }}
            />
          )}
        </div>

        {/* 액션 버튼들 */}
        {comment.status !== 'deleted' && user && (
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            {/* 좋아요 버튼 */}
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                comment.user_liked
                  ? 'text-red-500 bg-red-50 hover:bg-red-100'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {comment.user_liked ? (
                <HeartSolidIcon className="w-4 h-4" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
              <span>{comment.like_count}</span>
            </button>

            {/* 답글 버튼 */}
            {!isReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ChatBubbleLeftIcon className="w-4 h-4" />
                <span>답글</span>
              </button>
            )}

            {/* 답글 보기/숨기기 버튼 */}
            {!isReply && comment.reply_count > 0 && onToggleReplies && (
              <button
                onClick={() => onToggleReplies(comment.id)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showReplies ? '답글 숨기기' : `답글 ${comment.reply_count}개 보기`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 답글들 */}
      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}

      {/* 메뉴 닫기용 오버레이 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default CommentItem;
