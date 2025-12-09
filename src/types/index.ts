// ===================================
// 공통 타입 정의
// ===================================

export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface PaginationResponse {
  page: number;
  size: number;
  total: number;
  pages: number;
}

// ===================================
// 사용자 관련 타입
// ===================================

export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  kakao_id?: string;
  profile_image_url?: string;
  provider?: string;
  role?: 'admin' | 'user';
  nickname?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ===================================
// 지역 관련 타입
// ===================================

export interface Region {
  id: string;
  code: string;
  sub_add1: string;
  sub_add2: string;
  created_at: string;
  updated_at: string;
}

export interface RegionListResponse extends BaseResponse {
  data: Region[];
  pagination: PaginationResponse;
}

// ===================================
// 음식점 관련 타입
// ===================================

export interface Restaurant {
  id: string;
  name: string;
  title?: string;  // 음식점 표시명 (title이 있으면 title을, 없으면 name을 사용)
  address?: string;
  road_address?: string;  // 도로명주소
  phone?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  sub_category?: string; 
  region_id: string;
  sub_add1?: string;  // 지역명 (기존 region)
  sub_add2?: string;  // 하위 지역명 (기존 sub_region)
  status: string;
  is_active?: boolean;  // 활성화 상태
  created_at: string;
  updated_at: string;
  region_info?: Region;  // 기존 region 필드를 region_info로 변경
  primary_photo_url?: string;  // 대표 이미지 URL
}

export interface RestaurantListResponse extends BaseResponse {
  data: Restaurant[];
  pagination: PaginationResponse;
}

export interface RestaurantSearchRequest {
  keyword?: string;
  region_id?: string;
  category?: string;
  year?: number;
  month?: number;
  page?: number;
  size?: number;
  order_by?: string;
}

// 음식점 카드용 확장 정보
export interface RestaurantWithStats extends Restaurant {
  visit_count?: number;
  total_amount?: number;
  rank_position?: number;
  avg_rating?: number;
  review_count?: number;
  region_rank?: number;     // 지역 내 순위 (DENSE_RANK)
  province_rank?: number;    // 광역시/도 내 순위 (DENSE_RANK)
  national_rank?: number;    // 전국 순위 (DENSE_RANK)
  images?: RestaurantImage[];
  recent_visits?: VisitRecord[];
  recent_rankings?: Ranking[];
}

export interface RestaurantImage {
  id: string;
  image_url: string;
  image_type: 'main' | 'menu' | 'interior' | 'exterior' | 'food';
  alt_text?: string;
  display_order: number;
}

// ===================================
// 리뷰 관련 타입
// ===================================

export interface UserReview {
  id: string;
  restaurant_id: string;
  user_id: string;
  rating: number;
  content?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  like_count?: number;
  dislike_count?: number;
  reply_count?: number;
}

export interface UserReviewCreateRequest {
  restaurant_id: string;
  rating: number;
  content?: string;
}

export interface UserReviewUpdateRequest {
  rating?: number;
  content?: string;
}

export interface UserReviewListResponse extends BaseResponse {
  data: UserReview[];
  pagination: PaginationResponse;
}

export interface RestaurantReviewSummary {
  total_reviews: number;
  average_rating?: number;
  rating_distribution: Record<string, number>;
  recent_reviews: UserReview[];
}

// ===================================
// 리뷰 사진 관련 타입
// ===================================

export interface ReviewPhoto {
  id: string;
  review_id: string;
  user_id: string;
  photo_url: string;
  storage_path: string;
  file_size?: number;
  display_order: number;
  created_at: string;
}

export interface ReviewPhotoUploadResult {
  id: string;
  photo_url: string;
  storage_path: string;
  file_size: number;
}

export interface UserReviewWithPhotos extends UserReview {
  photos?: ReviewPhoto[];
}

// ===================================
// 리뷰 반응 관련 타입
// ===================================

export interface ReviewReaction {
  id: string;
  review_id: string;
  user_id: string;
  reaction_type: 'like' | 'dislike';
  created_at: string;
}

// ===================================
// 리뷰 답글 관련 타입
// ===================================

export interface ReviewReply {
  id: string;
  review_id: string;
  parent_id?: string;
  user_id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  nickname?: string;
  avatar_url?: string;
  replies?: ReviewReply[];
}

// ===================================
// 방문 기록 관련 타입
// ===================================

export interface VisitRecord {
  id: string;
  restaurant_id: string;
  region_id: string;
  year: number;
  month: number;
  visit_count: number;
  total_amount: string | number;
  restaurant?: Restaurant;
  region?: Region;
  created_at: string;
}

// ===================================
// 랭킹 관련 타입
// ===================================

export interface Ranking {
  id: string;
  restaurant_id: string;
  region_id: string;
  year: number;
  month: number;
  rank_position: number;
  visit_count: number;
  total_amount: number;
  avg_rating?: number;
  review_count: number;
  last_updated: string;
  restaurant?: Restaurant;
  region?: Region;
}

export interface RankingListResponse extends BaseResponse {
  data: Ranking[];
  pagination: PaginationResponse;
}

// ===================================
// 통계 관련 타입
// ===================================

export interface OverviewStatistics {
  total_regions: number;
  total_restaurants: number;
  total_visits: number;
  total_amount: number;
  latest_crawl_date?: string;
} 