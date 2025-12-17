import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../services/supabaseClient';

type Board = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  write_policy: any;
};

type Category = {
  id: string;
  board_id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

const AdminBoardsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [categories, setCategories] = useState<Record<string, Category[]>>({});
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');

  const [newBoard, setNewBoard] = useState({ code: '', name: '', description: '' });
  const [newCategory, setNewCategory] = useState({ code: '', name: '', display_order: 0 });

  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedBoardId) || null,
    [boards, selectedBoardId]
  );

  const loadBoards = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('id, code, name, description, is_active, write_policy')
        .order('code', { ascending: true });
      if (error) throw error;
      setBoards((data || []) as any);
      if (!selectedBoardId && data && data.length > 0) setSelectedBoardId(data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '게시판 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (boardId: string) => {
    try {
      const { data, error } = await supabase
        .from('board_categories')
        .select('id, board_id, code, name, display_order, is_active')
        .eq('board_id', boardId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setCategories((prev) => ({ ...prev, [boardId]: (data || []) as any }));
    } catch (e) {
      console.error('카테고리 조회 실패:', e);
    }
  };

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBoardId) loadCategories(selectedBoardId);
  }, [selectedBoardId]);

  const handleCreateBoard = async () => {
    setError('');
    if (!newBoard.code.trim() || !newBoard.name.trim()) {
      setError('code/name은 필수입니다.');
      return;
    }
    try {
      const { error } = await supabase.from('boards').insert({
        code: newBoard.code.trim(),
        name: newBoard.name.trim(),
        description: newBoard.description.trim() || null,
      });
      if (error) throw error;
      setNewBoard({ code: '', name: '', description: '' });
      await loadBoards();
    } catch (e) {
      setError(e instanceof Error ? e.message : '게시판 생성 실패');
    }
  };

  const handleToggleBoardActive = async (board: Board) => {
    try {
      const { error } = await supabase
        .from('boards')
        .update({ is_active: !board.is_active })
        .eq('id', board.id);
      if (error) throw error;
      await loadBoards();
    } catch (e) {
      alert(e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  const handleCreateCategory = async () => {
    setError('');
    if (!selectedBoardId) {
      setError('게시판을 선택하세요.');
      return;
    }
    if (!newCategory.code.trim() || !newCategory.name.trim()) {
      setError('카테고리 code/name은 필수입니다.');
      return;
    }
    try {
      const { error } = await supabase.from('board_categories').insert({
        board_id: selectedBoardId,
        code: newCategory.code.trim(),
        name: newCategory.name.trim(),
        display_order: Number(newCategory.display_order) || 0,
      });
      if (error) throw error;
      setNewCategory({ code: '', name: '', display_order: 0 });
      await loadCategories(selectedBoardId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '카테고리 생성 실패');
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      const { error } = await supabase
        .from('board_categories')
        .update({ is_active: !cat.is_active })
        .eq('id', cat.id);
      if (error) throw error;
      await loadCategories(cat.board_id);
    } catch (e) {
      alert(e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">게시판/카테고리 관리</h1>
          <p className="text-gray-600 mt-1">boards / board_categories를 관리합니다.</p>
          {error && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">로딩 중...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">게시판</h2>

              <div className="space-y-2">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBoardId(b.id)}
                    className={`w-full text-left p-3 border rounded-md ${
                      selectedBoardId === b.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {b.name} <span className="text-xs text-gray-500">({b.code})</span>
                        </div>
                        {b.description && <div className="text-sm text-gray-600">{b.description}</div>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {b.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t pt-4">
                <h3 className="font-medium mb-2">새 게시판 생성</h3>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    className="border rounded px-3 py-2 text-sm"
                    placeholder="code (예: restaurant_info)"
                    value={newBoard.code}
                    onChange={(e) => setNewBoard((p) => ({ ...p, code: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2 text-sm"
                    placeholder="name"
                    value={newBoard.name}
                    onChange={(e) => setNewBoard((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2 text-sm"
                    placeholder="description (옵션)"
                    value={newBoard.description}
                    onChange={(e) => setNewBoard((p) => ({ ...p, description: e.target.value }))}
                  />
                  <button
                    onClick={handleCreateBoard}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    생성
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">카테고리</h2>
                {selectedBoard && (
                  <button
                    onClick={() => handleToggleBoardActive(selectedBoard)}
                    className="px-3 py-1 text-sm rounded border"
                  >
                    게시판 {selectedBoard.is_active ? '비활성화' : '활성화'}
                  </button>
                )}
              </div>

              {!selectedBoardId ? (
                <div className="text-gray-500">게시판을 선택하세요.</div>
              ) : (
                <>
                  <div className="text-sm text-gray-600 mb-2">
                    선택: <span className="font-medium text-gray-900">{selectedBoard?.name}</span>
                  </div>

                  <div className="space-y-2">
                    {(categories[selectedBoardId] || []).map((c) => (
                      <div key={c.id} className="p-3 border border-gray-200 rounded-md flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {c.name} <span className="text-xs text-gray-500">({c.code})</span>
                          </div>
                          <div className="text-xs text-gray-500">order: {c.display_order}</div>
                        </div>
                        <button
                          onClick={() => handleToggleCategoryActive(c)}
                          className={`px-3 py-1 text-xs rounded ${
                            c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {c.is_active ? '활성' : '비활성'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 border-t pt-4">
                    <h3 className="font-medium mb-2">새 카테고리 생성</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        className="border rounded px-3 py-2 text-sm"
                        placeholder="code (예: seoul)"
                        value={newCategory.code}
                        onChange={(e) => setNewCategory((p) => ({ ...p, code: e.target.value }))}
                      />
                      <input
                        className="border rounded px-3 py-2 text-sm"
                        placeholder="name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))}
                      />
                      <input
                        className="border rounded px-3 py-2 text-sm"
                        placeholder="display_order"
                        type="number"
                        value={newCategory.display_order}
                        onChange={(e) => setNewCategory((p) => ({ ...p, display_order: Number(e.target.value) }))}
                      />
                      <button
                        onClick={handleCreateCategory}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        생성
                      </button>
                    </div>
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

export default AdminBoardsPage;


