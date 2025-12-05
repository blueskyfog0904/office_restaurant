import React, { useState, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { RestaurantPhoto } from '../services/authService';
import { getPhotoUrl } from '../utils/googlePlacesPhoto';

interface RestaurantPhotoGalleryProps {
  photos: RestaurantPhoto[];
  restaurantName?: string;
  isLoading?: boolean;
}

// 개별 이미지 컴포넌트 (로딩 상태 포함)
const PhotoImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, className, onClick }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-2"></div>
            <span className="text-xs text-gray-500">로딩 중...</span>
          </div>
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-sm text-gray-500">이미지 로드 실패</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onClick={onClick}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};

const RestaurantPhotoGallery: React.FC<RestaurantPhotoGalleryProps> = ({ 
  photos, 
  restaurantName = '음식점',
  isLoading = false 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-600">사진을 불러오는 중...</span>
      </div>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxImageLoading(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
    setLightboxImageLoading(false);
    document.body.style.overflow = 'unset';
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex > 0) {
      setLightboxImageLoading(true);
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setLightboxImageLoading(true);
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
      setLightboxImageLoading(true);
      setSelectedIndex(selectedIndex - 1);
    } else if (e.key === 'ArrowRight' && selectedIndex < photos.length - 1) {
      setLightboxImageLoading(true);
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const renderGallery = () => {
    if (photos.length === 1) {
      const photo = photos[0];
      const imageUrl = getPhotoUrl(photo.photo_url, photo.photo_reference);
      
      return (
        <div className="w-full aspect-video relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
          <PhotoImage
            src={imageUrl}
            alt={`${restaurantName} 사진`}
            className="w-full h-full object-cover"
            onClick={() => openLightbox(0)}
          />
        </div>
      );
    }

    if (photos.length >= 2 && photos.length <= 4) {
      return (
        <div className={`grid gap-2 ${
          photos.length === 2 ? 'grid-cols-2' : 
          photos.length === 3 ? 'grid-cols-3' : 
          'grid-cols-2'
        }`}>
          {photos.map((photo, index) => {
            const imageUrl = getPhotoUrl(photo.photo_url, photo.photo_reference);
            const isLarge = photos.length === 3 && index === 0;
            
            return (
              <div
                key={photo.id}
                className={`${isLarge ? 'col-span-2 row-span-2' : ''} relative group cursor-pointer overflow-hidden rounded-lg aspect-square`}
                onClick={() => openLightbox(index)}
              >
                <PhotoImage
                  src={imageUrl}
                  alt={`${restaurantName} 사진 ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {photos.length > 4 && index === 3 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white font-semibold text-lg">
                    +{photos.length - 4}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 5장 이상: 슬라이더/캐러셀 형태
    return (
      <div className="relative">
        <style>{`
          .photo-gallery-scroll::-webkit-scrollbar {
            height: 8px;
          }
          .photo-gallery-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .photo-gallery-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .photo-gallery-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        <div className="overflow-x-auto photo-gallery-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
          <div className="flex gap-2 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {photos.map((photo, index) => {
              const imageUrl = getPhotoUrl(photo.photo_url, photo.photo_reference);
              
              return (
                <div
                  key={photo.id}
                  className="flex-shrink-0 w-64 h-48 relative group cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => openLightbox(index)}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <PhotoImage
                    src={imageUrl}
                    alt={`${restaurantName} 사진 ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600 text-center">
          {photos.length}장의 사진이 있습니다. 좌우로 스크롤하여 모두 확인하세요.
        </div>
      </div>
    );
  };

  return (
    <>
      <div>
        {renderGallery()}
      </div>

      {/* 라이트박스 모달 */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            aria-label="닫기"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>

          {selectedIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
              aria-label="이전 사진"
            >
              <ChevronLeftIcon className="h-8 w-8" />
            </button>
          )}

          {selectedIndex < photos.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
              aria-label="다음 사진"
            >
              <ChevronRightIcon className="h-8 w-8" />
            </button>
          )}

          <div className="max-w-7xl max-h-full flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
            {/* 라이트박스 로딩 인디케이터 */}
            {lightboxImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-3"></div>
                  <span className="text-white text-sm">사진 로딩 중...</span>
                </div>
              </div>
            )}
            <img
              src={getPhotoUrl(photos[selectedIndex].photo_url, photos[selectedIndex].photo_reference)}
              alt={`${restaurantName} 사진 ${selectedIndex + 1}`}
              className={`max-w-full max-h-[90vh] object-contain transition-opacity duration-300 ${lightboxImageLoading ? 'opacity-30' : 'opacity-100'}`}
              onLoad={() => setLightboxImageLoading(false)}
              onError={() => setLightboxImageLoading(false)}
            />
          </div>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
            {selectedIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
};

export default RestaurantPhotoGallery;
