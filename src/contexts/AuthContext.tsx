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

// 사용자 역할에 따라 스토리지 키 결정
const getUserStorageKey = (isAdmin?: boolean): string => {
  // 명시적으로 isAdmin이 제공되면 그것을 우선 사용
  if (isAdmin !== undefined) {
    return isAdmin ? 'admin_user' : 'user';
  }
  // 그렇지 않으면 경로로 판단
  return window.location.pathname.startsWith('/admin') ? 'admin_user' : 'user';
};

const getStoredUser = (): User | null => {
  try {
    // 먼저 admin_user 확인
    let userStr = localStorage.getItem('admin_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      console.log('🔍 admin_user에서 사용자 정보 로드:', user.email);
      return user;
    }
    
    // admin_user가 없으면 user 확인
    userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      console.log('🔍 user에서 사용자 정보 로드:', user.email);
      return user;
    }
    
    return null;
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
              // getCurrentUser()에서 이미 profiles 정보를 포함하여 가져옴
              // 이중 조회 제거
              setUser(currentUser);
              const storageKey = getUserStorageKey(currentUser.is_admin || currentUser.role === 'admin');
              localStorage.setItem(storageKey, JSON.stringify(currentUser));
              console.log('💾 사용자 정보 저장:', storageKey, currentUser.email);
            } else if (storedUser) {
              setUser(storedUser);
            }
          } catch (error) {
            console.warn('최신 사용자 정보 로드 실패:', error);
            // fallback으로 세션 정보 사용
            if (storedUser) {
              setUser(storedUser);
            }
          }
        } else {
          // 세션이 없으면 로그아웃 상태
          setUser(null);
          // 두 키 모두 삭제
          localStorage.removeItem('admin_user');
          localStorage.removeItem('user');
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
      console.log('🔐 Auth state change:', event, session?.user?.email);
      
      try {
        if (event === 'SIGNED_OUT') {
          // 두 키 모두 삭제
          localStorage.removeItem('admin_user');
          localStorage.removeItem('user');
          sessionStorage.clear();
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          try {
            const currentUser = await getCurrentUser();
            
            if (currentUser) {
              // getCurrentUser()에서 이미 profiles 정보를 포함하여 가져옴
              console.log('✅ 사용자 정보 업데이트:', {
                email: currentUser.email,
                username: currentUser.username,
                role: currentUser.role,
                is_admin: currentUser.is_admin
              });
              
              const storageKey = getUserStorageKey(currentUser.is_admin || currentUser.role === 'admin');
              localStorage.setItem(storageKey, JSON.stringify(currentUser));
              console.log('💾 사용자 정보 저장:', storageKey, currentUser.email);
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
              localStorage.setItem('user', JSON.stringify(fallbackUser));
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
            localStorage.setItem('user', JSON.stringify(fallbackUser));
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

      // profiles 테이블에서 role 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, nickname')
        .eq('user_id', authResponse.user.id)
        .single();

      const enrichedUser: User = {
        ...authResponse.user,
        role: profile?.role || 'user',
        nickname: profile?.nickname || authResponse.user.username,
        is_admin: profile?.role === 'admin',
      };

      const storageKey = getUserStorageKey(profile?.role === 'admin');
      localStorage.setItem(storageKey, JSON.stringify(enrichedUser));
      console.log('💾 로그인 - 사용자 정보 저장:', storageKey, enrichedUser.email);
      setUser(enrichedUser);
      
      return profile?.role === 'admin';
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
      // 두 키 모두 삭제
      localStorage.removeItem('admin_user');
      localStorage.removeItem('user');
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
          // getCurrentUser()에서 이미 profiles 정보를 포함하여 가져옴
          const storageKey = getUserStorageKey(currentUser.is_admin || currentUser.role === 'admin');
          localStorage.setItem(storageKey, JSON.stringify(currentUser));
          console.log('💾 새로고침 - 사용자 정보 저장:', storageKey, currentUser.email);
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