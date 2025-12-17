import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../services/supabaseClient';

type ReportStatus = 'pending' | 'in_progress' | 'dismissed' | 'penalized';

type PostRow = {
  id: string;
  title: string;
  author_id: string;
  is_active: boolean;
  created_at: string;
};

type PostReportRow = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  post?: PostRow;
};

type Profile = { user_id: string; nickname: string | null; email: string | null; avatar_url: string | null };

async function callEdge(functionName: string, data: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required');

  const resp = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || 'Request failed');
  return json;
}

const AdminPostReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [reports, setReports] = useState<PostReportRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});

  const reporterIds = useMemo(
    () => Array.from(new Set(reports.map((r) => r.reporter_id).filter(Boolean))),
    [reports]
  );

  const authorIds = useMemo(
    () => Array.from(new Set(reports.map((r) => r.post?.author_id).filter(Boolean))) as string[],
    [reports]
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      let q = supabase
        .from('post_reports')
        .select('id, post_id, reporter_id, reason, description, status, created_at, reviewed_at, reviewed_by, post:post_id (id, title, author_id, is_active, created_at)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') q = q.eq('status', filter);

      const { data, error } = await q;
      if (error) throw error;
      setReports((data || []) as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : '신고 목록 조회 실패');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async (ids: string[]) => {
    if (!ids.length) return;
    const missing = ids.filter((id) => !profilesById[id]);
    if (!missing.length) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, nickname, email, avatar_url')
      .in('user_id', missing);

    if (error) {
      console.warn('프로필 조회 실패:', error);
      return;
    }

    const next: Record<string, Profile> = {};
    (data || []).forEach((p: any) => (next[p.user_id] = p));
    setProfilesById((prev) => ({ ...prev, ...next }));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    loadProfiles([...reporterIds, ...authorIds]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reporterIds.join(','), authorIds.join(',')]);

  const reporterName = (id: string) => profilesById[id]?.nickname || profilesById[id]?.email || '알 수 없음';
  const authorName = (id: string) => profilesById[id]?.nickname || profilesById[id]?.email || '알 수 없음';

  const handleModerate = async (r: PostReportRow, action: 'hide' | 'unhide' | 'delete', nextStatus?: ReportStatus) => {
    try {
      await callEdge('moderate-post', {
        post_id: r.post_id,
        action,
        report_id: r.id,
        report_status: nextStatus,
        reason_code: r.reason,
        notes: r.description || null,
      });
      await load();
      alert('처리 완료');
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 실패');
    }
  };

  const handleSetStatus = async (r: PostReportRow, nextStatus: ReportStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');
      const { error } = await supabase
        .from('post_reports')
        .update({ status: nextStatus, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
        .eq('id', r.id);
      if (error) throw error;
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">게시글 신고 관리</h1>
          <p className="text-gray-600 mt-1">post_reports 처리, 게시글 숨김/삭제, 처리 로그는 moderation_actions에 기록됩니다.</p>
          {error && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border rounded"
          >
            <option value="pending">대기중</option>
            <option value="in_progress">처리중</option>
            <option value="dismissed">기각</option>
            <option value="penalized">제재확정</option>
            <option value="all">전체</option>
          </select>
          <button onClick={load} className="px-3 py-2 border rounded hover:bg-gray-50 text-sm">
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">로딩 중...</div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-500">신고가 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleString('ko-KR')} · 상태: <span className="font-medium">{r.status}</span>
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {r.post?.title || '(삭제된 게시글)'}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      신고자: <span className="font-medium">{reporterName(r.reporter_id)}</span> · 작성자:{' '}
                      <span className="font-medium">{r.post?.author_id ? authorName(r.post.author_id) : '알 수 없음'}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      사유: <span className="font-medium">{r.reason}</span>
                    </div>
                    {r.description && <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.description}</div>}
                    <div className="mt-2 text-sm text-gray-600">
                      게시글 상태: <span className="font-medium">{r.post?.is_active ? '노출' : '숨김'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleSetStatus(r, 'in_progress')}
                      className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
                    >
                      처리중
                    </button>
                    <button
                      onClick={() => handleSetStatus(r, 'dismissed')}
                      className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
                    >
                      기각
                    </button>
                    <button
                      onClick={() => handleModerate(r, 'hide', 'penalized')}
                      className="px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      숨김+제재
                    </button>
                    <button
                      onClick={() => handleModerate(r, 'unhide')}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      복원
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('게시글을 삭제할까요?')) handleModerate(r, 'delete', 'penalized');
                      }}
                      className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      삭제+제재
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPostReportsPage;


