import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { updateRestaurant, RestaurantData, setSkipAdminCheck } from '../../services/adminApi';
import { getRestaurantById } from '../../services/authService';
import { RestaurantWithStats } from '../../types';

const AdminEditRestaurantPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdminLoggedIn, loading: authLoading } = useAdminAuth();
  
  const [restaurant, setRestaurant] = useState<RestaurantWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    category: '',
    telephone: '',
    region: '',
    sub_region: '',
    is_active: true
  });

  useEffect(() => {
    if (!authLoading && !isAdminLoggedIn) {
      navigate('/admin/login');
      return;
    }

    if (!id) {
      navigate('/admin/restaurants');
      return;
    }

    loadRestaurant();
  }, [id, isAdminLoggedIn, authLoading, navigate]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const data = await getRestaurantById(id!);
      setRestaurant(data);
      setFormData({
        name: data.title || data.name || '',
        address: data.address || '',
        category: data.category || '',
        telephone: data.phone || '',
        region: data.sub_add1 || '',
        sub_region: data.sub_add2 || '',
        is_active: data.is_active ?? true
      });
    } catch (error) {
      console.error('음식점 정보 로드 실패:', error);
      alert('음식점 정보를 불러오는데 실패했습니다.');
      navigate('/admin/restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('음식점 이름을 입력해주세요.');
      return;
    }

    if (!formData.address.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      // 관리자 권한이 이미 확인되었으므로 중복 확인 건너뛰기
      setSkipAdminCheck(true);
      
      const updateData = {
        name: formData.name.trim(),
        title: formData.name.trim(),  // title 컬럼도 함께 업데이트
        address: formData.address.trim(),
        category: formData.category.trim() || undefined,
        telephone: formData.telephone.trim() || undefined,
        region: formData.region.trim() || undefined,
        sub_region: formData.sub_region.trim() || undefined,
        is_active: formData.is_active
      };
      
      console.log('🎯 수정 시도 - ID:', id);
      console.log('🎯 수정 시도 - 데이터:', updateData);
      console.log('🎯 원본 음식점 데이터:', restaurant);
      
      const result = await updateRestaurant(id!, updateData);
      
      console.log('🎯 수정 결과:', result);
      
      alert('음식점 정보가 성공적으로 수정되었습니다.');
      navigate(-1); // 이전 페이지로 돌아가기
    } catch (error) {
      console.error('음식점 수정 실패:', error);
      alert(`음식점 수정에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      // 권한 확인 건너뛰기 해제
      setSkipAdminCheck(false);
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <span className="ml-4 text-gray-600">로딩 중...</span>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">음식점을 찾을 수 없습니다</h2>
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">음식점 정보 수정</h1>
          <p className="text-gray-600 mt-1">음식점의 기본 정보를 수정할 수 있습니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 음식점 이름 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                음식점 제목 (표시명) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="음식점 제목을 입력하세요"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="예: 한식, 중식, 일식"
              />
            </div>
          </div>

          {/* 주소 */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="주소를 입력하세요"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 전화번호 */}
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="text"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="전화번호를 입력하세요"
              />
            </div>

            {/* 지역 */}
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                지역
              </label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="예: 서울특별시"
              />
            </div>

            {/* 하위 지역 */}
            <div>
              <label htmlFor="sub_region" className="block text-sm font-medium text-gray-700 mb-2">
                하위 지역
              </label>
              <input
                type="text"
                id="sub_region"
                name="sub_region"
                value={formData.sub_region}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="예: 강남구"
              />
            </div>
          </div>

          {/* 활성화 상태 */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">활성화 상태</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              비활성화하면 사용자에게 표시되지 않습니다.
            </p>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEditRestaurantPage;
