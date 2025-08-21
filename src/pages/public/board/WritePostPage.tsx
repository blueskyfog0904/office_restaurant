import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { createPost, checkPostCooldown } from '../../../services/boardService';
import { useAuth } from '../../../contexts/AuthContext';

const WritePostPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  
  // URL에서 boardType 추출
  const boardType = location.pathname.includes('/board/free/write') ? 'free' : 
                   location.pathname.includes('/board/suggestion/write') ? 'suggestion' : 
                   undefined;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canPost, setCanPost] = useState(true);
  const [remainingTime, setRemainingTime] = useState(0);

  // 게시판 타입에 따른 제목과 설명
  const getBoardInfo = () => {
    switch (boardType) {
      case 'free':
        return {
          title: '자유게시판',
          description: '맛집에 대한 다양한 이야기를 나누어보세요',
          placeholder: '맛집 추천, 후기, 질문 등을 자유롭게 작성해주세요...'
        };
      case 'suggestion':
        return {
          title: '의견제안',
          description: '서비스 개선을 위한 의견을 제안해주세요',
          placeholder: '서비스 개선 아이디어, 버그 신고, 기능 요청 등을 작성해주세요...'
        };
      default:
        return {
          title: '게시글 작성',
          description: '게시글을 작성해주세요',
          placeholder: '내용을 작성해주세요...'
        };
    }
  };

  const boardInfo = getBoardInfo();

  // 쿨다운 상태 확인
  useEffect(() => {
    const checkCooldown = async () => {
      if (isLoggedIn) {
        try {
          const cooldownStatus = await checkPostCooldown();
          setCanPost(cooldownStatus.canPost);
          if (!cooldownStatus.canPost && cooldownStatus.remainingTime) {
            setRemainingTime(cooldownStatus.remainingTime);
          }
        } catch (error) {
          console.error('쿨다운 확인 실패:', error);
        }
      }
    };

    checkCooldown();
  }, [isLoggedIn]);

  // 쿨다운 타이머
  useEffect(() => {
    if (!canPost && remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setCanPost(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [canPost, remainingTime]);

  // boardType이 유효하지 않은 경우 처리
  if (!boardType || (boardType !== 'free' && boardType !== 'suggestion')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            잘못된 접근입니다
          </h3>
          <p className="text-gray-600 mb-4">
            올바른 게시판으로 이동해주세요.
          </p>
          <button
            onClick={() => navigate('/board')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            게시판으로 이동
          </button>
        </div>
      </div>
    );
  }

  // 로그인 체크
  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <p className="text-gray-600 mb-4">
            게시글을 작성하려면 로그인해주세요.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 15초 요청 타임아웃 가드
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')), 15000);
      });

      await Promise.race([
        createPost({
          title: title.trim(),
          content: content.trim(),
          board_type: boardType as 'free' | 'suggestion'
        }),
        timeout,
      ]);

      navigate(`/board/${boardType}`);
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      setError(error instanceof Error ? error.message : '게시글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/board/${boardType}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>돌아가기</span>
          </button>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{boardInfo.title}</h1>
          <p className="text-gray-600">{boardInfo.description}</p>
        </div>
      </div>

      {/* 글쓰기 폼 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제목 입력 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="제목을 입력해주세요"
              maxLength={100}
            />
            <div className="mt-1 text-sm text-gray-500">
              {title.length}/100
            </div>
          </div>

          {/* 내용 입력 */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              내용 *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder={boardInfo.placeholder}
              maxLength={5000}
            />
            <div className="mt-1 text-sm text-gray-500">
              {content.length}/5000
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 쿨다운 메시지 */}
          {!canPost && remainingTime > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                게시글 작성 후 1분간 새 글을 작성할 수 없습니다. ({remainingTime}초 남음)
              </p>
            </div>
          )}

          {/* 작성 가이드 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">작성 가이드</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 제목은 100자 이내로 작성해주세요.</li>
              <li>• 내용은 5000자 이내로 작성해주세요.</li>
              <li>• 게시글 작성 후 1분간은 새 글을 작성할 수 없습니다.</li>
              <li>• 타인을 비방하거나 불쾌감을 주는 내용은 삼가해주세요.</li>
              <li>• 개인정보나 민감한 정보는 포함하지 마세요.</li>
              {boardType === 'suggestion' && (
                <li>• 구체적이고 실현 가능한 제안을 해주시면 더욱 도움이 됩니다.</li>
              )}
            </ul>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !canPost}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {loading ? '작성 중...' : !canPost ? `작성하기 (${remainingTime}초 후)` : '작성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WritePostPage;
