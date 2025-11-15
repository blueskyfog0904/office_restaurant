

// 소셜 공유 유틸리티 함수들

export interface ShareData {
  title: string;
  description: string;
  url: string;
  image?: string;
  restaurantId?: string;
  restaurantName?: string;
}

// 카카오톡 공유
export const shareToKakao = (data: ShareData) => {
  // 공유 통계 수집
  if (data.restaurantId && data.restaurantName) {
    const { trackShare } = require('./favorites');
    trackShare('kakao', data.restaurantId, data.restaurantName);
  }

  if (typeof window !== 'undefined' && (window as any).Kakao) {
    const kakao = (window as any).Kakao;
    
    if (!kakao.isInitialized()) {
      kakao.init(process.env.REACT_APP_KAKAO_MAP_API_KEY);
    }
    
    kakao.Link.sendDefault({
      objectType: 'feed',
      content: {
        title: data.title,
        description: data.description,
        imageUrl: data.image || 'https://www.kofficer-guide.co.kr/images/project_logo_original.png',
        link: {
          mobileWebUrl: data.url,
          webUrl: data.url,
        },
      },
      buttons: [
        {
          title: '자세히 보기',
          link: {
            mobileWebUrl: data.url,
            webUrl: data.url,
          },
        },
      ],
    });
  } else {
    // Kakao SDK가 없는 경우 URL로 공유
    const shareUrl = `https://story.kakao.com/share?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.title)}`;
    window.open(shareUrl, '_blank');
  }
};

// 네이버 블로그 공유
export const shareToNaver = (data: ShareData) => {
  // 공유 통계 수집
  if (data.restaurantId && data.restaurantName) {
    const { trackShare } = require('./favorites');
    trackShare('naver', data.restaurantId, data.restaurantName);
  }

  const shareUrl = `https://share.naver.com/web/shareView?url=${encodeURIComponent(data.url)}&title=${encodeURIComponent(data.title)}`;
  window.open(shareUrl, '_blank');
};

// 페이스북 공유
export const shareToFacebook = (data: ShareData) => {
  // 공유 통계 수집
  if (data.restaurantId && data.restaurantName) {
    const { trackShare } = require('./favorites');
    trackShare('facebook', data.restaurantId, data.restaurantName);
  }

  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`;
  window.open(shareUrl, '_blank');
};

// 트위터 공유
export const shareToTwitter = (data: ShareData) => {
  // 공유 통계 수집
  if (data.restaurantId && data.restaurantName) {
    const { trackShare } = require('./favorites');
    trackShare('twitter', data.restaurantId, data.restaurantName);
  }

  const text = `${data.title} - ${data.description}`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(data.url)}`;
  window.open(shareUrl, '_blank');
};

// 링크 복사
export const copyToClipboard = async (url: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('클립보드 복사 실패:', error);
    return false;
  }
};

// 네이티브 공유 API 사용 (모바일)
export const nativeShare = async (data: ShareData): Promise<boolean> => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: data.title,
        text: data.description,
        url: data.url,
      });
      return true;
    } catch (error) {
      console.error('네이티브 공유 실패:', error);
      return false;
    }
  }
  return false;
};

// 카카오맵 외부 링크 생성
export const getKakaoMapUrl = (name: string, address: string, lat?: number, lng?: number): string => {
  if (lat && lng) {
    // 좌표가 있는 경우
    return `https://map.kakao.com/link/map/${name},${lat},${lng}`;
  } else {
    // 좌표가 없는 경우 검색 링크
    const searchQuery = encodeURIComponent(`${name} ${address}`);
    return `https://map.kakao.com/link/search/${searchQuery}`;
  }
};

// 네이버지도 외부 링크 생성
export const getNaverMapUrl = (name: string, address: string): string => {
  const searchQuery = encodeURIComponent(`${name} ${address}`);
  return `https://map.naver.com/v5/search/${searchQuery}`;
};