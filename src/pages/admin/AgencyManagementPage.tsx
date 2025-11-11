import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { getAgencies, AgencyData } from '../../services/adminApi';

const AgencyManagementPage: React.FC = () => {
  const [agencies, setAgencies] = useState<AgencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / limit);

  const loadAgencies = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAgencies(page, limit);
      setAgencies(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '기관 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">기관 정보 관리</h1>
        
        {loading && <p>로딩 중...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">세부 카테고리</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agencies.map(agency => (
                    <tr key={agency.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{agency.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{agency.sub_category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(agency.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <span>총 {total}개</span>
              <div>
                <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}>이전</button>
                <span className="mx-2">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>다음</button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AgencyManagementPage; 