import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  StarIcon,
  MapPinIcon,
  EyeIcon,
  HandThumbUpIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { 
  updateProfile, 
  deleteAccount, 
  getUserFavorites,
  removeFavorite,
  getUserPosts,
  getUserReviews
} from '../../services/kakaoAuthService';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  
  // 상태 관리
  const [isEditing, setIsEditing] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 사용자 활동 내역
  const [favorites, setFavorites] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  

  
  // 계정 삭제 확인
  const [deleteConfirm, setDeleteConfirm] = useState('');



  // 사용자 정보가 변경될 때 폼 데이터 업데이트
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // 사용자 활동 내역 로드
  useEffect(() => {
    if (user) {
      loadUserActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 메시지 자동 제거
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 사용자 활동 내역 로드
  const loadUserActivities = async () => {
    if (!user) return;
    
    try {
      setActivitiesLoading(true);
      const [favoritesData, postsData, reviewsData] = await Promise.all([
        getUserFavorites(user.id),
        getUserPosts(user.id),
        getUserReviews(user.id)
      ]);
      
      setFavorites(favoritesData);
      setPosts(postsData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('사용자 활동 내역 로드 실패:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // 즐겨찾기 제거
  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      await removeFavorite(favoriteId);
      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      setMessage({ type: 'success', text: '즐겨찾기가 제거되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '즐겨찾기 제거에 실패했습니다.' });
    }
  };

  // 프로필 업데이트
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      // kakaoAuthService의 updateProfile은 nickname(string)만 받음
      await updateProfile(formData.username);
      
      // 사용자 정보 새로고침
      await refreshUser();
      
      setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다.' });
      setIsEditing(false);
      
      // 성공 메시지를 3초 후 자동 제거
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '프로필 업데이트에 실패했습니다.' });
      
      // 에러 메시지를 5초 후 자동 제거
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };



  // 계정 삭제
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setMessage({ type: 'error', text: '정확히 "DELETE"를 입력해주세요.' });
      return;
    }

    try {
      setLoading(true);
      await deleteAccount();
      await logout();
      navigate('/');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '계정 삭제에 실패했습니다.' });
      setLoading(false);
    }
  };

  // 별점 렌더링
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarSolidIcon
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating}점</span>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <p className="text-gray-600 mb-4">
            프로필을 확인하려면 먼저 로그인해주세요.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">내 프로필</h1>
        <p className="text-gray-600">계정 정보를 관리하고 설정을 변경할 수 있습니다.</p>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className={`mb-6 p-4 rounded-md flex items-center justify-between ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
          <button
            onClick={() => setMessage(null)}
            className="ml-4 text-current hover:opacity-70"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽 컬럼 - 계정 설정 */}
        <div className="lg:col-span-1 space-y-8">
          {/* 프로필 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">기본 정보</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  수정
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">사용자명</p>
                    <p className="text-gray-900">{user.username}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">이메일</p>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">가입일</p>
                    <p className="text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    사용자명
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 rounded-md cursor-not-allowed"
                    disabled
                    readOnly
                  />
                  <p className="mt-1 text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
                  >
                    {loading ? '저장 중...' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        username: user.username || '',
                        email: user.email || ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 카카오 OAuth 안내 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">계정 보안</h2>
              <div className="flex items-center text-yellow-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5 mr-2">
                  <path fill="#3C1E1E" d="M16 5C9.925 5 5 8.88 5 13.667c0 3.17 2.187 5.93 5.444 7.35-.187.66-.672 2.37-.77 2.74-.12.47.17.46.36.33.15-.1 2.37-1.62 3.33-2.28.85.13 1.73.2 2.64.2 6.075 0 11-3.88 11-8.667C27 8.88 22.075 5 16 5z"/>
                </svg>
                <span className="text-sm font-medium">카카오 계정</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    카카오 계정으로 로그인 중
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      카카오 계정으로 로그인하셨습니다. 비밀번호는 카카오에서 관리되므로 
                      여기서 변경할 수 없습니다.
                    </p>
                    <p className="mt-2">
                      비밀번호를 변경하려면 
                      <a 
                        href="https://accounts.kakao.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium underline hover:text-yellow-900"
                      >
                        카카오 계정 관리 페이지
                      </a>
                      를 이용해주세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 계정 삭제 */}
          <div className="bg-red-50 rounded-lg border border-red-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
                <h2 className="text-xl font-semibold text-red-900">계정 삭제</h2>
              </div>
              {!isDeletingAccount && (
                <button
                  onClick={() => setIsDeletingAccount(true)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  삭제
                </button>
              )}
            </div>

            <p className="text-red-700 mb-4">
              계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
            </p>

            {isDeletingAccount && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="deleteConfirm" className="block text-sm font-medium text-red-700 mb-1">
                    확인을 위해 "DELETE"를 입력하세요
                  </label>
                  <input
                    type="text"
                    id="deleteConfirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="DELETE"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading || deleteConfirm !== 'DELETE'}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '삭제 중...' : '계정 삭제'}
                  </button>
                  <button
                    onClick={() => {
                      setIsDeletingAccount(false);
                      setDeleteConfirm('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽 컬럼 - 활동 내역 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 즐겨찾기 목록 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">즐겨찾기 목록</h2>
              <div className="flex items-center text-sm text-gray-500">
                <HeartSolidIcon className="h-4 w-4 mr-1 text-red-500" />
                {favorites.length}개
              </div>
            </div>

            {activitiesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <span className="ml-2 text-gray-600">로딩 중...</span>
              </div>
            ) : favorites.length > 0 ? (
              <div className="space-y-4">
                {favorites.map((favorite) => (
                  <div key={favorite.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {favorite.restaurants?.title || favorite.restaurants?.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span>{favorite.restaurants?.address}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                            {favorite.restaurants?.category}
                          </span>
                          <span className="ml-2">
                            {new Date(favorite.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => navigate(`/restaurants/${favorite.restaurants?.id}`)}
                          className="px-3 py-1 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600"
                        >
                          보기
                        </button>
                        <button
                          onClick={() => handleRemoveFavorite(favorite.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="즐겨찾기 제거"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <HeartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  즐겨찾기가 없습니다
                </h3>
                <p className="text-gray-600">
                  마음에 드는 음식점을 즐겨찾기에 추가해보세요!
                </p>
                <button
                  onClick={() => navigate('/restaurants')}
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  음식점 찾기
                </button>
              </div>
            )}
          </div>

          {/* 작성한 글 목록 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">작성한 글</h2>
              <div className="flex items-center text-sm text-gray-500">
                <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                {posts.length}개
              </div>
            </div>

            {activitiesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <span className="ml-2 text-gray-600">로딩 중...</span>
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{post.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center text-sm text-gray-500 gap-4">
                          <span className="bg-blue-100 px-2 py-1 rounded-full text-xs">
                            {post.board_type === 'notice' ? '공지사항' : 
                             post.board_type === 'free' ? '자유게시판' : '의견제안'}
                          </span>
                          <div className="flex items-center">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            {post.view_count}
                          </div>
                          <div className="flex items-center">
                            <HandThumbUpIcon className="h-4 w-4 mr-1" />
                            {post.like_count}
                          </div>
                          <span>
                            {new Date(post.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/board/${post.board_type}/${post.id}`)}
                        className="ml-4 px-3 py-1 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600"
                      >
                        보기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  작성한 글이 없습니다
                </h3>
                <p className="text-gray-600">
                  게시판에 글을 작성해보세요!
                </p>
                <button
                  onClick={() => navigate('/board')}
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  게시판 가기
                </button>
              </div>
            )}
          </div>

          {/* 작성한 리뷰 목록 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">작성한 리뷰</h2>
              <div className="flex items-center text-sm text-gray-500">
                <StarSolidIcon className="h-4 w-4 mr-1 text-yellow-400" />
                {reviews.length}개
              </div>
            </div>

            {activitiesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <span className="ml-2 text-gray-600">로딩 중...</span>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {review.restaurants?.title || review.restaurants?.name}
                        </h3>
                        <div className="mb-2">
                          {renderStars(review.rating)}
                        </div>
                        {review.content && (
                          <p className="text-sm text-gray-600 mb-2">
                            {review.content}
                          </p>
                        )}
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                            {review.restaurants?.category}
                          </span>
                          <span className="ml-2">
                            {new Date(review.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/restaurants/${review.restaurants?.id}`)}
                        className="ml-4 px-3 py-1 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600"
                      >
                        보기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <StarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  작성한 리뷰가 없습니다
                </h3>
                <p className="text-gray-600">
                  방문한 음식점에 리뷰를 남겨보세요!
                </p>
                <button
                  onClick={() => navigate('/restaurants')}
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  음식점 찾기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 