import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRightOnRectangleIcon, UserIcon } from '@heroicons/react/24/outline';
import TopNav, { TopNavItem } from './TopNav';
import MoreDropdown, { MoreItem } from './MoreDropdown';
import MobileScrollTabs, { MobileMoreItem, MobileTab } from './MobileScrollTabs';

const Header: React.FC = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const primaryItems: TopNavItem[] = useMemo(() => ([
    { label: 'HOME', to: '/', isActive: (p) => p === '/' },
    { label: '맛집 찾기', to: '/restaurants', isActive: (p) => p.startsWith('/restaurants') },
    // { label: '맛집정보', to: '/board/restaurant-info', isActive: (p) => p.startsWith('/board/restaurant-info') },
    // { label: '자유게시판', to: '/board/free', isActive: (p) => p.startsWith('/board/free') },
  ]), []);

  const moreItems: MoreItem[] = useMemo(() => ([
    // {
    //   label: '공지사항',
    //   to: '/board/notice',
    //   description: '중요 공지 확인',
    //   isActive: (p) => p.startsWith('/board/notice'),
    // },
    // {
    //   label: '의견제안',
    //   to: '/board/suggestion',
    //   description: '기능/정책 제안 + 상태관리',
    //   isActive: (p) => p.startsWith('/board/suggestion'),
    // },
  ]), []);

  const mobileTabs: MobileTab[] = useMemo(() => primaryItems.map((i) => ({
    label: i.label,
    to: i.to,
    isActive: i.isActive,
  })), [primaryItems]);

  const mobileMoreItems: MobileMoreItem[] = useMemo(() => moreItems.map((i) => ({
    label: i.label,
    to: i.to,
    description: i.description,
  })), [moreItems]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/images/project_logo.png"
                alt="공무원 맛집 로고"
                className="h-8 w-auto sm:h-10"
              />
              <span className="text-lg font-extrabold tracking-tight text-gray-900">
                공무원맛집 가이드
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-2">
            <TopNav items={primaryItems} />
            {moreItems.length > 0 && <MoreDropdown items={moreItems} />}
          </div>

          {/* Right / user */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-3">
              {isLoggedIn ? (
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  {user?.is_admin && (
                    <Link
                      to="/admin"
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md hover:bg-gray-200 transition-colors"
                    >
                      ADMIN
                    </Link>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      <span className="font-bold text-gray-900">{user?.username}</span>님
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to="/profile"
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-full transition-all"
                      title="내 정보"
                    >
                      <UserIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-full transition-all"
                      title="로그아웃"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-full hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    시작하기
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile actions */}
            <div className="lg:hidden flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  {user?.is_admin && (
                    <Link
                      to="/admin"
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md"
                    >
                      ADMIN
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="p-2 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-50"
                    title="내 정보"
                  >
                    <UserIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-50"
                    title="로그아웃"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700"
                  >
                    시작하기
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile scroll tabs */}
      <div className="lg:hidden">
        <MobileScrollTabs tabs={mobileTabs} moreItems={mobileMoreItems} />
      </div>
    </header>
  );
};

export default Header;
