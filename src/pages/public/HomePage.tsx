import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHomePageStats, HomePageStats } from '../../services/authService';
import { MagnifyingGlassIcon, MapPinIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

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
      setStatsLoading(true);
      const homeStats = await getHomePageStats();
      setStats(homeStats);
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <div className="relative bg-[#1B365D] overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute top-1/2 -left-24 w-64 h-64 rounded-full bg-[#D69E2E] blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 sm:pt-40 sm:pb-32 z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
              공공데이터로 검증된
              <br />
              <span className="text-[#D69E2E]">신뢰할 수 있는 맛집</span> 가이드
            </h1>
            
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              실제 공무원들의 업무추진비 데이터를 분석하여, 
              <br className="hidden sm:block" />
              광고 없는 진짜 로컬 맛집 정보를 제공합니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/restaurants"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-[#1B365D] bg-white rounded-full overflow-hidden transition-all duration-300 hover:bg-[#F8FAFC] hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto"
              >
                <span className="relative flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  맛집 검색하기
                </span>
              </Link>
              <Link
                to="/board"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white border border-white/30 rounded-full hover:bg-white/10 transition-all duration-300 w-full sm:w-auto"
              >
                커뮤니티
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <div className="text-center border-r border-gray-100 last:border-0">
            <div className="text-3xl md:text-4xl font-black text-[#1B365D] mb-1">
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
              ) : (
                `${stats.regionCount.toLocaleString()}`
              )}
            </div>
            <div className="text-sm text-gray-500 font-medium">서비스 지역</div>
          </div>
          <div className="text-center border-r border-gray-100 last:border-0">
            <div className="text-3xl md:text-4xl font-black text-[#1B365D] mb-1">
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
              ) : (
                `${stats.restaurantCount.toLocaleString()}`
              )}
            </div>
            <div className="text-sm text-gray-500 font-medium">검증된 맛집</div>
          </div>
          <div className="text-center border-r border-gray-100 last:border-0">
            <div className="text-3xl md:text-4xl font-black text-[#1B365D] mb-1">
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto rounded"></div>
              ) : (
                `${(stats.totalVisits / 10000).toFixed(1)}만+`
              )}
            </div>
            <div className="text-sm text-gray-500 font-medium">누적 방문</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-black text-[#D69E2E] mb-1">100%</div>
            <div className="text-sm text-gray-500 font-medium">공공데이터 기반</div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            왜 <span className="text-[#1B365D]">공무원 맛집</span>인가요?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            투명한 데이터로 검증된, 실패 없는 미식 경험을 제공합니다.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1B365D] transition-colors duration-300">
              <ShieldCheckIcon className="w-7 h-7 text-[#1B365D] group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">신뢰할 수 있는 데이터</h3>
            <p className="text-gray-600 leading-relaxed">
              광고나 홍보성 리뷰가 아닌, 공공기관의 실제 업무추진비 사용 내역을 기반으로 분석합니다.
            </p>
          </div>

          <div className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#D69E2E] transition-colors duration-300">
              <ChartBarIcon className="w-7 h-7 text-[#D69E2E] group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">객관적인 랭킹</h3>
            <p className="text-gray-600 leading-relaxed">
              방문 횟수와 재방문율 등 객관적인 데이터를 바탕으로 지역별, 카테고리별 실시간 랭킹을 제공합니다.
            </p>
          </div>

          <div className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#1B365D] transition-colors duration-300">
              <MapPinIcon className="w-7 h-7 text-[#1B365D] group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">전국 맛집 지도</h3>
            <p className="text-gray-600 leading-relaxed">
              전국 {stats.regionCount}개 지역의 맛집 정보를 지도 위에서 직관적으로 확인하고 검색할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            지금 바로 주변 맛집을 찾아보세요
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            더 이상 맛집 검색에 실패하지 마세요. 공무원 맛집이 검증된 곳만 추천해드립니다.
          </p>
          <Link
            to="/restaurants"
            className="inline-flex items-center justify-center px-8 py-3 text-base font-bold text-white bg-[#1B365D] rounded-xl hover:bg-[#162c4b] shadow-lg hover:shadow-xl transition-all duration-200"
          >
            내 주변 맛집 찾기
          </Link>
        </div>
      </div>

    </div>
  );
};

export default HomePage;
