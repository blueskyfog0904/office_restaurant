import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const REFRESH_TIMEOUT_MS = 5000;
const API_TIMEOUT_MS = 8000;
const OFFLINE_ERROR_MESSAGE = 'OFFLINE';

class SessionRefreshTimeoutError extends Error {
  constructor() {
    super('SESSION_REFRESH_TIMEOUT');
    this.name = 'SessionRefreshTimeoutError';
  }
}

class ApiTimeoutError extends Error {
  constructor(operation: string) {
    super(`API_TIMEOUT: ${operation}`);
    this.name = 'ApiTimeoutError';
  }
}

class OfflineError extends Error {
  constructor() {
    super(OFFLINE_ERROR_MESSAGE);
    this.name = 'OfflineError';
  }
}

let refreshPromise: Promise<Session | null> | null = null;

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operationName?: string): Promise<T> => {
  if (!timeoutMs) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(operationName ? new ApiTimeoutError(operationName) : new SessionRefreshTimeoutError());
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

export const isApiTimeoutError = (error: unknown): boolean => {
  return (
    error instanceof ApiTimeoutError ||
    (error instanceof Error && error.name === 'ApiTimeoutError')
  );
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

// 로컬 스토리지 정리 (signOut 실패해도 실행)
const cleanupLocalStorage = () => {
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

// 세션 초기화 및 로그아웃 (타임아웃 포함)
export const forceSignOut = async () => {
  try {
    await withTimeout(supabase.auth.signOut(), API_TIMEOUT_MS, 'signOut');
  } catch (e) {
    console.warn('signOut 실패 또는 타임아웃:', e);
  }
  
  // signOut 성공/실패 관계없이 로컬 스토리지 정리
  cleanupLocalStorage();
  clearSessionRefreshState();
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
    // API 호출에 타임아웃 적용
    return await withTimeout(fn(), API_TIMEOUT_MS * 2, operationName);
  } catch (error) {
    if (operationName) {
      console.error(`${operationName} 실패:`, error);
    }
    
    // 타임아웃 에러면 그대로 throw (재시도 안함)
    if (isApiTimeoutError(error)) {
      throw new Error(`요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.`);
    }
    
    // 인증 에러면 세션 정리 후 재시도
    if (isAuthError(error)) {
      console.warn('⚠️ 인증 오류 감지, 세션 정리 후 재시도');
      await forceSignOut();
      // 한 번 더 시도 (타임아웃 적용)
      try {
        return await withTimeout(fn(), API_TIMEOUT_MS * 2, operationName);
      } catch (retryError) {
        if (isApiTimeoutError(retryError)) {
          throw new Error(`요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.`);
        }
        throw retryError;
      }
    }
    
    throw error;
  }
};
