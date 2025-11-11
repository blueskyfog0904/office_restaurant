import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { searchUsers } from '../../services/commentApi';
import { useAuth } from '../../contexts/AuthContext';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  initialContent?: string;
  placeholder?: string;
  submitText?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface MentionUser {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentId,
  initialContent = '',
  placeholder = '댓글을 작성해주세요...',
  submitText = '댓글 작성',
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [lastCommentTime, setLastCommentTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // 글자 수 제한
  const maxLength = 2000;
  const minLength = 1;

  // 마지막 댓글 작성 시간 로드
  useEffect(() => {
    if (user) {
      const lastTime = localStorage.getItem(`lastCommentTime_${user.id}`);
      if (lastTime) {
        setLastCommentTime(parseInt(lastTime, 10));
      }
    }
  }, [user]);

  // 1분 제한 카운트다운
  useEffect(() => {
    if (!canSubmitComment()) {
      const interval = setInterval(() => {
        const remaining = getRemainingTime();
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setRemainingTime(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCommentTime]);

  // 1분 제한 체크
  const canSubmitComment = () => {
    if (!lastCommentTime) return true;
    const now = Date.now();
    const timeDiff = now - lastCommentTime;
    return timeDiff >= 60000; // 60초 = 1분
  };

  const getRemainingTime = () => {
    if (!lastCommentTime) return 0;
    const now = Date.now();
    const timeDiff = now - lastCommentTime;
    const remaining = Math.ceil((60000 - timeDiff) / 1000);
    return Math.max(0, remaining);
  };

  // 멘션 검색 디바운스
  useEffect(() => {
    if (!mentionQuery) {
      setMentionUsers([]);
      setShowMentions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(mentionQuery, 10);
        setMentionUsers(users);
        setShowMentions(users.length > 0);
        setSelectedMentionIndex(0);
      } catch (error) {
        console.error('사용자 검색 실패:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [mentionQuery]);

  // 텍스트에서 멘션 감지
  const handleContentChange = (value: string) => {
    setContent(value);

    // 멘션 감지 (@로 시작하는 단어)
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery('');
    }
  };

  // 멘션 선택
  const selectMention = (user: MentionUser) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newContent = `${beforeMention}@${user.nickname} ${textAfterCursor}`;
      setContent(newContent);
      setShowMentions(false);
      setMentionQuery('');

      // 커서 위치 조정
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPosition = beforeMention.length + user.nickname.length + 2;
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          prev < mentionUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          prev > 0 ? prev - 1 : mentionUsers.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectMention(mentionUsers[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
        setMentionQuery('');
      }
      return;
    }

    // Ctrl/Cmd + Enter로 전송
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 폼 제출
  const handleSubmit = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 1분 제한 체크
    if (!canSubmitComment()) {
      const remaining = getRemainingTime();
      alert(`댓글은 1분에 1개만 작성할 수 있습니다. ${remaining}초 후에 다시 시도해주세요.`);
      return;
    }

    if (content.trim().length < minLength) {
      alert(`댓글은 최소 ${minLength}자 이상 작성해주세요.`);
      return;
    }

    if (content.length > maxLength) {
      alert(`댓글은 최대 ${maxLength}자까지 작성할 수 있습니다.`);
      return;
    }

    // 허니팟 체크
    if (honeypotRef.current?.value) {
      console.warn('Honeypot detected');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      
      // 성공 시 시간 기록 및 메시지 표시
      const now = Date.now();
      setLastCommentTime(now);
      localStorage.setItem(`lastCommentTime_${user.id}`, now.toString());
      
      // 성공 메시지 표시
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000); // 3초 후 자동 숨김
      
      setContent('');
      setShowMentions(false);
      setMentionQuery('');
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-600">댓글을 작성하려면 로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* 허니팟 필드 (숨김) */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
      />

      {/* 성공 메시지 */}
      {showSuccessMessage && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm font-medium">✅ 댓글 작성이 완료되었습니다.</p>
        </div>
      )}

      {/* 1분 제한 안내 */}
      {!canSubmitComment() && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⏰ 댓글은 1분에 1개만 작성할 수 있습니다. {remainingTime}초 후에 다시 시도해주세요.
          </p>
        </div>
      )}

      <div className="relative">
        {/* 텍스트 에리어 */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full min-h-20 max-h-60 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting || isLoading}
        />

        {/* 멘션 드롭다운 */}
        {showMentions && mentionUsers.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {mentionUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => selectMention(user)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                  index === selectedMentionIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300" />
                  )}
                </div>
                <span className="text-sm text-gray-900">{user.nickname}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 하단 정보 및 버튼 */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{content.length}/{maxLength}</span>
          {content.length > maxLength && (
            <span className="text-red-500">글자 수를 초과했습니다</span>
          )}
          <span>Ctrl+Enter로 전송</span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              취소
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting || 
              isLoading || 
              content.trim().length < minLength || 
              content.length > maxLength ||
              !canSubmitComment()
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-4 h-4" />
            )}
            <span>{isSubmitting ? '작성 중...' : submitText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentForm;
