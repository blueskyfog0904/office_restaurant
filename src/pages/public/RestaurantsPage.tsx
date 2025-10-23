import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ArrowsUpDownIcon 
} from '@heroicons/react/24/outline';
import RestaurantCard from '../../components/RestaurantCard';
import DateFilter from '../../components/DateFilter';
import { 
  searchRestaurants, 
  getRegions,
  toggleFavorite,
  shareRestaurant 
} from '../../services/authService';
import { 
  RestaurantWithStats, 
  Region, 
  RestaurantSearchRequest 
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// 정렬 옵션
const SORT_OPTIONS = [
  { value: 'visit_count', label: '방문 횟수순' },
  { value: 'rating', label: '별점순' },
  { value: 'amount', label: '금액순' },
  { value: 'name', label: '이름순' }
];

// 카테고리 옵션
const CATEGORY_OPTIONS = [
  { value: '', label: '전체 카테고리' },
  { value: '한식', label: '한식' },
  { value: '중식', label: '중식' },
  { value: '일식', label: '일식' },
  { value: '양식', label: '양식' },
  { value: '분식', label: '분식' },
  { value: '치킨', label: '치킨' },
  { value: '카페', label: '카페/dessert' },
  { value: '기타', label: '기타' }
];

const RestaurantsPage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const scrollPositionKey = 'restaurantsPageScrollPosition';
  
  // 상태 관리
  const [restaurants, setRestaurants] = useState<RestaurantWithStats[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // 필터 상태
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
  );
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
    searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'visit_count');
  
  // UI 상태
  const [showFilters, setShowFilters] = useState(false);

  // 지역별 그룹화된 옵션
  const regionOptions = useMemo(() => {
    console.log('🔄 regionOptions 계산 중... regions.length:', regions.length);
    
    const grouped = regions.reduce((acc, region) => {
      if (!acc[region.sub_add1]) {
        acc[region.sub_add1] = [];
      }
      acc[region.sub_add1].push(region);
      return acc;
    }, {} as Record<string, Region[]>);

    const result = Object.entries(grouped).map(([province, regions]) => ({
      province,
      regions
    }));
    
    console.log('✅ regionOptions 결과:', result.length, '개 시도');
    console.log('시도 목록:', result.map(r => r.province));
    
    return result;
  }, [regions]);

  // 검색 파라미터 구성
  const searchRequest = useMemo((): RestaurantSearchRequest => ({
    keyword: searchKeyword || undefined,
    region_id: selectedRegion || undefined,
    category: selectedCategory || undefined,
    year: selectedYear || undefined,
    month: selectedMonth || undefined,
    page,
    size: 12
  }), [searchKeyword, selectedRegion, selectedCategory, selectedYear, selectedMonth, page]);

  // 지역 데이터 로드
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const response = await getRegions();
        console.log('✅ 지역 데이터 로드 성공:', response.data.length, '개 지역');
        console.log('지역 데이터 샘플:', response.data.slice(0, 3));
        setRegions(response.data);
      } catch (error) {
        console.error('❌ 지역 데이터 로드 실패:', error);
      }
    };

    loadRegions();
  }, []);

  // 스크롤 위치 복원 (뒤로가기 시)
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem(scrollPositionKey);
    
    if (savedScrollPosition) {
      const scrollTimeout = setTimeout(() => {
        const position = parseInt(savedScrollPosition, 10);
        window.scrollTo(0, position);
        console.log('✅ 스크롤 위치 복원:', position);
        sessionStorage.removeItem(scrollPositionKey);
      }, 150);

      return () => clearTimeout(scrollTimeout);
    }
  }, [restaurants, scrollPositionKey]);

  // 스크롤 이벤트 감지하여 지속적으로 위치 저장
  useEffect(() => {
    let scrollTimeout: number | undefined;
    
    const handleScroll = () => {
      // 디바운싱: 스크롤이 멈춘 후 200ms 후에 저장
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        if (restaurants.length > 0) {
          const currentScroll = window.scrollY;
          sessionStorage.setItem(scrollPositionKey, currentScroll.toString());
          console.log('📜 스크롤 위치 저장:', currentScroll);
        }
      }, 200);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [restaurants, scrollPositionKey]);

  // 음식점 데이터 로드
  const loadRestaurants = useCallback(async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      console.log('🔍 음식점 검색 요청:', searchRequest);
      const response = await searchRestaurants(searchRequest);
      console.log('✅ 음식점 검색 성공:', response.data.length, '개');
      
      if (reset) {
        setRestaurants(response.data);
        setPage(1);
      } else {
        setRestaurants(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response.pagination.page < response.pagination.pages);
    } catch (error) {
      console.error('❌ 음식점 데이터 로드 실패:', error);
      alert('음식점 검색에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [searchRequest, loading]);

  // 검색 조건 변경 시 리셋하여 로드
  useEffect(() => {
    setPage(1);
    loadRestaurants(true);
  }, [searchKeyword, selectedRegion, selectedCategory, selectedYear, selectedMonth, sortBy]);

  // URL 파라미터 업데이트
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchKeyword) params.set('keyword', searchKeyword);
    if (selectedRegion) params.set('region_id', selectedRegion);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedYear) params.set('year', selectedYear.toString());
    if (selectedMonth) params.set('month', selectedMonth.toString());
    if (sortBy !== 'visit_count') params.set('sort', sortBy);
    
    setSearchParams(params);
  }, [searchKeyword, selectedRegion, selectedCategory, selectedYear, selectedMonth, sortBy]);

  // 무한 스크롤
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
      ) {
        if (hasMore && !loading) {
          setPage(prev => prev + 1);
          loadRestaurants(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadRestaurants]);

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

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedRegion(undefined);
    setSelectedCategory('');
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setSortBy('visit_count');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">맛집 찾기</h1>
        <p className="text-gray-600">공공기관이 자주 방문하는 검증된 맛집을 찾아보세요</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-8 space-y-4">
        {/* 검색바 */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="음식점 이름이나 주소로 검색하세요..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* 필터 토글 버튼 */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FunnelIcon className="h-5 w-5" />
            필터 {showFilters ? '숨기기' : '보기'}
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowsUpDownIcon className="h-5 w-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-sm text-gray-500">
              {restaurants.length}개 음식점
            </span>
          </div>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 지역 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  지역
                </label>
                <select
                  value={selectedRegion || ''}
                  onChange={(e) => setSelectedRegion(e.target.value || undefined)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">전체 지역</option>
                  {regionOptions.map(({ province, regions }) => (
                    <optgroup key={province} label={province}>
                      {regions.map(region => (
                        <option key={region.id} value={`${region.sub_add1}|${region.sub_add2}`}>
                          {region.sub_add2}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* 카테고리 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  {CATEGORY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 날짜 필터 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기간
                </label>
                <DateFilter
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onYearChange={setSelectedYear}
                  onMonthChange={setSelectedMonth}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                필터 초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 음식점 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            isFavorite={favorites.has(restaurant.id)}
            isLoggedIn={isLoggedIn}
            onFavoriteToggle={handleFavoriteToggle}
            onShare={handleShare}
          />
        ))}
      </div>

      {/* 로딩 표시 */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-2 text-gray-600">로딩 중...</span>
        </div>
      )}

      {/* 더 이상 데이터가 없을 때 */}
      {!hasMore && restaurants.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          모든 음식점을 불러왔습니다.
        </div>
      )}

      {/* 검색 결과가 없을 때 */}
      {!loading && restaurants.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            검색 결과가 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            다른 검색어나 필터 조건을 시도해보세요.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
          >
            전체 음식점 보기
          </button>
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage; 