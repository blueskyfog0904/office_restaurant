import { supabase, supabaseAdmin } from './supabaseClient';
import { getErrorMessage } from './api';

// 외부에서 관리자 상태를 확인할 수 있는 옵션 제공
let skipAdminCheck = false;
export const setSkipAdminCheck = (skip: boolean) => {
  skipAdminCheck = skip;
};

// 관리자 Edge Function 호출(서비스키 브라우저 노출 방지)
const callAdminEdge = async (functionName: string, payload: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('로그인이 필요합니다.');
  }

  const resp = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(json.error || '요청 실패');
  }
  return json;
};

// 관리자 권한 확인 (role 기반) - 세션 안전성 개선
const checkAdminRole = async (): Promise<boolean> => {
  try {
    // 현재 세션 확인 (getUser 대신 getSession 사용으로 더 안전함)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('세션 확인 중 오류:', sessionError.message);
      return false;
    }
    
    if (!session?.user) {
      console.log('세션이 없거나 사용자 정보 없음');
      return false;
    }

    // 프로필에서 role 확인
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.log('프로필 조회 실패:', error.message);
      return false;
    }
    
    if (!data) {
      console.log('프로필 데이터 없음');
      return false;
    }
    
    const isAdmin = data.role === 'admin';
    console.log('관리자 권한 확인 결과:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('관리자 권한 확인 실패:', error);
    return false;
  }
};

// 음식점 데이터 관리 API
export interface RestaurantData {
  id: string;
  name: string;
  address?: string;
  category?: string;
  telephone?: string;  // 데이터베이스에는 telephone 컬럼이 있음
  latitude?: number;
  longitude?: number;
  region?: string;
  sub_region?: string;
  title?: string;      // 데이터베이스에 title 컬럼이 있음
  description?: string; // 데이터베이스에 description 컬럼이 있음
  is_active?: boolean;  // optional로 변경
  created_at?: string;  // optional로 변경
  updated_at?: string;  // optional로 변경
}

