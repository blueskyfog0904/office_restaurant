import { getErrorMessage } from './api';
import { supabase } from './supabaseClient';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RestaurantListResponse,
  RestaurantSearchRequest,
  RestaurantWithStats,
  RegionListResponse,
  Restaurant,
  Region,
} from '../types';

// ===================================
// 인증 관련 API
// ===================================

export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error) throw new Error(getErrorMessage(error));
  const session = data.session;
  const user = data.user;
  if (!session || !user) throw new Error('로그인에 실패했습니다.');
  return {
    access_token: data.session?.access_token || '',
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email ?? '',
      username: user.user_metadata?.nickname ?? user.email ?? '',
      is_active: true,
      is_admin: false,
      created_at: user.created_at ?? new Date().toISOString(),
    } as import('../types').User,
  };
};

export const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: { nickname: userData.username },
    },
  });
  if (error) throw new Error(getErrorMessage(error));
  const session = data.session; // 이메일 확인이 필요하도록 설정된 경우 null 일 수 있음
  const user = data.user;
  if (!user) throw new Error('회원가입에 실패했습니다.');

  // 세션 스토리지에서 약관 동의 정보 가져와서 저장
  try {
    const termsConsentData = sessionStorage.getItem('termsConsent');
    if (termsConsentData && session) {
      const consents = JSON.parse(termsConsentData);
      const rows = consents.map((consent: any) => ({
        user_id: user.id,
        terms_id: consent.terms_id,
        version: consent.version,
        agreed: consent.agreed,
      }));
      
      const { error: consentError } = await supabase
        .from('user_terms_consents')
        .insert(rows);
      
      if (consentError) {
        console.error('약관 동의 저장 실패:', consentError);
      } else {
        // 성공적으로 저장되면 세션 스토리지에서 제거
        sessionStorage.removeItem('termsConsent');
      }
    }
  } catch (e) {
    console.error('약관 동의 처리 중 오류:', e);
  }

  return {
    access_token: data.session?.access_token || '',
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email ?? '',
      username: user.user_metadata?.nickname ?? userData.username,
      is_active: true,
      is_admin: false,
      created_at: user.created_at ?? new Date().toISOString(),
    } as import('../types').User,
  };
};

export const socialLoginKakao = async (_accessToken: string): Promise<AuthResponse> => {
  // 추후 Kakao OAuth 연동 예정 (Supabase OAuth 사용 권장). 현재는 미구현.
  // 구현 시 약관 동의 처리도 함께 추가 필요
  throw new Error('카카오 간편로그인은 준비 중입니다.');
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(getErrorMessage(error));
  const u = data.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? '',
    username: u.user_metadata?.nickname ?? u.email ?? '',
    is_active: true,
    is_admin: false,
    created_at: u.created_at ?? new Date().toISOString(),
  } as import('../types').User;
};

// ===================================
// 프로필 관련 API
// ===================================

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

export const updateProfile = async (profileData: UpdateProfileRequest): Promise<import('../types').User> => {
  const { data: { user }, error } = await supabase.auth.updateUser({
    email: profileData.email,
    data: { nickname: profileData.username }
  });
  
  if (error) throw new Error(getErrorMessage(error));
  if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');
  
  return {
    id: user.id,
    email: user.email ?? '',
    username: user.user_metadata?.nickname ?? user.email ?? '',
    is_active: true,
    is_admin: false,
    created_at: user.created_at ?? new Date().toISOString(),
  } as import('../types').User;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  // 1. 현재 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    throw new Error("사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
  }

  // 2. 현재 비밀번호가 맞는지 확인하기 위해 로그인 시도
  // 이 과정에서 현재 세션이 변경될 수 있으므로 주의가 필요합니다.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    // 401 Unauthorized 또는 다른 에러 코드로 비밀번호가 틀렸음을 확인
    throw new Error("현재 비밀번호가 올바르지 않습니다.");
  }

  // 3. 비밀번호가 확인되었으므로, 새 비밀번호로 업데이트
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    // 비밀번호 업데이트 실패 시 에러 처리
    throw new Error(`비밀번호 변경에 실패했습니다: ${updateError.message}`);
  }
  
  // 4. 중요: signInWithPassword로 인해 세션이 변경되었을 수 있으므로,
  // 최신 사용자 정보를 다시 가져와서 세션을 안정화시키는 것이 좋습니다.
  await supabase.auth.refreshSession();
};

