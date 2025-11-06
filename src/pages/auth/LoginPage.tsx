import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginWithKakao } from '../../services/kakaoAuthService';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = (location.state as any)?.from?.pathname || '/';

  const handleKakaoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      // 리다이렉트 경로를 세션 스토리지에 저장
      sessionStorage.setItem('authRedirectTo', from);
      
      // 카카오 OAuth 로그인 시작
      await loginWithKakao();
      
      // OAuth 리다이렉트가 시작되므로 이 코드는 실행되지 않음
    } catch (error) {
      setError(error instanceof Error ? error.message : '카카오 로그인에 실패했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-32 w-32 flex items-center justify-center">
            {/* 로고 또는 아이콘 */}
            <div className="h-32 w-32 bg-white rounded-lg flex items-center justify-center">
              {/* 로고 */}
              <img 
                src="/images/project_logo.png" 
                alt="공공맛집 로고" 
                className="h-32 w-32 object-contain"
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            공무원맛집에 로그인하세요
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            카카오 계정으로 간편하게 로그인할 수 있습니다
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 카카오 로그인 버튼 */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5">
                  <path fill="#3C1E1E" d="M16 5C9.925 5 5 8.88 5 13.667c0 3.17 2.187 5.93 5.444 7.35-.187.66-.672 2.37-.77 2.74-.12.47.17.46.36.33.15-.1 2.37-1.62 3.33-2.28.85.13 1.73.2 2.64.2 6.075 0 11-3.88 11-8.667C27 8.88 22.075 5 16 5z"/>
                </svg>
              )}
            </span>
            {loading ? '카카오 로그인 중...' : '카카오로 로그인'}
          </button>

          {/* 회원가입 안내 */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              처음 방문이신가요?{' '}
              <button 
                onClick={handleKakaoLogin}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                카카오로 간편가입
              </button>
            </p>
          </div>

          {/* 서비스 소개 */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">공무원맛집이란?</h3>
              <div className="grid grid-cols-1 gap-4 text-sm text-gray-600">
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>공공기관 맛집 정보</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>지역별 맛집 찾기</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>리뷰 및 즐겨찾기 기능</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;