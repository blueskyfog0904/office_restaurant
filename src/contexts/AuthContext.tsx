import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  // ===================================
  // 초기 로그인 상태 확인
  // ===================================

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // 세션이 있으면 사용자 정보 로드
          const storedUser = getStoredUser();
          
          if (storedUser) {
            setUser(storedUser);
          }
          
          // 서버에서 최신 사용자 정보 가져오기
          try {
            const currentUser = await getCurrentUser();
            
            if (currentUser) {
              setUser(currentUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
              console.log('💾 초기화 - 사용자 정보 저장:', currentUser.email, 'is_admin:', currentUser.is_admin);
            } else if (storedUser) {
              setUser(storedUser);
            }
          } catch (error) {
            console.warn('최신 사용자 정보 로드 실패:', error);
            if (storedUser) {
              setUser(storedUser);
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
      } finally {
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
          return;
        }

        // TOKEN_REFRESHED는 너무 자주 발생하므로 필터링
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ 토큰이 자동으로 갱신되었습니다.');
          // localStorage 정보는 그대로 유지, API 호출 생략
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
      await logoutAPI();
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('admin_user'); // 레거시 키도 정리
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
        
        if (currentUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          console.log('💾 새로고침 - 사용자 정보 저장:', currentUser.email, 'is_admin:', currentUser.is_admin);
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
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
    isAdmin: user?.role === 'admin' || user?.is_admin === true,
    logout,
    refreshUser,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