export const deleteAccount = async (): Promise<void> => {
  const { error } = await supabase.auth.admin.deleteUser(
    (await supabase.auth.getUser()).data.user?.id || ''
  );
  
  if (error) throw new Error(getErrorMessage(error));
};

// ===================================
// 사용자 활동 내역 API
// ===================================

export const getUserFavorites = async (userId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      created_at,
      restaurants (
        id,
        title,
        name,
        address,
        category,
        region,
        sub_region
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(getErrorMessage(error));
  return data || [];
};

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId);
  
  if (error) throw new Error(getErrorMessage(error));
};

export const getUserPosts = async (userId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      board_type,
      view_count,
      like_count,
      created_at,
      updated_at
    `)
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(getErrorMessage(error));
  return data || [];
};

export const getUserReviews = async (userId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      content,
      created_at,
      restaurants (
        id,
        title,
        name,
        address,
        category
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(getErrorMessage(error));
  return data || [];
};

// ===================================
// 음식점 관련 API
// ===================================

export const searchRestaurants = async (params: RestaurantSearchRequest): Promise<RestaurantListResponse> => {
  const page = params.page ?? 1;
  const size = params.size ?? 1000;

  // 기본 쿼리 빌더 - 새로운 뷰 사용
  let query = supabase
    .from('v_restaurants_with_stats')
    .select('*', { count: 'exact' });

  // 키워드: 이름/주소 ILIKE
  if (params.keyword) {
    query = query.or(
      `name.ilike.%${params.keyword}%,address.ilike.%${params.keyword}%`
    );
  }

  // 지역별 필터링 (region과 sub_region으로 검색)
  if (params.region_id) {
    console.log(`지역 ${params.region_id}로 필터링 중...`);
    
    // region_id가 문자열이고 "시도명|시군구명" 형태인 경우
    if (typeof params.region_id === 'string' && params.region_id.includes('|')) {
      const [region, sub_region] = params.region_id.split('|');
      query = query.eq('region', region).eq('sub_region', sub_region);
    } else {
      // 기존 호환성을 위해 sub_region으로만 검색 (deprecated)
      query = query.eq('sub_region', params.region_id);
    }
  }

  // 카테고리
  if (params.category) {
    query = query.eq('category', params.category);
  }

  // 연도: visit_summary 에서 해당 연도 레스토랑 id 조회 후 필터
  if (params.year) {
    const { data: idsData, error: idsError } = await supabase
      .from('visit_summary')
      .select('restaurant_id')
      .eq('year', params.year);
    if (idsError) throw new Error(getErrorMessage(idsError));
    const ids = Array.from(new Set((idsData ?? []).map((r: any) => r.restaurant_id)));
    if (ids.length === 0) {
      return {
        success: true,
        message: 'ok',
        data: [],
        pagination: { page, size, total: 0, pages: 0 },
      };
    }
    query = query.in('id', ids);
  }

  // 정렬
  const sortBy = (params.order_by ?? 'visit_count').toLowerCase();
  const sortMap: Record<string, string> = {
    visit_count: 'total_visits',
    rating: 'avg_rating',
    amount: 'total_amount',
    name: 'name',
    total_count: 'total_visits', // total_count를 total_visits로 매핑
  };
  const sortColumn = sortMap[sortBy] ?? 'total_visits';
  query = query.order(sortColumn as any, { ascending: sortBy === 'name' });

  // 페이지네이션
  const from = (page - 1) * size;
  const to = from + size - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(getErrorMessage(error));

  console.log(`검색 결과: ${data?.length || 0}개 음식점 발견`);

  const items = ((data ?? []) as any[]).map((row: any) => {
    const mapped: RestaurantWithStats = {
      id: row.id,
      name: row.name,
      title: row.title,  // title 필드 추가
      address: row.address,
      phone: row.telephone,
      latitude: row.latitude,
      longitude: row.longitude,
      category: row.category,
      sub_category: row.category2,
      region_id: 0,
      region: row.region,  // 지역명 직접 매핑
      sub_region: row.sub_region,  // 하위 지역명 직접 매핑
      status: row.is_active ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_amount: 0, // 새로운 스키마에서는 total_amount가 없음
      visit_count: row.total_visits ?? 0,
      avg_rating: row.avg_rating ?? 0,
      review_count: row.reviews_count ?? 0,
      region_info: { region: row.region, sub_region: row.sub_region } as any,  // 기존 region 필드 호환성
    } as any;
    return mapped;
  });
  return {
    success: true,
    message: 'ok',
    data: items as unknown as Restaurant[],
    pagination: {
      page,
      size,
      total: count ?? items.length,
      pages: Math.max(1, Math.ceil((count ?? items.length) / size)),
    },
  };
};

export const getRestaurantById = async (id: string): Promise<RestaurantWithStats> => {
  const { data, error } = await supabase
    .from('v_restaurants_with_stats')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(getErrorMessage(error));
  const row: any = data;
  const mapped: RestaurantWithStats = {
    id: row.id,
    name: row.name,
    title: row.title,  // title 필드 추가
    address: row.address,
    phone: row.telephone,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    sub_category: row.category2, 
    region_id: 0,
    region: row.region,  // 지역명 직접 매핑
    sub_region: row.sub_region,  // 하위 지역명 직접 매핑
    status: row.is_active ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_amount: 0, // 새로운 스키마에서는 total_amount가 없음
    visit_count: row.total_visits ?? 0,
    avg_rating: row.avg_rating ?? 0,
    review_count: row.reviews_count ?? 0,
    region_info: { region: row.region, sub_region: row.sub_region } as any,  // 기존 region 필드 호환성
  } as any;
  return mapped as any;
};

export const getRestaurantByLocation = async (
  region: string, 
  subRegion: string, 
  title: string
): Promise<RestaurantWithStats> => {
  // URL 디코딩
  const decodedRegion = decodeURIComponent(region);
  const decodedSubRegion = decodeURIComponent(subRegion);
  const decodedTitle = decodeURIComponent(title);
  
  console.log('음식점 검색:', { decodedRegion, decodedSubRegion, decodedTitle });
  
  // 먼저 활성화된 음식점만 검색
  let { data, error } = await supabase
    .from('v_restaurants_with_stats')
    .select('*')
    .eq('region', decodedRegion)
    .eq('sub_region', decodedSubRegion)
    .eq('title', decodedTitle)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);
  
  // 활성화된 음식점이 없으면 모든 음식점에서 검색
  if (!data || data.length === 0) {
    const { data: allData, error: allError } = await supabase
      .from('v_restaurants_with_stats')
      .select('*')
      .eq('region', decodedRegion)
      .eq('sub_region', decodedSubRegion)
      .eq('title', decodedTitle)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (allError) {
      console.error('음식점 검색 실패:', allError);
      throw new Error(getErrorMessage(allError));
    }
    
    if (!allData || allData.length === 0) {
      throw new Error('음식점을 찾을 수 없습니다.');
    }
    
    data = allData;
  }
  
  if (error) {
    console.error('음식점 검색 실패:', error);
    throw new Error(getErrorMessage(error));
  }
  
  const row: any = data[0]; // 배열의 첫 번째 요소 사용
  const mapped: RestaurantWithStats = {
    id: row.id,
    name: row.name,
    title: row.title,
    address: row.address,
    phone: row.telephone,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    sub_category: row.category2, 
    region_id: 0,
    region: row.region,
    sub_region: row.sub_region,
    status: row.is_active ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_amount: 0,
    visit_count: row.total_visits ?? 0,
    avg_rating: row.avg_rating ?? 0,
    review_count: row.reviews_count ?? 0,
    favorite_count: row.favorites_count ?? 0,
    region_info: { region: row.region, sub_region: row.sub_region } as any,
    recent_visits: [],
    recent_rankings: [],
  } as any;
  return mapped as any;
};

export const getRestaurantsByRegion = async (
  _regionId: number,
  params?: Omit<RestaurantSearchRequest, 'region_id'>
): Promise<RestaurantListResponse> => {
  // 현재 스키마에는 지역 테이블이 없어 regionId 직접 필터는 미지원.
  // 키워드/카테고리/연도 기반 검색으로 대체.
  return searchRestaurants(params ?? {});
};

// ===================================
// 지역 관련 API
// ===================================

export const getRegions = async (): Promise<RegionListResponse> => {
  const { data, error } = await supabase
    .from('v_region_stats')  // 🎯 restaurants → v_region_stats
    .select('region, sub_region, restaurant_count, total_visits')  // 추가 통계 정보도 가져올 수 있음
    .order('region', { ascending: true })
    .order('sub_region', { ascending: true });
    
  if (error) throw new Error(getErrorMessage(error));
  
  const regions: Region[] = (data ?? []).map((r, idx) => ({
    id: (idx + 1).toString(),
    code: '',
    region: r.region,
    sub_region: r.sub_region,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  
  return {
    success: true,
    message: 'ok',
    data: regions,
    pagination: { page: 1, size: regions.length, total: regions.length, pages: 1 },
  };
};

export const getRegionsByProvince = async (province: string): Promise<RegionListResponse> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('region, sub_region')
    .eq('region', province)
    .order('sub_region', { ascending: true });
  if (error) throw new Error(getErrorMessage(error));
  const unique = Array.from(
    new Map((data ?? []).map((r: any) => [`${r.region}__${r.sub_region}`, r])).values()
  );
  const regions: Region[] = unique.map((r: any, idx: number) => ({
    id: (idx + 1).toString(),
    code: '',
    region: r.region,
    sub_region: r.sub_region,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  return {
    success: true,
    message: 'ok',
    data: regions,
    pagination: { page: 1, size: regions.length, total: regions.length, pages: 1 },
  };
};

// ===================================
// 즐겨찾기 관련 API (로그인 필요)
// ===================================

export const toggleFavorite = async (restaurantId: string): Promise<{ is_favorite: boolean }> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(getErrorMessage(userError));
  const userId = userData.user?.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const { data: existing, error: qErr } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (qErr) throw new Error(getErrorMessage(qErr));

  if (existing) {
    const { error: dErr } = await supabase
      .from('favorites')
      .delete()
      .eq('id', (existing as any).id);
    if (dErr) throw new Error(getErrorMessage(dErr));
    return { is_favorite: false };
  }

  const { error: iErr } = await supabase
    .from('favorites')
    .insert({ user_id: userId, restaurant_id: restaurantId });
  if (iErr) throw new Error(getErrorMessage(iErr));
  return { is_favorite: true };
};

export const getFavoriteRestaurants = async (): Promise<RestaurantListResponse> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(getErrorMessage(userError));
  const userId = userData.user?.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const { data: favRows, error: favErr } = await supabase
    .from('favorites')
    .select('restaurant_id')
    .eq('user_id', userId);
  if (favErr) throw new Error(getErrorMessage(favErr));
  const ids = (favRows ?? []).map((r: any) => r.restaurant_id);
  if (ids.length === 0) {
    return {
      success: true,
      message: 'ok',
      data: [],
      pagination: { page: 1, size: 0, total: 0, pages: 0 },
    };
  }
  const { data, error } = await supabase
    .from('v_restaurants_metrics')
    .select('*')
    .in('id', ids);
  if (error) throw new Error(getErrorMessage(error));
  return {
    success: true,
    message: 'ok',
    data: (data ?? []) as unknown as Restaurant[],
    pagination: { page: 1, size: data?.length ?? 0, total: data?.length ?? 0, pages: 1 },
  };
};

// ===================================
// 리뷰 관련 API
// ===================================

export const getRestaurantReviews = async (
  restaurantId: string,
  page: number = 1,
  size: number = 10
): Promise<import('../types').UserReviewListResponse> => {
  const from = (page - 1) * size;
  const to = from + size - 1;
  const { data, error, count } = await supabase
    .from('v_reviews_detailed')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw new Error(getErrorMessage(error));
  return {
    success: true,
    message: 'ok',
    data: (data ?? []) as any,
    pagination: { page, size, total: count ?? 0, pages: Math.max(1, Math.ceil((count ?? 0) / size)) },
  };
};

export const getRestaurantReviewSummary = async (
  restaurantId: string
): Promise<import('../types').RestaurantReviewSummary> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId);
  if (error) throw new Error(getErrorMessage(error));
  const ratings = (data ?? []).map((r: any) => r.rating as number);
  const total_reviews = ratings.length;
  const average_rating = total_reviews ? ratings.reduce((a, b) => a + b, 0) / total_reviews : undefined;
  const rating_distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  ratings.forEach((r) => (rating_distribution[String(r)] = (rating_distribution[String(r)] ?? 0) + 1));

  // 최근 리뷰 5개
  const { data: recent, error: recErr } = await supabase
    .from('v_reviews_detailed')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (recErr) throw new Error(getErrorMessage(recErr));

  return {
    total_reviews,
    average_rating,
    rating_distribution,
    recent_reviews: (recent ?? []) as any,
  };
};

export const createReview = async (
  reviewData: import('../types').UserReviewCreateRequest
): Promise<import('../types').UserReview> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(getErrorMessage(userError));
  const userId = userData.user?.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  // 사용자가 이미 이 음식점에 리뷰를 작성했는지 확인
  const { data: existingReview, error: checkError } = await supabase
    .from('reviews')
    .select('id')
    .eq('restaurant_id', reviewData.restaurant_id)
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116는 결과가 없는 경우이므로 무시
    throw new Error(getErrorMessage(checkError));
  }

  if (existingReview) {
    throw new Error('이미 이 음식점에 리뷰를 작성하셨습니다.');
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      restaurant_id: reviewData.restaurant_id,
      user_id: userId,
      rating: reviewData.rating,
      content: reviewData.content ?? null,
    })
    .select('*')
    .single();
    
  if (error) {
    // 데이터베이스 제약 조건 위반 시 중복 리뷰 에러로 처리
    if (error.code === '23505' && error.message.includes('reviews_user_restaurant_unique')) {
      throw new Error('이미 이 음식점에 리뷰를 작성하셨습니다.');
    }
    throw new Error(getErrorMessage(error));
  }
  
  return data as any;
};

// ===================================
// 공유 관련 유틸리티
// ===================================

export const shareRestaurant = async (restaurant: RestaurantWithStats): Promise<void> => {
  if (navigator.share) {
    // Web Share API 사용
    try {
      await navigator.share({
        title: restaurant.name,
        text: `${restaurant.name} - ${restaurant.address}`,
        url: window.location.origin + `/restaurants/${restaurant.id}`
      });
    } catch (error) {
      // 사용자가 취소했거나 오류 발생 시 클립보드로 복사
      await copyToClipboard(restaurant);
    }
  } else {
    // Web Share API 미지원 시 클립보드로 복사
    await copyToClipboard(restaurant);
  }
};

const copyToClipboard = async (restaurant: RestaurantWithStats): Promise<void> => {
  const shareText = `${restaurant.name}\n${restaurant.address}\n${window.location.origin}/restaurants/${restaurant.id}`;
  
  try {
    await navigator.clipboard.writeText(shareText);
    // 성공 알림 (실제로는 toast 알림으로 대체)
    alert('링크가 클립보드에 복사되었습니다!');
  } catch (error) {
    // 클립보드 API 미지원 시 fallback
    const textArea = document.createElement('textarea');
    textArea.value = shareText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('링크가 클립보드에 복사되었습니다!');
  }
};

// ===================================
// 홈페이지 통계 관련 API
// ===================================

export interface HomePageStats {
  regionCount: number;
  restaurantCount: number;
  totalVisits: number;
}

export const getHomePageStats = async (): Promise<HomePageStats> => {
  try {
    // 1. 지역 수 가져오기 (v_region_stats에서 고유한 region, sub_region 조합 개수)
    const { data: regionData, error: regionError } = await supabase
      .from('v_region_stats')
      .select('region, sub_region');
    
    if (regionError) {
      console.error('지역 통계 조회 실패:', regionError);
      throw new Error('지역 통계를 불러올 수 없습니다.');
    }

    const regionCount = regionData?.length || 0;

    // 2. 등록된 맛집 수 가져오기 (restaurants 테이블의 활성 레코드 수)
    const { count: restaurantCount, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (restaurantError) {
      console.error('음식점 수 조회 실패:', restaurantError);
      throw new Error('음식점 수를 불러올 수 없습니다.');
    }

    // 3. 총 방문 기록 수 가져오기 (v_region_stats의 total_visits 합계)
    const { data: visitsData, error: visitsError } = await supabase
      .from('v_region_stats')
      .select('total_visits');
    
    if (visitsError) {
      console.error('방문 통계 조회 실패:', visitsError);
      throw new Error('방문 통계를 불러올 수 없습니다.');
    }

    const totalVisits = visitsData?.reduce((sum, row) => sum + (row.total_visits || 0), 0) || 0;

    return {
      regionCount,
      restaurantCount: restaurantCount || 0,
      totalVisits
    };
  } catch (error) {
    console.error('홈페이지 통계 조회 실패:', error);
    throw error;
  }
}; 