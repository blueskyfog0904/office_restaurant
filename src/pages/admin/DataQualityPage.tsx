import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  MapPinIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import { getRestaurants, Restaurant } from '../../services/api';

interface DataQualityIssue {
  type: 'no_category' | 'incomplete_address' | 'duplicate' | 'no_phone';
  count: number;
  restaurants: Restaurant[];
}

const DataQualityPage: React.FC = () => {
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<DataQualityIssue | null>(null);

  useEffect(() => {
    loadDataQualityIssues();
  }, []);

  const loadDataQualityIssues = async () => {
    try {
      setLoading(true);
      
      // 모든 음식점 데이터 로드
      const response = await getRestaurants({ page: 1, size: 1000 });
      const restaurants = response.data;
      
      // 데이터 품질 이슈 분석
      const qualityIssues: DataQualityIssue[] = [];
      
      // 카테고리 미분류
      const noCategoryRestaurants = restaurants.filter(r => !r.category);
      if (noCategoryRestaurants.length > 0) {
        qualityIssues.push({
          type: 'no_category',
          count: noCategoryRestaurants.length,
          restaurants: noCategoryRestaurants
        });
      }
      
      // 주소 정보 불완전
      const incompleteAddressRestaurants = restaurants.filter(r => 
        !r.address || r.address.includes('위치 정보 업데이트 필요')
      );
      if (incompleteAddressRestaurants.length > 0) {
        qualityIssues.push({
          type: 'incomplete_address',
          count: incompleteAddressRestaurants.length,
          restaurants: incompleteAddressRestaurants
        });
      }
      
      // 연락처 정보 없음
      const noPhoneRestaurants = restaurants.filter(r => !r.phone);
      if (noPhoneRestaurants.length > 0) {
        qualityIssues.push({
          type: 'no_phone',
          count: noPhoneRestaurants.length,
          restaurants: noPhoneRestaurants
        });
      }
      
      // 중복 음식점 (이름 기준)
      const nameCounts: { [key: string]: Restaurant[] } = {};
      restaurants.forEach(r => {
        const normalizedName = r.name.trim().toLowerCase();
        if (!nameCounts[normalizedName]) {
          nameCounts[normalizedName] = [];
        }
        nameCounts[normalizedName].push(r);
      });
      
      const duplicateRestaurants = Object.values(nameCounts)
        .filter(group => group.length > 1)
        .flat();
      
      if (duplicateRestaurants.length > 0) {
        qualityIssues.push({
          type: 'duplicate',
          count: duplicateRestaurants.length,
          restaurants: duplicateRestaurants
        });
      }
      
      setIssues(qualityIssues);
      
    } catch (error) {
      console.error('데이터 품질 이슈 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'no_category':
        return <BuildingOfficeIcon className="h-6 w-6 text-orange-500" />;
      case 'incomplete_address':
        return <MapPinIcon className="h-6 w-6 text-red-500" />;
      case 'no_phone':
        return <XCircleIcon className="h-6 w-6 text-yellow-500" />;
      case 'duplicate':
        return <DocumentDuplicateIcon className="h-6 w-6 text-purple-500" />;
      default:
        return <ExclamationTriangleIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getIssueTitle = (type: string) => {
    switch (type) {
      case 'no_category':
        return '카테고리 미분류';
      case 'incomplete_address':
        return '주소 정보 불완전';
      case 'no_phone':
        return '연락처 정보 없음';
      case 'duplicate':
        return '중복 음식점';
      default:
        return '알 수 없는 이슈';
    }
  };

  const getIssueDescription = (type: string) => {
    switch (type) {
      case 'no_category':
        return '카테고리가 설정되지 않은 음식점입니다.';
      case 'incomplete_address':
        return '주소 정보가 불완전하거나 업데이트가 필요한 음식점입니다.';
      case 'no_phone':
        return '연락처 정보가 없는 음식점입니다.';
      case 'duplicate':
        return '이름이 중복되는 음식점입니다.';
      default:
        return '데이터 품질 이슈가 발견되었습니다.';
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'no_category':
        return 'bg-orange-50 border-orange-200';
      case 'incomplete_address':
        return 'bg-red-50 border-red-200';
      case 'no_phone':
        return 'bg-yellow-50 border-yellow-200';
      case 'duplicate':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">데이터 품질을 분석하는 중...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">데이터 품질 관리</h1>
            <p className="text-gray-600 mt-1">음식점 데이터의 품질을 확인하고 개선합니다.</p>
          </div>
          <button
            onClick={loadDataQualityIssues}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            새로고침
          </button>
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 이슈</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issues.reduce((sum, issue) => sum + issue.count, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">이슈 유형</p>
                <p className="text-2xl font-bold text-gray-900">{issues.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">개선 필요</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issues.filter(i => i.type === 'no_category' || i.type === 'incomplete_address').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DocumentDuplicateIcon className="h-6 w-6 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">중복 데이터</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issues.find(i => i.type === 'duplicate')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 이슈 목록 */}
        <div className="space-y-4">
          {issues.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-green-900 mb-2">데이터 품질이 양호합니다!</h3>
              <p className="text-green-700">발견된 데이터 품질 이슈가 없습니다.</p>
            </div>
          ) : (
            issues.map((issue, index) => (
              <div
                key={index}
                className={`border rounded-lg p-6 ${getIssueColor(issue.type)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getIssueIcon(issue.type)}
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {getIssueTitle(issue.type)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {getIssueDescription(issue.type)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {issue.count.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">개 음식점</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 이슈 상세 모달 */}
        {selectedIssue && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {getIssueTitle(selectedIssue.type)}
                  </h3>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  {getIssueDescription(selectedIssue.type)}
                </p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          음식점명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          주소
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          카테고리
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          연락처
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedIssue.restaurants.map((restaurant) => (
                        <tr key={restaurant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{restaurant.address}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {restaurant.category || '미분류'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {restaurant.phone || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              restaurant.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {restaurant.status === 'active' ? '활성' : '비활성'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      // 여기에 일괄 수정 기능 추가
                      alert('일괄 수정 기능은 추후 구현 예정입니다.');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    일괄 수정
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DataQualityPage; 