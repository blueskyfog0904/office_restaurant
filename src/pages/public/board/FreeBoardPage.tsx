import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PlusIcon, ChatBubbleLeftRightIcon, EyeIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { getBoardCategories, getBoardPosts, getHotPostsByBoardCode, BoardCategory, Post } from '../../../services/boardService';
import { formatBoardDate } from '../../../utils/dateUtils';

const stripParentheses = (text: string) =>
  text
    .replace(/\s*[(（][^)）]*[)）]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const FreeBoardPage: React.FC = () => {
  const { categoryCode } = useParams<{ categoryCode?: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [hotLoading, setHotLoading] = useState(true);
  const [hotTab, setHotTab] = useState<'all' | 'humor' | 'entertainment' | 'free' | 'politics'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<BoardCategory[]>([]);

  const activeCategory = useMemo(() => categoryCode || 'chat', [categoryCode]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getBoardCategories('free');
        const active = cats.filter((c) => c.is_active);

        const getPriority = (c: BoardCategory) => {
          const name = (c.name || '').replace(/\s/g, '');
          if (c.code === 'hot' || name.includes('HOT')) return 0;
          if (name.includes('자유') && (name.includes('수다') || name.includes('잡담'))) return 1;
          if (name.includes('엽기') || name.includes('유머')) return 2;
          if (name.includes('정치') || name.includes('시사')) return 3;
          return 100;
        };

        const sorted = active
          .map((c, idx) => ({ c, idx }))
          .sort((a, b) => {
            const pa = getPriority(a.c);
            const pb = getPriority(b.c);
            if (pa !== pb) return pa - pb;
            const da = a.c.display_order ?? 0;
            const db = b.c.display_order ?? 0;
            if (da !== db) return da - db;
            return a.idx - b.idx;
          })
          .map((x) => x.c);

        setCategories(sorted);
      } catch (e) {
        console.error('자유게시판 카테고리 로드 실패:', e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadHot = async () => {
      setHotLoading(true);
      try {
        // 탭에 따라 카테고리 필터링
        let categoryFilter: string | undefined = undefined;
        if (hotTab === 'humor') categoryFilter = 'humor';
        else if (hotTab === 'politics') categoryFilter = 'politics';
        else if (hotTab === 'free') categoryFilter = 'chat';
        else if (hotTab === 'entertainment') categoryFilter = 'entertainment';
        
        const data = await getHotPostsByBoardCode('free', 48, 30, categoryFilter);
        setHotPosts(data || []);
      } catch (e) {
        console.error('HOT 30 로드 실패:', e);
        setHotPosts([]);
      } finally {
        setHotLoading(false);
      }
    };
    loadHot();
  }, [hotTab]);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      
      try {
        const response = await getBoardPosts('free', activeCategory, currentPage, 20);
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
  }, [currentPage, activeCategory]);

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
        <div className="flex items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">자유게시판</h1>
            </div>
            <p className="text-sm text-gray-600">맛집에 대한 다양한 이야기를 나누어보세요</p>
          </div>
        </div>
      </div>

      {/* 최근 HOT 인기글 (HOT 30) */}
      <div className="mb-6 rounded-lg border-2 border-[#1B365D] overflow-hidden bg-white">
        <div className="flex items-center justify-between bg-[#1B365D] px-4 py-1.5">
          <div className="text-white text-sm font-extrabold tracking-tight">🔥 오늘의 HOT 30</div>
          <div className="flex items-center rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold">
            {[
              { key: 'all' as const, label: '종합' },
              { key: 'humor' as const, label: '유머(엽기유머)' },
              { key: 'politics' as const, label: '정치(정치&시사)' },
              { key: 'free' as const, label: '자유(자유&수다)' },
              { key: 'entertainment' as const, label: '연예' },
            ].map((t) => {
              const isActive = hotTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setHotTab(t.key)}
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                    isActive ? 'bg-[#1B365D] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-pressed={isActive}
                >
                  {stripParentheses(t.label)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {[0, 1, 2].map((col) => {
            const start = col * 10;
            const items = Array.from({ length: 10 }, (_, i) => hotPosts[start + i] || null);
            return (
              <div key={col} className="divide-y divide-gray-200">
                {items.map((p, idx) => {
                  const rank = start + idx + 1;
                  const isPlaceholder = !p;
                  const content = (
                    <div className={`flex items-center gap-2 px-4 py-1.5 ${isPlaceholder ? 'opacity-50' : 'hover:bg-gray-50'} transition-colors`}>
                      <div className="w-6 text-sm text-[#1B365D] font-bold">{rank}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center min-w-0">
                          <span className="text-xs text-gray-800 truncate">
                            {p?.title || '—'}
                          </span>
                          <span className="ml-1 text-xs text-orange-500 font-bold">
                            ({p?.view_count ?? 0})
                          </span>
                        </div>
                      </div>
                    </div>
                  );

                  if (isPlaceholder) return <div key={`ph-${rank}`}>{content}</div>;
                  return (
                    <Link key={p.id} to={`/board/free/${p.id}`} className="block">
                      {content}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {hotLoading && (
          <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200">HOT 30을 불러오는 중...</div>
        )}
      </div>

      {/* 카테고리 탭 + 글쓰기 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {categories.length > 0 && (
          <div className="flex flex-1 flex-wrap gap-2">
            {categories.map((c) => {
              const href = c.code === 'hot' ? '/board/free/hot' : `/board/free/category/${c.code}`;
              const isActive = c.code === activeCategory;
              return (
                <Link
                  key={c.id}
                  to={href}
                  onClick={() => setCurrentPage(1)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    isActive ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {stripParentheses(c.name || '')}
                </Link>
              );
            })}
          </div>
        )}

        <Link
          to={`/board/free/write?category=${encodeURIComponent(activeCategory)}`}
          className="ml-auto inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors whitespace-nowrap"
        >
          <PlusIcon className="h-4 w-4" />
          글쓰기
        </Link>
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
