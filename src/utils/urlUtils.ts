// URL 생성 및 처리 유틸리티

/**
 * 음식점 정보로 상세페이지 URL을 생성합니다
 * 한글을 그대로 사용하여 URL이 깔끔하게 보이도록 합니다
 */
export const generateRestaurantUrl = (
  subAdd1: string,
  subAdd2: string,
  title: string
): string => {
  return `/restaurants/${subAdd1}/${subAdd2}/${title}`;
};

/**
 * 음식점 객체로 상세페이지 URL을 생성합니다
 */
export const generateRestaurantUrlFromObject = (restaurant: {
  sub_add1?: string;
  sub_add2?: string;
  title?: string;
  name?: string;
}): string | null => {
  // 필수 정보가 없으면 null 반환
  if (!restaurant.sub_add1 || !restaurant.sub_add2) {
    return null;
  }
  
  const title = restaurant.title || restaurant.name || '';
  if (!title) {
    return null;
  }
  
  return generateRestaurantUrl(restaurant.sub_add1, restaurant.sub_add2, title);
};

/**
 * URL에서 파라미터를 디코딩합니다
 * React Router가 자동으로 디코딩해주므로 그대로 반환합니다
 */
export const decodeUrlParams = (
  subAdd1: string,
  subAdd2: string,
  title: string
) => ({
  subAdd1: subAdd1,
  subAdd2: subAdd2,
  title: title
});
