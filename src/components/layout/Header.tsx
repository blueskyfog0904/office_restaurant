import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-primary-500 font-bold' : 'text-gray-600 font-medium hover:text-primary-500';
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm py-2"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo Area */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/images/project_logo.png" 
                alt="공무원 맛집 로고" 
                className="h-8 w-auto sm:h-10 md:h-14"
              />
              <span className="text-xl font-bold text-gray-900">
                공무원맛집 가이드
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`text-sm transition-colors ${isActive('/')}`}
            >
              HOME
            </Link>
            <Link 
              to="/restaurants" 
              className={`text-sm transition-colors ${isActive('/restaurants')}`}
            >
              맛집 찾기
            </Link>
            
            {/* Board Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setIsBoardDropdownOpen(true)}
              onMouseLeave={() => setIsBoardDropdownOpen(false)}
            >
              <Link
                to="/board"
                className={`text-sm transition-colors flex items-center gap-1 ${
                  location.pathname.startsWith('/board') ? 'text-primary-500 font-bold' : 'text-gray-600 font-medium hover:text-primary-500'
                }`}
              >
                커뮤니티
                <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${isBoardDropdownOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              {/* Dropdown Menu */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 w-40 transition-all duration-200 ${
                isBoardDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
              }`}>
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden p-1">
                  <Link
                    to="/board/notice"
                    className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-500 rounded-lg transition-colors"
                  >
                    공지사항
                  </Link>
                  <Link
                    to="/board/free"
                    className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-500 rounded-lg transition-colors"
                  >
                    자유게시판
                  </Link>
                  <Link
                    to="/board/suggestion"
                    className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-500 rounded-lg transition-colors"
                  >
                    의견제안
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-3">
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
                    className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-full transition-all"
                    title="내 정보"
                  >
                    <UserIcon className="h-5 w-5" />
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
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
                  className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-primary-500 text-white text-sm font-bold rounded-full hover:bg-primary-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  시작하기
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-600 hover:text-primary-500 rounded-lg transition-colors"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg animate-in slide-in-from-top-5 duration-200">
            <div className="p-4 space-y-1">
              <Link 
                to="/" 
                className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                  location.pathname === '/' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                HOME
              </Link>
              <Link 
                to="/restaurants" 
                className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                  location.pathname === '/restaurants' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                맛집 찾기
              </Link>
              
              <div className="px-4 py-2">
                <div className="text-xs font-semibold text-gray-400 mb-2">커뮤니티</div>
                <div className="space-y-1 pl-2 border-l-2 border-gray-100">
                  <Link
                    to="/board/notice"
                    className="block px-4 py-2 text-sm text-gray-600 hover:text-primary-500"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    공지사항
                  </Link>
                  <Link
                    to="/board/free"
                    className="block px-4 py-2 text-sm text-gray-600 hover:text-primary-500"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    자유게시판
                  </Link>
                  <Link
                    to="/board/suggestion"
                    className="block px-4 py-2 text-sm text-gray-600 hover:text-primary-500"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    의견제안
                  </Link>
                </div>
              </div>

              <div className="h-px bg-gray-100 my-2" />

              {isLoggedIn ? (
                <div className="space-y-1">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{user?.username}님</span>
                    {user?.is_admin && (
                      <Link
                        to="/admin"
                        className="text-xs font-bold text-primary-500 bg-primary-50 px-2 py-1 rounded"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        ADMIN
                      </Link>
                    )}
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 rounded-xl"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    내 정보 설정
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    to="/login"
                    className="flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center px-4 py-3 text-sm font-bold text-white bg-primary-500 rounded-xl hover:bg-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
