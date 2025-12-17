import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRestaurantUrlFromObject } from '../utils/urlUtils';
import {
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  HeartIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { RestaurantWithStats } from '../types';
import NaverReviewButton from './NaverReviewButton';
import ShareModal from './ShareModal';
import { useAuth } from '../contexts/AuthContext';
import { deleteRestaurant, setSkipAdminCheck } from '../services/adminApi';

interface RestaurantCardProps {
  restaurant: RestaurantWithStats;
  onFavoriteToggle?: (restaurantId: string, isFavorite: boolean) => void;
  onShare?: (restaurant: RestaurantWithStats) => void;
  isFavorite?: boolean;
  isLoggedIn?: boolean;
  className?: string;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onFavoriteToggle,
  onShare,
  isFavorite = false,
  isLoggedIn = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCardClick = () => {
    const url = generateRestaurantUrlFromObject(restaurant);
    if (url) {
      navigate(url);
    } else {
      // URL 생성 실패시 기본 ID 기반 URL로 fallback
      console.warn('URL 생성 실패, ID 기반 URL로 fallback:', restaurant);
      navigate(`/restaurants/${restaurant.id}`);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      alert('로그인 후 사용하실 수 있습니다.');
      return;
    }
    onFavoriteToggle?.(restaurant.id, !isFavorite);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 수정 페이지로 이동 (추후 구현)
    navigate(`/admin/restaurants/edit/${restaurant.id}`);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm(`'${restaurant.title || restaurant.name}' 음식점을 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // 관리자 권한이 이미 확인되었으므로 중복 확인 건너뛰기
      setSkipAdminCheck(true);
      
      const result = await deleteRestaurant(restaurant.id);
      if (result.success) {
        alert('음식점이 성공적으로 삭제되었습니다.');
        // 페이지 새로고침 또는 상위 컴포넌트에 알림
        window.location.reload();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('음식점 삭제 실패:', error);
      alert('음식점 삭제에 실패했습니다.');
    } finally {
      // 권한 확인 건너뛰기 해제
      setSkipAdminCheck(false);
      setIsDeleting(false);
    }
  };

  // 메인 이미지 URL (Google API URL은 만료되어 사용 불가하므로 제외)
  const isGoogleUrl = (url?: string) => url?.includes('googleapis.com');
  const primaryPhoto = !isGoogleUrl(restaurant.primary_photo_url) ? restaurant.primary_photo_url : null;
  const mainImageFromImages = restaurant.images?.find(img => img.image_type === 'main' && !isGoogleUrl(img.image_url))?.image_url ||
                              restaurant.images?.find(img => !isGoogleUrl(img.image_url))?.image_url;
  const mainImage = primaryPhoto || mainImageFromImages;

  // 별점 렌더링 (음식점 상세페이지와 동일한 스타일)
  const renderStars = (rating?: number) => {
    const stars = [];
    const reviewCount = restaurant.review_count || 0;
    
    // 별점이 없거나 리뷰가 없으면 빈 별 5개와 0.0 (0개 리뷰) 표시
    if (!rating || rating === 0) {
      for (let i = 0; i < 5; i++) {
        stars.push(
          <StarIcon key={i} className="h-4 w-4 text-gray-300" />
        );
      }
      
      return (
        <div className="flex items-center gap-1">
          <div className="flex">{stars}</div>
          <span className="text-sm text-gray-600 ml-1">
            0.0 ({reviewCount}개 리뷰)
          </span>
        </div>
      );
    }
    
    // 별점이 있는 경우
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarSolidIcon key={i} className="h-4 w-4 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative h-4 w-4">
            <StarIcon className="absolute h-4 w-4 text-gray-300" />
            <div className="absolute overflow-hidden w-1/2">
              <StarSolidIcon className="h-4 w-4 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <StarIcon key={i} className="h-4 w-4 text-gray-300" />
        );
      }
    }

    return (
      <div className="flex items-center gap-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600 ml-1">
          {rating.toFixed(1)} ({reviewCount}개 리뷰)
        </span>
      </div>
    );
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md hover:shadow-lg
        transition-all duration-300 cursor-pointer
        border border-gray-200 hover:border-gray-300
        transform hover:-translate-y-1
        ${className}
      `}
      onClick={handleCardClick}
    >
      {/* 이미지 섹션 */}
      <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
        {mainImage && !imageError ? (
          <img
            src={mainImage}
            alt={restaurant.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <img 
                src="/images/project_logo.png" 
                alt="공무원 맛집 로고" 
                className="h-16 w-auto mx-auto mb-2 opacity-50"
              />
              <div className="text-sm text-gray-500">이미지를 준비 중입니다.</div>
            </div>
          </div>
        )}

        {/* 순위 배지 */}
        {restaurant.region_rank && (
          <div className="absolute top-3 left-3">
            <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
              {restaurant.region_rank}위
            </div>
          </div>
        )}

        {/* 네이버 리뷰 버튼 */}
        <div className="absolute top-3 right-3">
          <NaverReviewButton
            restaurantName={restaurant.title || '음식점'}
            address={restaurant.address}
            subAdd1={restaurant.sub_add1}
            subAdd2={restaurant.sub_add2}
            size="sm"
          />
        </div>

        {/* 액션 버튼들 */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {/* 관리자용 수정 버튼 */}
          {isAdmin && (
            <button
              onClick={handleEditClick}
              className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
              title="음식점 수정"
            >
              <PencilIcon className="h-5 w-5 text-gray-600 hover:text-green-500" />
            </button>
          )}

          {/* 관리자용 삭제 버튼 */}
          {isAdmin && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className={`p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors ${
                isDeleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="음식점 삭제"
            >
              <TrashIcon className={`h-5 w-5 ${isDeleting ? 'text-gray-400' : 'text-gray-600 hover:text-red-500'}`} />
            </button>
          )}

          {/* 즐겨찾기 버튼 */}
          <button
            onClick={handleFavoriteClick}
            className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            {isFavorite ? (
              <HeartSolidIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-gray-600 hover:text-red-500" />
            )}
          </button>

          {/* 공유 버튼 */}
          <button
            onClick={handleShareClick}
            className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
            title="공유하기"
          >
            <ShareIcon className="h-5 w-5 text-gray-600 hover:text-blue-500" />
          </button>
        </div>
      </div>

      {/* 콘텐츠 섹션 */}
      <div className="p-4">
        {/* 음식점 이름 */}
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
          {restaurant.title || '음식점'}
        </h3>

        {/* 카테고리 */}
        {restaurant.category && (
          <div className="mb-2">
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {restaurant.category}
            </span>
          </div>
        )}

        {/* 주소 */}
        {restaurant.address && (
          <div className="flex items-start gap-2 mb-2 text-sm text-gray-600">
            <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{restaurant.address}</span>
          </div>
        )}

        {/* 전화번호 */}
        {restaurant.phone && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <PhoneIcon className="h-4 w-4 text-gray-400" />
            <span>{restaurant.phone}</span>
          </div>
        )}

        {/* 별점 */}
        <div className="mb-3">
          {renderStars(restaurant.avg_rating)}
        </div>
      </div>

      {/* 공유 모달 */}
      <ShareModal
        shareData={{
          title: `${restaurant.title || '음식점'} - ${restaurant.sub_add1} ${restaurant.sub_add2}`,
          description: `${restaurant.category || '음식점'} | ${restaurant.address}`,
          url: `${window.location.origin}/restaurants/${restaurant.id}`,
          image: 'https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=맛집'
        }}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};

export default RestaurantCard; 