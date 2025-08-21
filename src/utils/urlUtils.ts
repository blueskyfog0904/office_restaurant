// URL 생성 및 처리 유틸리티

/**
 * 음식점 정보로 상세페이지 URL을 생성합니다
 */
export const generateRestaurantUrl = (
  region: string,
  subRegion: string,
  title: string
): string => {
  // URL 인코딩으로 특수문자 처리
  const encodedRegion = encodeURIComponent(region);
  const encodedSubRegion = encodeURIComponent(subRegion);
  const encodedTitle = encodeURIComponent(title);
  
  return `/restaurants/${encodedRegion}/${encodedSubRegion}/${encodedTitle}`;
};

/**
 * 음식점 객체로 상세페이지 URL을 생성합니다
 */
export const generateRestaurantUrlFromObject = (restaurant: {
  region?: string;
  sub_region?: string;
  title?: string;
  name?: string;
}): string | null => {
  // 필수 정보가 없으면 null 반환
  if (!restaurant.region || !restaurant.sub_region) {
    return null;
  }
  
  const title = restaurant.title || restaurant.name || '';
  if (!title) {
    return null;
  }
  
  return generateRestaurantUrl(restaurant.region, restaurant.sub_region, title);
};

/**
 * URL에서 파라미터를 디코딩합니다
 */
export const decodeUrlParams = (
  region: string,
  subRegion: string,
  title: string
) => ({
  region: decodeURIComponent(region),
  subRegion: decodeURIComponent(subRegion),
  title: decodeURIComponent(title)
});
