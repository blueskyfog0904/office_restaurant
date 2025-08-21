declare global {
  interface Window {
    Kakao: any;
  }
}

const KAKAO_SDK_URL = 'https://developers.kakao.com/sdk/js/kakao.js';
const KAKAO_SDK_SCRIPT_ID = 'kakao-jssdk';

/**
 * Kakao SDK를 동적으로 로드하고 window.Kakao 가 준비될 때까지 대기
 */
const loadKakaoSdk = async (): Promise<void> => {
  if (typeof window === 'undefined') throw new Error('브라우저 환경이 아닙니다.');
  if ((window as any).Kakao) return; // 이미 로드됨

  let script = document.getElementById(KAKAO_SDK_SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = KAKAO_SDK_SCRIPT_ID;
    script.src = KAKAO_SDK_URL;
    script.async = true;
    document.head.appendChild(script);
  }

  await new Promise<void>((resolve, reject) => {
    const onLoad = () => resolve();
    const onError = () => reject(new Error('Kakao SDK 스크립트 로드 실패'));
    script!.addEventListener('load', onLoad, { once: true });
    script!.addEventListener('error', onError, { once: true });
  });
};

/**
 * Kakao SDK 초기화 (비동기)
 */
const initializeKakaoAsync = async (): Promise<boolean> => {
  await loadKakaoSdk();
  const jsKey = process.env.REACT_APP_KAKAO_JAVASCRIPT_KEY;
  if (!jsKey) {
    throw new Error('REACT_APP_KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다. web/.env를 확인하세요.');
  }
  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(jsKey);
  }
  return !!(window.Kakao && window.Kakao.isInitialized());
};

// 기존 동기 API는 하위 호환 유지 (내부에서 비동기 초기화 사용)
export const initializeKakao = (): boolean => {
  // 동기 API는 신뢰성이 낮으므로 즉시 상태만 반환
  return !!(typeof window !== 'undefined' && window.Kakao && window.Kakao.isInitialized());
};

export const kakaoLoginPopup = async (): Promise<{ accessToken: string }> => {
  const ok = await initializeKakaoAsync();
  if (!ok) throw new Error('Kakao SDK 초기화 실패. 환경변수를 확인해주세요.');

  return new Promise((resolve, reject) => {
    window.Kakao.Auth.login({
      scope: 'profile_nickname,account_email',
      success: (authObj: any) => {
        resolve({ accessToken: authObj.access_token });
      },
      fail: (err: any) => reject(err),
    });
  });
};

export const getKakaoUserProfile = async (): Promise<any> => {
  const ok = await initializeKakaoAsync();
  if (!ok) throw new Error('Kakao SDK 초기화 실패');
  return new Promise((resolve, reject) => {
    window.Kakao.API.request({
      url: '/v2/user/me',
      success: (res: any) => resolve(res),
      fail: (err: any) => reject(err),
    });
  });
};
