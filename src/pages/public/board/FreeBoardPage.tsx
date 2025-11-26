import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ChatBubbleLeftRightIcon, EyeIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { getPosts, Post } from '../../../services/boardService';
import { formatBoardDate } from '../../../utils/dateUtils';

const FreeBoardPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      
      try {
        const response = await getPosts('free', currentPage, 20);
        setPosts(response.data);
        setTotalPages(response.pagination.pages);
        setTotalCount(response.pagination.total);
      } catch (error) {
        console.error('자유게시판 로드 실패:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [currentPage]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">자유게시판을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">자유게시판</h1>
            </div>
            <p className="text-sm text-gray-600">맛집에 대한 다양한 이야기를 나누어보세요</p>
          </div>
          <Link
            to="/board/free/write"
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            글쓰기
          </Link>
        </div>
      </div>

      {/* 게시글 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  번호
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  글쓴이
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  날짜
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  <span className="sr-only">공감</span>
                  <HandThumbUpIcon className="h-4 w-4 mx-auto" title="공감" />
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  <span className="sr-only">비공감</span>
                  <HandThumbDownIcon className="h-4 w-4 mx-auto" title="비공감" />
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  <span className="sr-only">조회</span>
                  <EyeIcon className="h-4 w-4 mx-auto" title="조회수" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.length > 0 ? (
                posts.map((post, index) => {
                  // 번호 계산: 전체 개수 - ((현재페이지-1) * 페이지당개수 + 인덱스)
                  const postNumber = totalCount - ((currentPage - 1) * 20 + index);
                  
                  return (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {postNumber}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <Link to={`/board/free/${post.id}`} className="block group">
                          <span className="text-sm text-gray-900 font-medium group-hover:text-primary-600 transition-colors line-clamp-1">
                            {post.title}
                            {post.comment_count > 0 && (
                              <span className="ml-1 text-xs text-primary-600 font-bold">
                                [{post.comment_count}]
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                        {post.author?.nickname || '익명'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">
                        {formatBoardDate(post.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-primary-600">
                        {post.like_count}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-red-500">
                        {post.dislike_count}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {post.view_count}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    게시글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            
            <div className="hidden sm:flex gap-1">
              {[...Array(totalPages)].map((_, i) => {
                // 페이지가 많을 경우 처리는 간단하게 생략 (실제로는 복잡한 로직 필요)
                // 여기서는 5페이지씩만 보여주는 등으로 개선 가능하지만 일단 전체 렌더링
                if (totalPages > 10 && Math.abs(currentPage - (i + 1)) > 4 && i !== 0 && i !== totalPages - 1) {
                  if (i === 1 || i === totalPages - 2) return <span key={i} className="px-2">...</span>;
                  return null;
                }
                
                return (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 border rounded text-sm font-medium ${
                      currentPage === i + 1
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default FreeBoardPage;
