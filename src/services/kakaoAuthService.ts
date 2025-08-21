import { supabase } from './supabaseClient';
import { getErrorMessage } from './api';
import { User, AuthResponse } from '../types';

// ===================================
// 카카오 OAuth 전용 인증 서비스
// ===================================

export interface KakaoUserProfile {
  id: string;
  email?: string;
  nickname: string;
  profile_image_url?: string;
}

// 카카오 OAuth 로그인 시작
export const loginWithKakao = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });
  
  if (error) {
    throw new Error(`카카오 로그인 실패: ${getErrorMessage(error)}`);
  }
};

// 카카오 OAuth 회원가입 (로그인과 동일한 플로우)
export const signupWithKakao = async (): Promise<void> => {
  // 카카오 OAuth에서는 로그인과 회원가입이 동일한 프로세스
  return loginWithKakao();
};

// 현재 사용자 정보 가져오기 (카카오 OAuth 기반)
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(getErrorMessage(error));
  }
  
  if (!user) return null;

  // Supabase Auth 사용자 정보를 기반으로 User 타입 생성
  const kakaoId = user.user_metadata?.sub || user.user_metadata?.kakao_id;
  const nickname = user.user_metadata?.name || 
                  user.user_metadata?.nickname || 
                  user.user_metadata?.full_name ||
                  user.email?.split('@')[0] || 
                  'Unknown';

  // profiles 테이블에서 추가 정보 조회 (에러 시에도 기본값 사용)
  let profile = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role, nickname, profile_image_url')
      .eq('user_id', user.id)
      .single();
    profile = data;
  } catch (profileError) {
    console.warn('Profile 정보 조회 실패 (기본값 사용):', profileError);
    // 프로필이 없어도 계속 진행
  }

  return {
    id: user.id,
    email: user.email || '',
    username: profile?.nickname || nickname,
    is_active: true,
    is_admin: profile?.role === 'admin',
    created_at: user.created_at || new Date().toISOString(),
    kakao_id: kakaoId,
    profile_image_url: profile?.profile_image_url || user.user_metadata?.avatar_url,
    provider: 'kakao'
  } as User & { kakao_id?: string; profile_image_url?: string; provider: string };
};

// 로그아웃
export const logout = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } finally {
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

  // profiles 테이블 업데이트
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      nickname: nickname,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (updateError) {
    throw new Error(getErrorMessage(updateError));
  }

  // 업데이트된 사용자 정보 반환
  const updatedUser = await getCurrentUser();
  if (!updatedUser) {
    throw new Error('사용자 정보 업데이트 후 조회에 실패했습니다.');
  }

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
