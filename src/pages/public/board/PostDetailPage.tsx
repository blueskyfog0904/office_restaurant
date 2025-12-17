import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { EyeIcon, HandThumbUpIcon, HandThumbDownIcon, CalendarIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolid, HandThumbDownIcon as HandThumbDownSolid } from '@heroicons/react/24/solid';
import { getPostById, deletePost, togglePostReaction, getRestaurantInfoMeta, getPostPhotos, reportPostByEdge, Post, RestaurantInfoMeta, PostPhoto } from '../../../services/boardService';
import { useAuth } from '../../../contexts/AuthContext';
import CommentList from '../../../components/comments/CommentList';
import PostContent from '../../../components/editor/PostContent';
import { formatDetailDate } from '../../../utils/dateUtils';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  
  // URL에서 boardType 추출
  const boardType = location.pathname.includes('/board/notice/') ? 'notice' :
                   location.pathname.includes('/board/free/') ? 'free' :
                   location.pathname.includes('/board/suggestion/') ? 'suggestion' :
                   location.pathname.includes('/board/restaurant-info/') ? 'restaurant_info' :
                   location.pathname.includes('/board/civil-servant/') ? 'civil_servant_spots' :
                   undefined;
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [riMeta, setRiMeta] = useState<RestaurantInfoMeta | null>(null);
  const [photos, setPhotos] = useState<PostPhoto[]>([]);

  // 게시판 타입에 따른 제목
  const getBoardTitle = () => {
    switch (boardType) {
      case 'notice':
        return '공지사항';
      case 'free':
        return '자유게시판';
      case 'suggestion':
        return '의견제안';
      case 'restaurant_info':
        return '맛집정보';
      case 'civil_servant_spots':
        return '공무원맛집(UGC)';
      default:
        return '게시판';
    }
  };

  useEffect(() => {
    const loadPost = async () => {
      if (!postId || !boardType) return;
      
      setLoading(true);
      try {
        const postData = await getPostById(postId);
        setPost(postData);
        setLikeCount(postData.like_count);
        setDislikeCount(postData.dislike_count);
        setUserReaction(postData.user_reaction || null);

        if (boardType === 'restaurant_info') {
          const [meta, ph] = await Promise.all([
            getRestaurantInfoMeta(postId).catch(() => null),
            getPostPhotos(postId).catch(() => []),
          ]);
          setRiMeta(meta);
          setPhotos(ph);
        } else {
          setRiMeta(null);
          setPhotos([]);
        }
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        setError('게시글을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, boardType]);

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!isLoggedIn) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }
    if (!postId) return;

    try {
      const result = await togglePostReaction(postId, type);
      setLikeCount(result.like_count);
      setDislikeCount(result.dislike_count);
      setUserReaction(result.user_reaction);
    } catch (error) {
      console.error('반응 처리 실패:', error);
      alert('처리에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!postId) return;

    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deletePost(postId);
      if (boardType === 'restaurant_info') navigate('/board/restaurant-info');
      else if (boardType === 'civil_servant_spots') navigate('/board/civil-servant');
      else navigate(`/board/${boardType}`);
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const handleEdit = () => {
    navigate(`/board/${boardType}/edit/${postId}`);
  };

  const handleReport = async () => {
    if (!isLoggedIn) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }
    if (!postId) return;
    const reason = window.prompt('신고 사유를 입력해주세요(예: 광고/도배/욕설/개인정보 등)');
    if (!reason) return;
    const description = window.prompt('추가 설명(선택, 최대 500자)') || '';

    try {
      await reportPostByEdge(postId, reason, description);
      alert('신고가 접수되었습니다. 감사합니다.');
    } catch (e) {
      alert(e instanceof Error ? e.message : '신고에 실패했습니다.');
    }
  };

  if (!boardType || !postId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">잘못된 접근입니다</h3>
          <button
            onClick={() => navigate('/board')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            게시판으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">게시글을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">게시글을 찾을 수 없습니다</h3>
          <p className="text-gray-600 mb-4">{error || '요청하신 게시글이 존재하지 않거나 삭제되었습니다.'}</p>
          <button
            onClick={() => navigate(`/board/${boardType}`)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            게시판으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isAuthor = isLoggedIn && user && post.author_id === user.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <Link to="/board" className="hover:text-gray-900">게시판</Link>
          <span>&gt;</span>
          <Link
            to={boardType === 'restaurant_info' ? '/board/restaurant-info' : boardType === 'civil_servant_spots' ? '/board/civil-servant' : `/board/${boardType}`}
            className="hover:text-gray-900"
          >
            {getBoardTitle()}
          </Link>
        </div>
      </div>

      {/* 게시글 내용 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 게시글 헤더 (요청사항 반영) */}
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
          {/* 1행: 제목 / 댓글수 / 날짜 */}
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 flex-1 mr-4">
              {post.title}
              {post.comment_count > 0 && (
                <span className="ml-2 text-primary-600 text-lg">
                  [{post.comment_count}]
                </span>
              )}
            </h2>
            <div className="text-sm text-gray-500 whitespace-nowrap flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {formatDetailDate(post.created_at)}
            </div>
          </div>

          {/* 2행: 글쓴이 / 조회수 / 공감 / 비공감 */}
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium text-gray-900">
              {post.author?.nickname || '익명'}
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <div className="flex items-center gap-1" title="조회수">
                <EyeIcon className="h-4 w-4" />
                <span>{post.view_count}</span>
              </div>
              <div className="flex items-center gap-1 text-primary-600" title="공감">
                <HandThumbUpIcon className="h-4 w-4" />
                <span>{likeCount}</span>
              </div>
              <div className="flex items-center gap-1 text-red-500" title="비공감">
                <HandThumbDownIcon className="h-4 w-4" />
                <span>{dislikeCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 수정/삭제 버튼 (작성자만) */}
        {isAuthor && (
          <div className="px-6 py-2 border-b border-gray-200 flex justify-end gap-2 bg-gray-50/50">
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <PencilIcon className="h-3 w-3" />
              수정
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 transition-colors"
            >
              <TrashIcon className="h-3 w-3" />
              삭제
            </button>
          </div>
        )}

        {/* 게시글 본문 */}
        <div className="p-6 min-h-[200px]">
          {/* 맛집정보 메타 */}
          {boardType === 'restaurant_info' && riMeta && (
            <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-lg font-semibold text-gray-900">{riMeta.restaurant_name}</div>
              <div className="mt-1 text-sm text-gray-600">
                {riMeta.address_text || riMeta.map_link || ''}
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">대표메뉴:</span> {(riMeta.representative_menus || []).join(', ')}</div>
                <div><span className="font-medium">가격대:</span> {riMeta.price_range}</div>
                <div className="md:col-span-2"><span className="font-medium">한줄평:</span> {riMeta.one_line_review}</div>
              </div>
            </div>
          )}

          {/* 사진 */}
          {boardType === 'restaurant_info' && photos.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {photos
                  .slice()
                  .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                  .map((ph, idx) => (
                    <a key={ph.id} href={ph.photo_url} target="_blank" rel="noreferrer" className="block border rounded overflow-hidden bg-gray-50">
                      <img src={ph.photo_url} alt={`첨부 ${idx + 1}`} className="w-full h-24 object-cover" />
                    </a>
                  ))}
              </div>
            </div>
          )}

          <PostContent markdown={post.content || ''} />
        </div>

        {/* 공감/비공감 버튼 영역 */}
        <div className="border-t border-gray-200 p-8 bg-gray-50/30">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleReaction('like')}
              className={`flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 transition-all ${
                userReaction === 'like'
                  ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-md'
                  : 'border-gray-200 bg-white text-gray-400 hover:border-primary-200 hover:text-primary-500'
              }`}
              title="공감"
            >
              {userReaction === 'like' ? (
                <HandThumbUpSolid className="h-8 w-8 mb-1" />
              ) : (
                <HandThumbUpIcon className="h-8 w-8 mb-1" />
              )}
              <span className="text-xs font-bold">{likeCount}</span>
            </button>

            <button
              onClick={() => handleReaction('dislike')}
              className={`flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 transition-all ${
                userReaction === 'dislike'
                  ? 'border-red-500 bg-red-50 text-red-600 shadow-md'
                  : 'border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:text-red-500'
              }`}
              title="비공감"
            >
              {userReaction === 'dislike' ? (
                <HandThumbDownSolid className="h-8 w-8 mb-1" />
              ) : (
                <HandThumbDownIcon className="h-8 w-8 mb-1" />
              )}
              <span className="text-xs font-bold">{dislikeCount}</span>
            </button>
          </div>

          {!isAuthor && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleReport}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                신고하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 댓글 섹션 */}
      {(boardType === 'free' || boardType === 'suggestion') && postId && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              댓글 <span className="text-primary-600">{post.comment_count}</span>
            </h3>
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
              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
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
