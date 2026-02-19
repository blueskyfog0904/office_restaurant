import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const REFRESH_TIMEOUT_MS = 5000;
const API_TIMEOUT_MS = 8000;
const SESSION_VALIDATE_TIMEOUT_MS = 3000;
const OFFLINE_ERROR_MESSAGE = 'OFFLINE';

// 세션 상태 추적
let lastSessionValidation: number = 0;
const SESSION_VALIDATION_INTERVAL_MS = 30000; // 30초마다 세션 검증

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

class SessionExpiredError extends Error {
  constructor() {
    super('SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}

let refreshPromise: Promise<Session | null> | null = null;
let isValidatingSession = false;

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

export const isSessionExpiredError = (error: unknown): boolean => {
  return (
    error instanceof SessionExpiredError ||
    (error instanceof Error && error.name === 'SessionExpiredError')
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
          result.error.message.includes('Invalid Refresh Token') ||
          result.error.message.includes('invalid_grant')) {
        return null;
      }
      throw result.error;
    }

    lastSessionValidation = Date.now();
    return result.data.session ?? null;
  } catch (error) {
    console.error('세션 갱신 중 예외:', error);
    return null;
  } finally {
    refreshPromise = null;
  }
};

// JWT 토큰 만료 시간 확인
const isTokenExpired = (session: Session | null): boolean => {
  if (!session?.access_token) return true;
  
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const exp = payload.exp * 1000; // 초 -> 밀리초
    const now = Date.now();
    // 만료 1분 전이면 만료된 것으로 처리
    return now >= exp - 60000;
  } catch {
    return true;
  }
};

// 세션 유효성 검증 (API 호출 전에 사용)
export const validateSession = async (): Promise<{ isValid: boolean; needsRefresh: boolean }> => {
  if (isValidatingSession) {
    // 이미 검증 중이면 기본값 반환
    return { isValid: true, needsRefresh: false };
  }

  // 최근에 검증했으면 스킵
  const now = Date.now();
  if (now - lastSessionValidation < SESSION_VALIDATION_INTERVAL_MS) {
    return { isValid: true, needsRefresh: false };
  }

  isValidatingSession = true;

  try {
    // 로컬 세션 확인
    const { data: { session }, error } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_VALIDATE_TIMEOUT_MS,
      'validateSession'
    );

    if (error || !session) {
      console.log('🔍 세션 없음 또는 오류');
      return { isValid: false, needsRefresh: false };
    }

    // 토큰 만료 확인
    if (isTokenExpired(session)) {
      console.log('🔄 토큰 만료됨, 갱신 필요');
      return { isValid: true, needsRefresh: true };
    }

    lastSessionValidation = now;
    return { isValid: true, needsRefresh: false };
  } catch (e) {
    console.warn('세션 검증 실패:', e);
    if (isApiTimeoutError(e)) {
      // 포그라운드 복귀/네트워크 지연 시 false로 처리하면 불필요 로그아웃이 발생할 수 있음
      return { isValid: true, needsRefresh: false };
    }
    return { isValid: true, needsRefresh: false };
  } finally {
    isValidatingSession = false;
  }
};

// 세션이 유효한지 빠르게 확인 (동기적 체크)
export const hasValidLocalSession = (): boolean => {
  try {
    // Supabase 세션 키 찾기
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed?.access_token) {
            // 토큰 만료 확인
            const payload = JSON.parse(atob(parsed.access_token.split('.')[1]));
            const exp = payload.exp * 1000;
            return Date.now() < exp - 60000; // 1분 전까지 유효
          }
        }
      }
    }
  } catch {
    // 파싱 오류 시 유효하지 않음
  }
  return false;
};

export const ensureSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();

  if (!error && data.session) {
    // 토큰이 만료 임박하면 갱신
    if (isTokenExpired(data.session)) {
      console.log('🔄 토큰 만료 임박, 갱신 시도');
      if (!refreshPromise) {
        refreshPromise = runRefresh();
      }
      return refreshPromise;
    }
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
  lastSessionValidation = 0;
  isValidatingSession = false;
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
      message.includes('refresh_token_not_found') ||
      message.includes('invalid_grant') ||
      message.includes('session_expired')
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
    // 세션 먼저 검증
    const { isValid, needsRefresh } = await validateSession();
    
    if (!isValid) {
      console.warn('⚠️ 세션이 유효하지 않음');
      throw new SessionExpiredError();
    }

    if (needsRefresh) {
      const session = await ensureSession();
      if (!session) {
        throw new SessionExpiredError();
      }
    }

    return await withTimeout(fn(), API_TIMEOUT_MS, operationName);
  } catch (error) {
    if (operationName) {
      console.error(`${operationName} 실패:`, error);
    }

    if (isSessionExpiredError(error) || isAuthError(error)) {
      console.warn('⚠️ 세션 만료, 로그아웃 처리');
      await forceSignOut();
      throw new SessionExpiredError();
    }

    throw error;
  }
};

// 공개 API 호출을 위한 래퍼 함수 (세션 불필요, 인증 오류 시 자동 정리)
export const executePublicApi = async <T>(
  fn: () => Promise<T>,
  operationName?: string
): Promise<T> => {
  // 로그인 상태인 경우 세션 상태 먼저 확인
  const hasSession = hasValidLocalSession();
  
  if (hasSession) {
    const { isValid, needsRefresh } = await validateSession();
    
    if (!isValid) {
      console.warn('⚠️ 공개 API 호출 전 세션 검증 실패 - 즉시 로그아웃하지 않고 요청 계속 진행');
    } else if (needsRefresh) {
      // 백그라운드에서 세션 갱신 시도 (실패해도 API 호출은 진행)
      try {
        const session = await ensureSession();
        if (!session) {
          console.warn('⚠️ 공개 API 호출 전 세션 갱신 실패 - 요청은 익명/현재 상태로 진행');
        }
      } catch (refreshError) {
        console.warn('⚠️ 공개 API 호출 전 세션 갱신 오류:', refreshError);
      }
    }
  }

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
      window.dispatchEvent(new CustomEvent('session-expired'));
      
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
