import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, EyeIcon, HeartIcon, CalendarIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getPostById, deletePost, toggleLike, Post } from '../../../services/boardService';
import { useAuth } from '../../../contexts/AuthContext';
import CommentList from '../../../components/comments/CommentList';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  
  // URL에서 boardType 추출
  const boardType = location.pathname.includes('/board/notice/') ? 'notice' :
                   location.pathname.includes('/board/free/') ? 'free' :
                   location.pathname.includes('/board/suggestion/') ? 'suggestion' :
                   undefined;
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // 게시판 타입에 따른 제목
  const getBoardTitle = () => {
    switch (boardType) {
      case 'notice':
        return '공지사항';
      case 'free':
        return '자유게시판';
      case 'suggestion':
        return '의견제안';
      default:
        return '게시판';
    }
  };

  // useEffect를 최상위 레벨로 이동
  useEffect(() => {
    const loadPost = async () => {
      if (!postId || !boardType) return;
      
      setLoading(true);
      try {
        const postData = await getPostById(postId);
        setPost(postData);
        setLikeCount(postData.like_count);
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        setError('게시글을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, boardType]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const handleLike = async () => {
    if (!isLoggedIn) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (!postId) return;

    try {
      await toggleLike(postId);
      setLikeCount(prev => prev + 1);
      setIsLiked(true);
    } catch (error) {
      console.error('좋아요 실패:', error);
      alert('좋아요에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!postId) return;

    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deletePost(postId);
      navigate(`/board/${boardType}`);
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const handleEdit = () => {
    navigate(`/board/${boardType}/edit/${postId}`);
  };

  // boardType이 유효하지 않은 경우 처리
  if (!boardType || !postId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            잘못된 접근입니다
          </h3>
          <p className="text-gray-600 mb-4">
            올바른 게시글 페이지로 이동해주세요.
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">게시글을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            게시글을 찾을 수 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            {error || '요청하신 게시글이 존재하지 않거나 삭제되었습니다.'}
          </p>
          <button
            onClick={() => navigate(`/board/${boardType}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            게시판으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isAuthor = isLoggedIn && user && post.author_id === user.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(`/board/${boardType}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>목록으로</span>
          </button>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{getBoardTitle()}</h1>
        </div>
      </div>

      {/* 게시글 내용 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* 게시글 헤더 */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {post.title}
              </h2>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatDate(post.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <EyeIcon className="h-4 w-4" />
                  <span>{post.view_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HeartIcon className="h-4 w-4" />
                  <span>{likeCount}</span>
                </div>
                <span>작성자: {post.author?.nickname || '익명'}</span>
              </div>
            </div>

            {/* 작성자만 보이는 수정/삭제 버튼 */}
            {isAuthor && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <PencilIcon className="h-4 w-4" />
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 게시글 본문 */}
        <div className="p-6">
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {post.content}
            </div>
          </div>
        </div>

        {/* 좋아요 버튼 */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <button
              onClick={handleLike}
              disabled={!isLoggedIn || isLiked}
              className={`flex items-center gap-2 px-6 py-3 rounded-full transition-colors ${
                isLiked
                  ? 'bg-red-100 text-red-600 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600'
              }`}
            >
              <HeartIcon className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{isLiked ? '좋아요 완료' : '좋아요'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 댓글 섹션 */}
      {boardType === 'free' && postId && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">댓글</h3>
            <CommentList postId={postId} />
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => navigate(`/board/${boardType}`)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          목록으로
        </button>
        
        <div className="flex gap-2">
          {boardType !== 'notice' && (
            <Link
              to={`/board/${boardType}/write`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              글쓰기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
