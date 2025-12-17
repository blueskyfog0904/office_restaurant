import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginWithKakao } from '../../services/kakaoAuthService';
import { supabase } from '../../services/supabaseClient';

const isLocalhost = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // localhost 테스트 로그인용 상태
  const [testEmail, setTestEmail] = useState('testaccount@localhost.dev');
  const [testPassword, setTestPassword] = useState('testaccount1234');
  const [testUsername, setTestUsername] = useState('테스트유저');
  const [isAdmin, setIsAdmin] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const from = (location.state as any)?.from?.pathname || '/';

  const handleKakaoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithKakao();
      navigate(from, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : '카카오 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // localhost 테스트 로그인 - 실제 Supabase Auth 사용
  const handleTestLogin = async () => {
    if (!isLocalhost()) {
      setError('테스트 로그인은 localhost에서만 가능합니다.');
      return;
    }

    setTestLoading(true);
    setError('');

    try {
      // 로그인 시도
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('계정이 존재하지 않습니다. Supabase 대시보드 > Authentication > Users에서 테스트 계정을 먼저 생성해주세요.');
        }
        throw new Error(`로그인 실패: ${signInError.message}`);
      }

      // 로그인 성공 후 프로필 확인/생성
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          // 프로필이 없으면 생성
          await supabase.from('profiles').insert({
            user_id: user.id,
            email: testEmail,
            nickname: testUsername,
            role: isAdmin ? 'admin' : 'user',
          });
        }
      }

      // 로그인 성공
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '테스트 로그인에 실패했습니다.');
    } finally {
      setTestLoading(false);
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

          {/* localhost 테스트 로그인 */}
          {isLocalhost() && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-orange-800 mb-3">
                🔧 개발자 테스트 로그인 (localhost only)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                    disabled={testLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                    disabled={testLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">닉네임</label>
                  <input
                    type="text"
                    value={testUsername}
                    onChange={(e) => setTestUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                    disabled={testLoading}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    disabled={testLoading}
                  />
                  <label htmlFor="isAdmin" className="ml-2 text-sm text-gray-700">
                    관리자 권한
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleTestLogin}
                  disabled={testLoading}
                  className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testLoading ? '로그인 중...' : '테스트 로그인'}
                </button>
                <p className="text-xs text-gray-500">
                  * Supabase 대시보드에서 테스트 계정을 먼저 생성해주세요.
                </p>
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