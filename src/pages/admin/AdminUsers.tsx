import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import { getUsers, updateUserRole, deleteUser, createAdminUser, UserData, CreateAdminRequest, UserFilters } from '../../services/adminApi';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  // 필터 및 검색 상태
  const [filters, setFilters] = useState<UserFilters>({
    role: 'all',
    search: ''
  });
  const [searchInput, setSearchInput] = useState('');

  // 관리자 생성 폼 상태
  const [adminForm, setAdminForm] = useState<CreateAdminRequest>({
    email: '',
    password: '',
    nickname: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<CreateAdminRequest>>({});
  const [isCreating, setIsCreating] = useState(false);

  const loadUsers = async (page: number = 1, userFilters: UserFilters = filters) => {
    try {
      setLoading(true);
      const response = await getUsers(page, 20, userFilters);
      setUsers(response.data);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '사용자 목록을 불러오는데 실패했습니다.';
      
      if (errorMessage.includes('Admin API')) {
        alert(`⚠️ 제한된 사용자 정보 표시\n\n${errorMessage}\n\n일부 정보(마지막 로그인 시간 등)는 표시되지 않을 수 있습니다.`);
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터 변경 핸들러
  const handleRoleFilterChange = (role: 'all' | 'admin' | 'user') => {
    const newFilters = { ...filters, role };
    setFilters(newFilters);
    setCurrentPage(1);
    loadUsers(1, newFilters);
  };

  // 검색 핸들러
  const handleSearch = () => {
    const newFilters = { ...filters, search: searchInput.trim() };
    setFilters(newFilters);
    setCurrentPage(1);
    loadUsers(1, newFilters);
  };

  // 검색 초기화
  const handleSearchReset = () => {
    setSearchInput('');
    const newFilters = { ...filters, search: '' };
    setFilters(newFilters);
    setCurrentPage(1);
    loadUsers(1, newFilters);
  };

  // Enter 키로 검색
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleRoleUpdate = async (userId: string, role: 'admin' | 'user') => {
    try {
      await updateUserRole(userId, role);
      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role } : user
      ));
      setEditingUserId(null);
      alert('사용자 권한이 성공적으로 변경되었습니다.');
    } catch (error) {
      console.error('권한 변경 실패:', error);
      alert('권한 변경에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`정말로 ${userEmail} 사용자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteUser(userId);
      setUsers(users.filter(user => user.user_id !== userId));
      alert('사용자가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '사용자 삭제에 실패했습니다.';
      
      if (errorMessage.includes('Admin API') || errorMessage.includes('프로필만 삭제')) {
        alert(`⚠️ 부분적 삭제 완료\n\n${errorMessage}`);
        // 프로필이 삭제된 경우 목록에서 제거
        setUsers(users.filter(user => user.user_id !== userId));
      } else {
        alert(errorMessage);
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<CreateAdminRequest> = {};

    if (!adminForm.email) {
      errors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) {
      errors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    if (!adminForm.password) {
      errors.password = '비밀번호를 입력해주세요.';
    } else if (adminForm.password.length < 8) {
      errors.password = '비밀번호는 8글자 이상이어야 합니다.';
    }

    if (!adminForm.nickname) {
      errors.nickname = '닉네임을 입력해주세요.';
    } else if (adminForm.nickname.length < 2) {
      errors.nickname = '닉네임은 2글자 이상이어야 합니다.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAdmin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      await createAdminUser(adminForm);
      setShowCreateModal(false);
      setAdminForm({ email: '', password: '', nickname: '' });
      setFormErrors({});
      alert('관리자 계정이 성공적으로 생성되었습니다.');
      // 현재 필터를 유지하면서 목록 새로고침
      loadUsers(currentPage, filters);
    } catch (error) {
      console.error('관리자 생성 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '관리자 계정 생성에 실패했습니다.';
      
      // 더 친화적인 에러 메시지 표시
      if (errorMessage.includes('Admin API')) {
        alert(`⚠️ 관리자 계정 생성 기능 제한\n\n${errorMessage}\n\n현재는 기존 관리자 계정의 권한 변경만 가능합니다.`);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">사용자 목록을 불러오는 중...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-gray-600">시스템 사용자 및 관리자 계정 관리</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          <span>관리자 생성</span>
        </button>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* 역할 필터 라디오 버튼 */}
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-gray-700">사용자 유형:</span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="roleFilter"
                  value="all"
                  checked={filters.role === 'all'}
                  onChange={(e) => handleRoleFilterChange(e.target.value as 'all' | 'admin' | 'user')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">전체</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="roleFilter"
                  value="admin"
                  checked={filters.role === 'admin'}
                  onChange={(e) => handleRoleFilterChange(e.target.value as 'all' | 'admin' | 'user')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">관리자</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="roleFilter"
                  value="user"
                  checked={filters.role === 'user'}
                  onChange={(e) => handleRoleFilterChange(e.target.value as 'all' | 'admin' | 'user')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">일반 사용자</span>
              </label>
            </div>
          </div>

          {/* 검색 */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="이메일 또는 닉네임 검색"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              검색
            </button>
            {(filters.search || filters.role !== 'all') && (
              <button
                onClick={handleSearchReset}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 현재 필터 상태 표시 */}
        {(filters.search || filters.role !== 'all') && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>현재 필터:</span>
              {filters.role !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                  {filters.role === 'admin' ? '관리자' : '일반 사용자'}
                </span>
              )}
              {filters.search && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md">
                  검색: "{filters.search}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">사용자 목록</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  권한
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마지막 로그인
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.nickname}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUserId === user.user_id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="user">일반 사용자</option>
                          <option value="admin">관리자</option>
                        </select>
                        <button
                          onClick={() => handleRoleUpdate(user.user_id, newRole)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? '관리자' : '일반 사용자'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingUserId(user.user_id);
                            setNewRole(user.role);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : '없음'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteUser(user.user_id, user.email)}
                      className="text-red-600 hover:text-red-800"
                      title="사용자 삭제"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                페이지 {currentPage} / {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadUsers(currentPage - 1, filters)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => loadUsers(currentPage + 1, filters)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 관리자 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">새 관리자 생성</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="admin@example.com"
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="8글자 이상"
                />
                {formErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  닉네임
                </label>
                <input
                  type="text"
                  value={adminForm.nickname}
                  onChange={(e) => setAdminForm({ ...adminForm, nickname: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.nickname ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="관리자 이름"
                />
                {formErrors.nickname && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nickname}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isCreating}
              >
                취소
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;