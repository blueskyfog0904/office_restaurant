import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon,
  ShareIcon,
  HeartIcon,
  ClipboardDocumentIcon,
  PhotoIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { 
  getRestaurantById,
  getRestaurantByLocation,
  getRestaurantReviews,
  getRestaurantReviewSummary,
  createReview,
  getRestaurantPhotos,
  RestaurantPhoto
} from '../../services/authService';
import { 
  RestaurantWithStats, 
  UserReview, 
  RestaurantReviewSummary, 
  UserReviewCreateRequest,
  ReviewPhoto,
  ReviewReply,
  ReviewReaction
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import KakaoMap from '../../components/KakaoMap';
import ShareModal from '../../components/ShareModal';
import RestaurantPhotoGallery from '../../components/RestaurantPhotoGallery';
import ReviewPhotoUploader from '../../components/ReviewPhotoUploader';
import ReviewReactionButtons from '../../components/ReviewReactionButtons';
import ReviewReplySection from '../../components/ReviewReplySection';
import { ShareData } from '../../utils/socialShare';
import { addToRecentHistory, isFavorite, addToFavorites, removeFromFavorites } from '../../utils/favorites';
import { supabase } from '../../services/supabaseClient';
import { 
  uploadReviewPhotos, 
  getReviewPhotos, 
  deleteReviewPhoto,
  PendingPhoto 
} from '../../services/reviewPhotoService';
import { getMyReactionsForReviews } from '../../services/reviewReactionService';
import { getRepliesForReviews } from '../../services/reviewReplyService';
import { revokePreviewUrl } from '../../utils/imageCompressor';

const RestaurantDetailPage: React.FC = () => {
  const { subAdd1, subAdd2, title, id } = useParams<{ 
    subAdd1?: string; 
    subAdd2?: string; 
    title?: string; 
    id?: string; 
  }>();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  
  // 상태 관리
  const [restaurant, setRestaurant] = useState<RestaurantWithStats | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<RestaurantReviewSummary | null>(null);
  const [photos, setPhotos] = useState<RestaurantPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 리뷰 작성 폼 상태
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // 강제 리렌더링용
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [photoUploadProgress, setPhotoUploadProgress] = useState({ current: 0, total: 0 });
  
  // 리뷰별 사진 캐시
  const [reviewPhotosMap, setReviewPhotosMap] = useState<Record<string, ReviewPhoto[]>>({});

  // 리뷰별 반응/답글 캐시
  const [reviewReactionsMap, setReviewReactionsMap] = useState<Record<string, ReviewReaction>>({});
  const [reviewRepliesMap, setReviewRepliesMap] = useState<Record<string, ReviewReply[]>>({});

  // 소셜 공유 모달 상태
  const [showShareModal, setShowShareModal] = useState(false);
  const [isFavoriteRestaurant, setIsFavoriteRestaurant] = useState(false);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);

  // 리뷰 사진 모달 상태
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoModalImages, setPhotoModalImages] = useState<ReviewPhoto[]>([]);
  const [photoModalIndex, setPhotoModalIndex] = useState(0);

  // 사용자가 이미 리뷰를 작성했는지 확인
  const checkUserReview = () => {
    if (!isLoggedIn || !user || !reviews.length) return false;
    const userReview = reviews.find(review => review.user_id === user.id);
    return !!userReview;
  };

  // 사용자의 리뷰 작성 여부를 직접 데이터베이스에서 확인
  const checkUserReviewFromDB = async (restaurantId?: string | number) => {
    const targetRestaurantId = restaurantId || restaurant?.id;
    if (!isLoggedIn || !user || !targetRestaurantId) return false;
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('restaurant_id', targetRestaurantId)
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
  };

  // 리뷰가 변경될 때마다 사용자 리뷰 작성 여부 확인
  useEffect(() => {
    const userHasReviewed = checkUserReview();
    console.log('사용자 리뷰 작성 여부 확인:', {
      isLoggedIn,
      userId: user?.id,
      reviewsCount: reviews.length,
      userHasReviewed
    });
    setHasUserReviewed(userHasReviewed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews, isLoggedIn, user]);

  // hasUserReviewed 상태 변경 추적
  useEffect(() => {
    console.log('hasUserReviewed 상태 변경:', hasUserReviewed);
  }, [hasUserReviewed]);

  // 페이지 로드 시 스크롤을 맨 위로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [subAdd1, subAdd2, title, id]);

  // 데이터 로드
  useEffect(() => {
    const hasLocationParams = subAdd1 && subAdd2 && title;
    const hasIdParam = id;
    
    if (!hasLocationParams && !hasIdParam) return;
    
    let cancelled = false;
    
    const loadRestaurantData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        setError(null);
        
        let restaurantData: RestaurantWithStats;
        
        if (hasLocationParams) {
          restaurantData = await getRestaurantByLocation(subAdd1!, subAdd2!, title!);
        } else if (hasIdParam) {
          restaurantData = await getRestaurantById(id!);
        } else {
          throw new Error('유효하지 않은 URL 파라미터');
        }
        
        if (cancelled) return;
        
        const basicLoadTime = performance.now() - startTime;
        console.log(`⏱️ 음식점 기본 정보 로드: ${basicLoadTime.toFixed(2)}ms`);
        
        setRestaurant(restaurantData);
        setIsFavoriteRestaurant(isFavorite(restaurantData.id));
        
        addToRecentHistory({
          id: restaurantData.id,
          name: restaurantData.name,
          address: restaurantData.address || '',
          category: restaurantData.category,
          sub_add1: restaurantData.sub_add1 || '',
          sub_add2: restaurantData.sub_add2 || ''
        });
        
        setLoading(false);
        
        // 보조 데이터는 비동기로 로드 (로딩 바를 차단하지 않음)
        const secondaryStartTime = performance.now();
        
        Promise.allSettled([
          getRestaurantReviewSummary(String(restaurantData.id)).then((summary) => {
            if (!cancelled) setReviewSummary(summary);
          }).catch(() => {}),
          loadReviews(String(restaurantData.id)),
          loadPhotos(String(restaurantData.id)),
          isLoggedIn && user ? checkUserReviewFromDB(restaurantData.id).then((hasReviewed) => {
            if (!cancelled) setHasUserReviewed(hasReviewed);
          }).catch(() => {}) : Promise.resolve()
        ]).then(() => {
          const secondaryLoadTime = performance.now() - secondaryStartTime;
          console.log(`⏱️ 보조 데이터 로드: ${secondaryLoadTime.toFixed(2)}ms`);
          console.log(`⏱️ 총 로드 시간: ${(performance.now() - startTime).toFixed(2)}ms`);
        });
        
      } catch (error) {
        if (!cancelled) {
          console.error('음식점 데이터 로드 실패:', error);
          setError('음식점 정보를 불러올 수 없습니다.');
          setLoading(false);
        }
      }
    };

    loadRestaurantData();
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAdd1, subAdd2, title, id]);
  
  // 사용자 리뷰 확인은 별도 useEffect로 분리 (로그인 상태 변경 시에만)
  useEffect(() => {
    if (isLoggedIn && user && restaurant) {
      checkUserReviewFromDB(restaurant.id).then((hasReviewed) => {
        setHasUserReviewed(hasReviewed);
      }).catch(() => {});
    } else {
      setHasUserReviewed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user, restaurant?.id]);
  
  // 카카오맵 지연 로드 (음식점 정보가 로드된 후 약간의 지연)
  useEffect(() => {
    if (restaurant && !shouldLoadMap) {
      const timer = setTimeout(() => {
        setShouldLoadMap(true);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant]);

  // 리뷰 목록 로드
  const loadReviews = async (restaurantId: string) => {
    try {
      setReviewsLoading(true);
      const reviewsData = await getRestaurantReviews(restaurantId, 1, 10);
      setReviews(reviewsData.data);
      
      // 각 리뷰의 사진도 로드
      const photosPromises = reviewsData.data.map(async (review) => {
        try {
          const photos = await getReviewPhotos(review.id);
          return { reviewId: review.id, photos };
        } catch {
          return { reviewId: review.id, photos: [] };
        }
      });
      
      const photosResults = await Promise.all(photosPromises);
      const photosMap: Record<string, ReviewPhoto[]> = {};
      photosResults.forEach(({ reviewId, photos }) => {
        photosMap[reviewId] = photos;
      });
      setReviewPhotosMap(photosMap);

      // 리뷰 반응 및 답글 로드
      const reviewIds = reviewsData.data.map(r => r.id);
      if (reviewIds.length > 0) {
        const [reactionsMap, repliesMap] = await Promise.all([
          getMyReactionsForReviews(reviewIds),
          getRepliesForReviews(reviewIds),
        ]);
        setReviewReactionsMap(reactionsMap);
        setReviewRepliesMap(repliesMap);
      }
    } catch (error) {
      console.error('리뷰 로드 실패:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // 사진 목록 로드
  const loadPhotos = async (restaurantId: string) => {
    try {
      setPhotosLoading(true);
      const photosData = await getRestaurantPhotos(restaurantId);
      setPhotos(photosData);
    } catch (error) {
      console.error('사진 로드 실패:', error);
      setPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  // 리뷰 작성
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !isLoggedIn) return;

    try {
      setSubmitting(true);
      const reviewData: UserReviewCreateRequest = {
        restaurant_id: restaurant.id,
        rating: reviewRating,
        content: reviewContent.trim() || undefined
      };

      const createdReview = await createReview(reviewData);
      
      // 사진 업로드
      if (pendingPhotos.length > 0 && createdReview?.id) {
        setPhotoUploadProgress({ current: 0, total: pendingPhotos.length });
        try {
          await uploadReviewPhotos(
            createdReview.id,
            pendingPhotos.map(p => p.compressed.file),
            (current, total) => setPhotoUploadProgress({ current, total })
          );
        } catch (photoError) {
          console.error('사진 업로드 실패:', photoError);
          alert('리뷰는 작성되었지만 일부 사진 업로드에 실패했습니다.');
        }
      }
      
      // 미리보기 URL 정리
      pendingPhotos.forEach(p => revokePreviewUrl(p.preview));
      
      // 성공 후 즉시 사용자 리뷰 작성 여부를 true로 설정
      setHasUserReviewed(true);
      
      // 폼 초기화
      setReviewContent('');
      setReviewRating(5);
      setPendingPhotos([]);
      setPhotoUploadProgress({ current: 0, total: 0 });
      
      // 리뷰 목록과 요약 새로고침
      await Promise.all([
        loadReviews(String(restaurant.id)),
        getRestaurantReviewSummary(String(restaurant.id)).then(setReviewSummary).catch(() => {})
      ]);
      
      // 강제로 상태 업데이트 (리뷰 목록 새로고침 후)
      setTimeout(() => {
        setHasUserReviewed(true);
        setForceUpdate(prev => prev + 1); // 강제 리렌더링
        console.log('리뷰 작성 완료 후 상태 강제 업데이트');
      }, 200);
      
      alert('리뷰가 성공적으로 작성되었습니다!');
    } catch (error) {
      console.error('리뷰 작성 실패:', error);
      if (error instanceof Error && error.message.includes('이미 이 음식점에 리뷰를 작성하셨습니다')) {
        alert('이미 이 음식점에 리뷰를 작성하셨습니다.');
        // 이미 리뷰를 작성한 경우 상태 업데이트
        setHasUserReviewed(true);
        // 리뷰 목록 새로고침
        await loadReviews(String(restaurant.id));
      } else {
        alert('리뷰 작성에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  // 리뷰 사진 삭제
  const handleDeleteReviewPhoto = async (photoId: string, reviewId: string) => {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    
    try {
      await deleteReviewPhoto(photoId);
      // 해당 리뷰의 사진 목록 업데이트
      setReviewPhotosMap(prev => ({
        ...prev,
        [reviewId]: prev[reviewId]?.filter(p => p.id !== photoId) || []
      }));
    } catch (error) {
      console.error('사진 삭제 실패:', error);
      alert('사진 삭제에 실패했습니다.');
    }
  };

  // 리뷰 사진 모달 열기
  const openPhotoModal = (photos: ReviewPhoto[], index: number) => {
    setPhotoModalImages(photos);
    setPhotoModalIndex(index);
    setPhotoModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // 리뷰 사진 모달 닫기
  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  // 이전 사진
  const goToPrevPhoto = () => {
    setPhotoModalIndex(prev => (prev > 0 ? prev - 1 : photoModalImages.length - 1));
  };

  // 다음 사진
  const goToNextPhoto = () => {
    setPhotoModalIndex(prev => (prev < photoModalImages.length - 1 ? prev + 1 : 0));
  };

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photoModalOpen) return;
      if (e.key === 'Escape') closePhotoModal();
      if (e.key === 'ArrowLeft') goToPrevPhoto();
      if (e.key === 'ArrowRight') goToNextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoModalOpen, photoModalImages.length]);

  // 별점 렌더링 함수
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

  // 네이버 블로그 검색 링크
  const getNaverSearchUrl = () => {
    if (!restaurant) return '#';
    const query = `${restaurant.sub_add1} ${restaurant.sub_add2} ${restaurant.title || '음식점'}`;
    return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
  };

  // 통합 검색어 생성
  const getSearchQuery = () => {
    if (!restaurant) return '';
    return `${restaurant.sub_add1} ${restaurant.sub_add2} ${restaurant.title || '음식점'}`;
  };

  // 음식점 위치 정보 생성 (sub_add1, sub_add2, title 조합)
  const getRestaurantLocation = () => {
    if (!restaurant) return '';
    
    console.log('getRestaurantLocation 실행:', {
      restaurant_name: restaurant.name,
      sub_add1: restaurant.sub_add1,
      sub_add2: restaurant.sub_add2,
      title: restaurant.title
    });
    
    // sub_add1, sub_add2, title 조합으로 위치 문자열 생성
    const locationParts = [
      restaurant.sub_add1,
      restaurant.sub_add2,
      restaurant.title || restaurant.name
    ].filter(part => part && part.trim().length > 0);
    
    const location = locationParts.join(' ');
    console.log('생성된 위치 문자열:', location);
    
    return location;
  };

  // 소셜 공유 데이터 생성
  const getShareData = (): ShareData => {
    if (!restaurant) {
      return {
        title: '음식점 정보',
        description: '맛있는 음식점을 찾아보세요!',
        url: window.location.href
      };
    }

    // 한글 URL 생성
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

  // 카카오맵 외부 링크 열기
  const openKakaoMap = () => {
    if (!restaurant) return;
    
    // address 우선, 없으면 지역+음식점명으로 검색
    const searchQuery = restaurant.address || getRestaurantLocation() || getSearchQuery();
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank');
  };

  // 네이버지도 외부 링크 열기
  const openNaverMap = () => {
    if (!restaurant) return;
    
    // address 우선, 없으면 지역+음식점명으로 검색
    const searchQuery = restaurant.address || getRestaurantLocation() || getSearchQuery();
    const url = `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank');
  };

  // 주소 복사하기
  const copyAddress = async () => {
    if (!restaurant?.address) {
      alert('복사할 주소가 없습니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(restaurant.address);
      alert('주소가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('주소 복사 실패:', error);
      alert('주소 복사에 실패했습니다.');
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = () => {
    if (!restaurant) return;
    
    // 로그인 확인
    if (!isLoggedIn) {
      alert('로그인 후 사용하실 수 있습니다.');
      return;
    }
    
    if (isFavoriteRestaurant) {
      removeFromFavorites(restaurant.id);
      setIsFavoriteRestaurant(false);
    } else {
      addToFavorites({
        id: restaurant.id,
        name: restaurant.title || '음식점',
        address: restaurant.address || '',
        category: restaurant.category,
        sub_add1: restaurant.sub_add1 || '',
        sub_add2: restaurant.sub_add2 || ''
      });
      setIsFavoriteRestaurant(true);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <span className="ml-4 text-gray-600">음식점 정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            음식점 정보를 찾을 수 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            {error || '요청하신 음식점이 존재하지 않거나 삭제되었습니다.'}
          </p>
          <button
            onClick={() => navigate('/regions')}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
          >
            음식점 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        뒤로가기
      </button>

      {/* 음식점 기본 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            {/* 음식점 이름 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{restaurant.title || '음식점'}</h1>
            
            {/* 평점 및 리뷰 수 */}
            <div className="flex items-center mb-4">
              {renderStars(Math.round(Number(reviewSummary?.average_rating || 0)), 'lg')}
              <span className="ml-2 text-lg font-medium text-gray-900">
                {reviewSummary?.average_rating ? Number(reviewSummary.average_rating).toFixed(1) : '0.0'}
              </span>
              <span className="ml-2 text-gray-600">
                ({reviewSummary?.total_reviews || 0}개 리뷰)
              </span>
            </div>

            {/* 카테고리 */}
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-500">카테고리</span>
              <p className="text-lg text-gray-900">
                {restaurant.category || '정보 없음'}
              </p>
            </div>

            {/* 주소 */}
            <div className="flex items-start mb-2">
              <MapPinIcon className="h-5 w-5 text-gray-500 mt-1 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-500">주소</span>
                <div className="flex items-center gap-2">
                  <p className="text-gray-900">{restaurant.address}</p>
                  {restaurant.address && (
                    <button
                      onClick={copyAddress}
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
            {restaurant.road_address && (
              <div className="flex items-start mb-4">
                <MapPinIcon className="h-5 w-5 text-gray-500 mt-1 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-500">도로명주소</span>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900">{restaurant.road_address}</p>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(restaurant.road_address || '');
                          alert('도로명주소가 클립보드에 복사되었습니다.');
                        } catch (error) {
                          console.error('주소 복사 실패:', error);
                          alert('주소 복사에 실패했습니다.');
                        }
                      }}
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
            {restaurant.phone && (
              <div className="flex items-center mb-4">
                <PhoneIcon className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <span className="text-sm font-medium text-gray-500">연락처</span>
                  <p className="text-gray-900">{restaurant.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼들 */}
          <div className="mt-6 lg:mt-0 lg:ml-6 flex flex-col space-y-3">
            <button
              onClick={toggleFavorite}
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
              href={getNaverSearchUrl()}
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
      {photos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">사진</h2>
          <RestaurantPhotoGallery 
            photos={photos} 
            restaurantName={restaurant.title || restaurant.name}
          />
        </div>
      )}

      {/* 카카오 지도 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">위치</h2>
          <div className="flex space-x-2">
            <button
              onClick={openKakaoMap}
              className="flex items-center px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm transition-colors"
            >
              <MapPinIcon className="h-4 w-4 mr-1" />
              카카오맵으로 보기
            </button>
            <button
              onClick={openNaverMap}
              className="flex items-center px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
            >
              <MapPinIcon className="h-4 w-4 mr-1" />
              네이버지도로 보기
            </button>
          </div>
        </div>
        <div className="w-full h-96 rounded-lg overflow-hidden border">
          {shouldLoadMap && restaurant ? (
            <KakaoMap
              latitude={restaurant.latitude ? Number(restaurant.latitude) : undefined}
              longitude={restaurant.longitude ? Number(restaurant.longitude) : undefined}
              address={restaurant.address || ''}
              width="100%"
              height={384}
              level={3}
              restaurantName={restaurant.title || restaurant.name}
              subAdd1={restaurant.sub_add1}
              subAdd2={restaurant.sub_add2}
            />
          ) : (
            <div className="w-full h-96 flex items-center justify-center bg-gray-100">
              <div className="text-gray-500">지도를 불러오는 중...</div>
            </div>
          )}
        </div>
      </div>

      {/* 사용자 리뷰 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          사용자 리뷰 ({reviewSummary?.total_reviews || 0})
        </h2>

        {reviewsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600">리뷰를 불러오는 중...</span>
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review) => {
              // v_reviews_detailed 뷰에서 nickname 필드 사용
              const reviewAny = review as any;
              const displayName = reviewAny.nickname || review.user?.username || '익명';
              const displayInitial = displayName.charAt(0) || '?';
              
              return (
              <div key={review.id} className="border-b border-gray-200 pb-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {displayInitial}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {displayName}
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
                
                {/* 리뷰 사진 */}
                {reviewPhotosMap[review.id] && reviewPhotosMap[review.id].length > 0 && (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {reviewPhotosMap[review.id].map((photo, photoIndex) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.photo_url}
                            alt="리뷰 사진"
                            className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openPhotoModal(reviewPhotosMap[review.id], photoIndex)}
                          />
                          {/* 본인 사진인 경우 삭제 버튼 표시 */}
                          {user?.id === photo.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReviewPhoto(photo.id, review.id);
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="사진 삭제"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 공감/비공감 버튼 */}
                <div className="mt-4">
                  <ReviewReactionButtons
                    reviewId={review.id}
                    initialLikeCount={reviewAny.like_count || 0}
                    initialDislikeCount={reviewAny.dislike_count || 0}
                    userReaction={reviewReactionsMap[review.id]?.reaction_type || null}
                    isLoggedIn={isLoggedIn}
                  />
                </div>

                {/* 답글 섹션 */}
                <ReviewReplySection
                  reviewId={review.id}
                  reviewAuthorId={review.user_id}
                  replies={reviewRepliesMap[review.id] || []}
                  replyCount={reviewAny.reply_count || 0}
                  isLoggedIn={isLoggedIn}
                  currentUserId={user?.id}
                  onRepliesChange={(newReplies) => {
                    setReviewRepliesMap(prev => ({
                      ...prev,
                      [review.id]: newReplies,
                    }));
                  }}
                />
              </div>
            )})}
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
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <ChatBubbleLeftIcon className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                리뷰를 작성하려면 로그인이 필요합니다
              </h3>
              <p className="text-blue-700 mt-1">
                로그인 후 이 음식점에 대한 리뷰를 남겨보세요!
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사용자가 이미 리뷰를 작성한 경우 안내 */}
      {isLoggedIn && hasUserReviewed && (
        <div className="bg-green-50 rounded-lg p-6 mb-8">
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

      {/* 리뷰 작성 폼 - 로그인했고 아직 리뷰를 작성하지 않은 경우에만 표시 */}
      {isLoggedIn && !hasUserReviewed && forceUpdate >= 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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

            {/* 사진 업로드 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhotoIcon className="inline h-5 w-5 mr-1" />
                사진 첨부 (선택사항, 최대 10장)
              </label>
              <ReviewPhotoUploader
                maxPhotos={10}
                onPhotosChange={setPendingPhotos}
                disabled={submitting}
              />
              {photoUploadProgress.total > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600">
                    사진 업로드 중... ({photoUploadProgress.current}/{photoUploadProgress.total})
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(photoUploadProgress.current / photoUploadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
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

      {/* 소셜 공유 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareData={getShareData()}
      />

      {/* 리뷰 사진 모달 */}
      {photoModalOpen && photoModalImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closePhotoModal}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={closePhotoModal}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="닫기"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>

          {/* 사진 카운터 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {photoModalIndex + 1} / {photoModalImages.length}
          </div>

          {/* 이전 버튼 */}
          {photoModalImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevPhoto(); }}
              className="absolute left-4 p-2 text-white hover:text-gray-300 bg-black/50 rounded-full transition-colors"
              aria-label="이전 사진"
            >
              <ChevronLeftIcon className="h-8 w-8" />
            </button>
          )}

          {/* 메인 이미지 */}
          <div 
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photoModalImages[photoModalIndex].photo_url}
              alt={`리뷰 사진 ${photoModalIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          {/* 다음 버튼 */}
          {photoModalImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNextPhoto(); }}
              className="absolute right-4 p-2 text-white hover:text-gray-300 bg-black/50 rounded-full transition-colors"
              aria-label="다음 사진"
            >
              <ChevronRightIcon className="h-8 w-8" />
            </button>
          )}

          {/* 썸네일 네비게이션 */}
          {photoModalImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg">
              {photoModalImages.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={(e) => { e.stopPropagation(); setPhotoModalIndex(idx); }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    idx === photoModalIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo.photo_url}
                    alt={`썸네일 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage; 