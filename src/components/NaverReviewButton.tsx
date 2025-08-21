import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface NaverReviewButtonProps {
  restaurantName: string;
  address?: string;
  region?: string;
  subRegion?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const NaverReviewButton: React.FC<NaverReviewButtonProps> = ({
  restaurantName,
  address,
  region,
  subRegion,
  className = '',
  size = 'md'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 부모 요소 클릭 이벤트 방지
    
    // 검색 키워드 구성: 'region sub_region title'
    const keywords = [region, subRegion, restaurantName]
      .filter(Boolean)
      .join(' ');
    
    // URL 인코딩
    const encodedQuery = encodeURIComponent(keywords);
    const url = `https://search.naver.com/search.naver?where=blog&query=${encodedQuery}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5 
        bg-green-500 hover:bg-green-600 
        text-white font-medium rounded-md
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
        ${sizeClasses[size]}
        ${className}
      `}
      title={`${restaurantName} 네이버 블로그 리뷰 검색`}
      aria-label={`${restaurantName} 네이버 블로그 리뷰 검색`}
    >
      <MagnifyingGlassIcon className={iconSizes[size]} />
      <span>네이버 리뷰</span>
    </button>
  );
};

export default NaverReviewButton; 