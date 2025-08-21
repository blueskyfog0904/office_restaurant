import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { saveTermsConsent } from '../../services/kakaoAuthService';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        
        // URL에서 인증 코드나 토큰 처리
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          throw new Error(`인증 처리 실패: ${authError.message}`);
        }

        if (!data.session) {
          throw new Error('인증 세션을 찾을 수 없습니다.');
        }

        // 사용자 정보 새로고침
        await refreshUser();

        // 세션 스토리지에서 약관 동의 정보 확인
        const termsConsentData = sessionStorage.getItem('termsConsent');
        if (termsConsentData) {
          try {
            const consents = JSON.parse(termsConsentData);
            await saveTermsConsent(consents);
            sessionStorage.removeItem('termsConsent');
          } catch (consentError) {
            console.error('약관 동의 저장 실패:', consentError);
            // 약관 동의 저장 실패는 로그인 자체를 막지 않음
          }
        }

        // 로그인 성공 후 리다이렉트
        const redirectTo = sessionStorage.getItem('authRedirectTo') || '/';
        sessionStorage.removeItem('authRedirectTo');
        
        navigate(redirectTo, { replace: true });
        
      } catch (err) {
        console.error('OAuth 콜백 처리 실패:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        
        // 3초 후 로그인 페이지로 리다이렉트
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, refreshUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              카카오 로그인 처리 중...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500">
              <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              로그인 실패
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
            <p className="mt-4 text-xs text-gray-500">
              3초 후 로그인 페이지로 이동합니다...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallbackPage;
