import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, FireIcon, BellIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { getNotices, getLatestPosts, getHotPosts, Post } from '../../services/boardService';

const BoardPage: React.FC = () => {
  const [notices, setNotices] = useState<Post[]>([]);
  const [freePosts, setFreePosts] = useState<Post[]>([]);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBoardData = async () => {
      setLoading(true);
      
      try {
        const [noticesData, freePostsData, hotPostsData] = await Promise.all([
          getNotices(),
          getLatestPosts(),
          getHotPosts()
        ]);

        setNotices(noticesData);
        setFreePosts(freePostsData);
        setHotPosts(hotPostsData);
      } catch (error) {
        console.error('게시판 데이터 로드 실패:', error);
        // 에러 발생 시 빈 배열로 설정
        setNotices([]);
        setFreePosts([]);
        setHotPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadBoardData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">게시판을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">게시판</h1>
        <p className="text-gray-600">다양한 정보와 소통의 공간입니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 공지사항 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BellIcon className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
              </div>
              <Link
                to="/board/notice"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                더보기
              </Link>
            </div>
            
            <div className="space-y-3">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <Link
                      to={`/board/notice/${notice.id}`}
                      className="block hover:text-blue-600 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">
                        {notice.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{notice.author?.nickname || '익명'}</span>
                        <span>{formatDate(notice.created_at)}</span>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  공지사항이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 최신글 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900">최신글</h2>
              </div>
              <Link
                to="/board/free"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                더보기
              </Link>
            </div>
            
            <div className="space-y-3">
              {freePosts.length > 0 ? (
                freePosts.map((post) => (
                  <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <Link
                      to={`/board/free/${post.id}`}
                      className="block hover:text-blue-600 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">
                        {post.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{post.author?.nickname || '익명'}</span>
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  최신글이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HOT게시글 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FireIcon className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">HOT게시글</h2>
              </div>
              <Link
                to="/board/free"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                더보기
              </Link>
            </div>
            
            <div className="space-y-3">
              {hotPosts.length > 0 ? (
                hotPosts.map((post) => (
                  <div key={post.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <Link
                      to={`/board/${post.board_type}/${post.id}`}
                      className="block hover:text-blue-600 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">
                        {post.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>{post.author?.nickname || '익명'}</span>
                          <span className="text-orange-500">🔥 {post.view_count}</span>
                        </div>
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  HOT게시글이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 서브 메뉴 */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">게시판 메뉴</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/board/notice"
            className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <BellIcon className="h-5 w-5 text-red-500" />
            <span className="font-medium">공지사항</span>
          </Link>
          <Link
            to="/board/free"
            className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-500" />
            <span className="font-medium">자유게시판</span>
          </Link>
          <Link
            to="/board/suggestion"
            className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-medium">의견제안</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BoardPage;
