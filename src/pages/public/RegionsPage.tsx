import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon,
  FunnelIcon,
  MapIcon,
  XMarkIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  ArrowTopRightOnSquareIcon,
  ShareIcon,
  HeartIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import RestaurantCard from '../../components/RestaurantCard';
import { 
  getRegions, 
  searchRestaurants,
  toggleFavorite,
  shareRestaurant,
  getNearbyRestaurants,
  getRestaurantReviews,
  getRestaurantReviewSummary,
  createReview,
  getRestaurantPhotos,
  RestaurantPhoto
} from '../../services/authService';
import { 
  Region, 
  RestaurantWithStats,
  UserReview,
  RestaurantReviewSummary,
  UserReviewCreateRequest
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { sortProvinces, sortDistricts } from '../../utils/regionOrder';
import AdvancedKakaoMap, { MapMarker } from '../../components/AdvancedKakaoMap';
import KakaoMap from '../../components/KakaoMap';
import ShareModal from '../../components/ShareModal';
import RestaurantPhotoGallery from '../../components/RestaurantPhotoGallery';
import { ShareData } from '../../utils/socialShare';
import { isFavorite, addToFavorites, removeFromFavorites } from '../../utils/favorites';
import { supabase } from '../../services/supabaseClient';

const NEARBY_RADIUS_KM = 100;
const MAP_VIEW_STATE_KEY = 'regionsNearbyMapView';

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 음식점을 MapMarker로 변환하는 헬퍼 함수
const createMapMarker = (restaurant: RestaurantWithStats, ranking?: number): MapMarker => ({
  id: restaurant.id,
  name: restaurant.title || restaurant.name,
  latitude: toNumber(restaurant.latitude) ?? undefined,
  longitude: toNumber(restaurant.longitude) ?? undefined,
  address: restaurant.address,
  subAdd1: restaurant.sub_add1,
  subAdd2: restaurant.sub_add2,
  ranking,
});

const RegionsPage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate();
  const location = useLocation();
  const scrollPositionKey = 'regionsPageScrollPosition';
  const displayedCountKey = 'regionsPageDisplayedCount';
  const searchParamsKey = 'regionsPageSearchParams';
  const previousLocationKeyRef = useRef<string | null>(null);
  
  // 상태 관리
  const [mapViewState, setMapViewState] = useState<{ latitude: number; longitude: number; level: number } | null>(null);
  const mapViewStateRef = useRef<{ latitude: number; longitude: number; level: number } | null>(null);
  const scrollPositionRef = useRef<number>(0); // 스크롤 위치를 지속적으로 추적
  const [regions, setRegions] = useState<Region[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantWithStats[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearbyPool, setNearbyPool] = useState<RestaurantWithStats[]>([]);
  const [nearbyPoolLoading, setNearbyPoolLoading] = useState(false);
  const [regionMapOpen, setRegionMapOpen] = useState(false);
  const [regionMapKey, setRegionMapKey] = useState<number>(Date.now());
  const [focusedRegionMarkerId, setFocusedRegionMarkerId] = useState<string | null>(null);
  const [selectedNearbyRadius, setSelectedNearbyRadius] = useState<number>(1);
  const [centerOnUserLocation, setCenterOnUserLocation] = useState(false);
  const [hoveredRestaurantId, setHoveredRestaurantId] = useState<string | null>(null);
  const [selectedRestaurantForModal, setSelectedRestaurantForModal] = useState<RestaurantWithStats | null>(null);
  const [lastClickedRestaurantId, setLastClickedRestaurantId] = useState<string | null>(null);
  
  // 모달 관련 state
  const [modalReviews, setModalReviews] = useState<UserReview[]>([]);
  const [modalReviewSummary, setModalReviewSummary] = useState<RestaurantReviewSummary | null>(null);
  const [modalReviewsLoading, setModalReviewsLoading] = useState(false);
  const [modalPhotos, setModalPhotos] = useState<RestaurantPhoto[]>([]);
  const [modalPhotosLoading, setModalPhotosLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isFavoriteRestaurant, setIsFavoriteRestaurant] = useState(false);
  const [shouldLoadModalMap, setShouldLoadModalMap] = useState(false);
  
  // 모바일 무한 스크롤 관련 상태
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // 초기값을 sessionStorage에서 안전하게 가져오기
  const getInitialDisplayedCount = () => {
    // 1. 브라우저 환경 체크
    if (typeof window === 'undefined' || window.innerWidth >= 768) {
      return 5;
    }
    
    // 2. sessionStorage 체크
    try {
      const savedCount = sessionStorage.getItem(displayedCountKey);
      const savedSearchParams = sessionStorage.getItem(searchParamsKey);
      
      if (!savedCount || !savedSearchParams) {
        return 5;
      }
      
      // 3. URL 파라미터 체크 (window.location.search에서 직접 읽기)
      const urlParams = new URLSearchParams(window.location.search);
      const province = urlParams.get('province');
      const district = urlParams.get('district');
      
      if (!province || !district) {
        return 5;  // URL 파라미터가 없으면 초기값 5
      }
      
      const currentSearchKey = `${province}|${district}|all`;
      
      // 4. 검색 키 일치 확인
      if (savedSearchParams === currentSearchKey) {
        const count = parseInt(savedCount, 10);
        if (count > 0 && count <= 1000) {  // 합리적인 범위 체크
          console.log('🎯 초기값에서 복원:', count);
          return count;
        }
      }
    } catch (error) {
      console.warn('초기값 복원 실패:', error);
    }
    
    return 5;  // 모든 경우에 실패하면 기본값
  };
  const [displayedCount, setDisplayedCount] = useState(getInitialDisplayedCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const lastCardRef = useRef<HTMLDivElement | null>(null);
  const restoredDisplayedCountRef = useRef(false);
  const isRestoringRef = useRef(false);
  
  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    const stored = sessionStorage.getItem(MAP_VIEW_STATE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          typeof parsed.latitude === 'number' &&
          typeof parsed.longitude === 'number' &&
          typeof parsed.level === 'number'
        ) {
          setMapViewState(parsed);
          mapViewStateRef.current = parsed;
        }
      } catch (err) {
        console.warn('저장된 지도 상태 복원 실패:', err);
      }
    }
  }, []);

  useEffect(() => {
    mapViewStateRef.current = mapViewState;
  }, [mapViewState]);

  // 스크롤 위치를 지속적으로 추적
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };

    // 초기 스크롤 위치 저장
    scrollPositionRef.current = window.scrollY;
    console.log('📜 초기 스크롤 위치:', scrollPositionRef.current);

    // 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
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
      if (!acc[region.sub_add1]) {
        acc[region.sub_add1] = [];
      }
      acc[region.sub_add1].push(region);
      return acc;
    }, {} as Record<string, Region[]>);

    // 시도는 지정된 순서대로 정렬
    const provinces = sortProvinces(Object.keys(grouped));
    
    // 시군구는 가나다순으로 정렬
    const districts = selectedProvince 
      ? sortDistricts(grouped[selectedProvince] || [])
      : [];

    return { provinces, districts, grouped };
  }, [regions, selectedProvince]);

  // 카테고리별 필터링된 음식점 목록
  const filteredRestaurants = useMemo(() => {
    console.log('🔍 카테고리 필터링:', selectedCategory, '총 음식점:', restaurants.length);
    
    if (selectedCategory === 'all') {
      return restaurants;
    }
    
    const filtered = restaurants.filter(restaurant => {
      // category2 필드를 사용 (DB 컬럼명)
      const category2 = (restaurant as any).category2;
      console.log('음식점:', restaurant.title, 'category2:', category2);
      return category2 === selectedCategory;
    });
    
    console.log('✅ 필터링 결과:', filtered.length, '개');
    return filtered;
  }, [restaurants, selectedCategory]);

  // 모바일에서 표시할 음식점 목록 (5개씩 제한)
  const displayedRestaurants = useMemo(() => {
    if (isMobile) {
      return filteredRestaurants.slice(0, displayedCount);
    }
    return filteredRestaurants;
  }, [filteredRestaurants, displayedCount, isMobile]);

  // displayedCount 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (isMobile && searchPerformed && selectedProvince && selectedDistrict) {
      const searchKey = `${selectedProvince}|${selectedDistrict}|${selectedCategory}`;
      sessionStorage.setItem(displayedCountKey, displayedCount.toString());
      sessionStorage.setItem(searchParamsKey, searchKey);
      console.log('💾 displayedCount 저장:', displayedCount, '검색 키:', searchKey);
    }
  }, [displayedCount, isMobile, searchPerformed, selectedProvince, selectedDistrict, selectedCategory]);

  // 뒤로가기 감지: location.key가 변경되면 뒤로가기일 수 있음
  useEffect(() => {
    const isBackNavigation = previousLocationKeyRef.current !== null && 
                            previousLocationKeyRef.current !== location.key &&
                            location.pathname.includes('/restaurants');
    
    if (isBackNavigation && isMobile) {
      const savedCount = sessionStorage.getItem(displayedCountKey);
      const savedSearchParams = sessionStorage.getItem(searchParamsKey);
      const currentSearchKey = searchParams.get('province') && searchParams.get('district')
        ? `${searchParams.get('province')}|${searchParams.get('district')}|all`
        : null;
      
      if (savedCount && savedSearchParams === currentSearchKey) {
        restoredDisplayedCountRef.current = false;
        console.log('🔄 뒤로가기 감지 (location.key 변경), 복원 준비:', savedCount);
      }
    }
    
    previousLocationKeyRef.current = location.key;
  }, [location.key, location.pathname, isMobile, searchParams]);

  // 컴포넌트 마운트 시 또는 검색 결과 로드 후 displayedCount 복원
  // 이 로직은 카테고리 변경 리셋 로직보다 먼저 실행되어야 함
  // 우선순위를 높이기 위해 의존성 배열에 loading 상태를 추가하여 검색 완료 직후 실행되도록 함
  useEffect(() => {
    if (!isMobile || !searchPerformed || restaurants.length === 0 || filteredRestaurants.length === 0 || loading) {
      return;
    }
    
    // 이미 복원했으면 다시 복원하지 않음
    if (restoredDisplayedCountRef.current) {
      return;
    }
    
    // 복원 중 플래그 설정
    isRestoringRef.current = true;
    
    const savedCount = sessionStorage.getItem(displayedCountKey);
    const savedSearchParams = sessionStorage.getItem(searchParamsKey);
    const currentSearchKey = `${selectedProvince}|${selectedDistrict}|${selectedCategory}`;
    
    console.log('🔍 복원 시도:', {
      savedCount,
      savedSearchParams,
      currentSearchKey,
      restaurantsLength: restaurants.length,
      filteredLength: filteredRestaurants.length,
      displayedCount: displayedCount
    });
    
    // 동일한 검색 조건일 때만 복원
    if (savedCount && savedSearchParams === currentSearchKey) {
      const count = parseInt(savedCount, 10);
      if (count > 0 && count <= filteredRestaurants.length) {
        // 현재 값이 이미 복원된 값과 다르면 업데이트 (초기값과의 충돌 방지)
        // displayedCount는 ref로 현재 값을 확인하여 불필요한 업데이트 방지
        const currentDisplayedCount = displayedCount;
        if (count !== currentDisplayedCount) {
          setDisplayedCount(count);
          restoredDisplayedCountRef.current = true;
          isRestoringRef.current = false;
          console.log('✅ displayedCount 복원 성공:', count, '검색 키:', currentSearchKey, '(이전 값:', currentDisplayedCount, ')');
        } else {
          // 이미 올바른 값이면 플래그만 설정
          restoredDisplayedCountRef.current = true;
          isRestoringRef.current = false;
          console.log('✅ displayedCount 이미 복원됨:', count);
        }
      } else {
        // 저장된 값이 유효하지 않으면 최대값으로 조정
        const validCount = Math.min(count, filteredRestaurants.length);
        const currentDisplayedCount = displayedCount;
        if (validCount > 0 && validCount !== currentDisplayedCount) {
          setDisplayedCount(validCount);
          restoredDisplayedCountRef.current = true;
          isRestoringRef.current = false;
          console.log('✅ displayedCount 조정 복원:', validCount);
        } else {
          isRestoringRef.current = false;
        }
      }
    } else {
      // 복원할 데이터가 없으면 초기값 유지
      isRestoringRef.current = false;
      console.log('ℹ️ displayedCount 복원할 데이터 없음, 검색 키:', currentSearchKey, '저장된 키:', savedSearchParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, searchPerformed, restaurants.length, filteredRestaurants.length, selectedProvince, selectedDistrict, selectedCategory, loading]);

  // 데스크톱으로 변경되면 모든 카드 표시
  useEffect(() => {
    if (!isMobile && filteredRestaurants.length > 0) {
      setDisplayedCount(filteredRestaurants.length);
    }
  }, [isMobile, filteredRestaurants.length]);

  // 카테고리 변경 시 displayedCount 리셋 (복원이 필요한 경우는 제외)
  useEffect(() => {
    if (!isMobile || !searchPerformed) {
      return;
    }
    
    // 복원 중이거나 이미 복원이 완료되었으면 리셋하지 않음
    if (isRestoringRef.current || restoredDisplayedCountRef.current) {
      console.log('⏸️ 카테고리 변경 리셋 스킵 (복원 중/완료)');
      return;
    }
    
    const savedCount = sessionStorage.getItem(displayedCountKey);
    const savedSearchParams = sessionStorage.getItem(searchParamsKey);
    const currentSearchKey = `${selectedProvince}|${selectedDistrict}|${selectedCategory}`;
    
    // 저장된 검색 파라미터와 현재 검색 키가 일치하면 복원이 필요한 경우이므로 리셋하지 않음
    if (savedCount && savedSearchParams === currentSearchKey) {
      console.log('⏸️ 카테고리 변경 리셋 스킵 (복원 필요)');
      return;
    }
    
    // 실제 카테고리 변경인 경우에만 리셋
    setDisplayedCount(5);
    restoredDisplayedCountRef.current = false;
    // 카테고리 변경은 검색 파라미터도 업데이트
    sessionStorage.setItem(searchParamsKey, currentSearchKey);
    console.log('🔄 카테고리 변경으로 displayedCount 리셋');
  }, [selectedCategory, isMobile, searchPerformed, selectedProvince, selectedDistrict]);

  // Intersection Observer로 마지막 카드 감지하여 다음 5개 로드
  useEffect(() => {
    if (!isMobile || isLoadingMore || displayedCount >= filteredRestaurants.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          // 다음 5개 로드
          setTimeout(() => {
            setDisplayedCount(prev => Math.min(prev + 5, filteredRestaurants.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    const currentLastCard = lastCardRef.current;
    if (currentLastCard) {
      observer.observe(currentLastCard);
    }

    return () => {
      if (currentLastCard) {
        observer.unobserve(currentLastCard);
      }
    };
  }, [isMobile, isLoadingMore, displayedCount, filteredRestaurants.length]);

  const regionRestaurants = useMemo(() => {
    if (!selectedProvince || !selectedDistrict) {
      return [] as RestaurantWithStats[];
    }
    const filtered = restaurants.filter((restaurant) =>
      restaurant.sub_add1 === selectedProvince && restaurant.sub_add2 === selectedDistrict
    );
    // region_rank 기준으로 오름차순 정렬
    return filtered.sort((a, b) => {
      const rankA = a.region_rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.region_rank ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
  }, [restaurants, selectedProvince, selectedDistrict]);

  const regionMarkers = useMemo<MapMarker[]>(() => {
    return regionRestaurants.map((restaurant) => 
      createMapMarker(restaurant, restaurant.region_rank)
    );
  }, [regionRestaurants]);

  const nearbyRestaurantData = useMemo(() => {
    if (!userLocation) return [] as Array<{ restaurant: RestaurantWithStats; distance: number }>;

    return nearbyPool
      .map((restaurant) => {
        const lat = toNumber(restaurant.latitude);
        const lng = toNumber(restaurant.longitude);

        if (lat === null || lng === null) {
          return null;
        }

        const distance = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          lat,
          lng
        );

        return {
          restaurant: {
            ...restaurant,
            latitude: lat,
            longitude: lng,
          } as RestaurantWithStats,
          distance,
        };
      })
      .filter((item): item is { restaurant: RestaurantWithStats; distance: number } => !!item)
      .sort((a, b) => a.distance - b.distance)
      .filter((item) => item.distance <= selectedNearbyRadius);
  }, [userLocation, nearbyPool, selectedNearbyRadius]);

  const nearbyMarkers = useMemo<MapMarker[]>(() => {
    if (!userLocation) return [];
    return nearbyRestaurantData.map(({ restaurant, distance }, index) => {
      const marker = createMapMarker(restaurant, index + 1);
      return {
        ...marker,
        distance,
      };
    });
  }, [nearbyRestaurantData, userLocation]);

  const memoizedUserLocation = useMemo(() => {
    if (!userLocation) return null;
    return { ...userLocation, label: '내 위치' };
  }, [userLocation]);

  const memoizedInitialCenter = useMemo(() => {
    if (centerOnUserLocation && userLocation) {
      return { latitude: userLocation.latitude, longitude: userLocation.longitude };
    }
    if (mapViewState) {
      return { latitude: mapViewState.latitude, longitude: mapViewState.longitude };
    }
    return undefined;
  }, [centerOnUserLocation, userLocation, mapViewState]);

  const memoizedInitialLevel = useMemo(() => {
    return centerOnUserLocation ? 5 : mapViewState?.level;
  }, [centerOnUserLocation, mapViewState]);

  const memoizedFitBounds = useMemo(() => {
    return !centerOnUserLocation && !mapViewState;
  }, [centerOnUserLocation, mapViewState]);

  const memoizedPreserveView = useMemo(() => {
    return !!mapViewState && !centerOnUserLocation;
  }, [mapViewState, centerOnUserLocation]);

  // 지역 지도 모달의 초기 중심 좌표 (1위 음식점 기준)
  const regionMapInitialCenter = useMemo(() => {
    if (regionRestaurants.length === 0) {
      console.log('🗺️ 지역 지도 중심: 음식점 없음');
      return undefined;
    }
    
    // region_rank 기준으로 정렬하여 1위 음식점 찾기
    const sortedRestaurants = [...regionRestaurants].sort((a, b) => {
      const rankA = a.region_rank ?? 999999;
      const rankB = b.region_rank ?? 999999;
      return rankA - rankB;
    });
    
    const topRestaurant = sortedRestaurants[0];
    const lat = toNumber(topRestaurant.latitude);
    const lng = toNumber(topRestaurant.longitude);
    
    console.log('🗺️ 지역 지도 중심 설정:', {
      restaurant: topRestaurant.name,
      rank: topRestaurant.region_rank,
      latitude: lat,
      longitude: lng
    });
    
    if (lat === null || lng === null) {
      console.warn('⚠️ 1위 음식점 좌표 없음:', topRestaurant.name);
      return undefined;
    }
    
    return { latitude: lat, longitude: lng };
  }, [regionRestaurants]);

  // 지역 지도 모달 - 마커 클릭 핸들러
  const handleRegionMarkerClick = useCallback((marker: MapMarker) => {
    const restaurant = regionRestaurants.find(r => r.id === marker.id);
    if (restaurant) {
      setSelectedRestaurantForModal(restaurant);
    }
  }, [regionRestaurants]);

  // 지역 데이터 로드
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const response = await getRegions();
        console.log('✅ 지역 데이터 로드 성공:', response.data.length, '개 지역');
        setRegions(response.data);
      } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
      }
    };

    loadRegions();
  }, []);

  // 스크롤 위치 복원 (뒤로가기 시)
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem(scrollPositionKey);
    
    if (savedScrollPosition && restaurants.length > 0) {
      // 데이터가 로드되고 DOM이 완전히 렌더링된 후에 스크롤 복원
      const scrollTimeout = setTimeout(() => {
        const position = parseInt(savedScrollPosition, 10);
        console.log('🔄 스크롤 복원 시도:', position);
        
        // requestAnimationFrame을 사용하여 브라우저 렌더링 후 스크롤
        requestAnimationFrame(() => {
          window.scrollTo(0, position);
          console.log('✅ 스크롤 위치 복원 완료:', window.scrollY);
          sessionStorage.removeItem(scrollPositionKey);
        });
      }, 300);

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

  // URL 파라미터에서 초기 검색 실행 (한 번만)
  useEffect(() => {
    const province = searchParams.get('province');
    const district = searchParams.get('district');
    
    // URL 파라미터가 있고, regions가 로드되었고, 아직 검색을 수행하지 않은 경우에만 실행
    if (province && district && regions.length > 0 && !searchPerformed) {
      // URL 파라미터로부터 상태 업데이트
      setSelectedProvince(province);
      setSelectedDistrict(district);
      
      // 뒤로가기 감지: 저장된 검색 파라미터와 비교
      const isMobileDevice = window.innerWidth < 768;
      const savedCount = sessionStorage.getItem(displayedCountKey);
      const savedSearchParams = sessionStorage.getItem(searchParamsKey);
      const currentSearchKey = `${province}|${district}|all`;
      const isBackNavigation = isMobileDevice && savedCount && savedSearchParams === currentSearchKey;
      
      if (isBackNavigation) {
        // 뒤로가기인 경우 복원 플래그를 false로 설정하여 복원 로직이 실행되도록 함
        restoredDisplayedCountRef.current = false;
        console.log('🔄 URL 파라미터 뒤로가기 감지, 복원 준비:', savedCount);
      }
      
      // 지역 찾기
      const selectedRegion = regions.find(
        region => region.sub_add1 === province && region.sub_add2 === district
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
              size: 1000,
            });
            
            setRestaurants(response.data);
            
            // 새 검색인 경우에만 초기화 (뒤로가기는 복원 로직에서 처리)
            // 초기화를 먼저 실행하여 다른 로직의 간섭 방지
            if (isMobileDevice && !isBackNavigation) {
              setDisplayedCount(5);
              restoredDisplayedCountRef.current = false;
              isRestoringRef.current = false;
              sessionStorage.removeItem(displayedCountKey);
              sessionStorage.removeItem(searchParamsKey);
              console.log('🔄 URL 파라미터 새 검색으로 displayedCount 초기화 (명시적)');
            }
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
  }, [regions, searchParams, searchPerformed]); // searchPerformed 추가하여 중복 실행 방지

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
      region => region.sub_add1 === selectedProvince && region.sub_add2 === selectedDistrict
    );

    if (!selectedRegion) {
      alert('선택한 지역을 찾을 수 없습니다.');
      return;
    }

    // ref에 저장된 스크롤 위치 사용
    const savedScrollY = scrollPositionRef.current;
    console.log('📜 검색 전 저장된 스크롤 위치:', savedScrollY);

    setLoading(true);
    setSearchPerformed(true);

    try {
      const startTime = performance.now();
      const response = await searchRestaurants({
        region_id: `${selectedProvince}|${selectedDistrict}`,
        order_by: 'total_count',
        page: 1,
        size: 1000,
      });
      const endTime = performance.now();
      console.log(`⏱️ 검색 완료 시간: ${(endTime - startTime).toFixed(2)}ms`);
      
      setRestaurants(response.data);
      // 새 검색이므로 displayedCount 초기화 및 sessionStorage 삭제
      // 초기화를 먼저 실행하여 다른 로직의 간섭 방지
      if (isMobile) {
        setDisplayedCount(5);
        restoredDisplayedCountRef.current = false;
        isRestoringRef.current = false;
        sessionStorage.removeItem(displayedCountKey);
        sessionStorage.removeItem(searchParamsKey);
        console.log('🔄 새 검색으로 displayedCount 초기화 (명시적)');
      }
      
      // URL 파라미터 업데이트
      const params = new URLSearchParams();
      params.set('province', selectedProvince);
      params.set('district', selectedDistrict);
      setSearchParams(params);

      // 스크롤 위치 복원
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
        console.log('📜 스크롤 위치 복원 완료:', savedScrollY);
      });
      
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
    // 초기화 시 displayedCount 리셋 및 sessionStorage 삭제
    // 초기화를 먼저 실행하여 다른 로직의 간섭 방지
    if (isMobile) {
      setDisplayedCount(5);
      restoredDisplayedCountRef.current = false;
      isRestoringRef.current = false;
      sessionStorage.removeItem(displayedCountKey);
      sessionStorage.removeItem(searchParamsKey);
      console.log('🔄 검색 초기화로 displayedCount 리셋 (명시적)');
    }
  };

  const loadNearbyPool = async (center: { latitude: number; longitude: number }, radius: number = NEARBY_RADIUS_KM) => {
    setNearbyPoolLoading(true);
    try {
      const nearbyRestaurants = await getNearbyRestaurants(center.latitude, center.longitude, radius);
      setNearbyPool(nearbyRestaurants);
    } catch (error) {
      console.error('내 주변 맛집 데이터 로드 실패:', error);
      setGeoError('내 주변 맛집 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setNearbyPoolLoading(false);
    }
  };

  const handleLocateMe = () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isLocalhost && !isLoggedIn) {
      alert('로그인 후 사용하실 수 있는 서비스입니다.');
      navigate('/login');
      return;
    }

    setGeoError(null);
    
    if (isLocalhost) {
      console.log('🏠 localhost 환경 감지 - 테스트용 좌표 사용');
      setGeoStatus('loading');
      setTimeout(() => {
        sessionStorage.removeItem(MAP_VIEW_STATE_KEY);
        setMapViewState(null);
        mapViewStateRef.current = null;
        setUserLocation({
          latitude: 35.40063854,
          longitude: 127.37603443,
        });
        setCenterOnUserLocation(true);
        setGeoStatus('success');
        console.log('✅ 테스트용 위치 설정 완료:', { latitude: 35.40063854, longitude: 127.37603443 });
      }, 100);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('브라우저에서 위치 정보를 지원하지 않습니다.');
      return;
    }

    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sessionStorage.removeItem(MAP_VIEW_STATE_KEY);
        setMapViewState(null);
        mapViewStateRef.current = null;
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setCenterOnUserLocation(true);
        setGeoStatus('success');
      },
      (err) => {
        console.error('위치 정보를 가져오지 못했습니다:', err);
        setGeoStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('위치 정보 접근이 차단되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('현재 위치 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
        } else if (err.code === err.TIMEOUT) {
          setGeoError('위치 정보를 가져오는 데 시간이 초과되었습니다. 다시 시도해주세요.');
        } else {
          setGeoError('위치 정보를 가져오는 중 오류가 발생했습니다.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleResetLocation = () => {
    setUserLocation(null);
    setGeoStatus('idle');
    setGeoError(null);
    sessionStorage.removeItem(MAP_VIEW_STATE_KEY);
    setMapViewState(null);
    mapViewStateRef.current = null;
  };

  useEffect(() => {
    if (!userLocation) return;
    loadNearbyPool(userLocation, selectedNearbyRadius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, selectedNearbyRadius]);


  const handleMapViewChange = useCallback((view: { latitude: number; longitude: number; level: number }) => {
    setMapViewState(view);
    mapViewStateRef.current = view;
    sessionStorage.setItem(MAP_VIEW_STATE_KEY, JSON.stringify(view));
    setCenterOnUserLocation(false);
  }, []);

  const handleMarkerNavigate = useCallback((marker: MapMarker) => {
    if (!marker) return;
    const matched = nearbyRestaurantData.find(({ restaurant }) => restaurant.id === marker.id);
    if (matched) {
      setSelectedRestaurantForModal(matched.restaurant);
    }
  }, [nearbyRestaurantData]);

  const handleOpenRegionMap = () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isLocalhost && !isLoggedIn) {
      alert('로그인 후 사용하실 수 있는 서비스입니다.');
      navigate('/login');
      return;
    }

    if (regionRestaurants.length === 0) {
      alert('선택된 지역에 등록된 맛집이 없습니다.');
      return;
    }
    
    // 지역 지도용 새로운 키 생성 (매번 완전히 새로운 지도 인스턴스 생성)
    setRegionMapKey(Date.now());
    setFocusedRegionMarkerId(regionRestaurants[0]?.id ?? null);
    setRegionMapOpen(true);
    
    console.log('🗺️ 지역 지도 모달 열기 - 새 지도 인스턴스 생성');
  };

  // 모달 관련 함수들
  const loadModalReviews = async (restaurantId: string) => {
    try {
      setModalReviewsLoading(true);
      const reviewsData = await getRestaurantReviews(restaurantId, 1, 10);
      setModalReviews(reviewsData.data);
    } catch (error) {
      console.error('리뷰 로드 실패:', error);
    } finally {
      setModalReviewsLoading(false);
    }
  };

  const loadModalPhotos = async (restaurantId: string) => {
    try {
      setModalPhotosLoading(true);
      const photosData = await getRestaurantPhotos(restaurantId);
      setModalPhotos(photosData);
    } catch (error) {
      console.error('사진 로드 실패:', error);
      setModalPhotos([]);
    } finally {
      setModalPhotosLoading(false);
    }
  };

  const checkUserReviewFromDB = useCallback(async (restaurantId: string | number) => {
    if (!isLoggedIn || !user) return false;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('사용자 리뷰 확인 실패:', error);
        return false;
      }
      return !!data;
    } catch (error) {
      console.error('사용자 리뷰 확인 중 오류:', error);
      return false;
    }
  }, [isLoggedIn, user]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantForModal || !isLoggedIn) return;

    try {
      setSubmitting(true);
      const reviewData: UserReviewCreateRequest = {
        restaurant_id: selectedRestaurantForModal.id,
        rating: reviewRating,
        content: reviewContent.trim() || undefined
      };

      await createReview(reviewData);
      setHasUserReviewed(true);
      setReviewContent('');
      setReviewRating(5);

      await Promise.all([
        loadModalReviews(String(selectedRestaurantForModal.id)),
        getRestaurantReviewSummary(String(selectedRestaurantForModal.id))
          .then(setModalReviewSummary)
          .catch(() => {})
      ]);

      alert('리뷰가 성공적으로 작성되었습니다!');
    } catch (error) {
      console.error('리뷰 작성 실패:', error);
      if (error instanceof Error && error.message.includes('이미 이 음식점에 리뷰를 작성하셨습니다')) {
        alert('이미 이 음식점에 리뷰를 작성하셨습니다.');
        setHasUserReviewed(true);
        await loadModalReviews(String(selectedRestaurantForModal.id));
      } else {
        alert('리뷰 작성에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIconSolid
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getNaverSearchUrl = (restaurant: RestaurantWithStats) => {
    const query = `${restaurant.sub_add1} ${restaurant.sub_add2} ${restaurant.title || '음식점'}`;
    return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
  };

  const getShareData = (restaurant: RestaurantWithStats): ShareData => {
    const koreanUrl = `${window.location.origin}/restaurants/${restaurant.sub_add1}/${restaurant.sub_add2}/${restaurant.title || restaurant.name}`;
    return {
      title: `${restaurant.name} - ${restaurant.sub_add1} ${restaurant.sub_add2}`,
      description: `${restaurant.category || '음식점'} | ${restaurant.address}`,
      url: koreanUrl,
      image: 'https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=맛집',
      restaurantId: restaurant.id,
      restaurantName: restaurant.name
    };
  };

  const openKakaoMap = (restaurant: RestaurantWithStats) => {
    const searchQuery = restaurant.address || `${restaurant.sub_add1} ${restaurant.sub_add2} ${restaurant.title || restaurant.name}`;
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank');
  };

  const openNaverMap = (restaurant: RestaurantWithStats) => {
    const searchQuery = restaurant.address || `${restaurant.sub_add1} ${restaurant.sub_add2} ${restaurant.title || restaurant.name}`;
    const url = `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank');
  };

  const copyAddress = async (address: string) => {
    if (!address) {
      alert('복사할 주소가 없습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(address);
      alert('주소가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('주소 복사 실패:', error);
      alert('주소 복사에 실패했습니다.');
    }
  };

  const toggleModalFavorite = () => {
    if (!selectedRestaurantForModal) return;
    if (!isLoggedIn) {
      alert('로그인 후 사용하실 수 있습니다.');
      return;
    }
    if (isFavoriteRestaurant) {
      removeFromFavorites(selectedRestaurantForModal.id);
      setIsFavoriteRestaurant(false);
    } else {
      addToFavorites({
        id: selectedRestaurantForModal.id,
        name: selectedRestaurantForModal.title || '음식점',
        address: selectedRestaurantForModal.address || '',
        category: selectedRestaurantForModal.category,
        sub_add1: selectedRestaurantForModal.sub_add1 || '',
        sub_add2: selectedRestaurantForModal.sub_add2 || ''
      });
      setIsFavoriteRestaurant(true);
    }
  };

  useEffect(() => {
    if (!regionMapOpen) {
      setFocusedRegionMarkerId(null);
    }
  }, [regionMapOpen]);

  // 모달이 열릴 때 리뷰 및 관련 데이터 로드
  useEffect(() => {
    if (selectedRestaurantForModal) {
      setIsFavoriteRestaurant(isFavorite(selectedRestaurantForModal.id));
      setReviewRating(5);
      setReviewContent('');
      setShouldLoadModalMap(false);
      
      Promise.allSettled([
        getRestaurantReviewSummary(String(selectedRestaurantForModal.id))
          .then(setModalReviewSummary)
          .catch(() => {}),
        loadModalReviews(String(selectedRestaurantForModal.id)),
        loadModalPhotos(String(selectedRestaurantForModal.id)),
        isLoggedIn && user
          ? checkUserReviewFromDB(selectedRestaurantForModal.id)
              .then(setHasUserReviewed)
              .catch(() => {})
          : Promise.resolve()
      ]);

      setTimeout(() => setShouldLoadModalMap(true), 100);
    } else {
      setModalReviews([]);
      setModalReviewSummary(null);
      setModalPhotos([]);
      setHasUserReviewed(false);
      setShouldLoadModalMap(false);
    }
  }, [selectedRestaurantForModal, isLoggedIn, user, checkUserReviewFromDB]);

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

      {/* 내 주변 맛집 지도 */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MapPinIcon className="h-6 w-6 text-primary-500" />
                내 주변 맛집 지도
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                현재 위치 기준으로 반경 {selectedNearbyRadius}km 이내의 등록된 맛집을 확인해보세요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLocateMe}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
                disabled={geoStatus === 'loading'}
              >
                {geoStatus === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                    위치 확인 중...
                  </span>
                ) : (
                  <>
                    <MapPinIcon className="h-5 w-5" />
                    내 위치 불러오기
                  </>
                )}
              </button>
              {userLocation && (
                <button
                  onClick={handleResetLocation}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
                >
                  위치 초기화
                </button>
              )}
            </div>
          </div>

          {geoError && (
            <div className="mt-4 p-3 rounded-md bg-red-50 text-sm text-red-600 border border-red-100">
              {geoError}
            </div>
          )}

          {userLocation && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 반경
              </label>
              <div className="flex gap-4">
                {[1, 5, 10].map((radius) => (
                  <label
                    key={radius}
                    className="flex items-center cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="nearbyRadius"
                      value={radius}
                      checked={selectedNearbyRadius === radius}
                      onChange={(e) => setSelectedNearbyRadius(Number(e.target.value))}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 focus:ring-2"
                    />
                    <span className="ml-2 text-gray-700">{radius}km</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {userLocation ? (
            <div className="mt-4">
              {nearbyPoolLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <span className="animate-spin h-4 w-4 border-b-2 border-primary-500 rounded-full" />
                  내 주변 맛집 데이터를 불러오는 중입니다...
                </div>
              )}

              <div className="h-80">
                <AdvancedKakaoMap
                  height="100%"
                  markers={nearbyMarkers}
                  userLocation={memoizedUserLocation}
                  showUserLocation
                  fitBounds={memoizedFitBounds}
                  initialCenter={memoizedInitialCenter}
                  initialLevel={memoizedInitialLevel}
                  preserveView={memoizedPreserveView}
                  onMapViewChange={handleMapViewChange}
                  onMarkerClick={handleMarkerNavigate}
                  onCardClick={(marker) => {
                    setHoveredRestaurantId(marker.id);
                  }}
                  viewStateKey="nearby-map-view"
                  focusMarkerId={hoveredRestaurantId || undefined}
                />
              </div>

              <div className="mt-4">
                {nearbyRestaurantData.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      반경 {selectedNearbyRadius}km 이내에 {nearbyRestaurantData.length}개 맛집이 있습니다.
                    </p>
                    <style>
                      {`
                        .nearby-restaurant-scroll::-webkit-scrollbar {
                          width: 8px;
                        }
                        .nearby-restaurant-scroll::-webkit-scrollbar-track {
                          background: #f1f5f9;
                          border-radius: 4px;
                        }
                        .nearby-restaurant-scroll::-webkit-scrollbar-thumb {
                          background: #cbd5e1;
                          border-radius: 4px;
                        }
                        .nearby-restaurant-scroll::-webkit-scrollbar-thumb:hover {
                          background: #94a3b8;
                        }
                      `}
                    </style>
                    <div className="px-4 sm:px-0 w-full min-w-0">
                      <div 
                        className="max-h-[216px] overflow-y-auto overflow-x-hidden pr-2 nearby-restaurant-scroll w-full min-w-0"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#cbd5e1 #f1f5f9'
                        }}
                      >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 justify-items-start w-full min-w-0">
                          {nearbyRestaurantData.map(({ restaurant, distance }) => {
                            const handleNearbyRestaurantCardClick = () => {
                              // 모든 모드에서 동일하게 동작: 첫 번째 클릭은 지도 이동, 두 번째 클릭은 모달 열기
                              if (lastClickedRestaurantId === restaurant.id) {
                                // 같은 음식점을 두 번째 클릭하면 모달 열기
                                setSelectedRestaurantForModal(restaurant);
                                setLastClickedRestaurantId(null);
                              } else {
                                // 첫 번째 클릭이면 지도로 이동
                                setHoveredRestaurantId(restaurant.id);
                                setLastClickedRestaurantId(restaurant.id);
                              }
                            };
                            
                            return (
                              <button
                                key={restaurant.id}
                                onClick={handleNearbyRestaurantCardClick}
                                className="border border-gray-200 rounded-lg p-3 hover:border-primary-400 hover:shadow-sm transition-all text-left w-full min-w-0 max-w-full"
                              >
                                <p className="font-medium text-gray-900 truncate">
                                  {restaurant.title || restaurant.name}
                                  {restaurant.category && (
                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                      {restaurant.category}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {distance.toFixed(1)}km · {restaurant.address || '주소 정보 없음'}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    반경 {selectedNearbyRadius}km 이내에 등록된 맛집을 찾지 못했습니다. 범위를 넓혀보거나 다른 지역을 검색해보세요.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
              <p>위치 정보를 불러오면 내 주변 맛집을 지도에서 확인할 수 있습니다. 위치 공유를 허용하고 "내 위치 불러오기" 버튼을 눌러주세요.</p>
              {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                <p>(<span className="text-primary-500 font-bold">로그인 후</span> 사용하실 수 있는 서비스입니다.)</p>
              )}
              
            </div>
          )}
        </div>
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
                <option key={district.id} value={district.sub_add2}>
                  {district.sub_add2}
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
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm bg-gray-50 px-3 py-3 rounded-md">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPinIcon className="h-4 w-4" />
                <span>선택된 지역: <strong>{selectedProvince} {selectedDistrict}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleOpenRegionMap}
                disabled={regionRestaurants.length === 0}
                className={`inline-flex items-center gap-2 self-start md:self-auto px-3 py-2 text-sm rounded-md transition-colors ${
                  regionRestaurants.length === 0
                    ? 'border border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'border border-primary-500 text-primary-600 hover:bg-primary-50'
                }`}
              >
                <MapIcon className="h-5 w-5" />
                지도에서 보기
              </button>
            </div>
            {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <p className="text-xs text-gray-600 text-right">
                (<span className="text-primary-500 font-bold">로그인 후</span> 사용하실 수 있는 서비스입니다.)
              </p>
            )}
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedRestaurants.map((restaurant, index) => {
                  const isLastCard = isMobile && index === displayedRestaurants.length - 1;
                  return (
                    <div
                      key={restaurant.id}
                      ref={isLastCard ? lastCardRef : null}
                    >
                      <RestaurantCard
                        restaurant={restaurant}
                        isFavorite={favorites.has(restaurant.id.toString())}
                        isLoggedIn={isLoggedIn}
                        onFavoriteToggle={handleFavoriteToggle}
                        onShare={handleShare}
                      />
                    </div>
                  );
                })}
              </div>
              
              {/* 모바일 무한 스크롤 로딩 인디케이터 */}
              {isMobile && isLoadingMore && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  <span className="ml-2 text-gray-600">더 많은 맛집을 불러오는 중...</span>
                </div>
              )}
              
              {/* 모바일에서 모든 카드를 로드한 경우 안내 */}
              {isMobile && displayedCount >= filteredRestaurants.length && filteredRestaurants.length > 0 && (
                <div className="text-center py-6 text-sm text-gray-500">
                  모든 맛집을 불러왔습니다 ({filteredRestaurants.length}개)
                </div>
              )}
            </>
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

      {regionMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" role="dialog" aria-modal="true">
          <div data-region-map-modal className="bg-white rounded-xl shadow-2xl max-w-screen-2xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MapIcon className="h-4 sm:h-5 w-4 sm:w-5 text-primary-500" />
                  지역 지도에서 보기
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  {selectedProvince} {selectedDistrict} · {regionRestaurants.length}개 맛집
                   (우측 음식점 카드 1번 클릭시 지도로 이동, 2번 클릭시 음식점 정보 열기)
                </p>
              </div>
              <button
                onClick={() => setRegionMapOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="지도 닫기"
              >
                <XMarkIcon className="h-5 sm:h-6 w-5 sm:w-6 text-gray-500" />
              </button>
            </div>
            <div className="flex flex-col md:flex-row md:divide-x divide-gray-200 flex-1 overflow-hidden">
              <div className="flex-1 min-h-[400px] md:min-h-0">
                <AdvancedKakaoMap
                  key={`region-map-modal-${regionMapKey}`}
                  height="100%"
                  markers={regionMarkers}
                  fitBounds={false}
                  initialCenter={regionMapInitialCenter}
                  initialLevel={6}
                  focusMarkerId={focusedRegionMarkerId ?? undefined}
                  onMarkerClick={handleRegionMarkerClick}
                  onCardClick={(marker) => {
                    setFocusedRegionMarkerId(marker.id);
                  }}
                  viewStateKey={undefined}
                  showControls={true}
                  userLocation={memoizedUserLocation}
                  showUserLocation={true}
                  onRequestLocation={handleLocateMe}
                  regionCenter={regionMapInitialCenter}
                />
              </div>
              <div className="md:w-80 max-h-96 md:max-h-full overflow-y-auto bg-gray-50">
                {regionRestaurants.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">
                    선택된 지역의 음식점 데이터가 없습니다.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {regionRestaurants.map((restaurant) => {
                      const isFocused = focusedRegionMarkerId === restaurant.id;
                      const handleRestaurantCardClick = () => {
                        // 모든 모드에서 동일하게 동작: 첫 번째 클릭은 지도 이동, 두 번째 클릭은 모달 열기
                        if (lastClickedRestaurantId === restaurant.id) {
                          // 같은 음식점을 두 번째 클릭하면 모달 열기
                          setSelectedRestaurantForModal(restaurant);
                          setLastClickedRestaurantId(null);
                        } else {
                          // 첫 번째 클릭이면 지도로 이동
                          setFocusedRegionMarkerId(restaurant.id);
                          setLastClickedRestaurantId(restaurant.id);
                        }
                      };
                      
                      return (
                        <li key={restaurant.id}>
                          <button
                            onClick={handleRestaurantCardClick}
                            className={`block w-full text-left px-5 py-4 transition-colors ${
                              isFocused ? 'bg-primary-50 border-l-4 border-primary-500' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {restaurant.title || restaurant.name}
                              </p>
                              {restaurant.region_rank && (
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                  {restaurant.region_rank}위
                                </span>
                              )}
                              {restaurant.category && (
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {restaurant.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {restaurant.address || '주소 정보 없음'}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 음식점 상세 모달 */}
      {selectedRestaurantForModal && (
        <>
          <style>
            {`
              .nearby-map-controls {
                display: none !important;
              }
            `}
          </style>
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => {
              setSelectedRestaurantForModal(null);
              setLastClickedRestaurantId(null);
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedRestaurantForModal.title || selectedRestaurantForModal.name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedRestaurantForModal(null);
                    setLastClickedRestaurantId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="닫기"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* 모달 내용 */}
              <div className="p-6">
                {/* 음식점 기본 정보 */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      {/* 평점 및 리뷰 수 */}
                      <div className="flex items-center mb-4">
                        {renderStars(Math.round(Number(modalReviewSummary?.average_rating || 0)), 'lg')}
                        <span className="ml-2 text-lg font-medium text-gray-900">
                          {modalReviewSummary?.average_rating ? Number(modalReviewSummary.average_rating).toFixed(1) : '0.0'}
                        </span>
                        <span className="ml-2 text-gray-600">
                          ({modalReviewSummary?.total_reviews || 0}개 리뷰)
                        </span>
                      </div>

                      {/* 카테고리 */}
                      <div className="mb-4">
                        <span className="text-sm font-medium text-gray-500">카테고리</span>
                        <p className="text-lg text-gray-900">
                          {selectedRestaurantForModal.category || '정보 없음'}
                        </p>
                      </div>

                      {/* 주소 */}
                      <div className="flex items-start mb-2">
                        <MapPinIcon className="h-5 w-5 text-gray-500 mt-1 mr-2 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-500">주소</span>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900">{selectedRestaurantForModal.address}</p>
                            {selectedRestaurantForModal.address && (
                              <button
                                onClick={() => copyAddress(selectedRestaurantForModal.address || '')}
                                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="주소 복사"
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                                <span>복사</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 도로명주소 */}
                      {selectedRestaurantForModal.road_address && (
                        <div className="flex items-start mb-4">
                          <MapPinIcon className="h-5 w-5 text-gray-500 mt-1 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-500">도로명주소</span>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-900">{selectedRestaurantForModal.road_address}</p>
                              <button
                                onClick={() => copyAddress(selectedRestaurantForModal.road_address || '')}
                                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="도로명주소 복사"
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                                <span>복사</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 연락처 */}
                      {selectedRestaurantForModal.phone && (
                        <div className="flex items-center mb-4">
                          <PhoneIcon className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <span className="text-sm font-medium text-gray-500">연락처</span>
                            <p className="text-gray-900">{selectedRestaurantForModal.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="mt-6 lg:mt-0 lg:ml-6 flex flex-col space-y-3">
                      <button
                        onClick={toggleModalFavorite}
                        className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                          isFavoriteRestaurant 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isFavoriteRestaurant ? (
                          <HeartIconSolid className="h-5 w-5 mr-2" />
                        ) : (
                          <HeartIcon className="h-5 w-5 mr-2" />
                        )}
                        {isFavoriteRestaurant ? '즐겨찾기 해제' : '즐겨찾기'}
                      </button>
                      
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        <ShareIcon className="h-5 w-5 mr-2" />
                        공유하기
                      </button>
                      
                      <a
                        href={getNaverSearchUrl(selectedRestaurantForModal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                      >
                        <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-2" />
                        네이버 블로그 리뷰
                      </a>
                    </div>
                  </div>
                </div>

                {/* 사진 갤러리 */}
                {modalPhotos.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">사진</h2>
                    <RestaurantPhotoGallery 
                      photos={modalPhotos} 
                      restaurantName={selectedRestaurantForModal.title || selectedRestaurantForModal.name}
                    />
                  </div>
                )}

                {/* 카카오 지도 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">위치</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openKakaoMap(selectedRestaurantForModal)}
                        className="flex items-center px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm transition-colors"
                      >
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        카카오맵으로 보기
                      </button>
                      <button
                        onClick={() => openNaverMap(selectedRestaurantForModal)}
                        className="flex items-center px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
                      >
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        네이버지도로 보기
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-96 rounded-lg overflow-hidden border">
                    {shouldLoadModalMap && selectedRestaurantForModal ? (
                      <KakaoMap
                        latitude={selectedRestaurantForModal.latitude ? Number(selectedRestaurantForModal.latitude) : undefined}
                        longitude={selectedRestaurantForModal.longitude ? Number(selectedRestaurantForModal.longitude) : undefined}
                        address={selectedRestaurantForModal.address || ''}
                        width="100%"
                        height={384}
                        level={3}
                        restaurantName={selectedRestaurantForModal.title || selectedRestaurantForModal.name}
                        subAdd1={selectedRestaurantForModal.sub_add1}
                        subAdd2={selectedRestaurantForModal.sub_add2}
                      />
                    ) : (
                      <div className="w-full h-96 flex items-center justify-center bg-gray-100">
                        <div className="text-gray-500">지도를 불러오는 중...</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 사용자 리뷰 목록 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    사용자 리뷰 ({modalReviewSummary?.total_reviews || 0})
                  </h2>

                  {modalReviewsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      <span className="ml-2 text-gray-600">리뷰를 불러오는 중...</span>
                    </div>
                  ) : modalReviews.length > 0 ? (
                    <div className="space-y-6">
                      {modalReviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    {review.user?.username?.charAt(0) || '?'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {review.user?.username || '익명'}
                                </p>
                                <div className="flex items-center mt-1">
                                  {renderStars(review.rating, 'sm')}
                                  <span className="ml-2 text-sm text-gray-600">
                                    {review.rating}점
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="mt-3">
                            {review.content ? (
                              <p className="text-gray-900 leading-relaxed">
                                {review.content}
                              </p>
                            ) : (
                              <p className="text-gray-500 italic">
                                리뷰 내용이 없습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ChatBubbleLeftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        아직 리뷰가 없습니다
                      </h3>
                      <p className="text-gray-600">
                        이 음식점의 첫 번째 리뷰를 작성해보세요!
                      </p>
                    </div>
                  )}
                </div>

                {/* 로그인 안내 */}
                {!isLoggedIn && (
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center">
                      <ChatBubbleLeftIcon className="h-6 w-6 text-blue-500 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-blue-900">
                          리뷰를 작성하려면 로그인이 필요합니다
                        </h3>
                        <p className="text-blue-700 mt-1">
                          로그인 후 이 음식점에 대한 리뷰를 남겨보세요!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 사용자가 이미 리뷰를 작성한 경우 안내 */}
                {isLoggedIn && hasUserReviewed && (
                  <div className="bg-green-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center">
                      <ChatBubbleLeftIcon className="h-6 w-6 text-green-500 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-green-900">
                          이미 리뷰를 작성한 음식점입니다
                        </h3>
                        <p className="text-green-700 mt-1">
                          이 음식점에 대한 리뷰를 이미 작성하셨습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 리뷰 작성 폼 */}
                {isLoggedIn && !hasUserReviewed && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">리뷰 작성</h2>
                    <form onSubmit={handleSubmitReview}>
                      {/* 평점 선택 */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          평점
                        </label>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-1"
                            >
                              <StarIconSolid
                                className={`h-8 w-8 ${
                                  star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'
                                } hover:text-yellow-400 transition-colors`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-sm text-gray-600">
                            {reviewRating}점
                          </span>
                        </div>
                      </div>

                      {/* 리뷰 내용 */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          리뷰 내용 (선택사항)
                        </label>
                        <textarea
                          value={reviewContent}
                          onChange={(e) => setReviewContent(e.target.value)}
                          rows={4}
                          maxLength={500}
                          placeholder="음식점에 대한 솔직한 리뷰를 작성해주세요..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          {reviewContent.length}/500자
                        </p>
                      </div>

                      {/* 버튼들 */}
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? '작성 중...' : '리뷰 작성'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewContent('');
                            setReviewRating(5);
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 소셜 공유 모달 */}
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            shareData={getShareData(selectedRestaurantForModal)}
          />
        </>
      )}
    </div>
  );
};

export default RegionsPage; 