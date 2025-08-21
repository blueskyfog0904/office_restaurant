import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';

interface VisitRecord {
  id: number;
  restaurant_name: string;
  restaurant_id: number;
  agency_name: string;
  agency_id: number;
  region: string;
  visit_date: string;
  visit_count: number;
  data_source: 'crawled' | 'manual' | 'corrected';
  status: 'confirmed' | 'pending' | 'disputed';
  created_at: string;
  updated_at: string;
  notes?: string;
  corrected_by?: string;
  correction_reason?: string;
}

const VisitRecordsPage: React.FC = () => {
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterDataSource, setFilterDataSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<VisitRecord | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // 임시 데이터 (실제로는 API에서 가져옴)
  const mockVisitRecords: VisitRecord[] = [
    {
      id: 1,
      restaurant_name: '맛있는 한식당',
      restaurant_id: 1,
      agency_name: '서울특별시 강동구청',
      agency_id: 1,
      region: '서울특별시 강동구',
      visit_date: '2024-12-01',
      visit_count: 156,
      data_source: 'crawled',
      status: 'confirmed',
      created_at: '2024-12-01T10:30:00Z',
      updated_at: '2024-12-01T10:30:00Z'
    },
    {
      id: 2,
      restaurant_name: '신선한 중식당',
      restaurant_id: 2,
      agency_name: '서울특별시 강남구청',
      agency_id: 2,
      region: '서울특별시 강남구',
      visit_date: '2024-11-30',
      visit_count: 89,
      data_source: 'manual',
      status: 'pending',
      created_at: '2024-11-30T15:20:00Z',
      updated_at: '2024-11-30T15:20:00Z',
      notes: '수동으로 입력된 데이터'
    },
    {
      id: 3,
      restaurant_name: '맛있는 한식당',
      restaurant_id: 1,
      agency_name: '서울특별시 강동구청',
      agency_id: 1,
      region: '서울특별시 강동구',
      visit_date: '2024-11-29',
      visit_count: 142,
      data_source: 'corrected',
      status: 'confirmed',
      created_at: '2024-11-29T09:15:00Z',
      updated_at: '2024-11-29T09:15:00Z',
      corrected_by: 'admin_kim',
      correction_reason: '크롤링 데이터 오류 수정'
    }
  ];

  useEffect(() => {
    // 실제로는 API 호출
    setTimeout(() => {
      setVisitRecords(mockVisitRecords);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredRecords = visitRecords.filter(record => {
    const matchesSearch = record.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.agency_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgency = filterAgency === 'all' || record.agency_id.toString() === filterAgency;
    const matchesRegion = filterRegion === 'all' || record.region === filterRegion;
    const matchesDataSource = filterDataSource === 'all' || record.data_source === filterDataSource;
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    
    return matchesSearch && matchesAgency && matchesRegion && matchesDataSource && matchesStatus;
  });

  const getDataSourceBadge = (source: string) => {
    switch (source) {
      case 'crawled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">크롤링</span>;
      case 'manual':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">수동입력</span>;
      case 'corrected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">보정</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{source}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">확인됨</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">대기중</span>;
      case 'disputed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">이의제기</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // 페이지네이션
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  const handleDownload = () => {
    // CSV 다운로드 로직
    const csvContent = "data:text/csv;charset=utf-8," + 
      "음식점명,기관명,지역,방문일,방문수,데이터소스,상태\n" +
      currentRecords.map(record => 
        `${record.restaurant_name},${record.agency_name},${record.region},${record.visit_date},${record.visit_count},${record.data_source},${record.status}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `visit_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">방문기록을 불러오는 중...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">방문기록 관리</h1>
            <p className="text-gray-600 mt-1">기관/음식점별 월별 방문 기록을 관리합니다.</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
              일괄 업로드
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              다운로드
            </button>
            <button
              onClick={() => setSelectedRecord({} as VisitRecord)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              새 기록 추가
            </button>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="음식점명 또는 기관명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 기관</option>
              <option value="1">서울특별시 강동구청</option>
              <option value="2">서울특별시 강남구청</option>
            </select>
            
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 지역</option>
              <option value="서울특별시 강동구">강동구</option>
              <option value="서울특별시 강남구">강남구</option>
            </select>
            
            <select
              value={filterDataSource}
              onChange={(e) => setFilterDataSource(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 데이터소스</option>
              <option value="crawled">크롤링</option>
              <option value="manual">수동입력</option>
              <option value="corrected">보정</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="confirmed">확인됨</option>
              <option value="pending">대기중</option>
              <option value="disputed">이의제기</option>
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
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 방문기록</p>
                <p className="text-2xl font-bold text-gray-900">{visitRecords.length.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">확인된 기록</p>
                <p className="text-2xl font-bold text-gray-900">
                  {visitRecords.filter(r => r.status === 'confirmed').length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-500">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">대기중 기록</p>
                <p className="text-2xl font-bold text-gray-900">
                  {visitRecords.filter(r => r.status === 'pending').length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <MapPinIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 방문수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {visitRecords.reduce((sum, r) => sum + r.visit_count, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 방문기록 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">방문기록 목록 ({filteredRecords.length})</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    음식점/기관
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    방문일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    방문수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    데이터소스
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수정이력
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{record.restaurant_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPinIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">{record.agency_name}</span>
                        </div>
                        <div className="text-sm text-gray-500">{record.region}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.visit_date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.visit_count.toLocaleString()}회
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDataSourceBadge(record.data_source)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.data_source === 'corrected' && record.corrected_by && (
                        <div>
                          <div>수정자: {record.corrected_by}</div>
                          {record.correction_reason && (
                            <div className="text-xs text-gray-400">사유: {record.correction_reason}</div>
                          )}
                        </div>
                      )}
                      {record.data_source === 'manual' && record.notes && (
                        <div className="text-xs text-gray-400">메모: {record.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-blue-600 hover:text-blue-900"
                          title="상세보기"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="수정"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('정말 삭제하시겠습니까?')) {
                              // 삭제 로직
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
                  {startIndex + 1} - {Math.min(endIndex, filteredRecords.length)} / {filteredRecords.length}개
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

export default VisitRecordsPage; 