// 즐겨찾기 및 히스토리 관리 유틸리티

export interface FavoriteRestaurant {
  id: string;
  name: string;
  address: string;
  category?: string;
  sub_add1?: string;
  sub_add2?: string;
  addedAt: string;
}

export interface RecentRestaurant {
  id: string;
  name: string;
  address: string;
  category?: string;
  sub_add1?: string;
  sub_add2?: string;
  visitedAt: string;
}

const FAVORITES_KEY = 'office_restaurant_favorites';
const RECENT_HISTORY_KEY = 'office_restaurant_recent_history';
const MAX_HISTORY_SIZE = 20;

// 즐겨찾기 관련 함수들
export const getFavorites = (): FavoriteRestaurant[] => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('즐겨찾기 로드 실패:', error);
    return [];
  }
};

export const addToFavorites = (restaurant: {
  id: string;
  name: string;
  address: string;
  category?: string;
  sub_add1?: string;
  sub_add2?: string;
}): boolean => {
  try {
    const favorites = getFavorites();
    const exists = favorites.find(fav => fav.id === restaurant.id);
    
    if (exists) {
      return false; // 이미 존재함
    }

    const newFavorite: FavoriteRestaurant = {
      ...restaurant,
      addedAt: new Date().toISOString()
    };

    favorites.push(newFavorite);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return true;
  } catch (error) {
    console.error('즐겨찾기 추가 실패:', error);
    return false;
  }
};

export const removeFromFavorites = (restaurantId: string): boolean => {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(fav => fav.id !== restaurantId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('즐겨찾기 제거 실패:', error);
    return false;
  }
};

export const isFavorite = (restaurantId: string): boolean => {
  const favorites = getFavorites();
  return favorites.some(fav => fav.id === restaurantId);
};

// 최근 본 음식점 히스토리 관련 함수들
export const getRecentHistory = (): RecentRestaurant[] => {
  try {
    const stored = localStorage.getItem(RECENT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('최근 히스토리 로드 실패:', error);
    return [];
  }
};

export const addToRecentHistory = (restaurant: {
  id: string;
  name: string;
  address: string;
  category?: string;
  sub_add1?: string;
  sub_add2?: string;
}): boolean => {
  try {
    const history = getRecentHistory();
    
    // 이미 존재하는 경우 제거
    const filtered = history.filter(item => item.id !== restaurant.id);
    
    const newHistoryItem: RecentRestaurant = {
      ...restaurant,
      visitedAt: new Date().toISOString()
    };

    // 맨 앞에 추가
    filtered.unshift(newHistoryItem);
    
    // 최대 개수 제한
    if (filtered.length > MAX_HISTORY_SIZE) {
      filtered.splice(MAX_HISTORY_SIZE);
    }

    localStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('최근 히스토리 추가 실패:', error);
    return false;
  }
};

export const clearRecentHistory = (): void => {
  try {
    localStorage.removeItem(RECENT_HISTORY_KEY);
  } catch (error) {
    console.error('최근 히스토리 삭제 실패:', error);
  }
};

// 공유 통계 수집
export const trackShare = (platform: string, restaurantId: string, restaurantName: string): void => {
  try {
    const shareStats = JSON.parse(localStorage.getItem('office_restaurant_share_stats') || '{}');
    const today = new Date().toISOString().split('T')[0];
    
    if (!shareStats[today]) {
      shareStats[today] = {};
    }
    
    if (!shareStats[today][platform]) {
      shareStats[today][platform] = 0;
    }
    
    shareStats[today][platform]++;
    
    // 상세 통계 (최근 30일)
    const detailedStats = JSON.parse(localStorage.getItem('office_restaurant_detailed_stats') || '[]');
    detailedStats.push({
      platform,
      restaurantId,
      restaurantName,
      timestamp: new Date().toISOString()
    });
    
    // 30일 이전 데이터 제거
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filteredStats = detailedStats.filter((stat: any) => 
      new Date(stat.timestamp) > thirtyDaysAgo
    );
    
    localStorage.setItem('office_restaurant_share_stats', JSON.stringify(shareStats));
    localStorage.setItem('office_restaurant_detailed_stats', JSON.stringify(filteredStats));
  } catch (error) {
    console.error('공유 통계 수집 실패:', error);
  }
};

export const getShareStats = () => {
  try {
    const shareStats = JSON.parse(localStorage.getItem('office_restaurant_share_stats') || '{}');
    const detailedStats = JSON.parse(localStorage.getItem('office_restaurant_detailed_stats') || '[]');
    
    return {
      dailyStats: shareStats,
      detailedStats
    };
  } catch (error) {
    console.error('공유 통계 로드 실패:', error);
    return {
      dailyStats: {},
      detailedStats: []
    };
  }
}; 