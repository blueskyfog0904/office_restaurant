import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const REFRESH_TIMEOUT_MS = 5000;
const OFFLINE_ERROR_MESSAGE = 'OFFLINE';

class SessionRefreshTimeoutError extends Error {
  constructor() {
    super('SESSION_REFRESH_TIMEOUT');
    this.name = 'SessionRefreshTimeoutError';
  }
}

class OfflineError extends Error {
  constructor() {
    super(OFFLINE_ERROR_MESSAGE);
    this.name = 'OfflineError';
  }
}

let refreshPromise: Promise<Session | null> | null = null;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  if (!timeoutMs) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new SessionRefreshTimeoutError());
    }, timeoutMs);

    promise
      .then(value => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

type RefreshResponse = Awaited<ReturnType<typeof supabase.auth.refreshSession>>;

const runRefresh = async (): Promise<Session | null> => {
  try {
    const result = await withTimeout<RefreshResponse>(
      supabase.auth.refreshSession(),
      REFRESH_TIMEOUT_MS
    );

    if (result.error) {
      console.error('세션 갱신 실패:', result.error.message);
      if (result.error.message.includes('refresh_token_not_found') ||
          result.error.message.includes('Invalid Refresh Token')) {
        return null;
      }
      throw result.error;
    }

    return result.data.session ?? null;
  } catch (error) {
    console.error('세션 갱신 중 예외:', error);
    return null;
  } finally {
    refreshPromise = null;
  }
};

export const ensureSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();

  if (!error && data.session) {
    return data.session;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new OfflineError();
  }

  if (!refreshPromise) {
    refreshPromise = runRefresh();
  }

  return refreshPromise;
};

export const isOfflineError = (error: unknown): boolean => {
  return (
    error instanceof OfflineError ||
    (error instanceof Error && error.name === 'OfflineError') ||
    (error instanceof Error && error.message === OFFLINE_ERROR_MESSAGE)
  );
};

export const isSessionTimeoutError = (error: unknown): boolean => {
  return (
    error instanceof SessionRefreshTimeoutError ||
    (error instanceof Error && error.name === 'SessionRefreshTimeoutError')
  );
};

export const clearSessionRefreshState = () => {
  refreshPromise = null;
};

// 인증 관련 에러인지 확인
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('jwt') ||
      message.includes('token') ||
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('refresh_token_not_found')
    );
  }
  return false;
};

// 세션 초기화 및 로그아웃
export const forceSignOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('signOut 실패:', e);
  }
  
  // localStorage 정리
  const keysToRemove = ['user', 'admin_user'];
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  });
  
  // Supabase 세션 키 정리
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  }
};

// 세션이 필요한 API 호출을 위한 래퍼 함수
export const executeWithSession = async <T>(
  fn: () => Promise<T>,
  operationName?: string
): Promise<T> => {
  try {
    await ensureSession();
    return await fn();
  } catch (error) {
    if (operationName) {
      console.error(`${operationName} 실패:`, error);
    }
    throw error;
  }
};

// 공개 API 호출을 위한 래퍼 함수 (세션 불필요, 인증 오류 시 자동 정리)
export const executePublicApi = async <T>(
  fn: () => Promise<T>,
  operationName?: string
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (operationName) {
      console.error(`${operationName} 실패:`, error);
    }
    
    // 인증 에러면 세션 정리 후 재시도
    if (isAuthError(error)) {
      console.warn('⚠️ 인증 오류 감지, 세션 정리 후 재시도');
      await forceSignOut();
      // 한 번 더 시도
      return await fn();
    }
    
    throw error;
  }
};
