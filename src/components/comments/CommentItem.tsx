import React, { useState } from 'react';
import {
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  FlagIcon,
  ArrowTurnDownRightIcon
} from '@heroicons/react/24/outline';
import { Comment } from '../../services/commentApi';
import { useAuth } from '../../contexts/AuthContext';
import { formatDetailDate } from '../../utils/dateUtils';

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
      return <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-200 ml-1">관리자</span>;
    }
    return null;
  };

  return (
    <div className={`py-3 border-b border-gray-100 last:border-0 ${isReply ? 'pl-8 bg-gray-50/50' : ''}`}>
      <div className="flex items-start gap-2 group">
        {isReply && (
          <ArrowTurnDownRightIcon className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          {/* 헤더: 닉네임 / 날짜 / 메뉴 */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-gray-900">
                {comment.author_nickname}
              </span>
              {getAuthorBadge()}
              <span className="text-xs text-gray-400">
                {formatDetailDate(comment.created_at)}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-gray-300">(수정됨)</span>
              )}
            </div>

            {/* 메뉴 버튼 (로그인 시에만) */}
            {user && (
              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                >
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </button>

                {/* 드롭다운 메뉴 */}
                {showMenu && (
                  <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded shadow-lg py-1 z-10 min-w-[80px]">
                    {canEdit && (
                      <button
                        onClick={() => {
                          onEdit(comment);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <PencilIcon className="w-3 h-3" />
                        수정
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          onDelete(comment.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <TrashIcon className="w-3 h-3" />
                        삭제
                      </button>
                    )}
                    {!isOwner && (
                      <button
                        onClick={() => {
                          onReport(comment);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                      >
                        <FlagIcon className="w-3 h-3" />
                        신고
                      </button>
                    )}
                  </div>
                )}
                
                {/* 메뉴 닫기용 오버레이 */}
                {showMenu && (
                  <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowMenu(false)}
                  />
                )}
              </div>
            )}
          </div>

          {/* 댓글 내용 */}
          <div className="text-sm text-gray-800 leading-relaxed break-words mb-1">
            {comment.status === 'deleted' ? (
              <span className="text-gray-400 italic">삭제된 댓글입니다.</span>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: comment.content_html }} />
            )}
          </div>

          {/* 답글 버튼 등 */}
          {comment.status !== 'deleted' && !isReply && user && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
              >
                답글쓰기
              </button>
              
              {comment.reply_count > 0 && onToggleReplies && (
                <>
                  <span className="text-[10px] text-gray-300">|</span>
                  <button
                    onClick={() => onToggleReplies(comment.id)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    {showReplies ? '답글 접기' : `답글 ${comment.reply_count}개 보기`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 답글들 */}
      {children && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
