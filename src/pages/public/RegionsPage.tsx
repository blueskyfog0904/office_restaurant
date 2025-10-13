import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon,
  FunnelIcon 
} from '@heroicons/react/24/outline';
import RestaurantCard from '../../components/RestaurantCard';
import { 
  getRegions, 
  searchRestaurants,
  toggleFavorite,
  shareRestaurant
} from '../../services/authService';
import { 
  Region, 
  RestaurantWithStats 
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const RegionsPage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 상태 관리
  const [regions, setRegions] = useState<Region[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantWithStats[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // 검색 폼 상태
  const [selectedProvince, setSelectedProvince] = useState(
    searchParams.get('province') || ''
  );
  const [selectedDistrict, setSelectedDistrict] = useState(
    searchParams.get('district') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'restaurant' | 'cafe'>('all');

  // 지역별 그룹화된 데이터
  const regionData = useMemo(() => {
    const grouped = regions.reduce((acc, region) => {
      if (!acc[region.region]) {
        acc[region.region] = [];
      }
      acc[region.region].push(region);
      return acc;
    }, {} as Record<string, Region[]>);

    const provinces = Object.keys(grouped);
    const districts = selectedProvince ? grouped[selectedProvince] || [] : [];

    return { provinces, districts, grouped };
  }, [regions, selectedProvince]);

  // 카테고리별 필터링된 음식점 목록
  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === 'all') {
      return restaurants;
    }
    return restaurants.filter(restaurant => {
      // sub_category가 있으면 사용, 없으면 category 사용
      const category = (restaurant as any).sub_category || restaurant.category;
      return category === selectedCategory;
    });
  }, [restaurants, selectedCategory]);

  // 지역 데이터 로드
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const response = await getRegions();
        setRegions(response.data);
      } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
      }
    };

    loadRegions();
  }, []);

  // URL 파라미터에서 초기 검색 실행
  useEffect(() => {
    const province = searchParams.get('province');
    const district = searchParams.get('district');
    
    if (province && district && regions.length > 0) {
      // URL 파라미터로부터 상태 업데이트
      setSelectedProvince(province);
      setSelectedDistrict(district);
      
      // 지역 찾기
      const selectedRegion = regions.find(
        region => region.region === province && region.sub_region === district
      );

      if (selectedRegion) {
        // 검색 실행
        const executeSearch = async () => {
          setLoading(true);
          setSearchPerformed(true);

          try {
            const response = await searchRestaurants({
              region_id: `${province}|${district}`,
              order_by: 'total_count',
              page: 1,
              size: 60,
            });
            
            setRestaurants(response.data);
          } catch (error) {
            console.error('음식점 검색 실패:', error);
            alert('음식점 검색에 실패했습니다. 다시 시도해주세요.');
          } finally {
            setLoading(false);
          }
        };

        executeSearch();
      }
    }
  }, [regions, searchParams]); // regions와 searchParams 모두 감시

  // 시도 변경 시 시군구 초기화 (사용자 직접 변경 시에만)
  useEffect(() => {
    const province = searchParams.get('province');
    const district = searchParams.get('district');
    
    // URL 파라미터가 없거나, 현재 선택된 province가 URL과 다를 때만 district 초기화
    if (selectedProvince && (!province || !district)) {
      setSelectedDistrict('');
    }
  }, [selectedProvince, searchParams]);

  // 검색 실행
  const handleSearch = async () => {
    if (!selectedProvince || !selectedDistrict) {
      alert('시도와 시군구를 모두 선택해주세요.');
      return;
    }

    // 선택된 지역의 ID 찾기
    const selectedRegion = regions.find(
      region => region.region === selectedProvince && region.sub_region === selectedDistrict
    );

    if (!selectedRegion) {
      alert('선택한 지역을 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    setSearchPerformed(true);

    try {
      const response = await searchRestaurants({
        region_id: selectedDistrict,
        order_by: 'total_count',
        page: 1,
        size: 60,
      });
      
      setRestaurants(response.data);
      
      // URL 파라미터 업데이트
      const params = new URLSearchParams();
      params.set('province', selectedProvince);
      params.set('district', selectedDistrict);
      setSearchParams(params);
      
    } catch (error) {
      console.error('음식점 검색 실패:', error);
      alert('음식점 검색에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 초기화
  const handleReset = () => {
    setSelectedProvince('');
    setSelectedDistrict('');
    setSelectedCategory('all');
    setRestaurants([]);
    setSearchPerformed(false);
    setSearchParams(new URLSearchParams());
  };

  // 즐겨찾기 토글
  const handleFavoriteToggle = async (restaurantId: string, isFavorite: boolean) => {
    if (!isLoggedIn) {
      alert('로그인 후 사용하실 수 있습니다.');
      return;
    }

    try {
      await toggleFavorite(restaurantId);
      if (isFavorite) {
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.add(restaurantId);
          return newSet;
        });
      } else {
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(restaurantId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      alert('즐겨찾기 처리에 실패했습니다.');
    }
  };

  // 공유 기능
  const handleShare = async (restaurant: RestaurantWithStats) => {
    try {
      await shareRestaurant(restaurant);
    } catch (error) {
      console.error('공유 실패:', error);
      alert('공유에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">맛집 찾기</h1>
        <p className="text-gray-600">원하는 지역을 선택하여 검증된 맛집을 찾아보세요</p>
      </div>

      {/* 지역 검색 폼 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPinIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">지역 선택</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 시도 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시도
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">시도를 선택하세요</option>
              {regionData.provinces.map(province => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          {/* 시군구 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시군구
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedProvince}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">시군구를 선택하세요</option>
              {regionData.districts.map(district => (
                <option key={district.id} value={district.sub_region}>
                  {district.sub_region}
                </option>
              ))}
            </select>
          </div>

          {/* 검색 버튼 */}
          <div className="flex items-end">
            <div className="flex gap-2 w-full">
              <button
                onClick={handleSearch}
                disabled={!selectedProvince || !selectedDistrict || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                {loading ? '검색 중...' : '검색'}
              </button>
              
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 선택된 지역 표시 */}
        {selectedProvince && selectedDistrict && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
            <MapPinIcon className="h-4 w-4" />
            <span>선택된 지역: <strong>{selectedProvince} {selectedDistrict}</strong></span>
          </div>
        )}
      </div>

      {/* 검색 결과 */}
      {searchPerformed && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              검색 결과
              {filteredRestaurants.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({filteredRestaurants.length}개 음식점)
                </span>
              )}
            </h3>
            
            {restaurants.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FunnelIcon className="h-4 w-4" />
                  <span>{selectedProvince} {selectedDistrict} 지역</span>
                </div>
                
                {/* 카테고리 필터 */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">카테고리:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value="all"
                        checked={selectedCategory === 'all'}
                        onChange={(e) => setSelectedCategory(e.target.value as 'all' | 'restaurant' | 'cafe')}
                        className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">전체</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value="restaurant"
                        checked={selectedCategory === 'restaurant'}
                        onChange={(e) => setSelectedCategory(e.target.value as 'all' | 'restaurant' | 'cafe')}
                        className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">음식점</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value="cafe"
                        checked={selectedCategory === 'cafe'}
                        onChange={(e) => setSelectedCategory(e.target.value as 'all' | 'restaurant' | 'cafe')}
                        className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">카페</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <span className="ml-2 text-gray-600">맛집을 찾고 있습니다...</span>
            </div>
          )}

          {/* 검색 결과 카드 그리드 */}
          {!loading && restaurants.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRestaurants.map((restaurant, index) => (
                <div key={restaurant.id} className="relative">
                  {/* 순위 표시 */}
                  <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                    {index + 1}위
                  </div>
                  <RestaurantCard
                    restaurant={restaurant}
                    isFavorite={favorites.has(restaurant.id.toString())} // Set<string>으로 변경
                    isLoggedIn={isLoggedIn}
                    onFavoriteToggle={handleFavoriteToggle}
                    onShare={handleShare}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 검색 결과 없음 */}
          {!loading && searchPerformed && restaurants.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                검색 결과가 없습니다
              </h3>
              <p className="text-gray-600 mb-4">
                선택하신 <strong>{selectedProvince} {selectedDistrict}</strong> 지역에서 
                등록된 맛집을 찾을 수 없습니다.
              </p>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
              >
                다른 지역 검색하기
              </button>
            </div>
          )}

          {/* 필터링된 결과 없음 */}
          {!loading && searchPerformed && restaurants.length > 0 && filteredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                선택한 카테고리의 결과가 없습니다
              </h3>
              <p className="text-gray-600 mb-4">
                <strong>{selectedProvince} {selectedDistrict}</strong> 지역에서 
                <strong> {selectedCategory === 'restaurant' ? '음식점' : '카페'}</strong> 카테고리의 
                맛집을 찾을 수 없습니다.
              </p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
              >
                전체 카테고리 보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 초기 상태 */}
      {!searchPerformed && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            지역을 선택해주세요
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            상단의 시도와 시군구를 선택한 후 검색 버튼을 눌러주세요. 
            해당 지역의 공공기관이 자주 방문하는 검증된 맛집들을 보여드립니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default RegionsPage; 