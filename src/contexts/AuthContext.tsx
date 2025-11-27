import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { getCurrentUser, logout as logoutAPI } from '../services/kakaoAuthService';
import { login as loginAPI } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { useActivityTracker } from '../hooks/useActivityTracker';
import {
  clearSessionRefreshState,
  ensureSession,
  isOfflineError,
  isSessionTimeoutError,
} from '../services/sessionManager';

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

// 단일 스토리지 키 사용 (admin/user 구분 없이 하나로 통일)
const STORAGE_KEY = 'user';

// localhost 개발 환경 체크
const isLocalhost = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// localhost용 테스트 유저 (auth.users 테이블에 실제 존재하는 ID 사용)
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
  } catch (error) {
    console.warn('로컬 인증 캐시 삭제 실패:', error);
  }
};

const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEY);
    if (userStr) {
      const user = JSON.parse(userStr);
      console.log('🔍 사용자 정보 로드:', user.email, 'is_admin:', user.is_admin, 'role:', user.role);
      return user;
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 파싱 실패:', error);
    return null;
  }
};


// ===================================
// Auth Provider 컴포넌트
// ===================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutCalledRef = useRef(false);
  const logoutAlertShownRef = useRef(false);
  const initTimeoutRef = useRef<number | null>(null);
  const resumePromiseRef = useRef<Promise<void> | null>(null);
  const inactivityRefreshRef = useRef<Promise<void> | null>(null);

  const handleInactivity = useCallback(() => {
    if (inactivityRefreshRef.current) return;
    console.log('🛑 비활성 상태 감지, 조용히 토큰 점검 시작');
    inactivityRefreshRef.current = supabase.auth.refreshSession()
      .then(({ error }) => {
        if (error) {
          console.warn('비활성 상태 토큰 갱신 실패:', error.message ?? error);
        }
      })
      .catch(refreshError => {
        console.error('비활성 상태 토큰 갱신 중 오류:', refreshError);
      })
      .finally(() => {
        inactivityRefreshRef.current = null;
      });
  }, []);

  useActivityTracker(handleInactivity);

  const buildFallbackUser = (sessionUser: any): User => ({
    id: sessionUser.id,
    email: sessionUser.email || '',
    username:
      sessionUser.user_metadata?.nickname ||
      sessionUser.email?.split('@')[0] ||
      'user',
    is_active: true,
    is_admin: false,
    created_at: sessionUser.created_at || new Date().toISOString(),
    role: 'user',
  });

  // ===================================
  // 초기 로그인 상태 확인
  // ===================================

  useEffect(() => {
    const initAuth = async () => {
      // 초기화 시 혹시 남아있을 수 있는 로그인 진행 플래그 제거 (안전장치)
      sessionStorage.removeItem('kakao_auth_ing');

      // localhost 환경에서는 localStorage의 유저 정보 또는 기본 테스트 유저 사용
      if (isLocalhost()) {
        const storedUser = getStoredUser();
        if (storedUser) {
          console.log('🔧 localhost 환경 - 저장된 테스트 유저로 로그인:', storedUser.username);
          setUser(storedUser);
        } else {
          console.log('🔧 localhost 환경 - 기본 테스트 유저로 자동 로그인');
          setUser(LOCALHOST_TEST_USER);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(LOCALHOST_TEST_USER));
        }
        setIsLoading(false);
        return;
      }

      initTimeoutRef.current = window.setTimeout(() => {
        console.warn('⚠️ 인증 초기화 타임아웃, 로딩 해제');
        setIsLoading(false);
      }, 30000);

      try {
        const session = await ensureSession();

        if (!session?.user) {
          setUser(null);
          clearStoredAuthState();
          return;
        }

        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          console.log('💾 저장된 사용자 정보 사용 (즉시):', storedUser.email, 'is_admin:', storedUser.is_admin);
        }

        try {
          const timeoutPromise = new Promise<null>((resolve) => {
            window.setTimeout(() => resolve(null), 5000);
          });

          const currentUser = await Promise.race([
            getCurrentUser(),
            timeoutPromise,
          ]);

          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
            console.log('💾 초기화 - 사용자 정보 저장:', currentUser.email, 'is_admin:', currentUser.is_admin);
          } else if (!storedUser) {
            console.warn('⚠️ 사용자 정보 없음, 세션 정보로 fallback');
            const fallbackUser = buildFallbackUser(session.user);
            setUser(fallbackUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
          }
        } catch (error) {
          if (isOfflineError(error) || isSessionTimeoutError(error)) {
            console.warn('⚠️ 사용자 정보 로드 지연 (오프라인/타임아웃)');
            if (!storedUser) {
              const fallbackUser = buildFallbackUser(session.user);
              setUser(fallbackUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
            }
          } else if (error instanceof Error && (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('invalid'))) {
            console.warn('인증 토큰 오류 감지, 세션 정리');
            setUser(null);
            clearStoredAuthState();
            clearSessionRefreshState();
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('로그아웃 처리 실패:', signOutError);
            }
          } else if (storedUser) {
            console.log('💾 에러 발생, 저장된 사용자 정보 유지');
          } else {
            const fallbackUser = buildFallbackUser(session.user);
            setUser(fallbackUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
          }
        }
      } catch (error) {
        if (isOfflineError(error)) {
          const storedUser = getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          } else {
            setUser(null);
          }
        } else if (isSessionTimeoutError(error)) {
          console.warn('⚠️ 세션 갱신 타임아웃 - 초기화 지연');
        } else {
          console.error('인증 초기화 실패:', error);
          setUser(null);
          clearStoredAuthState();
        }
      } finally {
        if (initTimeoutRef.current !== null) {
          window.clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        setIsLoading(false);
      }
    };

    initAuth();
    
    // localhost 환경에서는 세션 구독 불필요
    if (isLocalhost()) {
      return () => {};
    }
    
    // 세션 변경 구독: 로그인/로그아웃 등 인증 상태 변경 시 사용자 정보를 즉시 동기화
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.email);
      
      try {
        if (event === 'SIGNED_OUT') {
          clearStoredAuthState();
          sessionStorage.clear();
          setUser(null);
          setIsLoading(false);
          
          // 로그아웃 상태 알림 (이미 표시했거나 logout 함수에서 호출한 경우 제외)
          // 무한 알림 방지: logoutAlertShownRef로 이미 표시 여부 추적
          if (!logoutCalledRef.current && !logoutAlertShownRef.current) {
            logoutAlertShownRef.current = true;
            alert('로그아웃이 되었습니다.');
          }
          // 플래그 리셋
          logoutCalledRef.current = false;
          return;
        }

        // TOKEN_REFRESHED 이벤트 처리: 토큰 갱신 후 사용자 정보 확인
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ 토큰이 자동으로 갱신되었습니다.');
          // 토큰 갱신 후 사용자 정보가 유효한지 확인
          if (session?.user) {
            try {
              const currentUser = await getCurrentUser();
              if (currentUser) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
                setUser(currentUser);
                console.log('💾 토큰 갱신 후 사용자 정보 업데이트:', currentUser.email);
              }
            } catch (userError) {
              console.warn('토큰 갱신 후 사용자 정보 확인 실패:', userError);
              // 사용자 정보 확인 실패해도 계속 진행 (토큰은 유효할 수 있음)
            }
          }
          setIsLoading(false);
          return;
        }

        // SIGNED_IN, INITIAL_SESSION만 처리
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          // 로그인 시 로그아웃 알림 플래그 리셋
          logoutAlertShownRef.current = false;
          
          try {
            const currentUser = await getCurrentUser();
            
            if (currentUser) {
              console.log('✅ 사용자 정보 업데이트:', {
                email: currentUser.email,
                username: currentUser.username,
                role: currentUser.role,
                is_admin: currentUser.is_admin
              });
              
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
              console.log('💾 사용자 정보 저장:', STORAGE_KEY, currentUser.email, 'is_admin:', currentUser.is_admin);
              setUser(currentUser);
              setIsLoading(false);
            } else {
              // currentUser가 null인 경우 fallback
              const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'user',
                is_active: true,
                is_admin: false,
                created_at: session.user.created_at || new Date().toISOString(),
                role: 'user',
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
              setUser(fallbackUser);
              setIsLoading(false);
            }
          } catch (userError) {
            console.warn('사용자 정보 가져오기 실패:', userError);
            // fallback: 세션 정보 사용
            const fallbackUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'user',
              is_active: true,
              is_admin: false,
              created_at: session.user.created_at || new Date().toISOString(),
              role: 'user',
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
            setUser(fallbackUser);
            setIsLoading(false);
          }
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('onAuthStateChange 처리 중 오류:', e);
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      // 타임아웃 클리어
      if (initTimeoutRef.current !== null) {
        window.clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, []);

  // ===================================
  // 이메일/비밀번호 로그인 (Admin 로그인용)
  // ===================================

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const authResponse = await loginAPI({ email, password });

      if (!authResponse.user?.id) {
        return false;
      }

      // authResponse.user에 이미 role 정보가 포함되어 있음
      const enrichedUser: User = authResponse.user;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedUser));
      console.log('💾 로그인 - 사용자 정보 저장:', enrichedUser.email, 'is_admin:', enrichedUser.is_admin, 'role:', enrichedUser.role);
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
      logoutCalledRef.current = true; // 로그아웃 함수 호출 플래그 설정
      await logoutAPI();
      clearSessionRefreshState();
      setUser(null);
      clearStoredAuthState();
      sessionStorage.clear();
      
      // 로그아웃 성공 알림
      alert('로그아웃이 되었습니다.');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setUser(null);
      logoutCalledRef.current = true; // 에러가 발생해도 플래그 설정
    } finally {
      setIsLoading(false);
    }
  };

  // ===================================
  // 사용자 정보 새로고침
  // ===================================

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const session = await ensureSession();

      if (!session?.user) {
        setUser(null);
        clearStoredAuthState();
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setUser(null);
        clearStoredAuthState();
        return;
      }

      const currentUser = await getCurrentUser();
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
        console.log('💾 새로고침 - 사용자 정보 저장:', currentUser.email, 'is_admin:', currentUser.is_admin);
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('사용자 정보 새로고침 중 오프라인 감지');
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
        return;
      }

      if (isSessionTimeoutError(error)) {
        console.warn('세션 갱신 타임아웃, 다음 이벤트에서 재시도');
        return;
      }

      console.error('사용자 정보 새로고침 실패:', error);

      if (error instanceof Error && (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('401'))) {
        console.warn('인증 토큰 오류로 인한 로그아웃 처리');
        setUser(null);
        clearStoredAuthState();
        clearSessionRefreshState();
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('로그아웃 처리 실패:', signOutError);
        }
      } else {
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
      }
    }
  }, []);

  const triggerSessionResume = useCallback(async (reason = 'manual'): Promise<void> => {
    // 이미 진행 중이면 기존 Promise 반환
    if (resumePromiseRef.current) {
      return resumePromiseRef.current;
    }

    // 카카오 로그인 진행 중이면 복구 스킵 (경쟁 상태 방지)
    if (sessionStorage.getItem('kakao_auth_ing')) {
      console.log(`🚫 로그인 진행 중, 세션 복구 건너뜀 (${reason})`);
      return;
    }

    const doResume = async () => {
      console.log(`🔄 세션 복구 시작 (${reason})`);
      setIsLoading(true);

      try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error || !data.session) {
          console.warn(`세션 갱신 실패 (${reason}):`, error?.message ?? 'no session');
          await supabase.auth.signOut();
          clearStoredAuthState();
          clearSessionRefreshState();
          setUser(null);
          return;
        }

        console.log(`✅ 세션 갱신 성공 (${reason})`);
        await refreshUser();
      } catch (refreshError) {
        console.error(`세션 복구 중 오류 (${reason}):`, refreshError);
        try {
          await supabase.auth.signOut();
        } catch {}
        clearStoredAuthState();
        clearSessionRefreshState();
        setUser(null);
      } finally {
        setIsLoading(false);
        resumePromiseRef.current = null;
      }
    };

    resumePromiseRef.current = doResume();
    return resumePromiseRef.current;
  }, [refreshUser]);

  useEffect(() => {
    // localhost 환경에서는 세션 자동 갱신 불필요
    if (isLocalhost()) {
      return () => {};
    }

    supabase.auth.startAutoRefresh();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh();
        triggerSessionResume('visibilitychange');
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    const handleFocus = () => {
      supabase.auth.startAutoRefresh();
      triggerSessionResume('focus');
    };

    const handleOnline = () => {
      if (navigator.onLine) {
        supabase.auth.startAutoRefresh();
        triggerSessionResume('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      supabase.auth.stopAutoRefresh();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [triggerSessionResume]);

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
