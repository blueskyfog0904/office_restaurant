import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

// 전역 SDK 로딩 상태 관리
let kakaoSDKLoadPromise: Promise<void> | null = null;

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

    const apiKey = process.env.REACT_APP_KAKAO_MAP_API_KEY || '4fc6d981a5f25b9e6b2e8a7c4d3e2f1g';
    if (!apiKey) {
      reject(new Error('카카오맵 API 키가 없습니다'));
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

interface KakaoMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  width?: string | number;
  height?: string | number;
  level?: number;
  className?: string;
  restaurantName?: string;
  region?: string;
  subRegion?: string;
}

const KakaoMap: React.FC<KakaoMapProps> = ({
  latitude,
  longitude,
  address,
  width = '100%',
  height = '400px',
  level = 3,
  className = '',
  restaurantName,
  region,
  subRegion
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_KAKAO_MAP_API_KEY || '4fc6d981a5f25b9e6b2e8a7c4d3e2f1g';
    
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

    if (!apiKey || apiKey.length < 10) {
      setError('카카오맵 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.');
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

        const hasValidCoords =
          typeof latitude === 'number' && isFinite(latitude) &&
          typeof longitude === 'number' && isFinite(longitude);

        // 지도 생성 (초기 중심: 서울시청)
        const initialCenter = new kakao.maps.LatLng(37.5665, 126.9780);
        const map = new kakao.maps.Map(mapContainer.current, { 
          center: initialCenter, 
          level,
          draggable: true,
          scrollwheel: true
        });

        mapInstance.current = map;
        console.log('🗺️ 지도 객체 생성 완료');

        // 마커 생성 함수
        const placeMarker = (lat: number, lng: number) => {
          const center = new kakao.maps.LatLng(lat, lng);
          map.relayout();
          map.setLevel(level);
          map.setCenter(center);
          
          const marker = new kakao.maps.Marker({ position: center });
          marker.setMap(map);
          
          if (restaurantName) {
            const infowindow = new kakao.maps.InfoWindow({
              content: `<div style="padding:8px;font-size:12px;text-align:center;min-width:120px;">${restaurantName}</div>`
            });
            infowindow.open(map, marker);
          }
          console.log(`📍 마커 표시 완료: (${lat}, ${lng})`);
        };

        // 간소화된 주소 검색 함수
        const searchAddress = async (searchQuery: string) => {
          const geocoder = new kakao.maps.services.Geocoder();
          
          return new Promise<{lat: number, lng: number} | null>((resolve) => {
            geocoder.addressSearch(searchQuery, (result: any[], status: any) => {
              if (status === kakao.maps.services.Status.OK && result.length > 0) {
                const lat = parseFloat(result[0].y);
                const lng = parseFloat(result[0].x);
                console.log(`✅ 주소 검색 성공: "${searchQuery}" -> (${lat}, ${lng})`);
                resolve({ lat, lng });
              } else {
                console.log(`❌ 주소 검색 실패: "${searchQuery}"`);
                resolve(null);
              }
            });
          });
        };

        // 키워드 검색 함수
        const searchKeyword = async (keyword: string) => {
          const places = new kakao.maps.services.Places();
          
          return new Promise<{lat: number, lng: number} | null>((resolve) => {
            places.keywordSearch(keyword, (data: any[], status: any) => {
              if (status === kakao.maps.services.Status.OK && data.length > 0) {
                const lat = parseFloat(data[0].y);
                const lng = parseFloat(data[0].x);
                console.log(`✅ 키워드 검색 성공: "${keyword}" -> (${lat}, ${lng})`);
                resolve({ lat, lng });
              } else {
                console.log(`❌ 키워드 검색 실패: "${keyword}"`);
                resolve(null);
              }
            });
          });
        };

        // 좌표가 있으면 바로 표시
        if (hasValidCoords) {
          console.log('📍 좌표로 마커 표시:', latitude, longitude);
          placeMarker(latitude as number, longitude as number);
          setMapLoaded(true);
          return;
        }

        // 주소 검색
        if (address && address.trim()) {
          console.log('🔍 주소 검색 시작:', address);
          
          // 1차: 주소 검색
          let result = await searchAddress(address);
          
          // 2차: 키워드 검색 (주소 검색 실패 시)
          if (!result && restaurantName) {
            const keywords: string[] = [
              restaurantName,
              `${restaurantName} ${address}`,
              region && subRegion ? `${restaurantName} ${region} ${subRegion}` : ''
            ].filter(keyword => keyword.trim().length > 0);
            
            for (const keyword of keywords) {
              result = await searchKeyword(keyword);
              if (result) break;
            }
          }
          
          if (result) {
            placeMarker(result.lat, result.lng);
          } else {
            console.log('⚠️ 위치를 찾을 수 없어 기본 위치(서울시청) 표시');
          }
        } else {
          console.log('📍 기본 위치(서울시청) 표시');
        }

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
  }, [latitude, longitude, address, level, restaurantName, region, subRegion]);

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
  if (error) {
    return (
      <div
        className={className}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height
        }}
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
                const searchQuery = address || (region && subRegion && restaurantName 
                  ? `${region} ${subRegion} ${restaurantName}`
                  : restaurantName || '');
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
                const searchQuery = address || restaurantName || '';
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
          {restaurantName && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">검색어: <span className="font-medium">{address || restaurantName}</span></p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className={`${className} ${!mapLoaded ? 'flex items-center justify-center bg-gray-50' : ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    >
      {!mapLoaded && !error && (
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm">카카오맵 로딩 중...</p>
        </div>
      )}
    </div>
  );
};

export default KakaoMap;