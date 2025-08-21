import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getPosts, deletePost, updatePost, PostData } from '../../services/adminApi';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [boardType, setBoardType] = useState<string>('all');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getPosts(boardType === 'all' ? undefined : boardType, page, limit);
      setPosts(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [boardType, page, limit]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('해당 게시글을 삭제할까요?')) return;
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const togglePin = async (post: PostData) => {
    try {
      const updated = await updatePost(post.id, { is_pinned: !post.is_pinned });
      setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
    } catch (e) {
      alert(e instanceof Error ? e.message : '고정 상태 변경 실패');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">게시글 관리</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <select
            value={boardType}
            onChange={(e) => { setPage(1); setBoardType(e.target.value); }}
            className="px-3 py-2 border rounded"
          >
            <option value="all">전체 게시판</option>
            <option value="notice">공지사항</option>
            <option value="free">자유게시판</option>
          </select>
        </div>

        {loading && <p>로딩 중...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">게시판</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작성자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 line-clamp-1">{p.title}</div>
                      <div className="text-sm text-gray-500 line-clamp-2">{p.content}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{p.board_type}</td>
                    <td className="px-6 py-4 text-sm">{p.author?.nickname || p.author?.email || ''}</td>
                    <td className="px-6 py-4 text-sm">{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => togglePin(p)} className="text-gray-600 hover:text-gray-900 mr-2" title={p.is_pinned ? '고정 해제' : '상단 고정'}>
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900" title="삭제">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center p-4">
              <span>총 {total}개</span>
              <div>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="mr-2">이전</button>
                <span>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="ml-2">다음</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPosts;


