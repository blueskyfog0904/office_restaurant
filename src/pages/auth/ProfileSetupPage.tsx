import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, nickname, region, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      navigate('/welcome', { replace: true });
    } catch (e: any) {
      setError(e.message || '프로필 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">기본 정보 입력</h2>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">닉네임</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} className="w-full border px-3 py-2 rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">지역</label>
            <input value={region} onChange={e => setRegion(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="예: 서울 강남" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/register/terms')} className="px-4 py-2 border rounded">이전</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">완료</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage;


