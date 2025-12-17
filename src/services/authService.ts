import { getErrorMessage } from './api';
import { supabase, getSupabaseAdmin } from './supabaseClient';
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
import { ensureSession, executeWithSession, executePublicApi } from './sessionManager';

const isLocalhost = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// auth.users 테이블에 실제 존재하는 테스트 유저 ID
const LOCALHOST_USER_ID = '11111111-1111-1111-1111-111111111111';

// localhost에서 사용할 클라이언트 (Service Role Key로 RLS 우회)
const getClient = () => isLocalhost() ? getSupabaseAdmin() : supabase;

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
  
  // profiles 테이블에서 role 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nickname')
    .eq('user_id', user.id)
    .single();
  
  console.log('🔍 로그인 - profile 조회:', { user_id: user.id, role: profile?.role, nickname: profile?.nickname });
  
  return {
    access_token: data.session?.access_token || '',
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email ?? '',
      username: profile?.nickname ?? user.user_metadata?.nickname ?? user.email ?? '',
      is_active: true,
      is_admin: profile?.role === 'admin',
      role: profile?.role || 'user',
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

  // profiles 테이블에서 role 정보 가져오기 (회원가입 직후에는 아직 없을 수 있음)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nickname')
    .eq('user_id', user.id)
    .single();

  console.log('🔍 회원가입 - profile 조회:', { user_id: user.id, role: profile?.role, nickname: profile?.nickname });

  return {
    access_token: data.session?.access_token || '',
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email ?? '',
      username: profile?.nickname ?? user.user_metadata?.nickname ?? userData.username,
      is_active: true,
      is_admin: profile?.role === 'admin',
      role: profile?.role || 'user',
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
  await ensureSession();
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

const searchRestaurantsInternal = async (params: RestaurantSearchRequest): Promise<RestaurantListResponse> => {
  const startTime = performance.now();
  console.log('🔍 [searchRestaurants] 시작, params:', params);
  
  const page = params.page ?? 1;
  const size = params.size ?? 1000;

  // 지역 필터가 있는 경우 직접 restaurants 테이블 사용 (인덱스 활용으로 빠름)
  const hasRegionFilter = params.region_id && typeof params.region_id === 'string';
  const useDirectTable = hasRegionFilter && !params.keyword && !params.year;

  if (useDirectTable && params.region_id) {
    let sub_add1: string | undefined;
    let sub_add2: string | undefined;
    const regionId = params.region_id;
    
    if (regionId.includes('|')) {
      [sub_add1, sub_add2] = regionId.split('|');
    } else if (regionId.includes(' ')) {
      const parts = regionId.split(' ');
      if (parts.length >= 2) {
        sub_add1 = parts[0];
        sub_add2 = parts.slice(1).join(' ');
      } else {
        sub_add2 = regionId;
      }
    } else {
      sub_add2 = regionId;
    }

    // 직접 restaurants 테이블에서 쿼리 (약 400배 빠름)
    let query = supabase
      .from('restaurants')
      .select('id,name,title,address,road_address,telephone,latitude,longitude,category,category2,sub_add1,sub_add2,is_active,created_at,updated_at,total_count,rank_value,primary_photo_url', { count: 'exact' })
      .eq('is_active', true);

    if (sub_add1) {
      query = query.eq('sub_add1', sub_add1);
    }
    if (sub_add2) {
      query = query.eq('sub_add2', sub_add2);
    }

    // 카테고리 필터
    if (params.category) {
      query = query.eq('category', params.category);
    }

    // 정렬
    const sortBy = (params.order_by ?? 'visit_count').toLowerCase();
    const sortMap: Record<string, string> = {
      visit_count: 'rank_value',
      rating: 'rank_value',
      amount: 'total_count',
      name: 'name',
      total_count: 'rank_value',
      rank: 'rank_value',
    };
    const sortColumn = sortMap[sortBy] ?? 'rank_value';
    query = query.order(sortColumn as any, { ascending: sortBy === 'name' });

    // 페이지네이션
    const from = (page - 1) * size;
    const to = from + size - 1;
    
    const { data, error, count } = await query.range(from, to);
    
    if (error) {
      console.error('❌ Supabase 쿼리 에러:', error);
      throw new Error(getErrorMessage(error));
    }

    const queryTime = performance.now() - startTime;
    console.log(`⏱️ searchRestaurants 쿼리 시간: ${queryTime.toFixed(2)}ms`);

    // 순위 계산을 위한 데이터 구조
    const dataWithRankValue = (data ?? []).map((row: any) => ({
      ...row,
      rank_value: row.rank_value ?? 0
    }));

    // Dense rank 계산
    let currentRank = 1;
    let prevRankValue: number | null = null;
    const itemsWithRank = dataWithRankValue.map((row: any) => {
      const rankValue = row.rank_value;
      
      if (prevRankValue !== null && rankValue !== prevRankValue) {
        currentRank++;
      }
      
      prevRankValue = rankValue;
      return { ...row, calculatedRank: currentRank };
    });

    // 통계 정보는 별도로 조회하지 않고 기본값 사용 (성능 우선)
    const items = itemsWithRank.map((row: any) => {
      const mapped: RestaurantWithStats = {
        id: row.id,
        name: row.title || row.name,
        title: row.title || row.name,
        address: row.address,
        road_address: row.road_address,
        phone: row.telephone,
        latitude: row.latitude,
        longitude: row.longitude,
        category: row.category,
        sub_category: row.category,
        category2: row.category2,
        region_id: 0,
        sub_add1: row.sub_add1,
        sub_add2: row.sub_add2,
        status: row.is_active ? 'active' : 'inactive',
        created_at: row.created_at,
        updated_at: row.updated_at,
        total_amount: (row.total_count ?? 0) as number,
        visit_count: row.total_count ?? 0,
        avg_rating: 0,
        review_count: 0,
        region_rank: row.calculatedRank,
        province_rank: null,
        national_rank: null,
        favorite_count: 0,
        region_info: { sub_add1: row.sub_add1, sub_add2: row.sub_add2 } as any,
        recent_visits: [],
        recent_rankings: [],
        primary_photo_url: row.primary_photo_url,
      } as any;
      return mapped;
    });

    console.log('✅ 검색 결과:', items.length, '개 음식점, 전체:', count);

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
  }

  // 복잡한 필터가 있는 경우 뷰 사용 (키워드 검색, 연도 필터 등)
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
    
    if (typeof params.region_id === 'string' && params.region_id.includes('|')) {
      const [sub_add1, sub_add2] = params.region_id.split('|');
      console.log('   → sub_add1:', sub_add1, ', sub_add2:', sub_add2);
      query = query.eq('sub_add1', sub_add1).eq('sub_add2', sub_add2);
    } else if (typeof params.region_id === 'string' && params.region_id.includes(' ')) {
      const parts = params.region_id.split(' ');
      if (parts.length >= 2) {
        const sub_add1 = parts[0];
        const sub_add2 = parts.slice(1).join(' ');
        console.log('   → sub_add1:', sub_add1, ', sub_add2:', sub_add2);
        query = query.eq('sub_add1', sub_add1).eq('sub_add2', sub_add2);
      } else {
        console.log('   → sub_add2만:', params.region_id);
        query = query.eq('sub_add2', params.region_id);
      }
    } else {
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
    visit_count: 'rank_value',
    rating: 'rank_value',
    amount: 'total_count',
    name: 'name',
    total_count: 'rank_value',
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

  const queryTime = performance.now() - startTime;
  console.log(`⏱️ searchRestaurants 쿼리 시간: ${queryTime.toFixed(2)}ms`);
  console.log('✅ 검색 결과:', data?.length || 0, '개 음식점, 전체:', count);

  const items = ((data ?? []) as any[]).map((row: any) => {
    const mapped: RestaurantWithStats = {
      id: row.id,
      name: row.title || row.name,
      title: row.title || row.name,
      address: row.address,
      phone: row.phone,
      latitude: row.latitude,
      longitude: row.longitude,
      category: row.category,
      sub_category: row.category,
      category2: row.category2,
      region_id: 0,
      sub_add1: row.sub_add1,
      sub_add2: row.sub_add2,
      status: row.status ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_amount: (row.total_count ?? 0) as number,
      visit_count: row.visit_count ?? 0,
      avg_rating: 0,
      review_count: row.review_count ?? 0,
      region_rank: row.region_rank,
      province_rank: row.province_rank,
      national_rank: row.national_rank,
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

export const searchRestaurants = async (params: RestaurantSearchRequest): Promise<RestaurantListResponse> => {
  return executePublicApi(() => searchRestaurantsInternal(params), 'searchRestaurants');
};

export const getRestaurantById = async (id: string): Promise<RestaurantWithStats> => {
  return executePublicApi(async () => {
    const startTime = performance.now();
    // ID로 조회하는 경우도 직접 restaurants 테이블 사용 (더 빠름)
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,title,address,road_address,telephone,latitude,longitude,category,category2,sub_add1,sub_add2,is_active,created_at,updated_at,total_count,primary_photo_url')
      .eq('id', id)
      .single();
    if (error) throw new Error(getErrorMessage(error));
    
    const queryTime = performance.now() - startTime;
    console.log(`⏱️ getRestaurantById 쿼리 시간: ${queryTime.toFixed(2)}ms`);
    
    const row: any = data;
    const mapped: RestaurantWithStats = {
      id: row.id,
      name: row.title || row.name,
      title: row.title || row.name,
      address: row.address,
      road_address: row.road_address,
      phone: row.telephone,
      latitude: row.latitude,
      longitude: row.longitude,
      category: row.category,
      sub_category: row.category,
      category2: row.category2,
      region_id: 0,
      sub_add1: row.sub_add1,
      sub_add2: row.sub_add2,
      status: row.is_active ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_amount: (row.total_count ?? 0) as number,
      visit_count: row.total_count ?? 0,
      avg_rating: 0,
      review_count: 0,
      region_rank: null,
      province_rank: null,
      national_rank: null,
      favorite_count: 0,
      region_info: { sub_add1: row.sub_add1, sub_add2: row.sub_add2 } as any,
      recent_visits: [],
      recent_rankings: [],
      primary_photo_url: row.primary_photo_url,
    } as any;
    return mapped as any;
  }, 'getRestaurantById');
};

export const getNearbyRestaurants = async (
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<RestaurantWithStats[]> => {
  const degToRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const deltaLat = (radiusKm / earthRadiusKm) * (180 / Math.PI);
  const cosLat = Math.cos(degToRad(latitude));
  const deltaLon = cosLat !== 0
    ? (radiusKm / earthRadiusKm) * (180 / Math.PI) / cosLat
    : 180;

  const minLat = latitude - deltaLat;
  const maxLat = latitude + deltaLat;
  const minLon = longitude - deltaLon;
  const maxLon = longitude + deltaLon;

  const { data, error } = await supabase
    .from('v_restaurants_with_stats')
    .select('*')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLon)
    .lte('longitude', maxLon)
    .limit(2000);

  if (error) {
    console.error('❌ getNearbyRestaurants 오류:', error);
    throw new Error(getErrorMessage(error));
  }

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    name: row.title || row.name,
    title: row.title || row.name,
    address: row.address,
    road_address: row.road_address,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    sub_category: row.category,
    category2: row.category2,
    region_id: 0,
    sub_add1: row.sub_add1,
    sub_add2: row.sub_add2,
    status: row.status ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_amount: (row.total_count ?? 0) as number,
    visit_count: row.visit_count ?? 0,
    avg_rating: row.avg_rating ?? 0,
    review_count: row.review_count ?? 0,
    region_rank: row.region_rank,
    province_rank: row.province_rank,
    national_rank: row.national_rank,
    favorite_count: row.favorite_count ?? 0,
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    share_count: row.share_count ?? 0,
    total_visit_count: row.total_visit_count ?? 0,
    total_visit_amount: row.total_visit_amount ?? 0,
    last_visit_date: row.last_visit_date,
    region_info: { sub_add1: row.sub_add1, sub_add2: row.sub_add2 },
  })) as unknown as RestaurantWithStats[];
};

export const getRestaurantByLocation = async (
  subAdd1: string, 
  subAdd2: string, 
  title: string
): Promise<RestaurantWithStats> => {
  const startTime = performance.now();
  const decodedSubAdd1 = decodeURIComponent(subAdd1);
  const decodedSubAdd2 = decodeURIComponent(subAdd2);
  const decodedTitle = decodeURIComponent(title);
  
  // 인덱스를 최대한 활용하기 위해 title로 먼저 시도 (unique_restaurant_location 인덱스 활용)
  let query = supabase
    .from('restaurants')
    .select('id,name,title,address,road_address,telephone,latitude,longitude,category,category2,sub_add1,sub_add2,is_active,created_at,updated_at,total_count,primary_photo_url')
    .eq('sub_add1', decodedSubAdd1)
    .eq('sub_add2', decodedSubAdd2)
    .eq('title', decodedTitle)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  
  let { data, error } = await query;
  
  // title로 찾지 못한 경우 name으로 시도
  if ((!data || data.length === 0) && !error) {
    query = supabase
      .from('restaurants')
      .select('id,name,title,address,road_address,telephone,latitude,longitude,category,category2,sub_add1,sub_add2,is_active,created_at,updated_at,total_count,primary_photo_url')
      .eq('sub_add1', decodedSubAdd1)
      .eq('sub_add2', decodedSubAdd2)
      .eq('name', decodedTitle)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);
    
    const result = await query;
    data = result.data;
    error = result.error;
  }
  
  if (error) {
    console.error('음식점 검색 실패:', error);
    throw new Error(getErrorMessage(error));
  }
  
  if (!data || data.length === 0) {
    throw new Error('음식점을 찾을 수 없습니다.');
  }
  
  const queryTime = performance.now() - startTime;
  console.log(`⏱️ getRestaurantByLocation 쿼리 시간: ${queryTime.toFixed(2)}ms`);
  
  const row: any = data[0];
  
  // 통계 정보는 별도로 조회하지 않고 기본값 사용 (필요시 별도 API 호출)
  const mapped: RestaurantWithStats = {
    id: row.id,
    name: row.title || row.name,
    title: row.title || row.name,
    address: row.address,
    road_address: row.road_address,
    phone: row.telephone,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category,
    sub_category: row.category,
    category2: row.category2,
    region_id: 0,
    sub_add1: row.sub_add1,
    sub_add2: row.sub_add2,
    status: row.is_active ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_amount: (row.total_count ?? 0) as number,
    visit_count: row.total_count ?? 0,
    avg_rating: 0,
    review_count: 0,
    region_rank: null,
    province_rank: null,
    national_rank: null,
    favorite_count: 0,
    region_info: { sub_add1: row.sub_add1, sub_add2: row.sub_add2 } as any,
    primary_photo_url: row.primary_photo_url,
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
  return executePublicApi(async () => {
    const { data, error } = await supabase.rpc('get_distinct_regions');
    
    if (error) {
      console.warn('⚠️ RPC get_distinct_regions not found, using fallback');
      const { data: restaurantData, error: fallbackError } = await supabase
        .from('restaurants')
        .select('sub_add1, sub_add2')
        .not('sub_add1', 'is', null)
        .not('sub_add2', 'is', null);
      
      if (fallbackError) throw new Error(getErrorMessage(fallbackError));
      
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
      
      const regionsFromFallback: Region[] = unique.map((r: any, idx) => ({
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
        data: regionsFromFallback,
        pagination: { page: 1, size: regionsFromFallback.length, total: regionsFromFallback.length, pages: 1 },
      };
    }
    
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
  }, 'getRegions');
};

export const getRegionsByProvince = async (province: string): Promise<RegionListResponse> => {
  return executePublicApi(async () => {
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
  }, 'getRegionsByProvince');
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

// ===================================
// 음식점 사진 관련 API
// ===================================

export interface RestaurantPhoto {
  id: string;
  restaurant_id: string;
  photo_reference: string | null;
  photo_url: string;
  description: string | null;
  uploaded_at: string;
  display_order: number;
}

export const getRestaurantPhotos = async (restaurantId: string): Promise<RestaurantPhoto[]> => {
  const { data, error } = await supabase
    .from('restaurant_photos')
    .select('id, restaurant_id, photo_reference, photo_url, description, uploaded_at, display_order')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)  // 비활성화된 이미지(Google 등) 제외
    .order('display_order', { ascending: true })
    .order('uploaded_at', { ascending: true })
    .limit(30);

  if (error) {
    console.error('음식점 사진 조회 실패:', error);
    throw new Error(getErrorMessage(error));
  }

  return (data || []) as RestaurantPhoto[];
};

export const getRestaurantReviewSummary = async (
  restaurantId: string
): Promise<import('../types').RestaurantReviewSummary> => {
  const startTime = performance.now();
  
  const [summaryResult, distributionResult] = await Promise.allSettled([
    supabase
      .from('v_restaurants_with_stats')
      .select('review_count')
      .eq('id', restaurantId)
      .single(),
    supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', restaurantId)
  ]);
  
  let total_reviews = 0;
  let average_rating: number | undefined = undefined;
  
  if (summaryResult.status === 'fulfilled' && summaryResult.value.data) {
    total_reviews = summaryResult.value.data.review_count ?? 0;
  }
  
  if (distributionResult.status === 'fulfilled' && distributionResult.value.data) {
    const ratings = (distributionResult.value.data ?? []).map((r: any) => r.rating as number);
    if (ratings.length > 0) {
      total_reviews = ratings.length;
      average_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
  }
  
  const rating_distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  if (distributionResult.status === 'fulfilled' && distributionResult.value.data) {
    const ratings = (distributionResult.value.data ?? []).map((r: any) => r.rating as number);
    ratings.forEach((r) => (rating_distribution[String(r)] = (rating_distribution[String(r)] ?? 0) + 1));
  }
  
  const queryTime = performance.now() - startTime;
  console.log(`⏱️ getRestaurantReviewSummary 쿼리 시간: ${queryTime.toFixed(2)}ms`);
  
  return {
    total_reviews,
    average_rating,
    rating_distribution,
    recent_reviews: [],
  };
};

export const createReview = async (
  reviewData: import('../types').UserReviewCreateRequest
): Promise<import('../types').UserReview> => {
  let userId: string;
  
  if (isLocalhost()) {
    userId = LOCALHOST_USER_ID;
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(getErrorMessage(userError));
    userId = userData.user?.id || '';
    if (!userId) throw new Error('로그인이 필요합니다.');
  }

  // localhost가 아닌 경우에만 중복 리뷰 체크
  if (!isLocalhost()) {
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('restaurant_id', reviewData.restaurant_id)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(getErrorMessage(checkError));
    }

    if (existingReview) {
      throw new Error('이미 이 음식점에 리뷰를 작성하셨습니다.');
    }
  }

  // localhost에서는 admin client 사용 (RLS 우회)
  const client = getClient();
  
  const { data, error } = await client
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
    if (error.code === '23505' && error.message.includes('reviews_user_restaurant_unique')) {
      throw new Error('이미 이 음식점에 리뷰를 작성하셨습니다.');
    }
    throw new Error(getErrorMessage(error));
  }
  
  return data as any;
};

export const updateReview = async (
  reviewId: string,
  reviewData: import('../types').UserReviewUpdateRequest
): Promise<import('../types').UserReview> => {
  let userId: string;
  
  if (isLocalhost()) {
    userId = LOCALHOST_USER_ID;
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(getErrorMessage(userError));
    userId = userData.user?.id || '';
    if (!userId) throw new Error('로그인이 필요합니다.');
  }

  const client = getClient();
  
  const updateData: any = {};
  if (reviewData.rating !== undefined) {
    updateData.rating = reviewData.rating;
  }
  if (reviewData.content !== undefined) {
    updateData.content = reviewData.content || null;
  }

  const { data, error } = await client
    .from('reviews')
    .update(updateData)
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select('*')
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('리뷰를 찾을 수 없거나 수정 권한이 없습니다.');
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
  console.log('📊 홈페이지 통계 데이터 로딩 시작...');
  
  // 각 통계를 독립적으로 조회 (하나가 실패해도 다른 것은 성공할 수 있도록)
  let regionCount = 0;
  let restaurantCount = 0;
  let totalVisits = 0;

  // 지역 수 조회
  try {
    const { data, error } = await supabase.rpc('get_distinct_sub_add2_count');
    if (!error && data) {
      regionCount = data;
    } else {
      // Fallback: 직접 쿼리
      const { data: fallbackData } = await supabase
        .from('restaurants')
        .select('sub_add2')
        .not('sub_add2', 'is', null)
        .limit(10000);
      if (fallbackData) {
        const uniqueSubAdd2 = new Set(fallbackData.map((r: any) => r.sub_add2).filter(Boolean));
        regionCount = uniqueSubAdd2.size;
      }
    }
  } catch (e) {
    console.warn('지역 수 조회 실패:', e);
  }

  // 음식점 수 조회
  try {
    const { count, error } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true });
    if (!error && count) {
      restaurantCount = count;
    }
  } catch (e) {
    console.warn('음식점 수 조회 실패:', e);
  }

  // 총 방문 수 조회
  try {
    const { data, error } = await supabase
      .from('visit_summary')
      .select('total_count');
    if (!error && data) {
      totalVisits = data.reduce((sum: number, item: any) => sum + (item.total_count || 0), 0);
    }
  } catch (e) {
    console.warn('방문 수 조회 실패:', e);
  }

  console.log('✅ 통계 로드 완료:', { regionCount, restaurantCount, totalVisits });

  return { regionCount, restaurantCount, totalVisits };
}; 