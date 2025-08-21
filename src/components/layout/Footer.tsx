import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">공무원 맛집</h3>
            <p className="text-gray-600 mb-4">
              공공기관 업무추진비 데이터를 기반으로 한 신뢰할 수 있는 맛집 정보를 제공합니다.
            </p>
            <p className="text-sm text-gray-500">
              실제 공무원들이 방문한 음식점 정보로 더욱 믿을 수 있는 맛집을 찾아보세요.
            </p>
          </div>

          {/* 서비스 링크 */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">서비스</h4>
            <ul className="space-y-2">
              <li>
                <a href="/restaurants" className="text-gray-600 hover:text-blue-600 transition-colors">
                  맛집 찾기
                </a>
              </li>
              <li>
                <a href="/board" className="text-gray-600 hover:text-blue-600 transition-colors">
                  게시판
                </a>
              </li>
              <li>
                <a href="/regions" className="text-gray-600 hover:text-blue-600 transition-colors">
                  지역별 검색
                </a>
              </li>
            </ul>
          </div>

          {/* 지원 링크 */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">지원</h4>
            <ul className="space-y-2">
              <li>
                <a href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
                  서비스 소개
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
                  문의하기
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
                  개인정보처리방침
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-600 hover:text-blue-600 transition-colors">
                  이용약관
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              © {currentYear} 공무원맛집(회사 : 더나움마켓) 제공 All rights reserved.
              
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/privacy" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                개인정보처리방침
              </a>
              <a href="/terms" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                이용약관
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 