import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RestaurantWithStats } from '../types';

declare global {
  interface Window {
    kakao: any;
  }
}

// 거리 옵션 (단위: km)
const DISTANCE_OPTIONS = [
  { value: 1, label: '1km' },
  { value: 5, label: '5km' },
  { value: 10, label: '10km' }
];

interface NearbyRestaurantsMapProps {
  restaurants: RestaurantWithStats[];
  onLocationError?: (error: string) => void;
}

const NearbyRestaurantsMap: React.FC<NearbyRestaurantsMapProps> = ({ 
  restaurants,
  onLocationError 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(5); // 기본값 5km
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // 두 좌표 사이의 거리 계산 (단위: km)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // 지구 반경 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // 사용자 위치 가져오기
  const getUserLocation = useCallback(() => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      const error = '브라우저가 위치 정보를 지원하지 않습니다.';
      onLocationError?.(error);
      alert(error);
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLoadingLocation(false);
        console.log('✅ 사용자 위치 획득:', { lat: latitude, lng: longitude });
      },
      (error) => {
        let errorMessage = '위치 정보를 가져올 수 없습니다.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
            break;
        }
        
        onLocationError?.(errorMessage);
        alert(errorMessage);
        setIsLoadingLocation(false);
        console.error('❌ 위치 정보 오류:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onLocationError]);

  // 테스트용 위치 사용 (서울 시청 좌표)
  const useTestLocation = useCallback(() => {
    const testLocation = {
      lat: 37.5665, // 서울 시청 위도
      lng: 126.9780 // 서울 시청 경도
    };
    setUserLocation(testLocation);
    console.log('✅ 테스트 위치 설정 (서울 시청):', testLocation);
  }, []);

  // 카카오맵 초기화
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    // 카카오맵 SDK가 로드될 때까지 대기
    const initMap = () => {
      if (window.kakao && window.kakao.maps) {
        console.log('🗺️ 주변 맛집 지도 초기화 시작');
        
        const kakao = window.kakao;
        const container = mapRef.current;
        const options = {
          center: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
          level: 5 // 지도 확대 레벨
        };

        const newMap = new kakao.maps.Map(container, options);
        setMap(newMap);

        // 사용자 위치 마커 추가
        const markerPosition = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
        const marker = new kakao.maps.Marker({
          position: markerPosition,
          map: newMap
        });

        // 사용자 위치 정보창
        const infowindow = new kakao.maps.InfoWindow({
          content: '<div style="padding:5px;font-size:12px;">내 위치</div>'
        });
        infowindow.open(newMap, marker);

        console.log('✅ 주변 맛집 지도 초기화 완료');
      } else {
        console.log('⏳ 카카오맵 SDK 로딩 대기중...');
        setTimeout(initMap, 100);
      }
    };

    initMap();
  }, [userLocation]);

  // 선택한 거리 내의 음식점 필터링 및 마커 표시
  useEffect(() => {
    if (!map || !userLocation) return;

    console.log('🔍 거리 필터링 시작:', {
      selectedDistance,
      totalRestaurants: restaurants.length,
      userLocation
    });

    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));

    const kakao = window.kakao;
    const newMarkers: any[] = [];
    let filteredCount = 0;

    // 음식점 필터링 및 마커 추가
    restaurants.forEach((restaurant) => {
      // latitude와 longitude가 있는 경우만 처리
      if (!restaurant.latitude || !restaurant.longitude) {
        return;
      }

      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        Number(restaurant.latitude),
        Number(restaurant.longitude)
      );

      // 선택한 거리 내에 있는 음식점만 표시
      if (distance <= selectedDistance) {
        filteredCount++;
        
        const markerPosition = new kakao.maps.LatLng(
          Number(restaurant.latitude),
          Number(restaurant.longitude)
        );

        const marker = new kakao.maps.Marker({
          position: markerPosition,
          map: map
        });

        // 음식점 정보창
        const content = `
          <div style="padding:10px;min-width:200px;">
            <div style="font-weight:bold;margin-bottom:5px;">${restaurant.name || restaurant.title}</div>
            <div style="font-size:12px;color:#666;margin-bottom:3px;">
              📍 ${distance.toFixed(2)}km
            </div>
            <div style="font-size:12px;color:#666;">
              ${restaurant.address || '주소 정보 없음'}
            </div>
          </div>
        `;

        const infowindow = new kakao.maps.InfoWindow({
          content: content
        });

        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', () => {
          infowindow.open(map, marker);
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    console.log(`✅ 필터링 완료: ${selectedDistance}km 내 ${filteredCount}개 음식점 표시`);
  }, [map, userLocation, selectedDistance, restaurants, calculateDistance, markers]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">내 주변 맛집 지도</h2>
        
        {/* 위치 불러오기 버튼 */}
        {!userLocation && (
          <div className="mb-4 text-center">
            <div className="flex gap-3 justify-center mb-2">
              <button
                onClick={getUserLocation}
                disabled={isLoadingLocation}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
              >
                {isLoadingLocation ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    위치 정보 가져오는 중...
                  </>
                ) : (
                  <>
                    📍 내 위치 불러오기
                  </>
                )}
              </button>
              <button
                onClick={useTestLocation}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium inline-flex items-center gap-2"
              >
                🧪 테스트 위치 사용
              </button>
            </div>
            <p className="text-sm text-gray-500">
              내 위치를 기반으로 주변 맛집을 찾아보세요 (테스트 위치: 서울 시청)
            </p>
          </div>
        )}

        {/* 거리 선택 라디오 버튼 */}
        {userLocation && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색 반경
            </label>
            <div className="flex gap-4">
              {DISTANCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center cursor-pointer"
                >
                  <input
                    type="radio"
                    name="distance"
                    value={option.value}
                    checked={selectedDistance === option.value}
                    onChange={(e) => setSelectedDistance(Number(e.target.value))}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 focus:ring-2"
                  />
                  <span className="ml-2 text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 지도 */}
      {userLocation && (
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg overflow-hidden border border-gray-200"
        />
      )}
    </div>
  );
};

export default NearbyRestaurantsMap;


