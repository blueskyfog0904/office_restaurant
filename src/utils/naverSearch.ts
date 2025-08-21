/**
 * 네이버 블로그 검색 URL 생성 유틸리티
 */

export const generateNaverSearchUrl = (restaurantName: string, address?: string): string => {
  // 주소에서 지역명 추출 (시/구 단위)
  const regionName = address ? extractRegionFromAddress(address) : '';
  
  // 검색 키워드 구성
  const keywords = [regionName, restaurantName, '맛집', '리뷰']
    .filter(Boolean)
    .join(' ');
  
  // URL 인코딩
  const encodedQuery = encodeURIComponent(keywords);
  
  return `https://search.naver.com/search.naver?where=blog&query=${encodedQuery}`;
};

/**
 * 주소에서 지역명 추출 (시/구 단위)
 */
const extractRegionFromAddress = (address: string): string => {
  // 정규식으로 시/구 단위 지역명 추출
  const regionMatch = address.match(/(.*?[시도])\s*(.*?[시군구])/);
  
  if (regionMatch) {
    const city = regionMatch[1];
    const district = regionMatch[2];
    
    // 서울특별시 -> 서울, 경기도 -> 경기 등으로 축약
    const shortCity = city
      .replace('특별시', '')
      .replace('광역시', '')
      .replace('도', '');
    
    return `${shortCity} ${district}`;
  }
  
  // 매칭되지 않으면 첫 번째 단어 반환
  return address.split(' ')[0] || '';
};

/**
 * 네이버 검색 URL을 새 탭에서 열기
 */
export const openNaverSearch = (restaurantName: string, address?: string): void => {
  const url = generateNaverSearchUrl(restaurantName, address);
  window.open(url, '_blank', 'noopener,noreferrer');
}; 