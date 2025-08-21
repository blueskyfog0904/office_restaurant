import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  FireIcon,
  MapPinIcon,
  HeartIcon,
  ChartBarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  getPopularRecommendations,
  getLocationBasedRecommendations,
  getUserPreferenceRecommendations,
  getTrendingRecommendations,
  getRecommendationStats,
  RestaurantData
} from '../../services/adminApi';

const RecommendationPage: React.FC = () => {
  const [popularRestaurants, setPopularRestaurants] = useState<RestaurantData[]>([]);
  const [trendingRestaurants, setTrendingRestaurants] = useState<RestaurantData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('서울특별시');
  const [selectedSubRegion, setSelectedSubRegion] = useState('강남구');

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError('');

      const [popular, trending, recommendationStats] = await Promise.all([
        getPopularRecommendations(10),
        getTrendingRecommendations(10),
        getRecommendationStats(),
      ]);

      setPopularRestaurants(popular);
      setTrendingRestaurants(trending);
      setStats(recommendationStats);
    } catch (error) {
      console.error('추천 데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '추천 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const refreshRecommendations = () => {
    loadRecommendations();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">추천 데이터를 불러오는 중...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">추천 시스템 관리</h1>
            <p className="text-gray-600 mt-1">Supabase 기반 지능형 음식점 추천 시스템을 관리합니다.</p>
          </div>
          <button
            onClick={refreshRecommendations}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            새로고침
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 추천 시스템 통계 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-500">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 음식점</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalRestaurants?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-500">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">활성 음식점</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.activeRestaurants?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-yellow-500">
                  <HeartIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 리뷰</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalReviews?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-500">
                  <FireIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">추천 커버리지</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.recommendationCoverage || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추천 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 인기 음식점 추천 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <SparklesIcon className="h-6 w-6 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">인기 음식점 추천</h3>
            </div>
            <div className="space-y-3">
              {popularRestaurants.slice(0, 5).map((restaurant, index) => (
                <div key={restaurant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{restaurant.name}</p>
                    <p className="text-sm text-gray-600">{restaurant.address}</p>
                    <p className="text-xs text-gray-500">{restaurant.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 트렌딩 음식점 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <FireIcon className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">트렌딩 음식점</h3>
            </div>
            <div className="space-y-3">
              {trendingRestaurants.slice(0, 5).map((restaurant, index) => (
                <div key={restaurant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{restaurant.name}</p>
                    <p className="text-sm text-gray-600">{restaurant.address}</p>
                    <p className="text-xs text-gray-500">{restaurant.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      HOT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 추천 알고리즘 설명 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">추천 알고리즘</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <SparklesIcon className="h-8 w-8 text-blue-500 mb-2" />
              <h4 className="font-medium text-gray-900 mb-1">인기 기반</h4>
              <p className="text-sm text-gray-600">방문 횟수와 평점을 기반으로 한 인기 음식점 추천</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <MapPinIcon className="h-8 w-8 text-green-500 mb-2" />
              <h4 className="font-medium text-gray-900 mb-1">지역 기반</h4>
              <p className="text-sm text-gray-600">사용자 위치 주변의 음식점을 우선 추천</p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <HeartIcon className="h-8 w-8 text-yellow-500 mb-2" />
              <h4 className="font-medium text-gray-900 mb-1">선호도 기반</h4>
              <p className="text-sm text-gray-600">사용자의 리뷰 패턴을 분석한 맞춤 추천</p>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <FireIcon className="h-8 w-8 text-red-500 mb-2" />
              <h4 className="font-medium text-gray-900 mb-1">트렌딩</h4>
              <p className="text-sm text-gray-600">최근 30일간 리뷰가 급증한 트렌딩 음식점</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RecommendationPage;
