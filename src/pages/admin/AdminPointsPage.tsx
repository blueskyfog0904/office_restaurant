import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../services/supabaseClient';

type LevelRule = { level_code: number; display_name: string; min_points: number };

type UserRow = {
  user_id: string;
  nickname: string | null;
  email: string | null;
};

type UserPointsRow = {
  user_id: string;
  balance_points: number;
  level_code: number;
  updated_at: string;
};

type LedgerRow = {
  id: string;
  user_id: string;
  delta: number;
  event_type: string;
  ref_table: string | null;
  ref_id: string | null;
  created_at: string;
  created_by: string | null;
};

const AdminPointsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  const levelNameByCode = useMemo(() => {
    const m = new Map<number, string>();
    levelRules.forEach((r) => m.set(r.level_code, r.display_name));
    return m;
  }, [levelRules]);

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const selectedUser = useMemo(() => users.find((u) => u.user_id === selectedUserId) || null, [users, selectedUserId]);

  const [userPoints, setUserPoints] = useState<UserPointsRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState<string>('manual_adjust');
  const [notes, setNotes] = useState<string>('');

  const loadLevelRules = async () => {
    const { data, error } = await supabase
      .from('user_level_rules')
      .select('level_code, display_name, min_points')
      .order('level_code', { ascending: true });
    if (error) throw error;
    setLevelRules((data || []) as any);
  };

  const loadUsers = async () => {
    if (!search.trim()) {
      setUsers([]);
      setSelectedUserId('');
      return;
    }
    const q = search.trim();
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, nickname, email')
      .or(`nickname.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(20);
    if (error) throw error;
    setUsers((data || []) as any);
    if (data && data.length > 0) setSelectedUserId(data[0].user_id);
  };

  const loadUserPointsAndLedger = async (uid: string) => {
    const [{ data: up, error: upErr }, { data: led, error: ledErr }] = await Promise.all([
      supabase.from('user_points').select('user_id, balance_points, level_code, updated_at').eq('user_id', uid).single(),
      supabase.from('points_ledger').select('id, user_id, delta, event_type, ref_table, ref_id, created_at, created_by').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
    ]);
    if (upErr) throw upErr;
    if (ledErr) throw ledErr;
    setUserPoints(up as any);
    setLedger((led || []) as any);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        await loadLevelRules();
      } catch (e) {
        setError(e instanceof Error ? e.message : '초기 로드 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadUsers().catch((e) => setError(e instanceof Error ? e.message : '사용자 검색 실패'));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!selectedUserId) return;
    loadUserPointsAndLedger(selectedUserId).catch((e) => setError(e instanceof Error ? e.message : '포인트 조회 실패'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const handleAdjust = async () => {
    if (!selectedUserId) return;
    if (!Number.isFinite(delta) || delta === 0) {
      alert('delta를 입력하세요(0 제외).');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase.from('points_ledger').insert({
        user_id: selectedUserId,
        delta,
        event_type: reason,
        ref_table: 'admin',
        ref_id: null,
        meta: { notes: notes || null },
        created_by: user.id,
      });
      if (error) throw error;

      setDelta(0);
      setNotes('');
      await loadUserPointsAndLedger(selectedUserId);
      alert('조정 완료');
    } catch (e) {
      alert(e instanceof Error ? e.message : '조정 실패');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">포인트/등급 관리</h1>
          <p className="text-gray-600 mt-1">points_ledger(원장) 조회 및 수동 조정(감사 로그)을 수행합니다.</p>
          {error && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">로딩 중...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">사용자 검색</h2>
              <input
                className="border rounded w-full px-3 py-2 text-sm"
                placeholder="닉네임/이메일로 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-3 space-y-2">
                {users.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSelectedUserId(u.user_id)}
                    className={`w-full text-left p-3 border rounded ${
                      selectedUserId === u.user_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{u.nickname || '(닉네임 없음)'}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </button>
                ))}
                {search.trim() && users.length === 0 && (
                  <div className="text-sm text-gray-500">검색 결과가 없습니다.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-3">선택 사용자</h2>
              {!selectedUserId || !selectedUser ? (
                <div className="text-gray-500">사용자를 선택하세요.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold">{selectedUser.nickname || selectedUser.email}</div>
                      <div className="text-sm text-gray-600">{selectedUser.email}</div>
                      <div className="text-xs text-gray-500">{selectedUser.user_id}</div>
                    </div>
                    {userPoints && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">현재 포인트</div>
                        <div className="text-2xl font-bold text-gray-900">{userPoints.balance_points.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">
                          등급: <span className="font-medium">{levelNameByCode.get(userPoints.level_code) || userPoints.level_code}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 border-t pt-4">
                    <h3 className="font-medium mb-2">수동 조정</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        type="number"
                        className="border rounded px-3 py-2 text-sm"
                        value={delta}
                        onChange={(e) => setDelta(Number(e.target.value))}
                        placeholder="delta (+/-)"
                      />
                      <select
                        className="border rounded px-3 py-2 text-sm"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      >
                        <option value="manual_adjust">manual_adjust</option>
                        <option value="admin_delete_violation">admin_delete_violation</option>
                        <option value="report_penalty_confirmed">report_penalty_confirmed</option>
                        <option value="spam_macro_detected">spam_macro_detected</option>
                      </select>
                      <input
                        className="border rounded px-3 py-2 text-sm md:col-span-2"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="메모(옵션)"
                      />
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={handleAdjust}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        적용
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 border-t pt-4">
                    <h3 className="font-medium mb-2">원장(최근 50건)</h3>
                    {ledger.length === 0 ? (
                      <div className="text-sm text-gray-500">기록이 없습니다.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">일시</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">event</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">delta</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ref</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {ledger.map((l) => (
                              <tr key={l.id}>
                                <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                                  {new Date(l.created_at).toLocaleString('ko-KR')}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-700">{l.event_type}</td>
                                <td className={`px-3 py-2 text-sm text-right ${l.delta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {l.delta}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  {l.ref_table || ''} {l.ref_id ? `(${l.ref_id})` : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPointsPage;


