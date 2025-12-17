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
 * Google API URL인지 확인
 */
export function isGoogleApiUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('googleapis.com') || url.includes('googleusercontent.com');
}

/**
 * 저장된 photo_url이 있으면 사용하고, 없으면 photo_reference로 URL 생성
 * Google API URL은 만료될 수 있으므로 비활성화된 경우 제외
 * @param photoUrl 저장된 photo_url (있을 경우)
 * @param photoReference photo_reference (photo_url이 없을 경우 사용)
 * @param maxWidth 최대 너비 (기본값: 1200)
 * @returns 이미지 URL (Google API URL이면 빈 문자열 반환)
 */
export function getPhotoUrl(
  photoUrl?: string | null,
  photoReference?: string | null,
  maxWidth: number = 1200
): string {
  // 저장된 URL이 있으면 우선 사용 (Google API URL 제외)
  if (photoUrl && !isGoogleApiUrl(photoUrl)) {
    return photoUrl;
  }

  // Google API URL은 만료되어 사용 불가하므로 빈 문자열 반환
  // photo_reference로 URL 생성도 비활성화
  // if (photoReference) {
  //   return buildGooglePhotoUrl(photoReference, maxWidth);
  // }

  // Google URL이거나 없으면 빈 문자열 반환
  return '';
}

