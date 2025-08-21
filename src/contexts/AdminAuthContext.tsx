import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { login } from '../services/authService';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdminLoggedIn: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          console.log('Initial session found:', session.user.email);
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role, nickname')
              .eq('user_id', session.user.id)
              .single();
            
            if (!mounted) return;
            
            if (error) {
              console.log('Profile not found or error:', error.message);
              setAdminUser(null);
            } else if (profile?.role === 'admin') {
              console.log('Admin user found:', profile);
              setAdminUser({
                id: session.user.id,
                email: session.user.email || '',
                username: profile.nickname || session.user.email?.split('@')[0] || 'admin',
                role: 'admin'
              });
            } else {
              console.log('User is not admin, role:', profile?.role);
              setAdminUser(null);
            }
          } catch (profileError) {
            console.log('Profile query error:', profileError);
            setAdminUser(null);
          }
        } else {
          console.log('No initial session found');
          setAdminUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setAdminUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state change:', _event, session?.user?.email);

        if (!mounted) return;

        try {
          if (session?.user) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role, nickname')
              .eq('user_id', session.user.id)
              .single();

            if (!mounted) return;

            if (error) {
              console.log('Profile fetch error on auth change:', error.message);
              setAdminUser(null);
            } else if (profile?.role === 'admin') {
              setAdminUser({
                id: session.user.id,
                email: session.user.email || '',
                username: profile.nickname || session.user.email?.split('@')[0] || 'admin',
                role: 'admin',
              });
            } else {
              // 비관리자는 세션 유지하되 관리자 권한만 차단
              setAdminUser(null);
            }
          } else {
            setAdminUser(null);
          }
        } catch (e) {
          console.log('Auth change handler error:', e);
          setAdminUser(null);
        } finally {
          // 어떤 이벤트든 로딩 해제 보장
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // 로그인 시도 (실패 시 예외 발생)
      const authResponse = await login({ email, password });

      if (!authResponse.user?.id) {
        return false;
      }

      // 프로필에서 역할 확인
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, nickname')
        .eq('user_id', authResponse.user.id)
        .single();

      if (error || !profile) {
        // 프로필이 없거나 에러인 경우 관리자 아님으로 간주
        // 🔧 세션을 유지하고 관리자 상태만 null로 설정
        setAdminUser(null);
        return false;
      }

      if (profile.role === 'admin') {
        setAdminUser({
          id: authResponse.user.id,
          email: authResponse.user.email,
          username: profile.nickname || authResponse.user.email || 'admin',
          role: 'admin',
        });
        return true;
      }

      // 🔧 관리자 권한이 아니어도 세션은 유지 (일반 사용자로 계속 사용 가능)
      setAdminUser(null);
      return false;
    } catch (error) {
      console.error('관리자 로그인 실패:', error);
      setAdminUser(null);
      return false;
    } finally {
      // 로그인 플로우 종료 시점에 로딩을 강제 해제 (폼 표시 보장)
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value: AdminAuthContextType = {
    adminUser,
    loading,
    login: adminLogin,
    logout,
    isAdminLoggedIn: !!adminUser
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};