import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FireIcon } from '@heroicons/react/24/outline';
import { getHotPostsByBoardCode, Post } from '../../../services/boardService';
import { formatBoardDate } from '../../../utils/dateUtils';

const HotBoardPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getHotPostsByBoardCode('free', 48, 30);
        setPosts(data);
      } catch (e) {
        console.error('HOT 게시글 로드 실패:', e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">HOT게시글을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FireIcon className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">HOT인기글</h1>
        </div>
        <p className="text-sm text-gray-600">최근 48시간 기준(추천/댓글/조회/비추천 + 시간감쇠)</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {posts.length > 0 ? (
            posts.map((p) => (
              <Link
                key={p.id}
                to={`/board/free/${p.id}`}
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
                    <span className="text-orange-600">🔥 {p.view_count}</span>
                    <span>👍 {p.like_count}</span>
                    <span>👎 {p.dislike_count}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-sm text-gray-500">HOT게시글이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotBoardPage;


