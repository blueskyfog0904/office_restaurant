import React, { useState, useEffect } from 'react';
import {
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import { getAdminReviews, AdminReviewData, deleteReview } from '../../services/adminApi';
import { useNavigate } from 'react-router-dom';
import { generateRestaurantUrl } from '../../utils/urlUtils';

type Review = AdminReviewData;

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await getAdminReviews(currentPage, itemsPerPage, searchTerm);
        setReviews(data);
      } catch (e) {
        console.error('리뷰 로드 실패:', e);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentPage, itemsPerPage, searchTerm]);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = searchTerm.trim().length === 0 ||
      (review.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (review.user_nickname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       (review.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       (review.content || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRating = filterRating === 'all' || review.rating.toString() === filterRating;
    const matchesRegion = filterRegion === 'all' || review.region === filterRegion;
    return matchesSearch && matchesRating && matchesRegion;
  });

  // 상태(status) 필드는 스키마에 없으므로 UI에서 제거

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  // 페이지네이션
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReviews = filteredReviews.slice(startIndex, endIndex);

  // 상태 변경 기능은 현재 스키마에 없으므로 비활성화

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">리뷰 정보를 불러오는 중...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">리뷰 관리</h1>
            <p className="text-gray-600 mt-1">리뷰를 관리하고 신고된 리뷰를 처리합니다.</p>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="음식점명, 사용자명 또는 내용 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="approved">승인됨</option>
              <option value="pending">대기중</option>
              <option value="rejected">거부됨</option>
              <option value="reported">신고됨</option>
            </select>
            
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 평점</option>
              <option value="5">5점</option>
              <option value="4">4점</option>
              <option value="3">3점</option>
              <option value="2">2점</option>
              <option value="1">1점</option>
            </select>
            
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 지역</option>
              <option value="서울특별시 강동구">강동구</option>
              <option value="서울특별시 강남구">강남구</option>
              <option value="서울특별시 강서구">강서구</option>
            </select>
            
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <FunnelIcon className="h-5 w-5 mr-2" />
              필터 적용
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 리뷰</p>
                <p className="text-2xl font-bold text-gray-900">{reviews.length.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          {/* 상태 통계는 스키마에 없으므로 제거 */}
          
          
          
          
        </div>

        {/* 리뷰 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">리뷰 목록 ({filteredReviews.length})</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    리뷰 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    평점
                  </th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{review.restaurant_name}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">{review.user_nickname || review.user_email}</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-500">{review.region || '-'}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-900 line-clamp-2">
                          {review.content || ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRatingStars(review.rating)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedReview(review)}
                          className="text-blue-600 hover:text-blue-900"
                          title="상세보기"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (review.region && review.sub_region && review.restaurant_name) {
                              const url = generateRestaurantUrl(review.region, review.sub_region, review.restaurant_name);
                              navigate(url);
                            } else {
                              alert('음식점 정보가 부족하여 이동할 수 없습니다.');
                            }
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="음식점 상세로 이동"
                        >
                          <BuildingOfficeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('정말 삭제하시겠습니까?')) {
                              deleteReview(review.id as unknown as string)
                                .then(() => setReviews(prev => prev.filter(r => r.id !== review.id)))
                                .catch(e => alert(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`));
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="삭제"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {startIndex + 1} - {Math.min(endIndex, filteredReviews.length)} / {filteredReviews.length}개
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    이전
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded-md text-sm ${
                          currentPage === page
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReviews; 