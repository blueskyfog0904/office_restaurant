import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 앱 버전 (배포 시 환경변수로 설정하거나 수동 업데이트)
// 주의: Date.now() 사용 금지 - 매 페이지 로드마다 캐시 정리됨
const APP_VERSION = process.env.REACT_APP_BUILD_TIME || '1.0.1';
const STORAGE_VERSION_KEY = 'app_version';

const clearOldCache = () => {
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  
  if (storedVersion !== APP_VERSION) {
    console.log('🔄 앱 버전 변경 감지, 캐시 정리 중...', {
      stored: storedVersion,
      current: APP_VERSION
    });
    
    // Supabase 세션 키(sb-로 시작)는 보존하여 로그인 유지
    const keysToKeep = ['lastActivityTime'];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Supabase 세션 키는 제외 (로그인 상태 유지)
      if (key && !keysToKeep.includes(key) && !key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`캐시 정리 실패: ${key}`, e);
      }
    });
    
    sessionStorage.clear();
    
    localStorage.setItem(STORAGE_VERSION_KEY, APP_VERSION);
    console.log('✅ 캐시 정리 완료 (Supabase 세션 유지)');
  }
};

clearOldCache();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister().then(() => {
        console.log('✅ 서비스 워커 등록 해제 완료');
      });
    });
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
