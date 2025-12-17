import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { getBoardPosts, Post } from '../../../services/boardService';
import { formatBoardDate } from '../../../utils/dateUtils';

const CivilServantBoardPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getBoardPosts('civil_servant_spots', undefined, currentPage, 20);
        setPosts(res.data);
        setTotalPages(res.pagination.pages);
        setTotalCount(res.pagination.total);
      } catch (e) {
        console.error('공무원맛집 게시판 로드 실패:', e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentPage]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">공무원맛집 게시판을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BuildingOffice2Icon className="h-6 w-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">공무원맛집(UGC)</h1>
            </div>
            <p className="text-sm text-gray-600">공무원들이 추천하는 맛집 이야기를 나눠보세요</p>
          </div>
          <Link
            to="/board/civil-servant/write"
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            글쓰기
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {posts.length > 0 ? (
            posts.map((p) => (
              <Link
                key={p.id}
                to={`/board/civil-servant/${p.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      {p.title}
                      {p.comment_count > 0 && (
                        <span className="ml-1 text-xs text-primary-600 font-bold">[{p.comment_count}]</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {p.author?.nickname || '익명'} · {formatBoardDate(p.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 whitespace-nowrap">
                    <span>👍 {p.like_count}</span>
                    <span>👎 {p.dislike_count}</span>
                    <span>👀 {p.view_count}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-4 py-12 text-center text-sm text-gray-500">게시글이 없습니다.</div>
          )}
        </div>
      </div>

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

            <div className="px-3 py-1 text-sm text-gray-600">
              {currentPage} / {totalPages} (총 {totalCount}개)
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

export default CivilServantBoardPage;


