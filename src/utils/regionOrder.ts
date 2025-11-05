// 시도 정렬 순서 관리

// 기본 시도 정렬 순서
export const DEFAULT_PROVINCE_ORDER = [
  '서울특별시',
  '경기도',
  '인천광역시',
  '대전광역시',
  '광주광역시',
  '대구광역시',
  '부산광역시',
  '울산광역시',
  '세종특별자치시',
  '강원도',
  '충청북도',
  '충청남도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주도'
];

/**
 * 시도 목록을 정해진 순서대로 정렬
 * @param provinces 정렬할 시도 목록
 * @param customOrder 사용자 정의 순서 (옵션)
 * @returns 정렬된 시도 목록
 */
export const sortProvinces = (
  provinces: string[],
  customOrder?: string[]
): string[] => {
  const order = customOrder || DEFAULT_PROVINCE_ORDER;
  
  return provinces.sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    
    // 둘 다 순서에 있으면 순서대로
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // A만 순서에 있으면 A가 먼저
    if (indexA !== -1) return -1;
    
    // B만 순서에 있으면 B가 먼저
    if (indexB !== -1) return 1;
    
    // 둘 다 순서에 없으면 가나다순
    return a.localeCompare(b, 'ko');
  });
};

/**
 * 시군구 목록을 가나다순으로 정렬
 * @param districts 정렬할 시군구 목록
 * @returns 정렬된 시군구 목록
 */
export const sortDistricts = <T extends { sub_add2: string }>(
  districts: T[]
): T[] => {
  return [...districts].sort((a, b) => 
    a.sub_add2.localeCompare(b.sub_add2, 'ko')
  );
};

