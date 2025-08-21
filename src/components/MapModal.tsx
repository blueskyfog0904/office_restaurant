import React from 'react';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import KakaoMap from './KakaoMap';
import { RestaurantWithStats } from '../types';

interface MapModalProps {
  restaurant: RestaurantWithStats;
  isOpen: boolean;
  onClose: () => void;
}

const MapModal: React.FC<MapModalProps> = ({ restaurant, isOpen, onClose }) => {
  if (!isOpen) return null;

  const hasCoordinates = restaurant.latitude && restaurant.longitude;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <MapPinIcon className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{restaurant.title || '음식점'}</h2>
              <p className="text-sm text-gray-600">{restaurant.address}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 지도 또는 오류 메시지 */}
        <div className="relative">
          {hasCoordinates ? (
            <KakaoMap
              latitude={restaurant.latitude!}
              longitude={restaurant.longitude!}
              width="100%"
              height={400}
              level={3}
              restaurantName={restaurant.title || '음식점'}
            />
          ) : (
            <div className="h-96 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <MapPinIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">위치 정보가 없습니다</p>
                <p className="text-sm">{restaurant.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2 p-4 border-t bg-gray-50">
          {hasCoordinates ? (
            <>
              <button
                onClick={() => {
                  const url = `https://map.kakao.com/link/map/${encodeURIComponent(restaurant.title || '음식점')},${restaurant.latitude},${restaurant.longitude}`;
                  window.open(url, '_blank');
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                카카오맵에서 보기
              </button>
              <button
                onClick={() => {
                  const url = `https://map.naver.com/v5/search/${encodeURIComponent(restaurant.address || restaurant.title || '음식점')}`;
                  window.open(url, '_blank');
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                네이버지도에서 보기
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                const searchQuery = encodeURIComponent(`${restaurant.title || '음식점'} ${restaurant.address || ''}`);
                const url = `https://map.naver.com/v5/search/${searchQuery}`;
                window.open(url, '_blank');
              }}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              네이버지도에서 검색
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapModal;