import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getPosts, deletePost, updatePost, PostData } from '../../services/adminApi';
import { TrashIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getComments, createComment, Comment } from '../../services/commentApi';

const AdminSuggestions: React.FC = () => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getPosts('suggestion', page, limit);
      setPosts(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '의견제안을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('해당 의견제안을 삭제할까요?')) return;
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const handleStatusChange = async (post: PostData, next: 'pending' | 'in_progress' | 'completed') => {
    try {
      const updated = await updatePost(post.id, { status: next });
      setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
    } catch (e) {
      alert(e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const commentList = await getComments(postId, 'latest', 100);
      setComments(prev => ({ ...prev, [postId]: commentList }));
    } catch (e) {
      console.error('답글 로드 실패:', e);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleExpanded = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      if (!comments[postId]) {
        await loadComments(postId);
      }
    }
  };

  const handleSubmitReply = async (postId: string) => {
    const content = replyContent[postId]?.trim();
    if (!content) {
      alert('답글 내용을 입력해주세요.');
      return;
    }

    setSubmittingReply(prev => ({ ...prev, [postId]: true }));
    try {
      const newComment = await createComment({
        post_id: postId,
        content: content,
      });
      setComments(prev => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])]
      }));
      setReplyContent(prev => ({ ...prev, [postId]: '' }));
    } catch (e) {
      alert(e instanceof Error ? e.message : '답글 작성 실패');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [postId]: false }));
    }
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">의견제안 관리</h1>

        {loading && <p>로딩 중...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작성자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map(p => (
                  <React.Fragment key={p.id}>
                    <tr>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 line-clamp-1">{p.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{p.content}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{p.author?.nickname || p.author?.email || ''}</td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          className="px-2 py-1 border rounded"
                          value={p.status ?? 'pending'}
                          onChange={(e) => handleStatusChange(p, e.target.value as 'pending' | 'in_progress' | 'completed')}
                        >
                          <option value="pending">담당자 확인</option>
                          <option value="in_progress">진행 중</option>
                          <option value="completed">완료</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleExpanded(p.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="답글 보기/작성"
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900" title="삭제">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPostId === p.id && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900">답글</h3>
                              <button
                                onClick={() => setExpandedPostId(null)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>

                            <div className="bg-white rounded-lg border p-4">
                              <textarea
                                value={replyContent[p.id] || ''}
                                onChange={(e) => setReplyContent(prev => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder="답글을 입력하세요..."
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                              />
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={() => handleSubmitReply(p.id)}
                                  disabled={submittingReply[p.id]}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {submittingReply[p.id] ? '작성 중...' : '답글 작성'}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="font-medium text-gray-700">작성된 답글</h4>
                              {loadingComments[p.id] ? (
                                <p className="text-gray-500">로딩 중...</p>
                              ) : comments[p.id] && comments[p.id].length > 0 ? (
                                <div className="space-y-2">
                                  {comments[p.id].map((comment) => (
                                    <div key={comment.id} className="bg-white border rounded-lg p-3">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm text-gray-900">
                                              {comment.author_nickname || '관리자'}
                                            </span>
                                            {comment.author_role === 'admin' && (
                                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">관리자</span>
                                            )}
                                            <span className="text-xs text-gray-500">
                                              {new Date(comment.created_at).toLocaleString('ko-KR')}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">작성된 답글이 없습니다.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

export default AdminSuggestions;


