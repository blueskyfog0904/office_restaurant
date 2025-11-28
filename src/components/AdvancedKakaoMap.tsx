import React, { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

// 전역 SDK 로딩 상태 관리
let kakaoSDKLoadPromise: Promise<void> | null = null;

const RESTAURANT_MARKER_SVG = `
<svg width="32" height="48" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 0C7.16344 0 0 7.16344 0 16C0 28 16 42 16 42C16 42 32 28 32 16C32 7.16344 24.8366 0 16 0Z" fill="#FF6B35"/>
  <circle cx="16" cy="16" r="11" fill="white"/>
  <path d="M11.5 10V14C11.5 15.1 12.4 16 13.5 16V22H14.5V16C15.6 16 16.5 15.1 16.5 14V10H15.5V13H14.5V10H13.5V13H12.5V10H11.5ZM19.5 10C18.9 10 18.5 10.4 18.5 11V22H19.5V14C20.1 14 20.5 13.6 20.5 13V10H19.5Z" fill="#FF6B35"/>
</svg>
`;

const getKakaoApiKey = () => {
  const key = process.env.REACT_APP_KAKAO_JAVASCRIPT_KEY || process.env.REACT_APP_KAKAO_MAP_API_KEY;
  if (!key) {
    throw new Error('카카오맵 API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.');
  }
  return key;
};

// 카카오맵 SDK 로딩 함수 (개선된 버전)
const loadKakaoMapScript = (): Promise<void> => {
  // 이미 로딩 중이면 기존 Promise 반환
  if (kakaoSDKLoadPromise) {
    return kakaoSDKLoadPromise;
  }

  kakaoSDKLoadPromise = new Promise((resolve, reject) => {
    // 이미 완전히 로드되었으면 바로 resolve
    if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
      console.log('✅ 카카오맵 SDK 이미 로드됨');
      resolve();
      return;
    }

    let apiKey: string;
    try {
      apiKey = getKakaoApiKey();
    } catch (error) {
      reject(error instanceof Error ? error : new Error('카카오맵 API 키가 없습니다'));
      return;
    }

    // 기존 스크립트 제거 (문제가 있는 경우)
    const existingScripts = document.querySelectorAll('script[src*="dapi.kakao.com"]');
    existingScripts.forEach(script => {
      if (!window.kakao || !window.kakao.maps) {
        console.log('🔄 기존 문제 스크립트 제거');
        script.remove();
      }
    });

    // 스크립트가 존재하고 정상 로드된 경우
    if (window.kakao) {
      if (window.kakao.maps && window.kakao.maps.Map) {
        console.log('✅ 기존 스크립트로 SDK 완전 로드됨');
        resolve();
        return;
      } else if (window.kakao.maps) {
        // kakao.maps.load 호출 필요
        console.log('🔄 기존 스크립트에서 maps 라이브러리 로드');
        window.kakao.maps.load(() => {
          console.log('✅ 기존 스크립트로 maps 라이브러리 로드 완료');
          resolve();
        });
        return;
      }
    }

    console.log('🚀 새 카카오맵 스크립트 로딩 시작...');

    // 새 스크립트 생성 (autoload 옵션 추가로 document.write 문제 해결)
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,clusterer&autoload=false`;
    script.async = true;
    
    const timeout = setTimeout(() => {
      console.error('❌ 카카오맵 스크립트 로딩 타임아웃 (15초)');
      kakaoSDKLoadPromise = null; // 재시도 가능하도록 초기화
      reject(new Error('카카오맵 스크립트 로딩 타임아웃'));
    }, 15000);
    
    script.onload = () => {
      clearTimeout(timeout);
      console.log('📦 카카오맵 스크립트 로드 완료');
      
      // autoload=false이므로 수동으로 라이브러리 로드
      if (window.kakao) {
        console.log('🔄 카카오맵 라이브러리 수동 로드 시작...');
        window.kakao.maps.load(() => {
          console.log('✅ 카카오맵 라이브러리 로드 완료');
          resolve();
        });
      } else {
        console.error('❌ 카카오 객체를 찾을 수 없습니다');
        kakaoSDKLoadPromise = null;
        reject(new Error('카카오 객체를 찾을 수 없습니다'));
      }
    };
    
    script.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ 카카오맵 스크립트 로드 실패:', error);
      console.error('API 키:', apiKey ? `${apiKey.substring(0, 8)}...` : '없음');
      console.error('스크립트 URL:', script.src);
      kakaoSDKLoadPromise = null;
      reject(new Error('카카오맵 API 키가 유효하지 않거나 네트워크 오류가 발생했습니다'));
    };
    
    document.head.appendChild(script);
  });

  return kakaoSDKLoadPromise;
};

export interface MapMarker {
  id: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  subAdd1?: string;
  subAdd2?: string;
  ranking?: number;
  distance?: number;
}

interface ClusterGroup {
  markers: Array<{ marker: MapMarker; position: any; coords: { lat: number; lng: number } }>;
  center: { lat: number; lng: number };
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

interface AdvancedKakaoMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  width?: string | number;
  height?: string | number;
  level?: number;
  className?: string;
  restaurantName?: string;
  subAdd1?: string;
  subAdd2?: string;
  markers?: MapMarker[];
  focusMarkerId?: string;
  fitBounds?: boolean;
  userLocation?: UserLocation | null;
  showUserLocation?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onCardClick?: (marker: MapMarker) => void;
  initialCenter?: { latitude: number; longitude: number };
  initialLevel?: number;
  preserveView?: boolean;
  onMapViewChange?: (view: { latitude: number; longitude: number; level: number }) => void;
  viewStateKey?: string;
  showControls?: boolean;
  onRequestLocation?: () => void;
  regionCenter?: { latitude: number; longitude: number };
}

const AdvancedKakaoMapComponent: React.FC<AdvancedKakaoMapProps> = ({
  latitude,
  longitude,
  address,
  width = '100%',
  height = '400px',
  level = 3,
  className = '',
  restaurantName,
  subAdd1,
  subAdd2,
  markers,
  focusMarkerId,
  fitBounds = true,
  userLocation,
  showUserLocation = true,
  onMarkerClick,
  onCardClick,
  initialCenter,
  initialLevel,
  preserveView = false,
  onMapViewChange,
  viewStateKey = 'kakaoMap:lastView',
  showControls = false,
  onRequestLocation,
  regionCenter,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapInstance = useRef<any>(null);
  const mapMarkersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const geocoderRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locationViewMode, setLocationViewMode] = useState<'user' | 'region'>('user');
  const initialViewRef = useRef<{ lat: number; lng: number; level: number } | null>(null);
  const fullscreenViewRef = useRef<{ lat: number; lng: number; level: number } | null>(null);
  const currentViewRef = useRef<{ lat: number; lng: number; level: number } | null>(null);
  const idleHandlerRef = useRef<(() => void) | null>(null);
  const userInteractedRef = useRef(false);
  const lastMarkerSignatureRef = useRef<string>('');
  const viewStateKeyRef = useRef(viewStateKey);
  const ignoreFocusMarkerRef = useRef(false);
  const currentLevelRef = useRef<number>(level);
  const validPositionsRef = useRef<Array<{ marker: MapMarker; position: any; coords: { lat: number; lng: number } }>>([]);
  const zoomHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    viewStateKeyRef.current = viewStateKey;
  }, [viewStateKey]);

  const saveCurrentView = useCallback((view: { lat: number; lng: number; level: number }) => {
    currentViewRef.current = view;
    const storageKey = viewStateKeyRef.current;
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(view));
    } catch (err) {
      console.warn('카카오맵 뷰 상태 저장 실패', err);
    }
  }, []);

  const loadStoredView = useCallback((): { lat: number; lng: number; level: number } | null => {
    const storageKey = viewStateKeyRef.current;
    if (!storageKey) return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.lat === 'number' &&
        typeof parsed.lng === 'number' &&
        typeof parsed.level === 'number'
      ) {
        return parsed;
      }
    } catch (err) {
      console.warn('카카오맵 뷰 상태 로드 실패', err);
    }
    return null;
  }, []);

  useEffect(() => {
    let apiKey: string;
    try {
      apiKey = getKakaoApiKey();
    } catch (err) {
      const message = err instanceof Error ? err.message : '카카오맵 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.';
      setError(message);
      return;
    }

    console.log('🗺️ KakaoMap 초기화:', {
      container: !!mapContainer.current,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : '❌ 없음',
      latitude,
      longitude,
      address,
      restaurantName
    });

    // 기본 검증
    if (!mapContainer.current) {
      setError('지도 컨테이너 요소가 없습니다');
      return;
    }

    // 이전 에러 상태 초기화
    setError(null);

    const initializeMap = async () => {
      try {
        console.log('🚀 카카오맵 SDK 로딩 시작...');
        await loadKakaoMapScript();
        console.log('✅ 카카오맵 SDK 로딩 완료, 지도 초기화 시작...');

        if (!mapContainer.current) {
          throw new Error('지도 컨테이너가 사라졌습니다');
        }

        // 카카오맵 객체 확인 및 대기
        let retryCount = 0;
        const maxRetries = 10;
        
        while (retryCount < maxRetries) {
          const { kakao } = window;
          if (kakao?.maps?.Map && kakao?.maps?.services) {
            console.log('✅ 카카오맵 객체 확인 완료');
            break;
          }
          
          console.log(`🔄 카카오맵 객체 대기 중... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 200));
          retryCount++;
        }
        
        const { kakao } = window;
        if (!kakao?.maps?.Map) {
          console.error('❌ 카카오맵 객체 상태:', {
            kakao: !!kakao,
            maps: !!kakao?.maps,
            Map: !!kakao?.maps?.Map,
            services: !!kakao?.maps?.services
          });
          throw new Error('카카오맵 객체 초기화 실패 - API 키가 유효하지 않거나 서비스가 제한되었을 수 있습니다');
        }

        // 지도 생성 (초기 중심: 서울시청)
        const defaultCenter = new kakao.maps.LatLng(37.5665, 126.9780);
        const map = new kakao.maps.Map(mapContainer.current, { 
          center: defaultCenter, 
          level: typeof initialLevel === 'number' ? initialLevel : level,
          draggable: true,
          scrollwheel: true
        });

        mapInstance.current = map;
        if (process.env.NODE_ENV !== 'production') {
          (window as any).__OFFICE_RESTAURANT_KAKAO_MAP__ = map;
        }
        
        // 드래그 및 스크롤 휠 명시적으로 활성화
        map.setDraggable(true);
        map.setZoomable(true);
        
        geocoderRef.current = new kakao.maps.services.Geocoder();
        placesRef.current = new kakao.maps.services.Places();
        const storedView = loadStoredView();
        let appliedCenter = defaultCenter;
        let appliedLevel = typeof initialLevel === 'number' ? initialLevel : map.getLevel();

        if (initialCenter && typeof initialCenter.latitude === 'number' && typeof initialCenter.longitude === 'number') {
          appliedCenter = new kakao.maps.LatLng(initialCenter.latitude, initialCenter.longitude);
          map.setCenter(appliedCenter);
          if (typeof initialLevel === 'number') {
            map.setLevel(initialLevel);
            appliedLevel = initialLevel;
          } else {
            appliedLevel = map.getLevel();
          }
        } else if (storedView) {
          appliedCenter = new kakao.maps.LatLng(storedView.lat, storedView.lng);
          map.setCenter(appliedCenter);
          map.setLevel(storedView.level);
          appliedLevel = storedView.level;
        } else if (typeof initialLevel === 'number') {
          map.setLevel(initialLevel);
          appliedLevel = initialLevel;
        }

        initialViewRef.current = {
          lat: appliedCenter.getLat(),
          lng: appliedCenter.getLng(),
          level: appliedLevel,
        };
        saveCurrentView(initialViewRef.current);

        if (onMapViewChange) {
          const handleIdle = () => {
            const center = map.getCenter();
            const levelNow = map.getLevel();
            const view = {
              lat: center.getLat(),
              lng: center.getLng(),
              level: levelNow,
            };
            saveCurrentView(view);
            onMapViewChange({
              latitude: view.lat,
              longitude: view.lng,
              level: view.level,
            });
          };
          idleHandlerRef.current = handleIdle;
          kakao.maps.event.addListener(map, 'idle', handleIdle);
        }
        if (!onMapViewChange) {
          const handleIdle = () => {
            const center = map.getCenter();
            const levelNow = map.getLevel();
            const view = {
              lat: center.getLat(),
              lng: center.getLng(),
              level: levelNow,
            };
            saveCurrentView(view);
          };
          idleHandlerRef.current = handleIdle;
          kakao.maps.event.addListener(map, 'idle', handleIdle);
        }

        kakao.maps.event.addListener(map, 'dragstart', () => {
          userInteractedRef.current = true;
        });

        const handleZoomChanged = () => {
          userInteractedRef.current = true;
          const newLevel = map.getLevel();
          currentLevelRef.current = newLevel;

          if (validPositionsRef.current.length > 0) {
            renderMarkersWithClustering(validPositionsRef.current, map, newLevel);
          }
        };

        zoomHandlerRef.current = handleZoomChanged;
        kakao.maps.event.addListener(map, 'zoom_changed', handleZoomChanged);
        console.log('🗺️ 지도 객체 생성 완료');
        // 지도 컨트롤 추가
        const mapTypeControl = new kakao.maps.MapTypeControl();
        map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

        setMapLoaded(true);
        console.log('✅ 카카오맵 초기화 완료');

      } catch (error) {
        console.error('❌ 카카오맵 초기화 실패:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류');
        setMapLoaded(false);
      }
    };

    initializeMap();

    return () => {
      if (mapInstance.current && window.kakao?.maps?.event) {
        if (idleHandlerRef.current) {
          window.kakao.maps.event.removeListener(mapInstance.current, 'idle', idleHandlerRef.current);
          idleHandlerRef.current = null;
        }
        if (zoomHandlerRef.current) {
          window.kakao.maps.event.removeListener(mapInstance.current, 'zoom_changed', zoomHandlerRef.current);
          zoomHandlerRef.current = null;
        }
      }
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
      mapMarkersRef.current = [];
      validPositionsRef.current = [];
      mapInstance.current = null;
      setMapLoaded(false);
    };
    // 초기 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.kakao) return;
    const { kakao } = window;
    const map = mapInstance.current;

    if (initialCenter && typeof initialCenter.latitude === 'number' && typeof initialCenter.longitude === 'number') {
      const center = new kakao.maps.LatLng(initialCenter.latitude, initialCenter.longitude);
      map.setCenter(center);
      saveCurrentView({
        lat: center.getLat(),
        lng: center.getLng(),
        level: typeof initialLevel === 'number' ? initialLevel : map.getLevel(),
      });
    }

    if (typeof initialLevel === 'number') {
      map.setLevel(initialLevel);
      const center = map.getCenter();
      saveCurrentView({
        lat: center.getLat(),
        lng: center.getLng(),
        level: map.getLevel(),
      });
    }
  }, [initialCenter, initialCenter?.latitude, initialCenter?.longitude, initialLevel, saveCurrentView]);

  const clearMapObjects = () => {
    mapMarkersRef.current.forEach((marker) => marker.setMap(null));
    mapMarkersRef.current = [];
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
  };

  const getDistanceInPixels = (map: any, pos1: any, pos2: any): number => {
    const projection = map.getProjection();
    if (!projection) return Infinity;
    const point1 = projection.pointFromCoords(pos1);
    const point2 = projection.pointFromCoords(pos2);
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const createClusterGroups = (
    positions: Array<{ marker: MapMarker; position: any; coords: { lat: number; lng: number } }>,
    map: any,
    clusterDistance: number
  ): ClusterGroup[] => {
    const groups: ClusterGroup[] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < positions.length; i++) {
      if (assigned.has(i)) continue;

      const group: ClusterGroup = {
        markers: [positions[i]],
        center: { lat: positions[i].coords.lat, lng: positions[i].coords.lng }
      };
      assigned.add(i);

      for (let j = i + 1; j < positions.length; j++) {
        if (assigned.has(j)) continue;

        const dist = getDistanceInPixels(map, positions[i].position, positions[j].position);
        if (dist < clusterDistance) {
          group.markers.push(positions[j]);
          assigned.add(j);
        }
      }

      if (group.markers.length > 1) {
        let sumLat = 0, sumLng = 0;
        group.markers.forEach(m => {
          sumLat += m.coords.lat;
          sumLng += m.coords.lng;
        });
        group.center = {
          lat: sumLat / group.markers.length,
          lng: sumLng / group.markers.length
        };
      }

      groups.push(group);
    }

    return groups;
  };

  const renderMarkersWithClustering = (
    positions: Array<{ marker: MapMarker; position: any; coords: { lat: number; lng: number } }>,
    map: any,
    currentLevel: number
  ) => {
    const { kakao } = window;
    if (!kakao?.maps) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    console.log('🗺️ 클러스터링 적용 - 현재 레벨:', currentLevel, '마커 수:', positions.length);

    if (currentLevel <= 2) {
      console.log('📍 레벨 1-2: 개별 마커 표시');
      positions.forEach(({ marker: item, position }) => {
        const isFocused = !!(focusMarkerId && item.id === focusMarkerId);
        renderSingleMarker(item, position, isFocused, map);
      });
      return;
    }

    const baseDistance = 80;
    const levelMultiplier = Math.pow(1.5, currentLevel - 3);
    const clusterDistance = baseDistance * levelMultiplier;
    console.log('🔍 클러스터링 거리:', clusterDistance, 'px (레벨:', currentLevel, ')');

    const groups = createClusterGroups(positions, map, clusterDistance);
    console.log('📊 클러스터 결과:', groups.length, '개 그룹');

    groups.forEach((group) => {
      if (group.markers.length === 1) {
        const { marker: item, position } = group.markers[0];
        const isFocused = !!(focusMarkerId && item.id === focusMarkerId);
        renderSingleMarker(item, position, isFocused, map);
      } else {
        renderCluster(group, map);
      }
    });
  };

  const renderSingleMarker = (item: MapMarker, position: any, isFocused: boolean, map: any) => {
    const { kakao } = window;

    const markerWrapper = document.createElement('div');
    markerWrapper.className = `restaurant-marker ${isFocused ? 'restaurant-marker--selected' : ''}`;
    markerWrapper.style.width = '32px';
    markerWrapper.style.height = '48px';

    const pin = document.createElement('div');
    pin.className = 'restaurant-marker__pin';
    pin.style.width = '32px';
    pin.style.height = '48px';
    pin.style.background = 'transparent';
    pin.style.boxShadow = 'none';
    pin.style.border = 'none';
    pin.innerHTML = RESTAURANT_MARKER_SVG;

    const svg = pin.querySelector('svg');
    if (svg) {
      svg.style.width = '96px';
      svg.style.height = '126px';
      svg.style.display = 'block';
    }

    markerWrapper.appendChild(pin);

    if (onMarkerClick || onCardClick) {
      markerWrapper.style.cursor = 'pointer';
      markerWrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isFocused && onMarkerClick) {
          onMarkerClick(item);
        } else if (onCardClick) {
          onCardClick(item);
          map.panTo(position);
        } else if (onMarkerClick) {
          onMarkerClick(item);
        }
      });
    }

    const markerOverlay = new kakao.maps.CustomOverlay({
      position,
      yAnchor: 1.0,
      xAnchor: 0.5,
      content: markerWrapper,
      zIndex: isFocused ? 1300 : 1200,
    });
    markerOverlay.setMap(map);
    overlaysRef.current.push(markerOverlay);

    if (item.name) {
      const card = createRestaurantCard(item, isFocused);
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isFocused && onMarkerClick) {
          onMarkerClick(item);
        } else if (onCardClick) {
          onCardClick(item);
          map.panTo(position);
        }
      });

      const cardOverlay = new kakao.maps.CustomOverlay({
        position,
        yAnchor: 1.0,
        xAnchor: 0.5,
        content: card,
        zIndex: isFocused ? 1400 : 1300,
      });
      cardOverlay.setMap(map);
      overlaysRef.current.push(cardOverlay);
    }

    if (isFocused && !ignoreFocusMarkerRef.current) {
      map.panTo(position);
    }
  };

  const renderCluster = (group: ClusterGroup, map: any) => {
    const { kakao } = window;
    const clusterPosition = new kakao.maps.LatLng(group.center.lat, group.center.lng);

    const clusterDiv = document.createElement('div');
    clusterDiv.className = 'cluster-card';
    clusterDiv.textContent = `지역 맛집 ${group.markers.length}개`;
    clusterDiv.style.cursor = 'pointer';

    clusterDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🖱️ 클러스터 클릭 - 레벨 2로 변경');
      map.setLevel(2);
      map.panTo(clusterPosition);
      currentLevelRef.current = 2;
    });

    const clusterOverlay = new kakao.maps.CustomOverlay({
      position: clusterPosition,
      yAnchor: 1.0,
      xAnchor: 0.5,
      content: clusterDiv,
      zIndex: 1500,
    });
    clusterOverlay.setMap(map);
    overlaysRef.current.push(clusterOverlay);
  };

  const ensureGeocoder = () => {
    const { kakao } = window;
    if (!kakao?.maps?.services) return null;
    if (!geocoderRef.current) {
      geocoderRef.current = new kakao.maps.services.Geocoder();
    }
    return geocoderRef.current;
  };

  const ensurePlaces = () => {
    const { kakao } = window;
    if (!kakao?.maps?.services) return null;
    if (!placesRef.current) {
      placesRef.current = new kakao.maps.services.Places();
    }
    return placesRef.current;
  };

  const resolveCoordinates = async (marker: MapMarker): Promise<{ lat: number; lng: number } | null> => {
    const { kakao } = window;
    if (!kakao?.maps?.services) return null;

    if (typeof marker.latitude === 'number' && isFinite(marker.latitude) &&
        typeof marker.longitude === 'number' && isFinite(marker.longitude)) {
      return { lat: marker.latitude, lng: marker.longitude };
    }

    const geocoder = ensureGeocoder();
    const places = ensurePlaces();

    const tryAddress = async (query?: string | null) => {
      if (!query || !geocoder) return null;
      const trimmed = query.trim();
      if (!trimmed) return null;

      return new Promise<{ lat: number; lng: number } | null>((resolve) => {
        geocoder.addressSearch(trimmed, (result: any[], status: any) => {
          if (status === kakao.maps.services.Status.OK && result.length > 0) {
            const lat = parseFloat(result[0].y);
            const lng = parseFloat(result[0].x);
            resolve({ lat, lng });
          } else {
            resolve(null);
          }
        });
      });
    };

    const tryKeyword = async (keyword?: string | null) => {
      if (!keyword || !places) return null;
      const trimmed = keyword.trim();
      if (!trimmed) return null;

      return new Promise<{ lat: number; lng: number } | null>((resolve) => {
        places.keywordSearch(trimmed, (data: any[], status: any) => {
          if (status === kakao.maps.services.Status.OK && data.length > 0) {
            const lat = parseFloat(data[0].y);
            const lng = parseFloat(data[0].x);
            resolve({ lat, lng });
          } else {
            resolve(null);
          }
        });
      });
    };

    const addressFirst = await tryAddress(marker.address);
    if (addressFirst) return addressFirst;

    const combinedKeyword = [marker.subAdd1, marker.subAdd2, marker.name]
      .filter(Boolean)
      .join(' ');

    const keywordResult = await tryKeyword(combinedKeyword);
    if (keywordResult) return keywordResult;

    return await tryKeyword(marker.name);
  };

  const createRestaurantCard = (marker: MapMarker, isSelected: boolean = false): HTMLElement => {
    const card = document.createElement('div');
    card.className = `restaurant-card ${isSelected ? 'restaurant-card--selected' : ''}`;
    card.style.cursor = 'pointer';

    if (isSelected) {
      card.style.backgroundColor = '#FF6B35'; // appetite-stimulating orange
      card.style.color = '#FFFFFF';
      card.style.borderColor = '#FF6B35';
    }

    const header = document.createElement('div');
    header.className = 'restaurant-card__header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'restaurant-card__title-wrap';

    const categoryDot = document.createElement('div');
    categoryDot.className = 'restaurant-card__category-dot';
    if (isSelected) {
      categoryDot.style.backgroundColor = '#FFFFFF'; // white for contrast against orange
    }

    const title = document.createElement('h3');
    title.className = 'restaurant-card__title';
    title.textContent = marker.name || '음식점';
    if (isSelected) {
      title.style.color = '#FFFFFF';
    }

    titleWrap.appendChild(categoryDot);
    titleWrap.appendChild(title);

    const badge = document.createElement('div');
    badge.className = 'restaurant-card__badge';
    if (marker.distance !== undefined) {
      badge.textContent = `${marker.distance.toFixed(1)}km`;
    } else if (marker.ranking) {
      badge.textContent = `★${marker.ranking}위`;
    } else {
      badge.textContent = '';
    }

    header.appendChild(titleWrap);
    header.appendChild(badge);

    card.appendChild(header);

    return card;
  };

  const renderMarkers = async () => {
    const map = mapInstance.current;
    if (!map) return;
    const { kakao } = window;
    if (!kakao?.maps?.LatLngBounds) return;

    clearMapObjects();

    const markerItems = Array.isArray(markers) ? markers : [];
    const signature = markerItems.map((m) => m.id).join('|');
    if (signature !== lastMarkerSignatureRef.current) {
      lastMarkerSignatureRef.current = signature;
      if (!preserveView) {
        userInteractedRef.current = false;
      }
    }
    const bounds = new kakao.maps.LatLngBounds();
    const validPositions: Array<{ marker: MapMarker; position: any; coords: { lat: number; lng: number } }> = [];

    for (const item of markerItems) {
      const coords = await resolveCoordinates(item);
      if (!coords) continue;

      const position = new kakao.maps.LatLng(coords.lat, coords.lng);
      validPositions.push({ marker: item, position, coords });
      bounds.extend(position);
    }

    validPositionsRef.current = validPositions;
    currentLevelRef.current = map.getLevel();

    if (showUserLocation && userLocation) {
      const userPos = new kakao.maps.LatLng(userLocation.latitude, userLocation.longitude);
      bounds.extend(userPos);

      // 내 위치 마커 (빨간색)
      const userMarkerWrapper = document.createElement('div');
      userMarkerWrapper.className = 'user-location-marker';
      userMarkerWrapper.innerHTML = `
        <div class="user-location-marker__pin">
          <span class="user-location-marker__icon">📍</span>
        </div>
      `;
      
      const userMarkerOverlay = new kakao.maps.CustomOverlay({
        position: userPos,
        yAnchor: 1.0,
        xAnchor: 0.5,
        content: userMarkerWrapper,
        zIndex: 2000,
      });
      userMarkerOverlay.setMap(map);
      overlaysRef.current.push(userMarkerOverlay);

      if (userLocation.label) {
        const overlay = new kakao.maps.CustomOverlay({
          position: userPos,
          yAnchor: 1.6,
          content: `<div style="padding:4px 8px;background:#DC2626;color:white;border-radius:8px;font-size:12px;font-weight:600;box-shadow:0 2px 6px rgba(220,38,38,0.3);">${userLocation.label}</div>`
        });
        overlay.setMap(map);
        overlay.setZIndex(2100);
        overlaysRef.current.push(overlay);
      }
    }

    renderMarkersWithClustering(validPositions, map, currentLevelRef.current);

    if (validPositions.length === 0 && userLocation) {
      const userCenter = new kakao.maps.LatLng(userLocation.latitude, userLocation.longitude);
      map.setCenter(userCenter);
      map.setLevel(level);
      saveCurrentView({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        level: map.getLevel(),
      });
      map.relayout();
      setMapLoaded(true);
      return;
    }

    if (validPositions.length === 0) {
      map.setLevel(level);
      const center = map.getCenter();
      saveCurrentView({
        lat: center.getLat(),
        lng: center.getLng(),
        level: map.getLevel(),
      });
      map.relayout();
      setMapLoaded(true);
      return;
    }

    const shouldPreserveView = !!initialViewRef.current;
    const shouldAutoAdjust = !userInteractedRef.current;
    if (shouldPreserveView) {
      const view = initialViewRef.current;
      if (view) {
        map.setLevel(view.level);
        const preserved = new kakao.maps.LatLng(view.lat, view.lng);
        map.setCenter(preserved);
        saveCurrentView({
          lat: preserved.getLat(),
          lng: preserved.getLng(),
          level: map.getLevel(),
        });
      }
      initialViewRef.current = null;
      fullscreenViewRef.current = null;
      userInteractedRef.current = true;
    } else if (shouldAutoAdjust && fitBounds && (validPositions.length > 1 || userLocation)) {
      map.setBounds(bounds, 40, 40, 40, 40);
      const center = map.getCenter();
      saveCurrentView({
        lat: center.getLat(),
        lng: center.getLng(),
        level: map.getLevel(),
      });
    } else if (shouldAutoAdjust && validPositions.length > 0) {
      const first = validPositions[0].position;
      map.setLevel(level);
      map.setCenter(first);
      saveCurrentView({
        lat: first.getLat(),
        lng: first.getLng(),
        level: map.getLevel(),
      });
    } else {
      const center = map.getCenter();
      saveCurrentView({
        lat: center.getLat(),
        lng: center.getLng(),
        level: map.getLevel(),
      });
    }

    map.relayout();
    
    // 지도 업데이트 후에도 드래그 및 줌 활성화 유지
    if (map && map.setDraggable) {
      map.setDraggable(true);
      map.setZoomable(true);
    }
    
    setMapLoaded(true);
  };

  const renderSingleLocation = async () => {
    const map = mapInstance.current;
    if (!map) return;
    const { kakao } = window;
    if (!kakao?.maps?.LatLng) return;

    clearMapObjects();

    const hasValidCoords =
      typeof latitude === 'number' && isFinite(latitude) &&
      typeof longitude === 'number' && isFinite(longitude);

    const placeMarker = (lat: number, lng: number) => {
      const center = new kakao.maps.LatLng(lat, lng);
      map.relayout();

      if (initialViewRef.current) {
        const { lat: savedLat, lng: savedLng, level: savedLevel } = initialViewRef.current;
        const preservedCenter = new kakao.maps.LatLng(savedLat, savedLng);
        map.setLevel(savedLevel);
        map.setCenter(preservedCenter);
        saveCurrentView({
          lat: preservedCenter.getLat(),
          lng: preservedCenter.getLng(),
          level: map.getLevel(),
        });
        initialViewRef.current = null;
        fullscreenViewRef.current = null;
        userInteractedRef.current = true;
      } else {
        map.setLevel(level);
        map.setCenter(center);
        saveCurrentView({
          lat: center.getLat(),
          lng: center.getLng(),
          level: map.getLevel(),
        });
      }

      const markerWrapper = document.createElement('div');
      markerWrapper.className = 'restaurant-marker restaurant-marker--selected';
      // Ensure inline styles match the desired SVG size
      markerWrapper.style.width = '32px';
      markerWrapper.style.height = '48px';

      const pin = document.createElement('div');
      pin.className = 'restaurant-marker__pin';
      // Ensure inline styles match the desired SVG size
      pin.style.width = '32px';
      pin.style.height = '48px';
      pin.style.background = 'transparent';
      pin.style.boxShadow = 'none';
      pin.style.border = 'none';

      // Use SVG directly
      pin.innerHTML = RESTAURANT_MARKER_SVG;
      const svg = pin.querySelector('svg');
      if (svg) {
        svg.style.width = '96px';
        svg.style.height = '126px';
        svg.style.display = 'block';
      }

      markerWrapper.appendChild(pin);

      const markerOverlay = new kakao.maps.CustomOverlay({
        position: center,
        yAnchor: 1.0,
        xAnchor: 0.5,
        content: markerWrapper,
        zIndex: 1200,
      });

      markerOverlay.setMap(map);
      overlaysRef.current.push(markerOverlay);

      if (restaurantName) {
        const marker: MapMarker = {
          id: 'single',
          name: restaurantName,
          address: address,
          subAdd1: subAdd1,
          subAdd2: subAdd2,
        };
        const card = createRestaurantCard(marker, true);
        const cardOverlay = new kakao.maps.CustomOverlay({
          position: center,
          yAnchor: 1.0,
          xAnchor: 0.5,
          content: card,
          zIndex: 1400,
        });
        cardOverlay.setMap(map);
        overlaysRef.current.push(cardOverlay);
      }
    };

    if (hasValidCoords) {
      placeMarker(latitude as number, longitude as number);
      setMapLoaded(true);
      return;
    }

    const fallbackMarker: MapMarker = {
      id: 'single',
      name: restaurantName,
      latitude,
      longitude,
      address,
      subAdd1,
      subAdd2
    };

    const coords = await resolveCoordinates(fallbackMarker);
    if (coords) {
      placeMarker(coords.lat, coords.lng);
    } else {
      console.log('⚠️ 위치를 찾을 수 없어 기본 위치(서울시청) 표시');
      map.setCenter(new kakao.maps.LatLng(37.5665, 126.9780));
      map.setLevel(level);
      map.relayout();
    }

    // 지도 업데이트 후에도 드래그 및 줌 활성화 유지
    if (map && map.setDraggable) {
      map.setDraggable(true);
      map.setZoomable(true);
    }

    setMapLoaded(true);
  };

  useEffect(() => {
    if (!mapInstance.current || !window.kakao || !mapLoaded) return;
    let cancelled = false;

    const updateMap = async () => {
      if (!mapInstance.current) return;

      try {
        if (Array.isArray(markers)) {
          await renderMarkers();
        } else {
          await renderSingleLocation();
        }
      } catch (err) {
        console.error('지도 업데이트 중 오류 발생:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '지도 업데이트 중 오류가 발생했습니다.');
        }
      }
    };

    updateMap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, focusMarkerId, latitude, longitude, address, level, restaurantName, subAdd1, subAdd2, userLocation, fitBounds, showUserLocation, preserveView, mapLoaded]);

  // 컨테이너 크기 변경 시 지도 크기 재조정
  useEffect(() => {
    if (mapInstance.current && mapLoaded) {
      const timer = setTimeout(() => {
        mapInstance.current.relayout();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [width, height, mapLoaded]);

  // 에러 상태 표시
  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  const handleFocusUserLocation = useCallback(() => {
    if (!mapInstance.current || !window.kakao) return;
    
    // '내 위치보기' 버튼 클릭 시 focusMarkerId로 인한 자동 이동 무시
    ignoreFocusMarkerRef.current = true;
    
    if (userLocation) {
      const { kakao } = window;
      const position = new kakao.maps.LatLng(userLocation.latitude, userLocation.longitude);
      mapInstance.current.setLevel(level);
      mapInstance.current.panTo(position);
      userInteractedRef.current = true;
      
      // 일정 시간 후 다시 focusMarkerId 자동 이동 허용
      setTimeout(() => {
        ignoreFocusMarkerRef.current = false;
      }, 1000);
    } else if (onRequestLocation) {
      onRequestLocation();
      setTimeout(() => {
        ignoreFocusMarkerRef.current = false;
      }, 1000);
    }
  }, [level, userLocation, onRequestLocation]);

  const handleToggleLocationView = useCallback(() => {
    if (!mapInstance.current || !window.kakao) return;
    const { kakao } = window;
    
    if (locationViewMode === 'user') {
      // 현재 '내 위치보기' 모드 → 내 위치로 이동 후 '지역위치 보기'로 전환
      ignoreFocusMarkerRef.current = true;
      if (userLocation) {
        const position = new kakao.maps.LatLng(userLocation.latitude, userLocation.longitude);
        mapInstance.current.setLevel(level);
        mapInstance.current.panTo(position);
        userInteractedRef.current = true;
        setLocationViewMode('region');
        setTimeout(() => {
          ignoreFocusMarkerRef.current = false;
        }, 1000);
      } else if (onRequestLocation) {
        onRequestLocation();
        setLocationViewMode('region');
        setTimeout(() => {
          ignoreFocusMarkerRef.current = false;
        }, 1000);
      }
    } else {
      // 현재 '지역위치 보기' 모드 → 지역 1위 음식점 위치로 이동 후 '내 위치보기'로 전환
      ignoreFocusMarkerRef.current = true;
      if (regionCenter && typeof regionCenter.latitude === 'number' && typeof regionCenter.longitude === 'number') {
        const position = new kakao.maps.LatLng(regionCenter.latitude, regionCenter.longitude);
        mapInstance.current.setLevel(level);
        mapInstance.current.panTo(position);
        userInteractedRef.current = true;
        setLocationViewMode('user');
        setTimeout(() => {
          ignoreFocusMarkerRef.current = false;
        }, 1000);
      }
    }
  }, [level, userLocation, regionCenter, locationViewMode, onRequestLocation]);

  const handleToggleFullscreen = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const map = mapInstance.current;
    if (map && window.kakao?.maps?.LatLng) {
      const center = map.getCenter();
      const levelNow = map.getLevel();
      const fallbackView = {
        lat: center.getLat(),
        lng: center.getLng(),
        level: levelNow,
      };
      const view = currentViewRef.current ?? fallbackView;
      initialViewRef.current = view;
      fullscreenViewRef.current = view;
      
      console.log(
        `%c📍 현재 지도 중심 좌표`,
        'font-size: 14px; font-weight: bold; color: #2563eb; background: #eff6ff; padding: 4px 8px; border-radius: 4px;',
        `\n위도: ${view.lat.toFixed(6)}`,
        `\n경도: ${view.lng.toFixed(6)}`,
        `\n줌 레벨: ${view.level}`
      );
    }
    if (!isFullscreen) {
      wrapper.requestFullscreen?.().catch(err => console.error('전체보기 실패:', err));
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(err => console.error('전체보기 종료 실패:', err));
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nowFullscreen = document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(nowFullscreen);

      if (fullscreenViewRef.current && mapInstance.current && window.kakao?.maps?.LatLng) {
        const { kakao } = window;
        const { lat, lng, level } = fullscreenViewRef.current;
        const center = new kakao.maps.LatLng(lat, lng);
        const map = mapInstance.current;
        map.setLevel(level);
        map.setCenter(center);
        map.relayout();
        saveCurrentView({
          lat: center.getLat(),
          lng: center.getLng(),
          level: map.getLevel(),
        });
        initialViewRef.current = { lat, lng, level };
        userInteractedRef.current = true;
        fullscreenViewRef.current = null;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [saveCurrentView]);

  useEffect(() => {
    if (userLocation && !preserveView) {
      userInteractedRef.current = false;
    }
  }, [userLocation, userLocation?.latitude, userLocation?.longitude, preserveView]);

  if (error) {
    return (
      <div
        ref={wrapperRef}
        className={`${className} relative`}
        style={containerStyle}
      >
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-blue-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">지도를 불러올 수 없습니다</h3>
            <p className="text-sm text-gray-600 mb-1">{error}</p>
            <p className="text-xs text-gray-500">아래 버튼을 클릭해서 외부 지도에서 확인하세요</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={() => {
                // address 우선 사용
                const searchQuery = address || '';
                const url = `https://map.kakao.com/link/search/${encodeURIComponent(searchQuery)}`;
                window.open(url, '_blank');
              }}
              className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              카카오맵에서 보기
            </button>
            <button
              onClick={() => {
                // address 우선 사용
                const searchQuery = address || '';
                const url = `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`;
                window.open(url, '_blank');
              }}
              className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              네이버지도에서 보기
            </button>
          </div>
          {address && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">검색어: <span className="font-medium">{address}</span></p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`${className} relative`} style={containerStyle}>
      <div
        ref={mapContainer}
        className={`${!mapLoaded ? 'flex items-center justify-center bg-gray-50' : ''}`}
        style={{ width: '100%', height: '100%' }}
      >
        {!mapLoaded && !error && (
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm">카카오맵 로딩 중...</p>
          </div>
        )}
      </div>

      {mapLoaded && showControls && (
        <div className="absolute top-3 left-3 flex items-center gap-2 z-[1200]">
          <button
            type="button"
            onClick={handleToggleLocationView}
            className="px-3 py-2 rounded-md bg-white text-sm text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50"
          >
            {locationViewMode === 'user' ? '내 위치 보기' : '지역위치 보기'}
          </button>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="px-3 py-2 rounded-md bg-white text-sm text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50"
          >
            {isFullscreen ? '전체보기 종료' : '전체보기'}
          </button>
        </div>
      )}
      
      {mapLoaded && !showControls && (userLocation && showUserLocation) && (
        <div className="absolute top-3 left-3 flex items-center gap-2 z-[1200] nearby-map-controls">
          <button
            type="button"
            onClick={handleFocusUserLocation}
            className="px-3 py-2 rounded-md bg-white text-sm text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50"
          >
            내 위치 보기
          </button>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="px-3 py-2 rounded-md bg-white text-sm text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50"
          >
            {isFullscreen ? '전체보기 종료' : '전체보기'}
          </button>
        </div>
      )}
    </div>
  );
};

const AdvancedKakaoMap = React.memo(AdvancedKakaoMapComponent, (prevProps, nextProps) => {
  // props가 변경되지 않았으면 true 반환 (재렌더링 방지)
  return (
    prevProps.latitude === nextProps.latitude &&
    prevProps.longitude === nextProps.longitude &&
    prevProps.address === nextProps.address &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.level === nextProps.level &&
    prevProps.className === nextProps.className &&
    prevProps.restaurantName === nextProps.restaurantName &&
    prevProps.subAdd1 === nextProps.subAdd1 &&
    prevProps.subAdd2 === nextProps.subAdd2 &&
    prevProps.focusMarkerId === nextProps.focusMarkerId &&
    prevProps.fitBounds === nextProps.fitBounds &&
    prevProps.showUserLocation === nextProps.showUserLocation &&
    prevProps.preserveView === nextProps.preserveView &&
    prevProps.viewStateKey === nextProps.viewStateKey &&
    prevProps.initialLevel === nextProps.initialLevel &&
    prevProps.showControls === nextProps.showControls &&
    prevProps.onRequestLocation === nextProps.onRequestLocation &&
    prevProps.onCardClick === nextProps.onCardClick &&
    JSON.stringify(prevProps.markers) === JSON.stringify(nextProps.markers) &&
    JSON.stringify(prevProps.userLocation) === JSON.stringify(nextProps.userLocation) &&
    JSON.stringify(prevProps.initialCenter) === JSON.stringify(nextProps.initialCenter) &&
    JSON.stringify(prevProps.regionCenter) === JSON.stringify(nextProps.regionCenter)
  );
});

AdvancedKakaoMap.displayName = 'AdvancedKakaoMap';

export default AdvancedKakaoMap;