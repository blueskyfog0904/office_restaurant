import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/images/project_logo.png" 
              alt="공무원 맛집 로고" 
              className="h-8 w-auto sm:h-10 md:h-16"
            />
              <span className="text-xl font-bold text-gray-900">
                공무원 맛집
              </span>
            </Link>
          </div>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              MAIN
            </Link>
            <Link 
              to="/restaurants" 
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              지역별 맛집 찾기
            </Link>
            
            {/* 게시판 드롭다운 */}
            <div 
              className="relative"
              onMouseEnter={() => setIsBoardDropdownOpen(true)}
              onMouseLeave={() => setIsBoardDropdownOpen(false)}
            >
              <Link
                to="/board"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
              >
                게시판
                <ChevronDownIcon className="h-4 w-4" />
              </Link>
              
              {/* 드롭다운 메뉴 */}
              {isBoardDropdownOpen && (
                <div
                  className="absolute top-full left-0 pt-2 w-48 z-50"
                >
                  <div className="bg-white rounded-md shadow-lg border border-gray-200">
                    <div className="py-1">
                      <Link
                        to="/board/notice"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        공지사항
                      </Link>
                      <Link
                        to="/board/free"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        자유게시판
                      </Link>
                      <Link
                        to="/board/suggestion"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        의견제안
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* 사용자 메뉴 */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  안녕하세요, <span className="font-medium">{user?.username}</span>님
                </span>
                
                {user?.is_admin && (
                  <Link
                    to="/admin"
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    관리자
                  </Link>
                )}
                
                <Link
                  to="/profile"
                  className="text-gray-700 hover:text-blue-600 p-2 rounded-md transition-colors"
                >
                  <UserIcon className="h-5 w-5" />
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-600 p-2 rounded-md transition-colors"
                  title="로그아웃"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-blue-600 p-2 rounded-md transition-colors"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                MAIN
              </Link>
              <Link 
                to="/restaurants" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                지역별 맛집 찾기
              </Link>
              
              {/* 모바일 게시판 메뉴 */}
              <div className="px-3 py-2">
                <Link
                  to="/board"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors mb-2 block"
                  onClick={() => setIsMenuOpen(false)}
                >
                  게시판
                </Link>
                <div className="ml-4 space-y-1">
                  <Link
                    to="/board/notice"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    공지사항
                  </Link>
                  <Link
                    to="/board/free"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    자유게시판
                  </Link>
                  <Link
                    to="/board/suggestion"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    의견제안
                  </Link>
                </div>
              </div>

              {isLoggedIn ? (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium">{user?.username}</span>님
                  </div>
                  
                  {user?.is_admin && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-sm text-red-700 hover:text-red-900 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      관리자 페이지
                    </Link>
                  )}
                  
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    내 정보
                  </Link>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-red-600 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
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