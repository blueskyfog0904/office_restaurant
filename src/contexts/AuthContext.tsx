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

const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch {
    return null;
  }
};

const buildFallbackUser = (sessionUser: any): User => ({
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
  const isProcessingAuthRef = useRef(false);

  // ===================================
  // 초기화 - 빠르게 로딩 해제
  // ===================================

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);

    const checkSession = async () => {
      if (isProcessingAuthRef.current) return;
      isProcessingAuthRef.current = true;

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.warn('⚠️ 세션이 유효하지 않음, 로그아웃 처리');
          await supabase.auth.signOut();
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('admin_user');
          setUser(null);
          
          if (storedUser) {
            window.location.reload();
          }
          return;
        }

        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !authUser) {
          console.warn('⚠️ 사용자 정보 조회 실패, 로그아웃 처리');
          await supabase.auth.signOut();
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
          return;
        }
        
        try {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          }
        } catch (e) {
          console.warn('사용자 정보 조회 실패:', e);
        }
      } catch (e) {
        console.warn('세션 확인 실패:', e);
      } finally {
        isProcessingAuthRef.current = false;
      }
    };

    const timeoutId = setTimeout(checkSession, 100);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.email);

      if (isProcessingAuthRef.current && event === 'SIGNED_IN') {
        console.log('⏭️ 이미 처리 중, SIGNED_IN 스킵');
        return;
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('admin_user');
        setUser(null);
        
        if (!logoutCalledRef.current) {
          alert('로그아웃이 되었습니다.');
        }
        logoutCalledRef.current = false;
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ 토큰 갱신됨 - 기존 사용자 정보 유지');
        return;
      }

      if (event === 'INITIAL_SESSION') {
        console.log('🔄 초기 세션 이벤트 - checkSession에서 처리');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        isProcessingAuthRef.current = true;
        try {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
            console.log('✅ 로그인 완료:', currentUser.email);
          } else {
            const fallbackUser = buildFallbackUser(session.user);
            setUser(fallbackUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
          }
        } catch (e) {
          console.warn('사용자 정보 로드 실패:', e);
          const fallbackUser = buildFallbackUser(session.user);
          setUser(fallbackUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
        } finally {
          isProcessingAuthRef.current = false;
        }
        return;
      }
    });

    return () => {
      clearTimeout(timeoutId);
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
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('admin_user');
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
