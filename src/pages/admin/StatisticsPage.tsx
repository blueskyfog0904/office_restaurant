import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  StarIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  getStatistics, 
  getRankings, 
  getRestaurants,
  getRegions,
  Statistics,
  RankingData,
  Region
} from '../../services/api';

const StatisticsPage: React.FC = () => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadStatistics();
  }, []);

  useEffect(() => {
    if (selectedRegion !== 'all' || selectedCategory !== 'all') {
      loadRankings();
    }
  }, [selectedRegion, selectedCategory]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // 통계 데이터 로드
      // 관리자 통계 전환 대기: 임시 값
      setStatistics({
        total_restaurants: 0,
        active_restaurants: 0,
        total_users: 0,
        active_users: 0,
        total_reviews: 0,
        approved_reviews: 0,
        total_visits: 0,
        avg_rating: 0
      });
      
      // 지역 데이터 로드
      const regionsData = await getRegions();
      setRegions(Array.isArray(regionsData) ? regionsData : []);
      
      // 랭킹 데이터 로드
      await loadRankings();
      
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
      // 에러 시 기본값 설정
      setStatistics({
        total_restaurants: 0,
        active_restaurants: 0,
        total_users: 0,
        active_users: 0,
        total_reviews: 0,
        approved_reviews: 0,
        total_visits: 0,
        avg_rating: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = async () => {
    try {
      const params: any = {
        limit: 10
      };
      
      if (selectedRegion !== 'all') {
        params.region_id = parseInt(selectedRegion);
      }
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      // 관리자 랭킹 전환 대기: 빈 목록
      setRankings([]);
    } catch (error) {
      console.error('랭킹 데이터 로드 실패:', error);
      setRankings([]);
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getTrendText = (change: number) => {
    if (change > 0) {
      return `+${change}`;
    } else if (change < 0) {
      return `${change}`;
    }
    return '0';
  };

  const getTrendColor = (change: number) => {
    if (change > 0) {
      return 'text-green-600';
    } else if (change < 0) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">통계 데이터를 불러오는 중...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">통계 및 분석</h1>
          <p className="text-gray-600 mt-1">시스템 현황과 주요 통계를 확인합니다.</p>
        </div>

        {/* 주요 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <BuildingOfficeIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 음식점</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics?.total_restaurants?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 사용자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics?.total_users?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-500">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 리뷰</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics?.total_reviews?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <StarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평균 평점</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics?.avg_rating?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 상세 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">음식점 현황</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">활성 음식점</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.active_restaurants?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">총 방문</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.total_visits?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">승인된 리뷰</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.approved_reviews?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">사용자 현황</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">활성 사용자</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.active_users?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">사용자 활성률</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.total_users && statistics?.active_users 
                    ? `${((statistics.active_users / statistics.total_users) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">리뷰 작성률</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.total_users && statistics?.total_reviews
                    ? `${((statistics.total_reviews / statistics.total_users) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 랭킹 차트 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">인기 음식점 랭킹</h3>
            <div className="flex space-x-4">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">모든 지역</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id.toString()}>
                    {region.sub_add1} {region.sub_add2}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">모든 카테고리</option>
                <option value="한식">한식</option>
                <option value="중식">중식</option>
                <option value="일식">일식</option>
                <option value="양식">양식</option>
                <option value="카페">카페</option>
                <option value="분식">분식</option>
              </select>
            </div>
          </div>
          
          {rankings.length > 0 ? (
            <div className="space-y-4">
              {rankings.map((restaurant, index) => (
                <div key={restaurant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{restaurant.name}</h4>
                      <p className="text-sm text-gray-500">{restaurant.region} • {restaurant.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="flex items-center space-x-1">
                        <StarIcon className="h-4 w-4 text-yellow-400" />
                        <span className="font-medium">{restaurant.rating}</span>
                      </div>
                      <p className="text-xs text-gray-500">{restaurant.review_count}개 리뷰</p>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{restaurant.visit_count}</div>
                      <p className="text-xs text-gray-500">방문</p>
                    </div>
                    <div className="text-center">
                      <div className={`flex items-center space-x-1 ${getTrendColor(restaurant.rank_change)}`}>
                        {getTrendIcon(restaurant.rank_change)}
                        <span className="text-sm font-medium">
                          {getTrendText(restaurant.rank_change)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">순위 변화</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">랭킹 데이터가 없습니다.</p>
            </div>
          )}
        </div>

        {/* 데이터 품질 알림 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">데이터 품질 알림</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-yellow-800">카테고리 미분류 음식점</p>
                <p className="text-xs text-yellow-600">카테고리가 설정되지 않은 음식점이 있습니다.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">주소 정보 불완전</p>
                <p className="text-xs text-red-600">주소 정보가 불완전한 음식점이 있습니다.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-800">중복 데이터 감지</p>
                <p className="text-xs text-blue-600">이름이 중복되는 음식점이 있습니다.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StatisticsPage; 