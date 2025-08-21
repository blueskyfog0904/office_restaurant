import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdminLoggedIn, loading } = useAdminAuth();
  const location = useLocation();

  console.log('AdminRoute 상태:', { 
    loading, 
    isAdminLoggedIn, 
    pathname: location.pathname 
  });

  // 로딩 중일 때는 로딩 스피너 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600">
          관리자 인증 확인 중...
        </div>
      </div>
    );
  }

  // 관리자 로그인하지 않은 경우 관리자 로그인 페이지로 리다이렉트
  if (!isAdminLoggedIn) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute; 