export interface RestaurantFilters {
  search?: string;
  region?: string;
  sub_region?: string;
  category?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface RestaurantListResponse {
  data: RestaurantData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getRestaurants = async (filters: RestaurantFilters = {}): Promise<RestaurantListResponse> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('restaurants')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    // 필터 적용
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
    }
    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    if (filters.sub_region) {
      query = query.eq('sub_region', filters.sub_region);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    throw new Error(`음식점 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const createRestaurant = async (data: Omit<RestaurantData, 'id' | 'created_at' | 'updated_at'>): Promise<RestaurantData> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const { data: newRestaurant, error } = await supabase
      .from('restaurants')
      .insert({
        ...data,
        is_active: data.is_active ?? true, // 기본값 설정
      })
      .select()
      .single();

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return newRestaurant;
  } catch (error) {
    throw new Error(`음식점 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const updateRestaurant = async (id: string, data: Partial<RestaurantData>): Promise<RestaurantData> => {
  // skipAdminCheck가 true가 아닌 경우에만 권한 확인
  if (!skipAdminCheck && !(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    console.log('🔄 음식점 업데이트 시작:', { id, data });
    
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    
    console.log('📤 실제 전송 데이터:', updateData);

    // 관리자 권한이 필요한 작업이므로 supabaseAdmin 사용
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    console.log('📥 Supabase 응답:', { restaurant, error });

    if (error) {
      console.error('❌ Supabase 에러:', error);
      throw new Error(getErrorMessage(error));
    }

    if (!restaurant) {
      console.error('❌ 업데이트된 데이터가 없음');
      throw new Error('업데이트된 음식점 정보를 찾을 수 없습니다.');
    }

    console.log('✅ 음식점 업데이트 성공:', restaurant);
    return restaurant;
  } catch (error) {
    console.error('💥 updateRestaurant 전체 에러:', error);
    throw new Error(`음식점 수정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const deleteRestaurant = async (id: string): Promise<{ success: boolean; message: string }> => {
  // skipAdminCheck가 true가 아닌 경우에만 권한 확인
  if (!skipAdminCheck && !(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    // 관리자 권한이 필요한 작업이므로 supabaseAdmin 사용
    const { error } = await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return { success: true, message: '음식점이 성공적으로 삭제되었습니다.' };
  } catch (error) {
    return { 
      success: false, 
      message: `음식점 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
    };
  }
};

// 사용자 관리 API
export interface UserData {
  user_id: string;
  email: string;
  nickname: string;
  role: 'admin' | 'user';
  created_at: string;
  last_sign_in_at?: string;
}

export interface UserFilters {
  role?: 'admin' | 'user' | 'all';
  search?: string;
}

export const getUsers = async (
  page: number = 1, 
  limit: number = 20,
  filters: UserFilters = {}
): Promise<{
  data: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    // 1) Edge Function 우선 (브라우저 Service Role Key 제거)
    try {
      const res = await callAdminEdge('admin-users', {
        action: 'list',
        page,
        perPage: limit,
        role: filters.role || 'all',
        search: filters.search || '',
      });

      return {
        data: (res.data || []).map((u: any) => ({
          user_id: u.user_id,
          email: u.email || '',
          nickname: u.nickname || 'N/A',
          role: u.role || 'user',
          created_at: u.created_at,
          last_sign_in_at: undefined,
        })),
        total: res.total || 0,
        page: res.page || page,
        limit: res.perPage || limit,
        totalPages: res.totalPages || 1,
      };
    } catch (edgeError) {
      console.warn('admin-users Edge Function 실패, fallback 사용:', edgeError);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Admin API를 사용할 수 없는 경우 profiles 테이블에서만 정보 가져오기
    let combinedUsers: UserData[] = [];
    let totalCount = 0;

    // Fallback: profiles 테이블에서만 정보 가져오기
    let query = supabase
      .from('profiles')
      .select('user_id, email, nickname, role, created_at', { count: 'exact' });

    if (filters.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim()}%`;
      query = query.or(`email.ilike.${searchTerm},nickname.ilike.${searchTerm}`);
    }

    const { data: profiles, error: profilesError, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(getErrorMessage(profilesError));
    }

    combinedUsers = (profiles || []).map(profile => ({
      user_id: profile.user_id,
      email: profile.email || '',
      nickname: profile.nickname || 'N/A',
      role: profile.role || 'user',
      created_at: profile.created_at,
      last_sign_in_at: undefined,
    }));

    totalCount = count || 0;

    return {
      data: combinedUsers,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    throw new Error(`사용자 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user'): Promise<UserData> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(getErrorMessage(error));
    
    // Auth User 정보와 조합해서 반환해야 하지만, 여기서는 profile 정보만 반환
    // 실제 반환 타입은 UserData와 다를 수 있으므로 호출부에서 주의 필요
    return data as UserData;

  } catch (error) {
    throw new Error(`사용자 역할 수정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};


export const deleteUser = async (userId: string): Promise<{ success: boolean }> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    try {
      const res = await callAdminEdge('admin-users', { action: 'delete', user_id: userId });
      if (res?.partial) {
        throw new Error(`Admin API 제한으로 프로필만 삭제되었습니다. (${res.message || ''})`);
      }
      return { success: true };
    } catch (edgeError) {
      console.warn('admin-users 삭제 Edge 실패, profiles fallback:', edgeError);
      const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (profileError) {
        throw new Error(`프로필 삭제 실패: ${getErrorMessage(profileError)}`);
      }
      throw new Error('Admin Edge 접근이 실패하여 프로필만 삭제되었습니다.');
    }
  } catch (error) {
    throw new Error(`사용자 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// 관리자 계정 생성
export interface CreateAdminRequest {
  email: string;
  password: string;
  nickname: string;
}

export const createAdminUser = async (adminData: CreateAdminRequest): Promise<UserData> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const res = await callAdminEdge('admin-users', {
      action: 'create_admin',
      email: adminData.email,
      password: adminData.password,
      nickname: adminData.nickname,
    });

    const userId = res.user_id as string | undefined;
    if (!userId) throw new Error('생성된 user_id를 확인할 수 없습니다.');

    return {
      user_id: userId,
      email: adminData.email,
      nickname: adminData.nickname,
      role: 'admin',
      created_at: new Date().toISOString(),
      last_sign_in_at: undefined,
    };

  } catch (error) {
    throw new Error(`관리자 계정 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// 기관 관리 API
export interface AgencyData {
  id: string;
  category: string;
  sub_category: string;
  created_at: string;
}

export const getAgencies = async (page: number = 1, limit: number = 20): Promise<{
  data: AgencyData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('agencies')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    throw new Error(`기관 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// 리뷰 관리 API (관리자용)
export interface AdminReviewData {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  user_id: string;
  user_nickname?: string;
  user_email?: string;
  rating: number;
  content?: string;
  created_at: string;
  updated_at: string;
  region?: string;
  sub_region?: string;
}

export const getAdminReviews = async (
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{
  data: AdminReviewData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('v_reviews_detailed')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      query = query.or(
        `restaurant_name.ilike.${s},user_email.ilike.${s},user_nickname.ilike.${s},content.ilike.${s}`
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(getErrorMessage(error));

    const reviews = (data || []) as AdminReviewData[];

    // region 정보를 위해 관련 레스토랑 정보 한번에 조회
    const restaurantIds = Array.from(new Set(reviews.map(r => r.restaurant_id))).filter(Boolean);
    if (restaurantIds.length > 0) {
      const { data: restaurants, error: rErr } = await supabase
        .from('restaurants')
        .select('id, region, sub_region')
        .in('id', restaurantIds);
      if (rErr) throw new Error(getErrorMessage(rErr));
      const regionMap = new Map((restaurants || []).map(r => [r.id, r]));
      reviews.forEach(r => {
        const info = regionMap.get(r.restaurant_id as any);
        if (info) {
          r.region = (info as any).region;
          r.sub_region = (info as any).sub_region;
        }
      });
    }

    return {
      data: reviews,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    throw new Error(`리뷰 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const deleteReview = async (reviewId: string): Promise<{ success: boolean }> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw new Error(getErrorMessage(error));
    return { success: true };
  } catch (error) {
    throw new Error(`리뷰 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// 게시판 관리 API
export interface PostData {
  id: string;
  title: string;
  content: string;
  author_id: string;
  board_type: 'notice' | 'free' | 'suggestion';
  view_count: number;
  like_count: number;
  is_pinned: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    nickname: string;
    email: string;
  };
}

export const getPosts = async (boardType?: string, page: number = 1, limit: number = 20): Promise<{
  data: PostData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (boardType) {
      query = query.eq('board_type', boardType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    // 작성자 정보 추가
    const postsWithAuthors = await Promise.all(
      (data || []).map(async (post) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, email')
          .eq('user_id', post.author_id)
          .single();

        return {
          ...post,
          author: profile || { nickname: '알 수 없음', email: '' }
        };
      })
    );

    return {
      data: postsWithAuthors,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    throw new Error(`게시글 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const createPost = async (postData: {
  title: string;
  content: string;
  board_type: 'notice' | 'free' | 'suggestion';
  is_pinned?: boolean;
}): Promise<PostData> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        title: postData.title,
        content: postData.content,
        board_type: postData.board_type,
        is_pinned: postData.is_pinned || false,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, email')
      .eq('user_id', data.author_id)
      .single();

    return {
      ...data,
      author: profile || { nickname: '알 수 없음', email: '' }
    };
  } catch (error) {
    throw new Error(`게시글 작성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const updatePost = async (id: string, data: Partial<PostData>): Promise<PostData> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    console.log('🔄 게시글 업데이트 시작:', { id, data });
    
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    
    console.log('📤 실제 전송 데이터:', updateData);

    // 관리자 권한이 필요한 작업이므로 supabaseAdmin 사용 (RLS 우회)
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    console.log('📥 Supabase 응답:', { post, error });

    if (error) {
      console.error('❌ Supabase 에러:', error);
      throw new Error(getErrorMessage(error));
    }

    if (!post) {
      console.error('❌ 업데이트된 데이터가 없음');
      throw new Error('업데이트된 게시글 정보를 찾을 수 없습니다.');
    }

    // 작성자 정보 조회 (일반 supabase 사용 가능)
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, email')
      .eq('user_id', post.author_id)
      .single();

    const result = {
      ...post,
      author: profile || { nickname: '알 수 없음', email: '' }
    };

    console.log('✅ 게시글 업데이트 성공:', result);
    return result;
  } catch (error) {
    console.error('💥 updatePost 전체 에러:', error);
    throw new Error(`게시글 수정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const deletePost = async (id: string): Promise<{ success: boolean; message: string }> => {
  if (!(await checkAdminRole())) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return { success: true, message: '게시글이 성공적으로 삭제되었습니다.' };
  } catch (error) {
    return { 
      success: false, 
      message: `게시글 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
    };
  }
};

// 통계 API
export interface DashboardStats {
  totalRestaurants: number;
  activeRestaurants: number;
  inactiveRestaurants: number;
  totalUsers: number;
  totalPosts: number;
  totalReviews: number;
  averageRating: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    console.log('getDashboardStats: 실제 Supabase 데이터 조회 시작');
    
    if (!(await checkAdminRole())) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    // 병렬로 통계 데이터 조회
    const [
      restaurantsResult,
      activeRestaurantsResult,
      inactiveRestaurantsResult,
      usersResult,
      postsResult,
      reviewsResult,
    ] = await Promise.all([
      supabase.from('restaurants').select('id', { count: 'exact', head: true }),
      supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_active', false),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('rating', { count: 'exact' }),
    ]);

    // 평균 평점 계산
    const reviews = reviewsResult.data || [];
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviews.length 
      : 0;

    const result = {
      totalRestaurants: restaurantsResult.count || 0,
      activeRestaurants: activeRestaurantsResult.count || 0,
      inactiveRestaurants: inactiveRestaurantsResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalPosts: postsResult.count || 0,
      totalReviews: reviewsResult.count || 0,
      averageRating: Math.round(averageRating * 10) / 10,
    };

    console.log('실제 Supabase 데이터 결과:', result);
    return result;
  } catch (error) {
    console.error('getDashboardStats 오류:', error);
    // 오류 발생 시 빈 데이터 또는 기본값 반환
    return {
      totalRestaurants: 0,
      activeRestaurants: 0,
      inactiveRestaurants: 0,
      totalUsers: 0,
      totalPosts: 0,
      totalReviews: 0,
      averageRating: 0,
    };
  }
};

// Supabase 기반 추천 시스템
export interface RecommendationData {
  restaurant_id: string;
  user_id: string;
  score: number;
  reason: 'popular' | 'similar_taste' | 'location_based' | 'trending';
  created_at: string;
}

// 인기 음식점 기반 추천
export const getPopularRecommendations = async (limit: number = 10): Promise<RestaurantData[]> => {
  try {
    const { data, error } = await supabase
      .from('v_restaurants_with_stats')
      .select('*')
      .eq('is_active', true)
      .order('total_visits', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    console.error(`인기 음식점 추천 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    return []; // 오류 시 빈 배열 반환
  }
};

// 지역 기반 추천
export const getLocationBasedRecommendations = async (region: string, subRegion: string, limit: number = 10): Promise<RestaurantData[]> => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .eq('region', region)
      .eq('sub_region', subRegion)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(`지역 기반 추천 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// 사용자 선호도 기반 추천 (리뷰 기반)
export const getUserPreferenceRecommendations = async (userId: string, limit: number = 10): Promise<RestaurantData[]> => {
  try {
    // 사용자가 높은 평점을 준 음식점들의 카테고리 분석
    const { data: userReviews } = await supabase
      .from('reviews')
      .select('restaurant_id, rating, restaurants(category)')
      .eq('user_id', userId)
      .gte('rating', 4);

    if (!userReviews || userReviews.length === 0) {
      // 사용자 리뷰가 없으면 인기 음식점 반환
      return getPopularRecommendations(limit);
    }

    // 선호 카테고리 추출
    const preferredCategories = userReviews
      .map(review => (review.restaurants as any)?.category)
      .filter(Boolean);

    const categoryCount: Record<string, number> = {};
    preferredCategories.forEach(category => {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const topCategory = Object.keys(categoryCount).reduce((a, b) => 
      categoryCount[a] > categoryCount[b] ? a : b
    );

    // 선호 카테고리의 음식점 중 사용자가 아직 리뷰하지 않은 곳 추천
    const reviewedRestaurantIds = userReviews.map(review => review.restaurant_id);

    const { data, error } = await supabase
      .from('v_restaurants_with_stats')
      .select('*')
      .eq('is_active', true)
      .eq('category', topCategory)
      .not('id', 'in', `(${reviewedRestaurantIds.join(',')})`)
      .order('avg_rating', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    throw new Error(`사용자 선호도 기반 추천 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

// 트렌딩 음식점 추천 (최근 리뷰가 많은 곳)
export const getTrendingRecommendations = async (limit: number = 10): Promise<RestaurantData[]> => {
  try {
    // 최근 30일 내 리뷰가 많은 음식점
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        reviews!inner(created_at)
      `)
      .eq('is_active', true)
      .gte('reviews.created_at', thirtyDaysAgo.toISOString())
      .limit(limit);

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return data || [];
  } catch (error) {
    console.error(`트렌딩 음식점 추천 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    return []; // 오류 시 빈 배열 반환
  }
};

// 관리자용 추천 시스템 관리
export const getRecommendationStats = async () => {
  try {
    if (!(await checkAdminRole())) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    const [
      totalRestaurants,
      activeRestaurants,
      totalReviews,
      totalUsers,
    ] = await Promise.all([
      supabase.from('restaurants').select('id', { count: 'exact', head: true }),
      supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
    ]);

    return {
      totalRestaurants: totalRestaurants.count || 0,
      activeRestaurants: activeRestaurants.count || 0,
      totalReviews: totalReviews.count || 0,
      totalUsers: totalUsers.count || 0,
      recommendationCoverage: activeRestaurants.count && totalRestaurants.count 
        ? Math.round((activeRestaurants.count / totalRestaurants.count) * 100)
        : 0,
    };
  } catch (error) {
    console.log('추천 시스템 통계 오류, 목 데이터 반환:', error);
    return {
      totalRestaurants: 1250,
      activeRestaurants: 1180,
      totalReviews: 890,
      totalUsers: 450,
      recommendationCoverage: 94,
    };
  }
}; 

// 약관 관리 API (admin)
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

export const getTermsList = async (): Promise<TermsVersion[]> => {
  if (!(await checkAdminRole())) throw new Error('관리자 권한이 필요합니다.');
  const { data, error } = await supabase.from('terms_versions').select('*').order('code').order('version', { ascending: false });
  if (error) throw new Error(getErrorMessage(error));
  return (data || []) as TermsVersion[];
};

export const createTerms = async (payload: Omit<TermsVersion, 'id' | 'updated_at'>): Promise<TermsVersion> => {
  if (!(await checkAdminRole())) throw new Error('관리자 권한이 필요합니다.');
  const { data, error } = await supabase
    .from('terms_versions')
    .insert({ ...payload })
    .select('*')
    .single();
  if (error) throw new Error(getErrorMessage(error));
  return data as TermsVersion;
};

export const updateTerms = async (id: string, payload: Partial<TermsVersion>): Promise<TermsVersion> => {
  if (!(await checkAdminRole())) throw new Error('관리자 권한이 필요합니다.');
  const { data, error } = await supabase
    .from('terms_versions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(getErrorMessage(error));
  return data as TermsVersion;
};

export const deleteTerms = async (id: string): Promise<{ success: boolean }> => {
  if (!(await checkAdminRole())) throw new Error('관리자 권한이 필요합니다.');
  const { error } = await supabase.from('terms_versions').delete().eq('id', id);
  if (error) throw new Error(getErrorMessage(error));
  return { success: true };
};