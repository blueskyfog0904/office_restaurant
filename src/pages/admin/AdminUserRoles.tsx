import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon,
  UserIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../services/supabaseClient';

interface UserWithRole {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  role: 'user' | 'moderator' | 'admin' | null;
  role_granted_at: string | null;
  role_granted_by: string | null;
}

const AdminUserRoles: React.FC = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'moderator' | 'admin'>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<'user' | 'moderator' | 'admin'>('user');

  // 사용자 목록 로드
  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          nickname,
          email,
          avatar_url,
          created_at,
          user_roles (
            role,
            granted_at,
            granted_by
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`nickname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('사용자 목록 로드 실패:', error);
        return;
      }

      // 데이터 변환
      const transformedUsers = data?.map((user: any) => ({
        ...user,
        role: user.user_roles?.[0]?.role || null,
        role_granted_at: user.user_roles?.[0]?.granted_at || null,
        role_granted_by: user.user_roles?.[0]?.granted_by || null
      })) || [];

      // 역할 필터 적용
      let filteredUsers = transformedUsers;
      if (roleFilter !== 'all') {
        if (roleFilter === 'user') {
          filteredUsers = transformedUsers.filter((user: any) => !user.role || user.role === 'user');
        } else {
          filteredUsers = transformedUsers.filter((user: any) => user.role === roleFilter);
        }
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 역할 부여/변경
  const handleRoleChange = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 기존 역할 삭제
      if (selectedUser.role) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id);
      }

      // 새 역할 추가 (user가 아닌 경우에만)
      if (newRole !== 'user') {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser.id,
            role: newRole,
            granted_by: currentUser.id
          });

        if (insertError) {
          console.error('역할 부여 실패:', insertError);
          alert('역할 부여에 실패했습니다.');
          return;
        }
      }

      setShowRoleModal(false);
      setSelectedUser(null);
      loadUsers();
      alert(`${selectedUser.nickname}님의 역할이 ${getRoleText(newRole)}으로 변경되었습니다.`);
    } catch (error) {
      console.error('역할 변경 실패:', error);
      alert('역할 변경에 실패했습니다.');
    }
  };

  // 역할 제거
  const handleRemoveRole = async (userId: string, nickname: string) => {
    if (!window.confirm(`${nickname}님의 관리자/운영자 권한을 제거하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('역할 제거 실패:', error);
        alert('역할 제거에 실패했습니다.');
        return;
      }

      loadUsers();
      alert(`${nickname}님의 관리자/운영자 권한이 제거되었습니다.`);
    } catch (error) {
      console.error('역할 제거 실패:', error);
      alert('역할 제거에 실패했습니다.');
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter]);

  const getRoleText = (role: string | null) => {
    switch (role) {
      case 'admin':
        return '관리자';
      case 'moderator':
        return '운영자';
      case 'user':
      default:
        return '일반 사용자';
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">관리자</span>;
      case 'moderator':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">운영자</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">일반 사용자</span>;
    }
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">사용자 역할 관리</h1>
        <p className="text-gray-600">사용자의 권한을 관리하고 운영자/관리자 역할을 부여할 수 있습니다.</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="닉네임 또는 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '전체' },
            { key: 'user', label: '일반 사용자' },
            { key: 'moderator', label: '운영자' },
            { key: 'admin', label: '관리자' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRoleFilter(key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            사용자 목록 ({users.length}명)
          </h2>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">사용자가 없습니다</h3>
            <p className="text-gray-500">검색 조건을 변경해보세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 아바타 */}
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* 사용자 정보 */}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium text-gray-900">{user.nickname}</h3>
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span>가입일: {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                      {user.role_granted_at && (
                        <p className="text-xs text-gray-400">
                          권한 부여일: {new Date(user.role_granted_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role || 'user');
                        setShowRoleModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      역할 변경
                    </button>
                    {user.role && user.role !== 'user' && (
                      <button
                        onClick={() => handleRemoveRole(user.id, user.nickname)}
                        className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        권한 제거
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 역할 변경 모달 */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedUser.nickname}님의 역할 변경
              </h3>

              <div className="space-y-3 mb-6">
                {[
                  { value: 'user', label: '일반 사용자', desc: '기본 권한만 가집니다.' },
                  { value: 'moderator', label: '운영자', desc: '댓글 관리, 신고 처리 등이 가능합니다.' },
                  { value: 'admin', label: '관리자', desc: '모든 관리 기능을 사용할 수 있습니다.' }
                ].map((option) => (
                  <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={newRole === option.value}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleRoleChange}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  변경하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserRoles;
