import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { createPost, checkPostCooldown, getBoardCategories, BoardCategory } from '../../../services/boardService';
import { useAuth } from '../../../contexts/AuthContext';
import CKEditorWrapper, { CKEditorRef } from '../../../components/editor/CKEditorWrapper';
import FileAttachment, { AttachedFile } from '../../../components/editor/FileAttachment';

const WritePostPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const editorRef = useRef<CKEditorRef>(null);
  
  // URL에서 boardType 결정
  const boardType = location.pathname.includes('/board/free/write') ? 'free' : 
                   location.pathname.includes('/board/suggestion/write') ? 'suggestion' :
                   location.pathname.includes('/board/restaurant-info/write') ? 'restaurant_info' :
                   location.pathname.includes('/board/civil-servant/write') ? 'civil_servant' :
                   undefined;
  
  // URL 쿼리 파라미터에서 카테고리 가져오기
  const searchParams = new URLSearchParams(location.search);
  const initialCategory = searchParams.get('category') || '';
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canPost, setCanPost] = useState(true);
  const [remainingTime, setRemainingTime] = useState(0);

  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

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
      case 'restaurant_info':
        return {
          title: '맛집정보',
          description: '방문한 맛집 정보를 공유해주세요',
          placeholder: '맛집 정보를 상세히 작성해주세요...'
        };
      case 'civil_servant':
        return {
          title: '공무원게시판',
          description: '공무원 관련 이야기를 나누어보세요',
          placeholder: '공무원 관련 내용을 작성해주세요...'
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

  useEffect(() => {
    if (boardType === 'free') {
      const loadCategories = async () => {
        try {
          const cats = await getBoardCategories('free');
          const activeCats = cats.filter((c) => c.is_active && c.code !== 'hot');
          setCategories(activeCats);
          
          // URL 쿼리 파라미터에서 카테고리가 있으면 그것을 사용, 없으면 첫 번째 카테고리
          if (initialCategory && activeCats.some(c => c.code === initialCategory)) {
            setSelectedCategory(initialCategory);
          } else if (activeCats.length > 0) {
            setSelectedCategory(activeCats[0].code);
          }
        } catch (e) {
          console.error('카테고리 로드 실패:', e);
        }
      };
      loadCategories();
    }
  }, [boardType, initialCategory]);

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

  const validBoardTypes = ['free', 'suggestion', 'restaurant_info', 'civil_servant'];
  if (!boardType || !validBoardTypes.includes(boardType)) {
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

  const handleInsertToContent = (urls: string[]) => {
    if (urls.length > 0) {
      editorRef.current?.insertImages(urls);
    }
  };

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

    if (boardType === 'free' && !selectedCategory) {
      setError('카테고리를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')), 15000);
      });

      await Promise.race([
        createPost({
          title: title.trim(),
          content: content.trim(),
          board_type: boardType as 'free' | 'suggestion' | 'restaurant_info' | 'civil_servant',
          category_code: boardType === 'free' ? selectedCategory : undefined,
        }),
        timeout,
      ]);

      // 네비게이션 경로 변환 (restaurant_info -> restaurant-info)
      const navPath = boardType.replace('_', '-');
      navigate(`/board/${navPath}`);
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      setError(error instanceof Error ? error.message : '게시글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const navPath = boardType?.replace('_', '-') || 'free';
    navigate(`/board/${navPath}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {boardType === 'free' && categories.length > 0 && (
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 *
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">카테고리 선택</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용 *
            </label>
            <CKEditorWrapper
              ref={editorRef}
              value={content}
              onChange={setContent}
              placeholder={boardInfo.placeholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              파일 첨부
            </label>
            <FileAttachment
              files={attachedFiles}
              onFilesChange={setAttachedFiles}
              onInsertToContent={handleInsertToContent}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              지원 형식: jpg, jpeg, gif, png, webp, pdf, zip (최대 50MB, 1MB 초과 이미지는 자동 리사이즈)
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!canPost && remainingTime > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                게시글 작성 후 1분간 새 글을 작성할 수 없습니다. ({remainingTime}초 남음)
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">작성 가이드</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 제목은 100자 이내로 작성해주세요.</li>
              <li>• 게시글 작성 후 1분간은 새 글을 작성할 수 없습니다.</li>
              <li>• 타인을 비방하거나 불쾌감을 주는 내용은 삼가해주세요.</li>
              <li>• 개인정보나 민감한 정보는 포함하지 마세요.</li>
              {boardType === 'suggestion' && (
                <li>• 구체적이고 실현 가능한 제안을 해주시면 더욱 도움이 됩니다.</li>
              )}
            </ul>
          </div>

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
