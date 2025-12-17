import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { getCurrentUser, logout as logoutAPI } from '../services/kakaoAuthService';
import { login as loginAPI } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { withTimeout, forceSignOut, clearSessionRefreshState, validateSession } from '../services/sessionManager';

const SESSION_CHECK_TIMEOUT_MS = 8000;

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

const isLocalhost = (): boolean => {
  try {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const isLocalTestUser = (u: User | null): boolean => {
  if (!u) return false;
  const isTestId = u.id === '00000000-0000-0000-0000-000000000000';
  const isTestEmail = typeof u.email === 'string' && u.email.endsWith('localhost.dev');
  return isLocalhost() && (isTestId || isTestEmail);
};

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
  const sessionExpiredHandledRef = useRef(false);

  // 세션 만료 처리 함수
  const handleSessionExpired = useCallback(async (showAlert: boolean = true) => {
    if (sessionExpiredHandledRef.current) return;
    sessionExpiredHandledRef.current = true;

    console.log('🔒 세션 만료 처리 시작');
    // localhost 테스트 유저는 Supabase 세션이 없을 수 있으므로 강제 로그아웃을 막음
    const localUser = getStoredUser();
    if (isLocalTestUser(localUser)) {
      setUser(localUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
      sessionExpiredHandledRef.current = false;
      return;
    }
    
    try {
      await forceSignOut();
    } catch (e) {
      console.warn('세션 정리 중 오류:', e);
    }

    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('admin_user');
    clearSessionRefreshState();

    if (showAlert) {
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    // 1초 후 플래그 리셋 (다음 이벤트 처리 가능하도록)
    setTimeout(() => {
      sessionExpiredHandledRef.current = false;
    }, 1000);
  }, []);

  // ===================================
  // 초기화 - 빠르게 로딩 해제
  // ===================================

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);

    const checkSession = async (isVisibilityChange = false) => {
      if (isProcessingAuthRef.current) return;
      isProcessingAuthRef.current = true;

      try {
        const localUserPresent = !!getStoredUser();
        const localUser = getStoredUser();
        if (isLocalTestUser(localUser)) {
          setUser(localUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
          return;
        }
        // 먼저 빠른 세션 검증 시도
        const { isValid, needsRefresh } = await validateSession();
        
        if (!isValid) {
          console.warn('⚠️ 세션이 유효하지 않음, 로그아웃 처리');
          await handleSessionExpired(!isVisibilityChange && !!storedUser);
          return;
        }

        if (needsRefresh) {
          console.log('🔄 토큰 갱신 필요, 갱신 시도');
          try {
            const refreshResult = await withTimeout(
              supabase.auth.refreshSession(),
              SESSION_CHECK_TIMEOUT_MS,
              'refreshSession'
            );
            
            if (refreshResult.error || !refreshResult.data.session) {
              console.warn('⚠️ 세션 갱신 실패, 로그아웃 처리');
              await handleSessionExpired(!isVisibilityChange && !!storedUser);
              return;
            }
          } catch (e) {
            console.warn('⚠️ 세션 갱신 중 오류:', e);
            await handleSessionExpired(!isVisibilityChange && !!storedUser);
            return;
          }
        }

        // 타임아웃 적용된 사용자 정보 조회
        const userResult = await withTimeout(
          supabase.auth.getUser(),
          SESSION_CHECK_TIMEOUT_MS,
          'getUser'
        );
        
        if (userResult.error || !userResult.data.user) {
          console.warn('⚠️ 사용자 정보 조회 실패, 로그아웃 처리');
          await handleSessionExpired(!isVisibilityChange && !!storedUser);
          return;
        }
        
        try {
          const currentUser = await withTimeout(
            getCurrentUser(),
            SESSION_CHECK_TIMEOUT_MS,
            'getCurrentUser'
          );
          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          }
        } catch (e) {
          console.warn('사용자 정보 조회 실패:', e);
        }
      } catch (e) {
        console.warn('세션 확인 실패 (타임아웃 포함):', e);
        // 타임아웃 시 로컬 상태 정리
        if (storedUser) {
          await handleSessionExpired(false);
        }
      } finally {
        isProcessingAuthRef.current = false;
      }
    };

    const timeoutId = setTimeout(() => checkSession(false), 100);

    // 앱이 백그라운드 → 포그라운드로 전환될 때 세션 재확인 (iOS Safari 대응)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 앱 포그라운드 전환 - 세션 재확인');
        // 약간의 딜레이 후 세션 확인 (iOS Safari 안정화)
        setTimeout(() => checkSession(true), 500);
      }
    };

    // 세션 만료 이벤트 리스너 (sessionManager에서 발생)
    const handleSessionExpiredEvent = () => {
      console.log('🔔 세션 만료 이벤트 수신');
      handleSessionExpired(true);
    };

    // 세션 갱신 실패 이벤트 리스너 (supabaseClient에서 발생)
    const handleSessionRefreshFailed = () => {
      console.log('🔔 세션 갱신 실패 이벤트 수신');
      handleSessionExpired(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('session-expired', handleSessionExpiredEvent);
    window.addEventListener('session-refresh-failed', handleSessionRefreshFailed);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.email);

      if (isProcessingAuthRef.current && event === 'SIGNED_IN') {
        console.log('⏭️ 이미 처리 중, SIGNED_IN 스킵');
        return;
      }

      if (event === 'SIGNED_OUT') {
        // localhost 테스트 유저 모드에서는 Supabase 세션 없음으로 SIGNED_OUT가 반복될 수 있음 → 무시
        const localUser = getStoredUser();
        if (isLocalTestUser(localUser)) {
          return;
        }
        const wasLoggedIn = !!getStoredUser();
        
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('admin_user');
        setUser(null);
        
        // 이미 로그아웃 상태였거나, 명시적 로그아웃이면 알람 표시 안함
        if (wasLoggedIn && !logoutCalledRef.current) {
          alert('로그아웃이 되었습니다.');
        }
        logoutCalledRef.current = false;
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (!session) {
          console.warn('⚠️ 토큰 갱신됐지만 세션 없음');
          await handleSessionExpired(true);
          return;
        }
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
          const currentUser = await withTimeout(
            getCurrentUser(),
            SESSION_CHECK_TIMEOUT_MS,
            'getCurrentUser'
          );
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('session-expired', handleSessionExpiredEvent);
      window.removeEventListener('session-refresh-failed', handleSessionRefreshFailed);
      subscription.unsubscribe();
    };
  }, [handleSessionExpired]);

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
    } catch (error) {
      console.error('로그아웃 실패 또는 타임아웃:', error);
      // 실패해도 로컬 상태는 정리
      await forceSignOut();
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('admin_user');
      setIsLoading(false);
      alert('로그아웃이 되었습니다.');
    }
  };

  // ===================================
  // 사용자 정보 새로고침
  // ===================================

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const currentUser = await withTimeout(
        getCurrentUser(),
        SESSION_CHECK_TIMEOUT_MS,
        'refreshUser'
      );
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
