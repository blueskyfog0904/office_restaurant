import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 빌드 시간 기반 버전 (배포마다 자동 캐시 정리)
const APP_VERSION = process.env.REACT_APP_BUILD_TIME || Date.now().toString();
const STORAGE_VERSION_KEY = 'app_version';

const clearOldCache = () => {
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  
  if (storedVersion !== APP_VERSION) {
    console.log('🔄 앱 버전 변경 감지, 캐시 정리 중...', {
      stored: storedVersion,
      current: APP_VERSION
    });
    
    const keysToKeep = ['lastActivityTime'];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
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
    console.log('✅ 캐시 정리 완료');
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
