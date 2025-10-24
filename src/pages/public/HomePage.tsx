import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHomePageStats, HomePageStats } from '../../services/authService';

const HomePage: React.FC = () => {
  const [stats, setStats] = useState<HomePageStats>({
    regionCount: 0,
    restaurantCount: 0,
    totalVisits: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      console.log('📊 홈페이지 통계 로드 시작...');
      setStatsLoading(true);
      const homeStats = await getHomePageStats();
      console.log('✅ 홈페이지 통계 로드 성공:', homeStats);
      setStats(homeStats);
    } catch (error) {
      console.error('❌ 통계 데이터 로드 실패:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // 에러 발생 시 기본값 유지
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="text-center">
          {/* 로고 */}
          {/* <div className="mb-8">
            <img 
              src="/images/project_logo.png" 
              alt="공무원 맛집 로고" 
              className="h-24 w-auto sm:h-32 md:h-50 mx-auto"
            />
          </div> */}
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            공공기관이 선택한
            <span className="text-blue-600 block mt-2">신뢰할 수 있는 맛집</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            실제 공무원들의 업무추진비 데이터를 기반으로 한 
            검증된 맛집 정보를 확인해보세요.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/restaurants"
              className="bg-blue-600 text-white px-12 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg w-full sm:w-auto text-center"
            >
              지역별 맛집 찾으러 가기!
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          왜 공무원 맛집인가요?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">신뢰할 수 있는 데이터</h3>
            <p className="text-gray-600">
              공공기관의 실제 업무추진비 사용 내역을 기반으로 한 검증된 음식점 정보를 제공합니다.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">실시간 랭킹</h3>
            <p className="text-gray-600">
              지역별, 카테고리별 실시간 음식점 랭킹을 통해 인기 맛집을 한눈에 확인할 수 있습니다.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">지역별 검색</h3>
            <p className="text-gray-600">
              전국 {stats.regionCount}개 지역별로 세분화된 맛집 정보를 통해 원하는 지역의 맛집을 쉽게 찾을 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {statsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  `${stats.regionCount.toLocaleString()}+`
                )}
              </div>
              <div className="text-gray-600">지역</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {statsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  `${stats.restaurantCount.toLocaleString()}+`
                )}
              </div>
              <div className="text-gray-600">등록된 맛집</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {statsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  `${stats.totalVisits.toLocaleString()}+`
                )}
              </div>
              <div className="text-gray-600">방문 기록</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600">공공데이터</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default HomePage; 