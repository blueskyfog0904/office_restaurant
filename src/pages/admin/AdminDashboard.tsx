import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import { getDashboardStats, DashboardStats } from '../../services/adminApi';

const AdminDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('대시보드 통계 데이터 로딩 시작...');
      
      const stats = await getDashboardStats();
      console.log('대시보드 통계 데이터 로딩 완료:', stats);
      setStatistics(stats);
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '통계 데이터를 불러오는데 실패했습니다.';
      console.error('오류 상세:', errorMessage);
      setError(errorMessage);
      
      // 에러 시 기본값 설정
      setStatistics({
        totalRestaurants: 0,
        activeRestaurants: 0,
        inactiveRestaurants: 0,
        totalUsers: 0,
        totalPosts: 0,
        totalReviews: 0,
        averageRating: 0
      });
    } finally {
      console.log('대시보드 로딩 완료');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">대시보드 데이터를 불러오는 중...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-600 mt-1">시스템 현황과 주요 통계를 확인합니다.</p>
          {error && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <BuildingOfficeIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 음식점</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics?.totalRestaurants?.toLocaleString() || '0'}
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
                  {statistics?.totalUsers?.toLocaleString() || '0'}
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
                  {statistics?.totalReviews?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 게시글</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics?.totalPosts?.toLocaleString() || '0'}
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
                  {statistics?.activeRestaurants?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">비활성 음식점</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.inactiveRestaurants?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">평균 평점</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.averageRating?.toFixed(1) || '0.0'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">콘텐츠 현황</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">총 게시글</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.totalPosts?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">총 리뷰</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics?.totalReviews?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">최근 활동</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">새로운 음식점이 등록되었습니다.</span>
              <span className="text-xs text-gray-400">방금 전</span>
            </div>
            <div className="flex items-center space-x-3">
              <StarIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-600">새로운 리뷰가 작성되었습니다.</span>
              <span className="text-xs text-gray-400">5분 전</span>
            </div>
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-600">데이터 품질 검사가 완료되었습니다.</span>
              <span className="text-xs text-gray-400">10분 전</span>
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">빠른 액션</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-500" />
              음식점 관리
            </button>
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <UsersIcon className="h-5 w-5 mr-2 text-green-500" />
              사용자 관리
            </button>
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-yellow-500" />
              리뷰 관리
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard; 