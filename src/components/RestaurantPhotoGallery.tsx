import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { RestaurantPhoto } from '../services/authService';
import { getPhotoUrl } from '../utils/googlePlacesPhoto';

interface RestaurantPhotoGalleryProps {
  photos: RestaurantPhoto[];
  restaurantName?: string;
  isLoading?: boolean;
  isAdmin?: boolean;
  primaryPhotoUrl?: string;
  onSetPrimary?: (photoUrl: string) => void;
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
  isLoading = false,
  isAdmin = false,
  primaryPhotoUrl,
  onSetPrimary
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);

  const handleSetPrimary = async (photoUrl: string) => {
    if (!onSetPrimary || settingPrimary) return;
    setSettingPrimary(true);
    try {
      await onSetPrimary(photoUrl);
    } finally {
      setSettingPrimary(false);
    }
  };

  const isPrimaryPhoto = (photo: RestaurantPhoto) => {
    const imageUrl = getPhotoUrl(photo.photo_url, photo.photo_reference);
    return primaryPhotoUrl === imageUrl || primaryPhotoUrl === photo.photo_url;
  };

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
    // 모든 경우에 슬라이드 형식으로 표시
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
          <div className="flex gap-3 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {photos.map((photo, index) => {
              const imageUrl = getPhotoUrl(photo.photo_url, photo.photo_reference);
              const isPrimary = isPrimaryPhoto(photo);
              
              return (
                <div
                  key={photo.id}
                  className="flex-shrink-0 w-72 h-56 relative group cursor-pointer overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow"
                  onClick={() => openLightbox(index)}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <PhotoImage
                    src={imageUrl}
                    alt={`${restaurantName} 사진 ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isPrimary && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow">
                      <StarIconSolid className="h-3 w-3" />
                      대표
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent h-12 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 text-white text-xs bg-black/40 px-2 py-0.5 rounded">
                    {index + 1} / {photos.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {photos.length > 1 && (
          <div className="mt-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
            <ChevronLeftIcon className="h-4 w-4" />
            <span>좌우로 스크롤하여 {photos.length}장의 사진을 확인하세요</span>
            <ChevronRightIcon className="h-4 w-4" />
          </div>
        )}
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

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3">
            <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
              {selectedIndex + 1} / {photos.length}
            </span>
            
            {isAdmin && onSetPrimary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const photo = photos[selectedIndex];
                  const imageUrl = getPhotoUrl(photo.photo_url, photo.photo_reference);
                  handleSetPrimary(imageUrl);
                }}
                disabled={settingPrimary || isPrimaryPhoto(photos[selectedIndex])}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isPrimaryPhoto(photos[selectedIndex])
                    ? 'bg-yellow-500 text-white cursor-default'
                    : settingPrimary
                    ? 'bg-gray-500 text-white cursor-wait'
                    : 'bg-white text-gray-800 hover:bg-yellow-500 hover:text-white'
                }`}
              >
                {isPrimaryPhoto(photos[selectedIndex]) ? (
                  <>
                    <StarIconSolid className="h-4 w-4" />
                    대표 이미지
                  </>
                ) : settingPrimary ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    설정 중...
                  </>
                ) : (
                  <>
                    <StarIcon className="h-4 w-4" />
                    대표로 설정
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RestaurantPhotoGallery;
