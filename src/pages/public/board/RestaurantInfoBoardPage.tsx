import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { getBoardCategories, getRestaurantInfoPosts, RestaurantInfoPost, BoardCategory } from '../../../services/boardService';
import { formatBoardDate } from '../../../utils/dateUtils';

const RestaurantInfoBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryCode } = useParams<{ categoryCode?: string }>();

  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [posts, setPosts] = useState<RestaurantInfoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const activeCategory = useMemo(() => {
    if (!categories.length) return null;
    const found = categories.find((c) => c.code === categoryCode);
    return found || categories[0];
  }, [categories, categoryCode]);

  const writeUrl = useMemo(() => {
    if (!activeCategory?.code) return '/board/restaurant-info/write';
    return `/board/restaurant-info/write?category=${encodeURIComponent(activeCategory.code)}`;
  }, [activeCategory?.code]);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const cats = await getBoardCategories('restaurant_info');
        setCategories(cats.filter((c) => c.is_active));
      } catch (e) {
        console.error('맛집정보 카테고리 로드 실패:', e);
        setCategories([]);
      }
    };
    loadCats();
  }, []);

  useEffect(() => {
    if (categories.length && !categoryCode) {
      navigate(`/board/restaurant-info/region/${categories[0].code}`, { replace: true });
    }
  }, [categories, categoryCode, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!activeCategory) return;
      setLoading(true);
      try {
        const res = await getRestaurantInfoPosts(activeCategory.code, currentPage, 20);
        setPosts(res.data);
        setTotalPages(res.pagination.pages);
        setTotalCount(res.pagination.total);
      } catch (e) {
        console.error('맛집정보 게시글 로드 실패:', e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeCategory, currentPage]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPinIcon className="h-6 w-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">맛집정보</h1>
            </div>
            <p className="text-sm text-gray-600">방문한 맛집 정보를 구조화해서 공유해보세요(지도/검색/필터에 재사용)</p>
          </div>
          <Link
            to={writeUrl}
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            글쓰기
          </Link>
        </div>
      </div>

      {/* Region categories */}
      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/board/restaurant-info/region/${c.code}`}
              onClick={() => setCurrentPage(1)}
              className={`px-3 py-1 rounded-full text-sm border ${
                activeCategory?.code === c.code
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">맛집정보를 불러오는 중...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length > 0 ? (
            posts.map((p) => (
              <Link
                key={p.id}
                to={`/board/restaurant-info/${p.id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4 flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">
                          {activeCategory?.name} · {formatBoardDate(p.created_at)}
                        </div>
                        <div className="text-base font-semibold text-gray-900 line-clamp-1">{p.meta?.restaurant_name || p.title}</div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        👍 {p.like_count} · 💬 {p.comment_count} · 👀 {p.view_count}
                      </div>
                    </div>

                    {p.meta && (
                      <div className="mt-2 text-xs text-gray-700 space-y-1">
                        <div className="line-clamp-1">
                          <span className="font-medium">한줄평:</span> {p.meta.one_line_review}
                        </div>
                        <div className="line-clamp-1 text-gray-600">
                          <span className="font-medium">대표메뉴:</span> {(p.meta.representative_menus || []).join(', ')} ·{' '}
                          <span className="font-medium">가격대:</span> {p.meta.price_range}
                        </div>
                        {(p.meta.address_text || p.meta.map_link) && (
                          <div className="line-clamp-1 text-gray-600">
                            <span className="font-medium">위치:</span> {p.meta.address_text || p.meta.map_link}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      {p.author?.nickname || '익명'}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 text-sm text-gray-500">게시글이 없습니다.</div>
          )}
        </div>
      )}

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

export default RestaurantInfoBoardPage;


