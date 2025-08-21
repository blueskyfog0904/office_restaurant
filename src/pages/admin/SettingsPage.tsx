import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'notice' | 'maintenance' | 'update' | 'emergency';
  status: 'active' | 'inactive' | 'draft';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  created_by: string;
  views: number;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by: string;
  views: number;
}

interface DataFormat {
  id: number;
  name: string;
  version: string;
  description: string;
  status: 'active' | 'deprecated' | 'draft';
  created_at: string;
  updated_at: string;
  created_by: string;
  download_count: number;
}

interface Backup {
  id: number;
  name: string;
  type: 'full' | 'incremental' | 'schema';
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  created_at: string;
  completed_at?: string;
  created_by: string;
  description?: string;
}

const SettingsPage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [dataFormats, setDataFormats] = useState<DataFormat[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notices' | 'faqs' | 'formats' | 'backups'>('notices');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 임시 데이터
  const mockNotices: Notice[] = [
    {
      id: 1,
      title: '시스템 점검 안내',
      content: '2024년 12월 15일 오전 2시부터 4시까지 시스템 점검이 예정되어 있습니다. 점검 시간 동안 서비스 이용이 제한될 수 있습니다.',
      type: 'maintenance',
      status: 'active',
      priority: 'high',
      created_at: '2024-12-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z',
      created_by: 'admin_kim',
      views: 156
    },
    {
      id: 2,
      title: '새로운 기능 업데이트',
      content: '음식점 검색 기능이 개선되었습니다. 더 정확하고 빠른 검색 결과를 제공합니다.',
      type: 'update',
      status: 'active',
      priority: 'medium',
      created_at: '2024-11-30T15:30:00Z',
      updated_at: '2024-11-30T15:30:00Z',
      created_by: 'admin_lee',
      views: 89
    },
    {
      id: 3,
      title: '개인정보 처리방침 개정',
      content: '개인정보 처리방침이 개정되었습니다. 자세한 내용은 공지사항을 참고해 주세요.',
      type: 'notice',
      status: 'active',
      priority: 'low',
      created_at: '2024-11-29T09:15:00Z',
      updated_at: '2024-11-29T09:15:00Z',
      created_by: 'admin_park',
      views: 234
    }
  ];

  const mockFaqs: FAQ[] = [
    {
      id: 1,
      question: '음식점 정보는 어떻게 업데이트되나요?',
      answer: '음식점 정보는 공공기관에서 제공하는 데이터를 기반으로 자동으로 업데이트됩니다. 수동으로도 관리자가 직접 수정할 수 있습니다.',
      category: '데이터 관리',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'admin_kim',
      views: 45
    },
    {
      id: 2,
      question: '리뷰 작성은 어떻게 하나요?',
      answer: '로그인 후 음식점 상세 페이지에서 리뷰를 작성할 수 있습니다. 평점과 함께 사진도 첨부할 수 있습니다.',
      category: '사용자 가이드',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'admin_lee',
      views: 67
    },
    {
      id: 3,
      question: '데이터 오류를 발견했을 때는 어떻게 하나요?',
      answer: '데이터 오류를 발견하시면 관리자에게 문의하거나, 음식점 상세 페이지의 오류 신고 기능을 이용해 주세요.',
      category: '오류 신고',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'admin_park',
      views: 23
    }
  ];

  const mockDataFormats: DataFormat[] = [
    {
      id: 1,
      name: '음식점 데이터 포맷',
      version: 'v2.1',
      description: '음식점 기본 정보, 위치, 연락처 등의 데이터 구조를 정의합니다.',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
      created_by: 'admin_kim',
      download_count: 25
    },
    {
      id: 2,
      name: '방문기록 데이터 포맷',
      version: 'v1.5',
      description: '월별 방문 기록 데이터의 구조와 필드를 정의합니다.',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-05-15T00:00:00Z',
      created_by: 'admin_lee',
      download_count: 18
    },
    {
      id: 3,
      name: '리뷰 데이터 포맷',
      version: 'v1.0',
      description: '사용자 리뷰 및 평점 데이터의 구조를 정의합니다.',
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'admin_park',
      download_count: 0
    }
  ];

  const mockBackups: Backup[] = [
    {
      id: 1,
      name: '전체 백업 2024-12-01',
      type: 'full',
      size: 2048576000,
      status: 'completed',
      created_at: '2024-12-01T02:00:00Z',
      completed_at: '2024-12-01T02:15:00Z',
      created_by: 'system',
      description: '일일 전체 백업'
    },
    {
      id: 2,
      name: '증분 백업 2024-12-01',
      type: 'incremental',
      size: 512000000,
      status: 'completed',
      created_at: '2024-12-01T14:00:00Z',
      completed_at: '2024-12-01T14:05:00Z',
      created_by: 'system',
      description: '오후 증분 백업'
    },
    {
      id: 3,
      name: '스키마 백업 2024-12-01',
      type: 'schema',
      size: 1024000,
      status: 'failed',
      created_at: '2024-12-01T16:00:00Z',
      created_by: 'admin_kim',
      description: '데이터베이스 스키마 백업'
    }
  ];

  useEffect(() => {
    setTimeout(() => {
      setNotices(mockNotices);
      setFaqs(mockFaqs);
      setDataFormats(mockDataFormats);
      setBackups(mockBackups);
      setLoading(false);
    }, 1000);
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'notice':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">공지</span>;
      case 'maintenance':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">점검</span>;
      case 'update':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">업데이트</span>;
      case 'emergency':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">긴급</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">높음</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">보통</span>;
      case 'low':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">낮음</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{priority}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">활성</span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">비활성</span>;
      case 'draft':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">임시</span>;
      case 'deprecated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">사용중단</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getBackupStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">완료</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">실패</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">진행중</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">설정 정보를 불러오는 중...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">설정/공지</h1>
            <p className="text-gray-600 mt-1">사이트 공지, FAQ, 데이터 포맷, 백업 관리</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              새 공지 작성
            </button>
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
              백업 생성
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <BellIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">활성 공지</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notices.filter(n => n.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">FAQ</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.filter(f => f.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-500">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">데이터 포맷</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dataFormats.filter(f => f.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <CircleStackIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">백업</p>
                <p className="text-2xl font-bold text-gray-900">
                  {backups.filter(b => b.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('notices')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                공지사항
              </button>
              <button
                onClick={() => setActiveTab('faqs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'faqs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                FAQ
              </button>
              <button
                onClick={() => setActiveTab('formats')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'formats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                데이터 포맷
              </button>
              <button
                onClick={() => setActiveTab('backups')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'backups'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                백업 관리
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 공지사항 탭 */}
            {activeTab === 'notices' && (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <div key={notice.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeBadge(notice.type)}
                          {getPriorityBadge(notice.priority)}
                          {getStatusBadge(notice.status)}
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{notice.title}</h3>
                        <p className="text-sm text-gray-700 mb-3">{notice.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>작성자: {notice.created_by}</span>
                          <span>조회수: {notice.views}</span>
                          <span>작성일: {new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900" title="상세보기">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="text-indigo-600 hover:text-indigo-900" title="수정">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900" title="삭제">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAQ 탭 */}
            {activeTab === 'faqs' && (
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {faq.category}
                          </span>
                          {getStatusBadge(faq.status)}
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{faq.question}</h3>
                        <p className="text-sm text-gray-700 mb-3">{faq.answer}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>작성자: {faq.created_by}</span>
                          <span>조회수: {faq.views}</span>
                          <span>작성일: {new Date(faq.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900" title="상세보기">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="text-indigo-600 hover:text-indigo-900" title="수정">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900" title="삭제">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 데이터 포맷 탭 */}
            {activeTab === 'formats' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        포맷명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        버전
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        다운로드
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        업데이트
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dataFormats.map((format) => (
                      <tr key={format.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{format.name}</div>
                            <div className="text-sm text-gray-500">{format.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(format.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format.download_count}회
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(format.updated_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="text-blue-600 hover:text-blue-900" title="다운로드">
                              <CloudArrowDownIcon className="h-4 w-4" />
                            </button>
                            <button className="text-indigo-600 hover:text-indigo-900" title="수정">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900" title="삭제">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 백업 관리 탭 */}
            {activeTab === 'backups' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        백업명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        유형
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        크기
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        생성 시간
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backups.map((backup) => (
                      <tr key={backup.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{backup.name}</div>
                            {backup.description && (
                              <div className="text-sm text-gray-500">{backup.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {backup.type === 'full' ? '전체' : backup.type === 'incremental' ? '증분' : '스키마'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(backup.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getBackupStatusBadge(backup.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(backup.created_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="text-blue-600 hover:text-blue-900" title="다운로드">
                              <CloudArrowDownIcon className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900" title="복원">
                              <CloudArrowUpIcon className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900" title="삭제">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 시스템 정보 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-900">보안 상태</span>
              </div>
              <p className="text-sm text-gray-600">모든 보안 설정이 정상입니다.</p>
            </div>
            
            <div className="space-y-2">
                             <div className="flex items-center space-x-2">
                 <CircleStackIcon className="h-5 w-5 text-blue-500" />
                 <span className="text-sm font-medium text-gray-900">데이터베이스</span>
               </div>
              <p className="text-sm text-gray-600">연결 상태: 정상</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900">최근 업데이트</span>
              </div>
              <p className="text-sm text-gray-600">2024-12-01 10:30:00</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage; 