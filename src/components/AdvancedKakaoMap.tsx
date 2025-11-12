import React, { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

// 전역 SDK 로딩 상태 관리
let kakaoSDKLoadPromise: Promise<void> | null = null;

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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
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
  ranking?: number; // 순위 정보 추가
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
        kakao.maps.event.addListener(map, 'zoom_changed', () => {
          userInteractedRef.current = true;
        });
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
      if (mapInstance.current && idleHandlerRef.current && window.kakao?.maps?.event) {
        window.kakao.maps.event.removeListener(mapInstance.current, 'idle', idleHandlerRef.current);
        idleHandlerRef.current = null;
      }
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
      mapMarkersRef.current = [];
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
    const validPositions: Array<{ marker: MapMarker; position: any }> = [];

    for (const item of markerItems) {
      const coords = await resolveCoordinates(item);
      if (!coords) continue;

      const position = new kakao.maps.LatLng(coords.lat, coords.lng);
      validPositions.push({ marker: item, position });
      bounds.extend(position);
    }

    if (showUserLocation && userLocation) {
      const userPos = new kakao.maps.LatLng(userLocation.latitude, userLocation.longitude);
      bounds.extend(userPos);

      const marker = new kakao.maps.Marker({
        position: userPos,
        zIndex: 1000,
        image: new kakao.maps.MarkerImage(
          'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
          new kakao.maps.Size(24, 35)
        )
      });
      marker.setMap(map);
      mapMarkersRef.current.push(marker);

      if (userLocation.label) {
        const overlay = new kakao.maps.CustomOverlay({
          position: userPos,
          yAnchor: 1.6,
          content: `<div style="padding:4px 8px;background:#2563eb;color:white;border-radius:8px;font-size:12px;">${userLocation.label}</div>`
        });
        overlay.setMap(map);
        overlay.setZIndex(1300);
        overlaysRef.current.push(overlay);
      }
    }

    validPositions.forEach(({ marker: item, position }) => {
      const isFocused = focusMarkerId && item.id === focusMarkerId;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;transform:translateY(-6px);';

      const pin = document.createElement('div');
      pin.style.cssText = `width:${isFocused ? 18 : 14}px;height:${isFocused ? 18 : 14}px;border-radius:9999px;background:#2563eb;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(37,99,235,0.6);`;
      wrapper.appendChild(pin);

      if (item.name) {
        const label = document.createElement('div');
        // 순위 정보 포함
        const displayText = item.ranking 
          ? `${item.name} | ${item.ranking}위`
          : item.name;
        label.textContent = displayText;
        // isFocused일 때 파란색 배경, 하얀 글씨
        const bgColor = isFocused ? '#2563eb' : '#facc15';
        const textColor = isFocused ? '#ffffff' : '#1f2937';
        const borderColor = isFocused ? '#2563eb' : '#facc15';
        label.style.cssText = `padding:6px 10px;background:${bgColor};color:${textColor};border-radius:6px;border:1px solid ${borderColor};box-shadow:0 4px 10px rgba(0,0,0,0.12);font-size:12px;font-weight:600;max-width:200px;text-align:center;white-space:nowrap;`;
        wrapper.appendChild(label);
      }

      if (onMarkerClick) {
        wrapper.style.cursor = 'pointer';
        wrapper.addEventListener('click', () => onMarkerClick(item));
      }

      const overlay = new kakao.maps.CustomOverlay({
        position,
        yAnchor: 1.1,
        content: wrapper,
        zIndex: isFocused ? 1300 : 1200,
      });

      overlay.setMap(map);
      overlaysRef.current.push(overlay);

      // 포커스된 마커로 지도 중심 이동 (사용자가 '내 위치보기' 버튼을 클릭한 경우 무시)
      if (isFocused && !ignoreFocusMarkerRef.current) {
        map.panTo(position);
      }
    });

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

      const marker = new kakao.maps.Marker({ position: center });
      marker.setMap(map);
      mapMarkersRef.current.push(marker);

      if (restaurantName) {
        const overlay = new kakao.maps.CustomOverlay({
          position: center,
          yAnchor: 1.4,
          content: `<div style="padding:6px 10px;background:#facc15;color:#1f2937;border-radius:6px;border:1px solid #facc15;box-shadow:0 4px 10px rgba(0,0,0,0.12);font-size:13px;font-weight:600;max-width:200px;text-align:center;">${restaurantName}</div>`
        });
        overlay.setMap(map);
        overlay.setZIndex(1200);
        overlaysRef.current.push(overlay);
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
    JSON.stringify(prevProps.markers) === JSON.stringify(nextProps.markers) &&
    JSON.stringify(prevProps.userLocation) === JSON.stringify(nextProps.userLocation) &&
    JSON.stringify(prevProps.initialCenter) === JSON.stringify(nextProps.initialCenter) &&
    JSON.stringify(prevProps.regionCenter) === JSON.stringify(nextProps.regionCenter)
  );
});

AdvancedKakaoMap.displayName = 'AdvancedKakaoMap';

export default AdvancedKakaoMap;