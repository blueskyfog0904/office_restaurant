import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getTermsList, createTerms, updateTerms, deleteTerms, TermsVersion } from '../../services/adminApi';

const emptyDraft: Omit<TermsVersion, 'id' | 'updated_at'> = {
  code: 'tos',
  title: '',
  content: '',
  is_required: true,
  version: 1,
  pdf_url: null,
};

const AdminTerms: React.FC = () => {
  const [items, setItems] = useState<TermsVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<TermsVersion, 'id' | 'updated_at'>>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const list = await getTermsList();
      setItems(list);
    } catch (e: any) {
      setError(e.message || '약관을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingId(null); setDraft(emptyDraft); setIsModalOpen(true); };
  const openEdit = (t: TermsVersion) => {
    setEditingId(t.id);
    setDraft({ code: t.code, title: t.title, content: t.content, is_required: t.is_required, version: t.version, pdf_url: t.pdf_url || null });
    setIsModalOpen(true);
  };

  const save = async () => {
    try {
      if (editingId) {
        const res = await updateTerms(editingId, draft);
        setItems(prev => prev.map(i => i.id === editingId ? res : i));
      } else {
        const res = await createTerms(draft);
        setItems(prev => [res, ...prev]);
      }
      setIsModalOpen(false);
    } catch (e: any) {
      alert(e.message || '저장 실패');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('해당 약관 버전을 삭제할까요?')) return;
    try { await deleteTerms(id); setItems(prev => prev.filter(i => i.id !== id)); } catch (e: any) { alert(e.message || '삭제 실패'); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">약관 관리</h1>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded">새 약관 추가</button>
        </div>

        {loading && <p>로딩 중...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">필수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">버전</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">업데이트</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map(i => (
                  <tr key={i.id}>
                    <td className="px-6 py-4 text-sm">{i.code}</td>
                    <td className="px-6 py-4 text-sm">{i.title}</td>
                    <td className="px-6 py-4 text-sm">{i.is_required ? '예' : '아니오'}</td>
                    <td className="px-6 py-4 text-sm">{i.version}</td>
                    <td className="px-6 py-4 text-sm">{new Date(i.updated_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(i)} className="text-blue-600 hover:text-blue-900 mr-2">수정</button>
                      <button onClick={() => remove(i.id)} className="text-red-600 hover:text-red-900">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6">
              <h3 className="text-lg font-bold mb-4">{editingId ? '약관 수정' : '새 약관 추가'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">코드</label>
                  <select value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value as any })} className="w-full border rounded px-3 py-2">
                    <option value="tos">이용약관</option>
                    <option value="privacy">개인정보 수집·이용</option>
                    <option value="age14">만 14세 이상</option>
                    <option value="location">위치기반서비스</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">제목</label>
                  <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">필수 여부</label>
                  <select value={draft.is_required ? '1' : '0'} onChange={e => setDraft({ ...draft, is_required: e.target.value === '1' })} className="w-full border rounded px-3 py-2">
                    <option value="1">필수</option>
                    <option value="0">선택</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">버전</label>
                  <input type="number" min={1} value={draft.version} onChange={e => setDraft({ ...draft, version: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">PDF URL(선택)</label>
                  <input value={draft.pdf_url || ''} onChange={e => setDraft({ ...draft, pdf_url: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">내용(전문)</label>
                  <textarea value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} rows={12} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">취소</button>
                <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">저장</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTerms;


