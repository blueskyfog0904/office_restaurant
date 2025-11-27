import { supabase } from './supabaseClient';
import { getErrorMessage } from './api';
import { User } from '../types';
import { kakaoLoginPopup } from '../utils/kakao';

// ===================================
// 카카오 OAuth 전용 인증 서비스 (단순화)
// ===================================

interface KakaoSessionResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
  user: User;
}

// 카카오 OAuth 로그인 (단순화된 버전)
export const loginWithKakao = async (): Promise<void> => {
  // 로그인 진행 상태 플래그 설정
  sessionStorage.setItem('kakao_auth_ing', 'true');

  try {
    console.log('🔑 카카오 팝업 로그인 시작...');
    const { accessToken } = await kakaoLoginPopup();
    console.log('✅ 카카오 토큰 획득 완료');

    console.log('🔄 Edge Function 호출 중...');
    const session = await exchangeKakaoToken(accessToken);
    console.log('✅ Edge Function 응답 수신');

    if (!session.access_token || !session.refresh_token) {
      throw new Error('Supabase 세션 토큰을 받지 못했습니다.');
    }

    console.log('🔐 Supabase 세션 설정 중...');
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      throw new Error(`세션 설정 실패: ${error.message}`);
    }

    // Edge Function에서 받은 사용자 정보 저장
    if (session.user) {
      localStorage.setItem('user', JSON.stringify(session.user));
    }

    console.log('🎉 카카오 로그인 완료!');
    // onAuthStateChange가 SIGNED_IN 이벤트로 나머지 처리
  } finally {
    sessionStorage.removeItem('kakao_auth_ing');
  }
};

// 카카오 OAuth 회원가입 (로그인과 동일)
export const signupWithKakao = loginWithKakao;

// 현재 사용자 정보 가져오기 (단순화)
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // profiles 테이블에서 추가 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nickname, profile_image_url')
    .eq('user_id', user.id)
    .single();

  const username = profile?.nickname || 
                   user.user_metadata?.nickname || 
                   user.user_metadata?.name ||
                   user.email?.split('@')[0] || 
                   'Unknown';

  return {
    id: user.id,
    email: user.email || '',
    username,
    is_active: true,
    is_admin: profile?.role === 'admin',
    created_at: user.created_at || new Date().toISOString(),
    role: profile?.role || 'user',
    nickname: profile?.nickname,
    profile_image_url: profile?.profile_image_url || user.user_metadata?.avatar_url,
  } as User;
};

// 로그아웃
export const logout = async (): Promise<void> => {
  await supabase.auth.signOut();
  localStorage.removeItem('user');
  localStorage.removeItem('admin_user');
  sessionStorage.clear();
};

// 프로필 업데이트
export const updateProfile = async (nickname: string): Promise<User> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('로그인된 사용자를 찾을 수 없습니다.');
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      nickname,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (updateError) {
    throw new Error(getErrorMessage(updateError));
  }

  const updatedUser = await getCurrentUser();
  if (!updatedUser) {
    throw new Error('사용자 정보 조회 실패');
  }

  return updatedUser;
};

// 계정 삭제
export const deleteAccount = async (): Promise<void> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('로그인된 사용자를 찾을 수 없습니다.');
  }

  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    throw new Error(getErrorMessage(deleteError));
  }

  await logout();
};

// 약관 동의 저장
export const saveTermsConsent = async (consents: Array<{
  terms_id: string;
  version: number;
  agreed: boolean;
  code: string;
  title: string;
}>): Promise<void> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('로그인된 사용자를 찾을 수 없습니다.');
  }

  const rows = consents.map(consent => ({
    user_id: user.id,
    terms_id: consent.terms_id,
    version: consent.version,
    agreed: consent.agreed,
  }));

  const { error: consentError } = await supabase
    .from('user_terms_consents')
    .insert(rows);

  if (consentError) {
    throw new Error(`약관 동의 저장 실패: ${getErrorMessage(consentError)}`);
  }
};

// 사용자 즐겨찾기 조회
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

// 사용자 게시글 조회
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

// 사용자 리뷰 조회
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

// 즐겨찾기 삭제
export const removeFavorite = async (favoriteId: string): Promise<void> => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId);
  
  if (error) throw new Error(getErrorMessage(error));
};

// Edge Function으로 카카오 토큰 교환
const exchangeKakaoToken = async (kakaoAccessToken: string): Promise<KakaoSessionResponse> => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/kakao-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ access_token: kakaoAccessToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || `카카오 로그인 연동 실패 (${response.status})`);
  }

  return await response.json();
};
