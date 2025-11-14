/**
 * Google Places Photos API URL 생성 유틸리티
 * photo_reference를 사용하여 Google CDN URL 생성
 */

/**
 * photo_reference로부터 Google CDN URL 생성
 * @param photoReference Google Photo Reference
 * @param maxWidth 최대 너비 (기본값: 1200)
 * @returns Google CDN URL
 */
export function buildGooglePhotoUrl(
  photoReference: string,
  maxWidth: number = 1200
): string {
  const apiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY || 
                 process.env.VITE_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('Google Places API 키가 설정되지 않았습니다. 환경변수를 확인하세요.');
    return '';
  }

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

/**
 * 저장된 photo_url이 있으면 사용하고, 없으면 photo_reference로 URL 생성
 * @param photoUrl 저장된 photo_url (있을 경우)
 * @param photoReference photo_reference (photo_url이 없을 경우 사용)
 * @param maxWidth 최대 너비 (기본값: 1200)
 * @returns 이미지 URL
 */
export function getPhotoUrl(
  photoUrl?: string | null,
  photoReference?: string | null,
  maxWidth: number = 1200
): string {
  // 저장된 URL이 있으면 우선 사용
  if (photoUrl) {
    return photoUrl;
  }

  // photo_reference로 URL 생성
  if (photoReference) {
    return buildGooglePhotoUrl(photoReference, maxWidth);
  }

  // 둘 다 없으면 빈 문자열 반환
  return '';
}

