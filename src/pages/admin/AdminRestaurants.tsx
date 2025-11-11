import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  getRestaurants, 
  createRestaurant, 
  updateRestaurant, 
  deleteRestaurant,
  RestaurantData,
  RestaurantFilters,
  RestaurantListResponse,
} from '../../services/adminApi';

const AdminRestaurants: React.FC = () => {
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const [filters, setFilters] = useState<RestaurantFilters>({
    search: '',
    is_active: undefined,
    page: 1,
    limit: 10,
  });
  
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
  
  const [formData, setFormData] = useState<Partial<RestaurantData>>({
    name: '',
    address: '',
    telephone: '',
    category: '',
    region: '',
    sub_region: '',
    is_active: true,
  });

  const loadRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response: RestaurantListResponse = await getRestaurants(filters);
      setRestaurants(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | boolean | undefined = value;

    if (name === 'is_active') {
        processedValue = value === '' ? undefined : value === 'true';
    } else if (value === '') {
        processedValue = undefined;
    }
    
    setFilters(prev => ({
      ...prev,
      page: 1,
      [name]: processedValue,
    }));
  };
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const openModal = (restaurant: RestaurantData | null = null) => {
    setSelectedRestaurant(restaurant);
    setFormData(restaurant ? { ...restaurant } : {
      name: '', address: '', telephone: '', category: '', region: '', sub_region: '', is_active: true,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRestaurant(null);
    setFormData({});
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRestaurant && selectedRestaurant.id) {
        await updateRestaurant(selectedRestaurant.id, formData);
      } else {
        await createRestaurant(formData as any);
      }
      closeModal();
      await loadRestaurants();
    } catch (err) {
      alert(`저장 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 이 음식점을 삭제하시겠습니까?')) {
      try {
        await deleteRestaurant(id);
        await loadRestaurants();
      } catch (err) {
        alert(`삭제 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
      }
    }
  };
  
  const getStatusBadge = (isActive: boolean | undefined) => (
    isActive 
      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">활성</span>
      : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">비활성</span>
  );
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">음식점 관리</h1>
            <p className="text-gray-600 mt-1">등록된 음식점 정보를 관리합니다.</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            새 음식점 등록
          </button>
        </div>
        
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text" name="search" placeholder="음식점명, 주소 검색..."
                value={filters.search || ''} onChange={handleFilterChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              name="is_active"
              value={filters.is_active === undefined ? '' : String(filters.is_active)}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
        </div>

        {/* Restaurant List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center p-10">로딩 중...</div>
          ) : error ? (
            <div className="text-center p-10 text-red-500">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">음식점명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주소</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지역</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {restaurants.map((restaurant) => (
                    <tr key={restaurant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{restaurant.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{restaurant.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{restaurant.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{restaurant.region} {restaurant.sub_region}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(restaurant.is_active ?? true)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => openModal(restaurant)} className="text-indigo-600 hover:text-indigo-900"><PencilIcon className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(restaurant.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-700">총 {pagination.total}개</span>
            <div className="flex space-x-1">
              <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 border rounded">이전</button>
              <span>{pagination.page} / {pagination.totalPages}</span>
              <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 border rounded">다음</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedRestaurant ? '음식점 수정' : '새 음식점 등록'}</h3>
            <form id="restaurant-form" onSubmit={handleSubmit} className="space-y-4">
              <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} placeholder="음식점명" required className="w-full p-2 border rounded" />
              <input type="text" name="address" value={formData.address || ''} onChange={handleFormChange} placeholder="주소" required className="w-full p-2 border rounded" />
              <input type="text" name="telephone" value={formData.telephone || ''} onChange={handleFormChange} placeholder="연락처" className="w-full p-2 border rounded" />
              <input type="text" name="category" value={formData.category || ''} onChange={handleFormChange} placeholder="카테고리" className="w-full p-2 border rounded" />
              <input type="text" name="region" value={formData.region || ''} onChange={handleFormChange} placeholder="지역 (예: 서울특별시)" className="w-full p-2 border rounded" />
              <input type="text" name="sub_region" value={formData.sub_region || ''} onChange={handleFormChange} placeholder="세부 지역 (예: 강남구)" className="w-full p-2 border rounded" />
              <div className="flex items-center">
                <input type="checkbox" name="is_active" checked={formData.is_active || false} onChange={handleFormChange} className="h-4 w-4 rounded" />
                <label className="ml-2 text-sm text-gray-700">활성 상태</label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded">취소</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{selectedRestaurant ? '수정' : '등록'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminRestaurants; 