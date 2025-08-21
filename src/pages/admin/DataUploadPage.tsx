import React, { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';

interface UploadJob {
  id: number;
  filename: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  data_type: 'restaurants' | 'visit_records' | 'reviews' | 'agencies';
}

interface DownloadTemplate {
  id: number;
  name: string;
  description: string;
  data_type: string;
  file_size: number;
  download_count: number;
  created_at: string;
}

const DataUploadPage: React.FC = () => {
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [downloadTemplates, setDownloadTemplates] = useState<DownloadTemplate[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('restaurants');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 임시 데이터
  const mockUploadJobs: UploadJob[] = [
    {
      id: 1,
      filename: 'restaurants_2024_12.csv',
      file_size: 2048576,
      status: 'completed',
      progress: 100,
      total_records: 150,
      processed_records: 150,
      success_records: 145,
      error_records: 5,
      created_at: '2024-12-01T10:30:00Z',
      completed_at: '2024-12-01T10:35:00Z',
      data_type: 'restaurants'
    },
    {
      id: 2,
      filename: 'visit_records_2024_11.xlsx',
      file_size: 1048576,
      status: 'processing',
      progress: 65,
      total_records: 200,
      processed_records: 130,
      success_records: 125,
      error_records: 5,
      created_at: '2024-12-01T11:00:00Z',
      data_type: 'visit_records'
    },
    {
      id: 3,
      filename: 'reviews_2024_12.csv',
      file_size: 512000,
      status: 'failed',
      progress: 0,
      total_records: 50,
      processed_records: 0,
      success_records: 0,
      error_records: 50,
      created_at: '2024-12-01T11:30:00Z',
      error_message: '파일 형식이 올바르지 않습니다.',
      data_type: 'reviews'
    }
  ];

  const mockDownloadTemplates: DownloadTemplate[] = [
    {
      id: 1,
      name: '음식점 데이터 템플릿',
      description: '음식점 정보 업로드를 위한 CSV 템플릿',
      data_type: 'restaurants',
      file_size: 1024,
      download_count: 25,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: '방문기록 데이터 템플릿',
      description: '방문기록 업로드를 위한 Excel 템플릿',
      data_type: 'visit_records',
      file_size: 2048,
      download_count: 18,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 3,
      name: '리뷰 데이터 템플릿',
      description: '리뷰 데이터 업로드를 위한 CSV 템플릿',
      data_type: 'reviews',
      file_size: 512,
      download_count: 12,
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  React.useEffect(() => {
    setUploadJobs(mockUploadJobs);
    setDownloadTemplates(mockDownloadTemplates);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    // 시뮬레이션된 업로드 진행
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // 새로운 업로드 작업 추가
          const newJob: UploadJob = {
            id: Date.now(),
            filename: selectedFile.name,
            file_size: selectedFile.size,
            status: 'completed',
            progress: 100,
            total_records: Math.floor(Math.random() * 200) + 50,
            processed_records: Math.floor(Math.random() * 200) + 50,
            success_records: Math.floor(Math.random() * 180) + 40,
            error_records: Math.floor(Math.random() * 20) + 1,
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            data_type: uploadType as UploadJob['data_type']
          };
          
          setUploadJobs(prev => [newJob, ...prev]);
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">대기중</span>;
      case 'processing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">처리중</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">완료</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">실패</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getDataTypeLabel = (type: string) => {
    switch (type) {
      case 'restaurants': return '음식점';
      case 'visit_records': return '방문기록';
      case 'reviews': return '리뷰';
      case 'agencies': return '기관';
      default: return type;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">데이터 업로드/다운로드</h1>
            <p className="text-gray-600 mt-1">엑셀/CSV 파일을 통한 대량 데이터 업로드 및 템플릿 다운로드</p>
          </div>
        </div>

        {/* 업로드 섹션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">데이터 업로드</h2>
          
          <div className="space-y-4">
            {/* 파일 선택 */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    파일을 선택하거나 여기로 드래그하세요
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    CSV, Excel 파일 (최대 10MB)
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                />
              </div>
              {selectedFile && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    선택된 파일: <span className="font-medium">{selectedFile.name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    크기: {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              )}
            </div>

            {/* 업로드 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  데이터 유형
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="restaurants">음식점 데이터</option>
                  <option value="visit_records">방문기록 데이터</option>
                  <option value="reviews">리뷰 데이터</option>
                  <option value="agencies">기관 데이터</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? (
                    <>
                      <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
                      업로드 중... ({uploadProgress}%)
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                      업로드 시작
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 업로드 진행률 */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>업로드 진행률</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 다운로드 템플릿 섹션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">템플릿 다운로드</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {downloadTemplates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <DocumentArrowDownIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>크기: {formatFileSize(template.file_size)}</span>
                  <span>다운로드: {template.download_count}회</span>
                </div>
                <button className="w-full flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  다운로드
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 업로드 작업 내역 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">업로드 작업 내역</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    파일명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    데이터 유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    진행률
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    결과
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    업로드 시간
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{job.filename}</div>
                        <div className="text-sm text-gray-500">{formatFileSize(job.file_size)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getDataTypeLabel(job.data_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>총: {job.total_records}개</div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">성공: {job.success_records}개</span>
                          {job.error_records > 0 && (
                            <span className="text-red-600">실패: {job.error_records}개</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="상세보기"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {job.status === 'failed' && (
                          <button
                            className="text-red-600 hover:text-red-900"
                            title="삭제"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 업로드 가이드 */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">업로드 가이드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">지원 파일 형식</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• CSV 파일 (.csv)</li>
                <li>• Excel 파일 (.xlsx, .xls)</li>
                <li>• 최대 파일 크기: 10MB</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">주의사항</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 첫 번째 행은 헤더로 사용됩니다</li>
                <li>• 필수 필드는 반드시 포함해야 합니다</li>
                <li>• 데이터 형식을 정확히 지켜주세요</li>
                <li>• 업로드 전 템플릿을 다운로드하여 참고하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DataUploadPage; 