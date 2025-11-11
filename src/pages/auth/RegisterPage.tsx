import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signupWithKakao } from '../../services/kakaoAuthService';

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = (location.state as any)?.from?.pathname || '/';

  const handleKakaoSignup = async () => {
    setError('');
    setLoading(true);

    try {
      // 리다이렉트 경로를 세션 스토리지에 저장
      sessionStorage.setItem('authRedirectTo', from);
      
      // 카카오 OAuth 회원가입 시작 (로그인과 동일한 프로세스)
      await signupWithKakao();
      
      // OAuth 리다이렉트가 시작되므로 이 코드는 실행되지 않음
    } catch (error) {
      setError(error instanceof Error ? error.message : '카카오 회원가입에 실패했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
                      <div className="mx-auto h-32 w-32 flex items-center justify-cente4r">
              {/* 로고 */}
              <img 
                src="/images/project_logo.png" 
                alt="공공맛집 로고" 
                className="h-32 w-32 object-contain"
              />
            </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            공무원맛집 회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            카카오 계정으로 간편하게 가입할 수 있습니다
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

          {/* 회원가입 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  간편 회원가입 안내
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>카카오 계정으로 빠르고 안전하게 가입</li>
                    <li>별도 비밀번호 설정 불필요</li>
                    <li>카카오 프로필 정보 자동 연동</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 카카오 회원가입 버튼 */}
          <button
            type="button"
            onClick={handleKakaoSignup}
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
            {loading ? '카카오 회원가입 중...' : '카카오로 회원가입'}
          </button>

          {/* 로그인 페이지 링크 */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <button 
                onClick={() => navigate('/login')}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                로그인하기
              </button>
            </p>
          </div>

          {/* 약관 동의 안내 */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-4">
                카카오로 회원가입 시 공공맛집의 서비스 약관에 동의하게 됩니다.
              </p>
              <div className="flex justify-center space-x-4 text-xs text-gray-400">
                <button 
                  onClick={() => navigate('/terms/service')}
                  className="hover:text-gray-600 underline"
                >
                  서비스 이용약관
                </button>
                <button 
                  onClick={() => navigate('/terms/privacy')}
                  className="hover:text-gray-600 underline"
                >
                  개인정보처리방침
                </button>
              </div>
            </div>
          </div>

          {/* 서비스 특징 */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
              🍽️ 공무원맛집과 함께하세요
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">지역별 맛집 탐색</p>
                  <p className="text-gray-600">전국 공공기관 맛집 정보를 한눈에</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">즐겨찾기 & 리뷰</p>
                  <p className="text-gray-600">나만의 맛집 리스트를 만들고 공유해보세요</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">커뮤니티</p>
                  <p className="text-gray-600">다른 사용자들과 맛집 정보를 나누세요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;