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
  console.log('🔍 [searchRestaurants] 시작, params:', params);
  
  const page = params.page ?? 1;
  const size = params.size ?? 1000;

  // 기본 쿼리 빌더 - 새로운 뷰 사용
  let query = supabase
    .from('v_restaurants_with_stats')
    .select('*', { count: 'exact' });

  // 키워드: 이름/주소 ILIKE
  if (params.keyword) {
    console.log('📝 키워드 필터:', params.keyword);
    query = query.or(
      `name.ilike.%${params.keyword}%,address.ilike.%${params.keyword}%`
    );
  }

  // 지역별 필터링 (sub_add1과 sub_add2로 검색)
  if (params.region_id) {
    console.log('📍 지역 필터:', params.region_id);
    
    // region_id가 문자열이고 "시도명|시군구명" 형태인 경우
    if (typeof params.region_id === 'string' && params.region_id.includes('|')) {
      const [sub_add1, sub_add2] = params.region_id.split('|');
      console.log('   → sub_add1:', sub_add1, ', sub_add2:', sub_add2);
      query = query.eq('sub_add1', sub_add1).eq('sub_add2', sub_add2);
    } else {
      // 기존 호환성을 위해 sub_add2로만 검색 (deprecated)
      console.log('   → sub_add2만:', params.region_id);
      query = query.eq('sub_add2', params.region_id);
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
    visit_count: 'rank_value', // rank_value로 정렬
    rating: 'avg_rating',
    amount: 'total_amount',
    name: 'name',
    total_count: 'rank_value', // rank_value로 정렬
    rank: 'rank_value',
  };
  const sortColumn = sortMap[sortBy] ?? 'rank_value';
  console.log('🔀 정렬:', sortBy, '→', sortColumn);
  query = query.order(sortColumn as any, { ascending: sortBy === 'name' });

  // 페이지네이션
  const from = (page - 1) * size;
  const to = from + size - 1;
  console.log('📄 페이지네이션:', { page, size, from, to });
  
  const { data, error, count } = await query.range(from, to);
  
  if (error) {
    console.error('❌ Supabase 쿼리 에러:', error);
    throw new Error(getErrorMessage(error));
  }

  console.log('✅ 검색 결과:', data?.length || 0, '개 음식점, 전체:', count);

  const items = ((data ?? []) as any[]).map((row: any) => {
    const mapped: RestaurantWithStats = {
      id: row.id,
      name: row.title || row.name,  // title 우선, 없으면 name
      title: row.title || row.name,
      address: row.address,
      phone: row.phone,
      latitude: row.latitude,
      longitude: row.longitude,
      category: row.category,
      sub_category: row.category,
      region_id: 0,
      sub_add1: row.sub_add1,
      sub_add2: row.sub_add2,
      status: row.status ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_amount: row.total_amount ?? 0,
      visit_count: row.visit_count ?? 0,
      avg_rating: row.avg_rating ?? 0,
      review_count: row.review_count ?? 0,
      region_rank: row.region_rank,      // 지역 순위 추가
      province_rank: row.province_rank,  // 광역시/도 순위 추가
      national_rank: row.national_rank,  // 전국 순위 추가
      region_info: { sub_add1: row.sub_add1, sub_add2: row.sub_add2 } as any,
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
    name: row.title || row.name,  // title 우선
    title: row.title || row.name,
    address: row.address,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    sub_category: row.category,
    region_id: 0,
    sub_add1: row.sub_add1,
    sub_add2: row.sub_add2,
    status: row.status ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_amount: row.total_amount ?? 0,
    visit_count: row.visit_count ?? 0,
    avg_rating: row.avg_rating ?? 0,
    review_count: row.review_count ?? 0,
    region_rank: row.region_rank,
    province_rank: row.province_rank,
    national_rank: row.national_rank,
    region_info: { sub_add1: row.sub_add1, sub_add2: row.sub_add2 } as any,
  } as any;
  return mapped as any;
};

export const getRestaurantByLocation = async (
  subAdd1: string, 
  subAdd2: string, 
  title: string
): Promise<RestaurantWithStats> => {
  // URL 디코딩
  const decodedSubAdd1 = decodeURIComponent(subAdd1);
  const decodedSubAdd2 = decodeURIComponent(subAdd2);
  const decodedTitle = decodeURIComponent(title);
  
  console.log('음식점 검색:', { decodedSubAdd1, decodedSubAdd2, decodedTitle });
  
  // 먼저 title로 검색 (활성화된 음식점만)
  let { data, error } = await supabase
    .from('v_restaurants_with_stats')
    .select('*')
    .eq('sub_add1', decodedSubAdd1)
    .eq('sub_add2', decodedSubAdd2)
    .eq('title', decodedTitle)
    .eq('status', true)
    .order('created_at', { ascending: false })
    .limit(1);
  
  // title로 못 찾으면 name으로 시도
  if (!data || data.length === 0) {
    const { data: nameData, error: nameError } = await supabase
      .from('v_restaurants_with_stats')
      .select('*')
      .eq('sub_add1', decodedSubAdd1)
      .eq('sub_add2', decodedSubAdd2)
      .eq('name', decodedTitle)
      .eq('status', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (nameData && nameData.length > 0) {
      data = nameData;
      error = nameError;
    }
  }
  
  // 활성화된 음식점이 없으면 모든 음식점에서 검색 (title 우선)
  if (!data || data.length === 0) {
    const { data: allData, error: allError } = await supabase
      .from('v_restaurants_with_stats')
      .select('*')
      .eq('sub_add1', decodedSubAdd1)
      .eq('sub_add2', decodedSubAdd2)
      .or(`title.eq.${decodedTitle},name.eq.${decodedTitle}`)
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
    name: row.title || row.name,  // title 우선
    title: row.title || row.name,
    address: row.address,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    sub_category: row.category,
    region_id: 0,
    sub_add1: row.sub_add1,
    sub_add2: row.sub_add2,
    status: row.status ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_amount: row.total_amount ?? 0,
    visit_count: row.visit_count ?? 0,
    avg_rating: row.avg_rating ?? 0,
    review_count: row.review_count ?? 0,
    region_rank: row.region_rank,
    province_rank: row.province_rank,
    national_rank: row.national_rank,
    favorite_count: 0,
    region_info: { sub_add1: row.sub_add1, sub_add2: row.sub_add2 } as any,
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
  // RPC로 DISTINCT 쿼리 실행 (중복 제거)
  const { data, error } = await supabase.rpc('get_distinct_regions');
  
  if (error) {
    // Fallback: RPC가 없으면 기존 방식 사용
    console.warn('⚠️ RPC get_distinct_regions not found, using fallback');
    const { data: restaurantData, error: fallbackError } = await supabase
      .from('restaurants')
      .select('sub_add1, sub_add2')
      .not('sub_add1', 'is', null)
      .not('sub_add2', 'is', null);
    
    if (fallbackError) throw new Error(getErrorMessage(fallbackError));
    
    // 중복 제거
    const uniqueMap = new Map<string, any>();
    (restaurantData as any[]).forEach((r) => {
      const key = `${r.sub_add1}__${r.sub_add2}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, r);
      }
    });
    
    const unique = Array.from(uniqueMap.values())
      .sort((a: any, b: any) => {
        if (a.sub_add1 !== b.sub_add1) return a.sub_add1.localeCompare(b.sub_add1);
        return a.sub_add2.localeCompare(b.sub_add2);
      });
    
    const regions: Region[] = unique.map((r: any, idx) => ({
      id: (idx + 1).toString(),
      code: '',
      sub_add1: r.sub_add1,
      sub_add2: r.sub_add2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    return {
      success: true,
      message: 'ok',
      data: regions,
      pagination: { page: 1, size: regions.length, total: regions.length, pages: 1 },
    };
  }
  
  // RPC 결과 반환
  const regions: Region[] = (data as any[]).map((r: any, idx) => ({
    id: (idx + 1).toString(),
    code: '',
    sub_add1: r.sub_add1,
    sub_add2: r.sub_add2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  
  console.log('✅ RPC get_distinct_regions 사용:', regions.length, '개 지역');
  
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
    .select('sub_add1, sub_add2')
    .eq('sub_add1', province)
    .order('sub_add2', { ascending: true });
  if (error) throw new Error(getErrorMessage(error));
  const unique = Array.from(
    new Map((data ?? []).map((r: any) => [`${r.sub_add1}__${r.sub_add2}`, r])).values()
  );
  const regions: Region[] = unique.map((r: any, idx: number) => ({
    id: (idx + 1).toString(),
    code: '',
    sub_add1: r.sub_add1,
    sub_add2: r.sub_add2,
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
    console.log('📊 홈페이지 통계 데이터 로딩 시작...');
    
    // RPC 함수를 사용하여 모든 통계를 한 번에 가져오기
    const { data, error } = await supabase.rpc('get_homepage_stats');
    
    if (error) {
      console.error('❌ 홈페이지 통계 조회 실패:', error);
      throw new Error('홈페이지 통계를 불러올 수 없습니다.');
    }

    console.log('✅ RPC 응답 데이터:', data);

    // 데이터를 객체로 변환
    const statsMap = new Map<string, number>();
    (data as any[]).forEach((row: any) => {
      statsMap.set(row.stat_name, Number(row.stat_value));
    });

    const regionCount = statsMap.get('지역수') || 0;
    const restaurantCount = statsMap.get('맛집수') || 0;
    const totalVisits = statsMap.get('방문기록') || 0;

    console.log('✅ 지역 수:', regionCount);
    console.log('✅ 등록된 맛집 수:', restaurantCount);
    console.log('✅ 총 방문 기록:', totalVisits);

    return {
      regionCount,
      restaurantCount,
      totalVisits
    };
  } catch (error) {
    console.error('❌ 홈페이지 통계 조회 실패:', error);
    throw error;
  }
}; 