import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getPosts, deletePost, updatePost, createPost, PostData } from '../../services/adminApi';
import { TrashIcon, PencilIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [boardType, setBoardType] = useState<string>('all');
  
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeForm, setWriteForm] = useState({
    title: '',
    content: '',
    board_type: 'notice' as 'notice' | 'free' | 'suggestion',
    is_pinned: false,
  });
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeError, setWriteError] = useState('');

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

  const handleOpenWriteModal = () => {
    setWriteForm({
      title: '',
      content: '',
      board_type: 'notice',
      is_pinned: false,
    });
    setWriteError('');
    setShowWriteModal(true);
  };

  const handleCloseWriteModal = () => {
    setShowWriteModal(false);
    setWriteForm({
      title: '',
      content: '',
      board_type: 'notice',
      is_pinned: false,
    });
    setWriteError('');
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!writeForm.title.trim()) {
      setWriteError('제목을 입력해주세요.');
      return;
    }
    
    if (!writeForm.content.trim()) {
      setWriteError('내용을 입력해주세요.');
      return;
    }

    setWriteLoading(true);
    setWriteError('');

    try {
      const newPost = await createPost({
        title: writeForm.title.trim(),
        content: writeForm.content.trim(),
        board_type: writeForm.board_type,
        is_pinned: writeForm.is_pinned,
      });
      
      setPosts(prev => [newPost, ...prev]);
      setTotal(t => t + 1);
      handleCloseWriteModal();
      alert('게시글이 작성되었습니다.');
    } catch (e) {
      setWriteError(e instanceof Error ? e.message : '게시글 작성 실패');
    } finally {
      setWriteLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">게시글 관리</h1>
          <button
            onClick={handleOpenWriteModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            게시글 작성
          </button>
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

      {/* 게시글 작성 모달 */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">게시글 작성</h2>
                <button
                  onClick={handleCloseWriteModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* 작성 폼 */}
              <form onSubmit={handleSubmitPost} className="space-y-6">
                {/* 게시판 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    게시판 *
                  </label>
                  <select
                    value={writeForm.board_type}
                    onChange={(e) => setWriteForm(prev => ({ ...prev, board_type: e.target.value as 'notice' | 'free' | 'suggestion' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="notice">공지사항</option>
                    <option value="free">자유게시판</option>
                    <option value="suggestion">의견제안</option>
                  </select>
                </div>

                {/* 상단 고정 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={writeForm.is_pinned}
                    onChange={(e) => setWriteForm(prev => ({ ...prev, is_pinned: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="is_pinned" className="text-sm text-gray-700">
                    상단 고정
                  </label>
                </div>

                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={writeForm.title}
                    onChange={(e) => setWriteForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="제목을 입력해주세요"
                    maxLength={100}
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    {writeForm.title.length}/100
                  </div>
                </div>

                {/* 내용 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용 *
                  </label>
                  <textarea
                    value={writeForm.content}
                    onChange={(e) => setWriteForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
                    placeholder="내용을 입력해주세요"
                    maxLength={5000}
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    {writeForm.content.length}/5000
                  </div>
                </div>

                {/* 에러 메시지 */}
                {writeError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{writeError}</p>
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseWriteModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={writeLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {writeLoading ? '작성 중...' : '작성하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPosts;


