import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { getCurrentUser, logout as logoutAPI } from '../services/kakaoAuthService';
import { supabase } from '../services/supabaseClient';

// ===================================
// 인증 Context 타입 정의
// ===================================

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ===================================
// Context 생성
// ===================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===================================
// Custom Hook
// ===================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ===================================
// 유틸리티 함수들
// ===================================

const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('사용자 정보 파싱 실패:', error);
    return null;
  }
};

const isTokenValid = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

// ===================================
// Auth Provider 컴포넌트
// ===================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ===================================
  // 초기 로그인 상태 확인
  // ===================================

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (await isTokenValid()) {
          // 토큰이 있고 유효한 경우 사용자 정보 로드
          const storedUser = getStoredUser();
          
          if (storedUser) {
            setUser(storedUser);
            
            // 서버에서 최신 사용자 정보 가져오기 (선택적)
            try {
              const currentUser = await getCurrentUser();
              setUser(currentUser);
              localStorage.setItem('user', JSON.stringify(currentUser));
            } catch (error) {
              // 서버에서 사용자 정보를 가져오지 못하면 저장된 정보 사용
              console.warn('최신 사용자 정보 로드 실패:', error);
            }
          }
        } else {
          // 토큰이 없거나 유효하지 않은 경우 로그아웃 상태로 설정
          setUser(null);
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // 세션 변경 구독: 로그인/로그아웃/비밀번호변경 등 토큰 갱신 시 사용자 정보를 즉시 동기화
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('user');
          sessionStorage.clear();
          setUser(null);
          return;
        }

        if (session?.user) {
          try {
            const currentUser = await getCurrentUser();
            localStorage.setItem('user', JSON.stringify(currentUser));
            setUser(currentUser);
          } catch (userError) {
            console.warn('사용자 정보 가져오기 실패:', userError);
            // 🔧 사용자 정보 가져오기 실패해도 세션은 유지
            // 관리자 로그인 후 일반 사용자로 전환할 때 발생할 수 있는 문제 방지
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'user',
              is_active: true,
              is_admin: false,
              created_at: session.user.created_at || new Date().toISOString(),
            };
            localStorage.setItem('user', JSON.stringify(fallbackUser));
            setUser(fallbackUser);
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn('onAuthStateChange 처리 중 오류:', e);
        // 🔧 오류 발생해도 완전히 로그아웃하지 않고 기존 사용자 정보 유지
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 카카오 OAuth는 별도 login/register 함수가 불필요
  // loginWithKakao(), signupWithKakao() 함수를 직접 사용

  // ===================================
  // 로그아웃
  // ===================================

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await logoutAPI();
      setUser(null);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ===================================
  // 사용자 정보 새로고침
  // ===================================

  const refreshUser = async (): Promise<void> => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const currentUser = await getCurrentUser();
        localStorage.setItem('user', JSON.stringify(currentUser));
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
      // 사용자 정보 로드 실패시 로그아웃
      await logout();
    }
  };

  // ===================================
  // Context 값
  // ===================================

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn: !!user,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 