import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { getCurrentUser, logout as logoutAPI } from '../services/kakaoAuthService';
import { login as loginAPI } from '../services/authService';
import { supabase } from '../services/supabaseClient';

// ===================================
// 인증 Context 타입 정의
// ===================================

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
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

const STORAGE_KEY = 'user';

const isLocalhost = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const LOCALHOST_TEST_USER: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@test.com',
  username: '테스트유저',
  is_active: true,
  is_admin: true,
  created_at: new Date().toISOString(),
  role: 'admin',
};

const clearStoredAuthState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('admin_user');
  } catch {}
};

const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

// 세션에서 사용자 정보 추출
const buildUserFromSession = (sessionUser: any): User => ({
  id: sessionUser.id,
  email: sessionUser.email || '',
  username: sessionUser.user_metadata?.nickname || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'user',
  is_active: true,
  is_admin: false,
  created_at: sessionUser.created_at || new Date().toISOString(),
  role: 'user',
});

// ===================================
// Auth Provider 컴포넌트 (단순화)
// ===================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutCalledRef = useRef(false);

  // ===================================
  // 초기화 및 세션 구독
  // ===================================

  useEffect(() => {
    // 초기화 시 로그인 플래그 정리
    sessionStorage.removeItem('kakao_auth_ing');

    // localhost 환경
    if (isLocalhost()) {
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      } else {
        setUser(LOCALHOST_TEST_USER);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(LOCALHOST_TEST_USER));
      }
      setIsLoading(false);
      return;
    }

    // 초기 세션 확인
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // 저장된 사용자 정보가 있으면 먼저 사용
          const storedUser = getStoredUser();
          if (storedUser && storedUser.id === session.user.id) {
            setUser(storedUser);
          } else {
            // profiles에서 추가 정보 로드
            const currentUser = await getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
            } else {
              setUser(buildUserFromSession(session.user));
            }
          }
        } else {
          setUser(null);
          clearStoredAuthState();
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 세션 변경 구독 (단순화)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.email);

      // 로그인 진행 중이면 무시 (loginWithKakao가 처리)
      if (sessionStorage.getItem('kakao_auth_ing')) {
        console.log('🚫 로그인 진행 중, 이벤트 무시');
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearStoredAuthState();
        setUser(null);
        setIsLoading(false);
        
        if (!logoutCalledRef.current) {
          alert('로그아웃이 되었습니다.');
        }
        logoutCalledRef.current = false;
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          // profiles에서 추가 정보 로드
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
            console.log('✅ 로그인 완료:', currentUser.email);
          } else {
            const fallbackUser = buildUserFromSession(session.user);
            setUser(fallbackUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
          }
        } catch (error) {
          console.warn('사용자 정보 로드 실패, fallback 사용:', error);
          const fallbackUser = buildUserFromSession(session.user);
          setUser(fallbackUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
        }
        setIsLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('✅ 토큰 갱신됨');
        // 토큰 갱신 시 사용자 정보는 그대로 유지
        return;
      }

      if (event === 'INITIAL_SESSION') {
        // 이미 initAuth에서 처리됨
        return;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ===================================
  // 이메일/비밀번호 로그인 (Admin용)
  // ===================================

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const authResponse = await loginAPI({ email, password });

      if (!authResponse.user?.id) {
        return false;
      }

      const enrichedUser: User = authResponse.user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedUser));
      setUser(enrichedUser);
      
      return enrichedUser.is_admin || enrichedUser.role === 'admin';
    } catch (error) {
      console.error('로그인 실패:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ===================================
  // 로그아웃
  // ===================================

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      logoutCalledRef.current = true;
      await logoutAPI();
      setUser(null);
      clearStoredAuthState();
      alert('로그아웃이 되었습니다.');
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

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
    }
  }, []);

  // ===================================
  // Context 값
  // ===================================

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin' || user?.is_admin === true,
    logout,
    refreshUser,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
