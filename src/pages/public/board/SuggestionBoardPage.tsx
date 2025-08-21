import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, EyeIcon, CalendarIcon, HeartIcon } from '@heroicons/react/24/outline';
import { getPosts, Post } from '../../../services/boardService';

const SuggestionBoardPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      
      try {
        const response = await getPosts('suggestion', currentPage, 20);
        setPosts(response.data);
        setTotalPages(response.pagination.pages);
      } catch (error) {
        console.error('의견제안 로드 실패:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">검토중</span>;
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">진행중</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">완료</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">반려</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">대기</span>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">의견제안을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-6 w-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h1 className="text-3xl font-bold text-gray-900">의견제안</h1>
            </div>
            <p className="text-gray-600">서비스 개선을 위한 의견을 제안해주세요</p>
          </div>
          <Link
            to="/board/suggestion/write"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            의견제안
          </Link>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">의견제안 목록</h2>
              <div className="text-sm text-gray-500">
                총 {posts.length}개의 의견제안
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <Link to={`/board/suggestion/${post.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(post.status)}
                        <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {post.title}
                        </h3>
                      </div>
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
                          <span>{post.like_count}</span>
                        </div>
                        <span>작성자: {post.author?.nickname || '익명'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              의견제안이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* 상태별 안내 */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">상태별 안내</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
            <span>검토중</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
            <span>진행중</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
            <span>완료</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded-full"></span>
            <span>반려</span>
          </div>
        </div>
      </div>

      {/* 뒤로가기 버튼 */}
      <div className="mt-6">
        <Link
          to="/board"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← 게시판으로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default SuggestionBoardPage;
