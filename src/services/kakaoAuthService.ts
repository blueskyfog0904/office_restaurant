import { supabase } from './supabaseClient';
import { getErrorMessage } from './api';
import { User } from '../types';
import {
  clearSessionRefreshState,
  ensureSession,
  isOfflineError,
  isSessionTimeoutError,
} from './sessionManager';
import { kakaoLoginPopup } from '../utils/kakao';

// ===================================
// 카카오 OAuth 전용 인증 서비스
// ===================================

interface KakaoSessionResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
  user: User;
}

// 카카오 OAuth 로그인 시작 (Supabase 세션으로 전환)
export const loginWithKakao = async (): Promise<void> => {
  const { accessToken } = await kakaoLoginPopup();
  const session = await exchangeKakaoToken(accessToken);

  if (!session.refresh_token) {
    throw new Error('Supabase 세션 토큰을 받지 못했습니다.');
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) {
    throw new Error(`Supabase 세션 설정 실패: ${getErrorMessage(error)}`);
  }

  const termsConsentData = sessionStorage.getItem('termsConsent');
  if (termsConsentData) {
    try {
      const consents = JSON.parse(termsConsentData);
      await saveTermsConsent(consents);
      sessionStorage.removeItem('termsConsent');
    } catch (consentError) {
      console.error('약관 동의 저장 실패:', consentError);
    }
  }
};

// 카카오 OAuth 회원가입 (로그인과 동일한 플로우)
export const signupWithKakao = async (): Promise<void> => {
  return loginWithKakao();
};

// 현재 사용자 정보 가져오기 (카카오 OAuth 기반)
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const session = await ensureSession();
    if (!session) {
      return null;
    }
  } catch (error) {
    if (isOfflineError(error) || isSessionTimeoutError(error)) {
      console.warn('getCurrentUser: 세션 확인 불가 (오프라인/타임아웃)');
      return null;
    }
    throw error;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    // 인증 관련 에러인 경우 null 반환 (로그아웃 상태로 처리)
    if (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('401')) {
      console.warn('getCurrentUser: 인증 토큰 오류:', error.message);
      return null;
    }
    throw new Error(getErrorMessage(error));
  }
  
  if (!user) return null;

  // profiles 테이블에서 정보 조회 (필수)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, nickname, profile_image_url')
    .eq('user_id', user.id)
    .single();

  console.log('🔍 getCurrentUser - profiles 조회:', {
    user_id: user.id,
    email: user.email,
    profile_nickname: profile?.nickname,
    profile_role: profile?.role,
    kakao_metadata_name: user.user_metadata?.name,
    kakao_metadata_nickname: user.user_metadata?.nickname,
    has_profile: !!profile,
    has_error: !!profileError
  });

  if (profileError) {
    console.error('Profile 조회 실패:', profileError);
    // profiles가 없는 경우 기본 프로필 생성 시도
    const defaultNickname = user.user_metadata?.name || 
                           user.user_metadata?.nickname || 
                           user.email?.split('@')[0] || 
                           'Unknown';
    
    console.log('🆕 기본 프로필 생성 시도:', defaultNickname);
    
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        nickname: defaultNickname,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Profile 생성 실패:', insertError);
    } else {
      console.log('✅ 기본 프로필 생성 성공');
    }
  }

  // Supabase Auth 사용자 정보를 기반으로 User 타입 생성
  const kakaoId = user.user_metadata?.sub || user.user_metadata?.kakao_id;
  
  // profiles.nickname을 최우선으로 사용 (사용자가 수정한 이름 보존)
  // 카카오 메타데이터는 fallback으로만 사용
  const username = profile?.nickname || 
                   user.user_metadata?.name || 
                   user.user_metadata?.nickname || 
                   user.user_metadata?.full_name ||
                   user.email?.split('@')[0] || 
                   'Unknown';

  console.log('✅ getCurrentUser 최종 username:', username, '(profile?.nickname:', profile?.nickname, ')');

  return {
    id: user.id,
    email: user.email || '',
    username: username,
    is_active: true,
    is_admin: profile?.role === 'admin',
    created_at: user.created_at || new Date().toISOString(),
    kakao_id: kakaoId,
    profile_image_url: profile?.profile_image_url || user.user_metadata?.avatar_url,
    provider: 'kakao',
    role: profile?.role || 'user',
    nickname: profile?.nickname,
  } as User & { kakao_id?: string; profile_image_url?: string; provider: string };
};

// 로그아웃
export const logout = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } finally {
    clearSessionRefreshState();
    // 로컬 캐시 정리
    try { 
      localStorage.removeItem('user'); 
      sessionStorage.clear(); 
    } catch {}
  }
};

// 프로필 업데이트 (닉네임만 수정 가능)
export const updateProfile = async (nickname: string): Promise<User> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('로그인된 사용자를 찾을 수 없습니다.');
  }

  console.log('🔄 프로필 업데이트 시작:', {
    user_id: user.id,
    new_nickname: nickname,
    email: user.email
  });

  // profiles 테이블 업데이트
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      nickname: nickname,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .select();

  if (updateError) {
    console.error('❌ 프로필 업데이트 실패:', updateError);
    throw new Error(getErrorMessage(updateError));
  }

  console.log('✅ 프로필 업데이트 성공:', updateData);

  // 업데이트 확인 쿼리
  const { data: verifyData } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('user_id', user.id)
    .single();

  console.log('✅ 업데이트 확인 (DB에서 다시 조회):', verifyData);

  // 업데이트된 사용자 정보 반환
  const updatedUser = await getCurrentUser();
  if (!updatedUser) {
    throw new Error('사용자 정보 업데이트 후 조회에 실패했습니다.');
  }

  console.log('✅ getCurrentUser() 결과:', {
    username: updatedUser.username,
    nickname: updatedUser.nickname
  });

  return updatedUser;
};

// 계정 삭제
export const deleteAccount = async (): Promise<void> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('로그인된 사용자를 찾을 수 없습니다.');
  }

  // profiles 테이블에서 사용자 정보 삭제 (CASCADE로 관련 데이터도 삭제됨)
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    throw new Error(getErrorMessage(deleteError));
  }

  // Supabase Auth에서 사용자 삭제 (관리자 권한 필요)
  // 실제로는 사용자가 직접 삭제할 수 없으므로, 프로필만 비활성화하거나
  // 서버 사이드에서 처리해야 함
  await logout();
};

// 약관 동의 처리 (회원가입 시)
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

// 사용자 활동 내역 관련 함수들 (기존과 동일)
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

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId);
  
  if (error) throw new Error(getErrorMessage(error));
};

const exchangeKakaoToken = async (kakaoAccessToken: string): Promise<KakaoSessionResponse> => {
  const { data, error } = await supabase.functions.invoke('kakao-login', {
    body: { access_token: kakaoAccessToken },
  });

  if (error || !data) {
    throw new Error(error?.message || '카카오 로그인 연동 실패');
  }

  return data as KakaoSessionResponse;
};
