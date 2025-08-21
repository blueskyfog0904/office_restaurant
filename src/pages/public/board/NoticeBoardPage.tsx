import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, BellIcon, EyeIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getPosts, Post } from '../../../services/boardService';

const NoticeBoardPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      
      try {
        const response = await getPosts('notice', currentPage, 20);
        setPosts(response.data);
        setTotalPages(response.pagination.pages);
      } catch (error) {
        console.error('공지사항 로드 실패:', error);
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">공지사항을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BellIcon className="h-6 w-6 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">공지사항</h1>
        </div>
        <p className="text-gray-600">중요한 공지사항을 확인하세요</p>
      </div>

      {/* 게시글 목록 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">공지사항 목록</h2>
              <div className="text-sm text-gray-500">
                총 {posts.length}개의 공지사항
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <Link to={`/board/notice/${post.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {post.is_pinned && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                            공지
                          </span>
                        )}
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
                        <span>작성자: {post.author?.nickname || '익명'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              공지사항이 없습니다.
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

export default NoticeBoardPage;
