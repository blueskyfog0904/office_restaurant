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

// 단일 스토리지 키 사용 (admin/user 구분 없이 하나로 통일)
const STORAGE_KEY = 'user';

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
  const initTimeoutRef = useRef<number | null>(null);

  // ===================================
  // 초기 로그인 상태 확인
  // ===================================

  useEffect(() => {
    const initAuth = async () => {
      // 타임아웃 설정 (30초) - 무한 로딩 방지 (재시도 로직 고려)
      initTimeoutRef.current = window.setTimeout(() => {
        console.warn('⚠️ 인증 초기화 타임아웃, 로딩 해제');
        setIsLoading(false);
      }, 30000);

      try {
        let session = null;
        let sessionError = null;
        
        // 세션 가져오기 재시도 로직 (최대 3회)
        for (let retry = 0; retry < 3; retry++) {
          try {
            const result = await supabase.auth.getSession();
            session = result.data.session;
            sessionError = result.error;
            if (!sessionError && session) break;
            if (retry < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
            }
          } catch (err) {
            sessionError = err as any;
            if (retry < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
            }
          }
        }
        
        // 세션 에러가 있거나 세션이 만료된 경우 갱신 시도
        if (sessionError || !session) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              // 갱신 실패 시 로그아웃 상태로 처리
              console.warn('세션 갱신 실패, 로그아웃 처리:', refreshError?.message);
              setUser(null);
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem('admin_user');
              setIsLoading(false);
              return;
            }
            // 갱신 성공 시 새 세션 사용
            const refreshedSession = refreshData.session;
            if (refreshedSession?.user) {
              try {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                  setUser(currentUser);
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
                  console.log('💾 세션 갱신 후 사용자 정보 저장:', currentUser.email);
                }
              } catch (userError) {
                console.warn('세션 갱신 후 사용자 정보 로드 실패:', userError);
                setUser(null);
                localStorage.removeItem(STORAGE_KEY);
              }
            }
            setIsLoading(false);
            return;
          } catch (refreshErr) {
            console.warn('세션 갱신 시도 실패:', refreshErr);
            setUser(null);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('admin_user');
            setIsLoading(false);
            return;
          }
        }
        
        if (session?.user) {
          // 세션이 있으면 사용자 정보 로드
          const storedUser = getStoredUser();
          
          // 먼저 저장된 사용자 정보를 설정 (즉시 UI 업데이트)
          if (storedUser) {
            setUser(storedUser);
            console.log('💾 저장된 사용자 정보 사용 (즉시):', storedUser.email, 'is_admin:', storedUser.is_admin);
          }
          
          // 서버에서 최신 사용자 정보 가져오기 (타임아웃 적용, 백그라운드)
          try {
            // Promise.race로 타임아웃 적용 (5초)
            const timeoutPromise = new Promise<null>((resolve) => {
              window.setTimeout(() => resolve(null), 5000);
            });
            
            const currentUser = await Promise.race([
              getCurrentUser(),
              timeoutPromise
            ]);
            
            if (currentUser) {
              // 최신 사용자 정보로 업데이트
              setUser(currentUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
              console.log('💾 초기화 - 사용자 정보 저장:', currentUser.email, 'is_admin:', currentUser.is_admin);
            } else {
              // 타임아웃 또는 null 반환 시 저장된 사용자 정보 유지
              if (storedUser) {
                console.warn('⚠️ getCurrentUser 타임아웃 또는 null, 저장된 사용자 정보 유지');
                // 이미 storedUser로 설정되어 있으므로 추가 작업 불필요
              } else {
                // 저장된 사용자 정보도 없으면 세션 정보로 fallback
                console.warn('⚠️ 사용자 정보 없음, 세션 정보로 fallback');
                const fallbackUser: User = {
                  id: session.user.id,
                  email: session.user.email || '',
                  username: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'user',
                  is_active: true,
                  is_admin: false,
                  created_at: session.user.created_at || new Date().toISOString(),
                  role: 'user',
                };
                setUser(fallbackUser);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
              }
            }
          } catch (error) {
            console.warn('최신 사용자 정보 로드 실패:', error);
            // 에러가 인증 관련이면 세션 정리
            if (error instanceof Error && (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('invalid'))) {
              console.warn('인증 토큰 오류 감지, 세션 정리');
              setUser(null);
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem('admin_user');
              try {
                await supabase.auth.signOut();
              } catch (signOutError) {
                console.error('로그아웃 처리 실패:', signOutError);
              }
            } else if (storedUser) {
              // 다른 에러는 저장된 사용자 정보 유지 (이미 설정되어 있음)
              console.log('💾 에러 발생, 저장된 사용자 정보 유지');
            } else {
              // 저장된 사용자 정보도 없으면 세션 정보로 fallback
              const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'user',
                is_active: true,
                is_admin: false,
                created_at: session.user.created_at || new Date().toISOString(),
                role: 'user',
              };
              setUser(fallbackUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
            }
          }
        } else {
          // 세션이 없으면 로그아웃 상태
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          // 레거시 키도 정리
          localStorage.removeItem('admin_user');
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('admin_user');
      } finally {
        // 타임아웃 클리어
        if (initTimeoutRef.current !== null) {
          window.clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        // 항상 로딩 해제 보장
        setIsLoading(false);
      }
    };

    initAuth();
    
    // 세션 변경 구독: 로그인/로그아웃 등 인증 상태 변경 시 사용자 정보를 즉시 동기화
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.email);
      
      try {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('admin_user'); // 레거시 키도 정리
          sessionStorage.clear();
          setUser(null);
          setIsLoading(false);
          
          // 로그아웃 상태 알림 (logout 함수에서 이미 띄운 경우를 제외)
          // logout 함수가 호출되지 않은 경우(자동 로그아웃, 세션 만료 등)에만 알림 띄우기
          if (!logoutCalledRef.current) {
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
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('admin_user'); // 레거시 키도 정리
      
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

  const refreshUser = async (): Promise<void> => {
    try {
      // 먼저 세션 갱신 시도
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        // 세션이 없거나 에러가 있으면 갱신 시도
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.warn('세션 갱신 실패:', refreshError?.message);
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('admin_user');
          return;
        }
      }
      
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const currentUser = await getCurrentUser();
        
        if (currentUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          console.log('💾 새로고침 - 사용자 정보 저장:', currentUser.email, 'is_admin:', currentUser.is_admin);
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('admin_user');
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
      // 인증 관련 에러인 경우에만 로그아웃 처리
      if (error instanceof Error && (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('401'))) {
        console.warn('인증 토큰 오류로 인한 로그아웃 처리');
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('admin_user');
        // logout() 호출 시 무한 루프 방지를 위해 signOut만 호출
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('로그아웃 처리 실패:', signOutError);
        }
      } else {
        // 다른 에러는 로그아웃하지 않고 기존 사용자 정보 유지
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
      }
    }
  };

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
