import { supabase } from './supabaseClient';

// ===================================
// API 클라이언트 설정
// ===================================

// Supabase 기반으로 대체

// axios 클라이언트 제거

// ===================================
// API 에러 처리 유틸리티
// ===================================

export const getErrorMessage = (error: any): string => error?.message ?? '알 수 없는 오류가 발생했습니다.';

// ===================================
// 토큰 관리 유틸리티
// ===================================

export const isAuthenticated = (): boolean => !!localStorage.getItem('sb:token');

// ===================================
// 음식점 관리 API
// ===================================

export interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  category: string;
  region_id: number;
  region?: {
    region: string;
    sub_region: string;
  };
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface RestaurantListResponse {
  success: boolean;
  message: string;
  data: Restaurant[];
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

export const getRestaurants = async (params: {
  page?: number;
  size?: number;
  region_id?: number;
  category?: string;
  status?: string;
  keyword?: string;
}): Promise<RestaurantListResponse> => {
  const { data, error } = await supabase
    .from('v_restaurants_metrics')
    .select('*')
    .limit(params.size ?? 20);
  if (error) throw error;
  return {
    success: true,
    message: 'ok',
    data: (data as any) as Restaurant[],
    pagination: { page: params.page ?? 1, size: params.size ?? 20, total: data?.length ?? 0, pages: 1 },
  };
};

export const getRestaurant = async (id: number): Promise<Restaurant> => {
  const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
  if (error) throw error;
  return data as any;
};

export const createRestaurant = async (data: Partial<Restaurant>): Promise<Restaurant> => {
  const { data: created, error } = await supabase.from('restaurants').insert(data).select('*').single();
  if (error) throw error;
  return created as any;
};

export const updateRestaurant = async (id: number, data: Partial<Restaurant>): Promise<Restaurant> => {
  const { data: updated, error } = await supabase.from('restaurants').update(data).eq('id', id).select('*').single();
  if (error) throw error;
  return updated as any;
};

export const deleteRestaurant = async (id: number): Promise<void> => {
  const { error } = await supabase.from('restaurants').delete().eq('id', id);
  if (error) throw error;
};

// ===================================
// 사용자 관리 API (미사용: 관리자 화면 전환 예정)
// ===================================

export interface User {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  region_id?: number;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  data: User[];
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

export const getUsers = async (): Promise<UserListResponse> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

export const createUser = async (): Promise<User> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

export const updateUser = async (): Promise<User> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

export const deleteUser = async (): Promise<void> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

// ===================================
// 리뷰 관리 API
// ===================================

export interface Review {
  id: number;
  restaurant_id: number;
  restaurant_name?: string;
  user_id: number;
  username?: string;
  rating: number;
  comment: string;
  status: 'approved' | 'pending' | 'rejected';
  report_count: number;
  report_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewListResponse {
  data: Review[];
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

export const getReviews = async (): Promise<ReviewListResponse> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

export const updateReviewStatus = async (): Promise<Review> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

export const deleteReview = async (): Promise<void> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

// ===================================
// 통계 API
// ===================================

export interface Statistics {
  total_restaurants: number;
  active_restaurants: number;
  total_users: number;
  active_users: number;
  total_reviews: number;
  approved_reviews: number;
  total_visits: number;
  avg_rating: number;
}

export const getStatistics = async (): Promise<Statistics> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

export interface RankingData {
  id: number;
  name: string;
  region: string;
  category: string;
  rating: number;
  review_count: number;
  visit_count: number;
  rank_change: number;
  previous_rank: number;
  current_rank: number;
}

export const getRankings = async (): Promise<RankingData[]> => {
  throw new Error('관리자 API는 Supabase 전환 대기 중입니다.');
};

// ===================================
// 지역 관리 API
// ===================================

export interface Region {
  id: number;
  region: string;
  sub_region: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export const getRegions = async (): Promise<Region[]> => {
  const { data, error } = await supabase
    .from('public_expense_entries')
    .select('region, sub_region')
    .neq('region', null)
    .neq('sub_region', null)
    .order('region', { ascending: true })
    .order('sub_region', { ascending: true });
  if (error) throw error;
  const unique = Array.from(
    new Map((data as any[]).map((r) => [`${r.region}__${r.sub_region}`, r])).values()
  );
  return unique.map((r: any, idx: number) => ({ id: idx + 1, region: r.region, sub_region: r.sub_region, created_at: '', updated_at: '' }));
};

// ===================================
// 카테고리 API
// ===================================

export const getCategories = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('category')
    .not('category', 'is', null);
  if (error) throw error;
  const set = new Set((data ?? []).map((r: any) => r.category));
  return Array.from(set).filter(Boolean) as string[];
};

// ===================================
// 약관 관련 API (공개)
// ===================================

export interface TermsVersion {
  id: string;
  code: 'tos' | 'privacy' | 'age14' | 'location';
  title: string;
  content: string;
  is_required: boolean;
  version: number;
  updated_at: string;
  pdf_url?: string | null;
}

// 공개 약관 조회 (회원가입용)
export const getPublicTerms = async (): Promise<TermsVersion[]> => {
  const { data, error } = await supabase
    .from('terms_versions')
    .select('*')
    .order('is_required', { ascending: false })
    .order('code', { ascending: true });
  
  if (error) {
    throw new Error(getErrorMessage(error));
  }
  
  return (data || []) as TermsVersion[];
};