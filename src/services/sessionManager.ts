import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const isLocalhost = () => {
  return typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
};

const REFRESH_TIMEOUT_MS = 15000;
const GET_SESSION_TIMEOUT_MS = 10000;
const MAX_RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;
const OFFLINE_ERROR_MESSAGE = 'OFFLINE';
const AUTH_ERROR_KEYWORDS = ['jwt', 'expired', 'invalid', 'session', 'token', 'auth', '401'];

class SessionRefreshTimeoutError extends Error {
  constructor() {
    super('SESSION_REFRESH_TIMEOUT');
    this.name = 'SessionRefreshTimeoutError';
  }
}

class SessionGetTimeoutError extends Error {
  constructor() {
    super('SESSION_GET_TIMEOUT');
    this.name = 'SessionGetTimeoutError';
  }
}

class OfflineError extends Error {
  constructor() {
    super(OFFLINE_ERROR_MESSAGE);
    this.name = 'OfflineError';
  }
}

export class SessionExpiredError extends Error {
  context?: string;

  constructor(context?: string) {
    super('세션이 만료되었습니다. 다시 로그인해주세요.');
    this.name = 'SessionExpiredError';
    this.context = context;
  }
}

let refreshPromise: Promise<Session | null> | null = null;

export const clearSessionRefreshState = () => {
  refreshPromise = null;
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  TimeoutErrorCtor: new () => Error
): Promise<T> => {
  if (!timeoutMs) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutErrorCtor());
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
type GetSessionResponse = Awaited<ReturnType<typeof supabase.auth.getSession>>;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const runRefreshWithRetry = async (retryCount = 0): Promise<Session | null> => {
  try {
    const result = await withTimeout<RefreshResponse>(
      supabase.auth.refreshSession(),
      REFRESH_TIMEOUT_MS,
      SessionRefreshTimeoutError
    );

    if (result.error) {
      throw result.error;
    }

    return result.data.session ?? null;
  } catch (error) {
    if (error instanceof SessionRefreshTimeoutError && retryCount < MAX_RETRY_COUNT) {
      console.warn(`세션 갱신 타임아웃, 재시도 중... (${retryCount + 1}/${MAX_RETRY_COUNT})`);
      await delay(RETRY_DELAY_MS);
      return runRefreshWithRetry(retryCount + 1);
    }
    throw error;
  }
};

const runRefresh = async (): Promise<Session | null> => {
  try {
    return await runRefreshWithRetry();
  } finally {
    refreshPromise = null;
  }
};

const getSessionWithRetry = async (retryCount = 0): Promise<Session | null> => {
  try {
    const { data, error } = await withTimeout<GetSessionResponse>(
      supabase.auth.getSession(),
      GET_SESSION_TIMEOUT_MS,
      SessionGetTimeoutError
    );

    if (!error && data.session) {
      return data.session;
    }

    if (error) {
      console.warn('supabase.auth.getSession 실패:', error.message ?? error);
    }
    
    return null;
  } catch (error) {
    if (error instanceof SessionGetTimeoutError) {
      console.warn(`Supabase 세션 조회 타임아웃 발생 (시도 ${retryCount + 1}/${MAX_RETRY_COUNT + 1})`);
      
      if (retryCount < MAX_RETRY_COUNT) {
        await delay(RETRY_DELAY_MS);
        return getSessionWithRetry(retryCount + 1);
      }
    } else if (!(error instanceof OfflineError)) {
      console.error('Supabase 세션 조회 중 알 수 없는 오류:', error);
    }
    
    return null;
  }
};

export const ensureSession = async (): Promise<Session | null> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new OfflineError();
  }

  const session = await getSessionWithRetry();
  
  if (session) {
    return session;
  }

  if (!refreshPromise) {
    refreshPromise = runRefresh();
  }

  return refreshPromise;
};

const extractErrorMessage = (error: unknown): string => {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in (error as any)) {
    const msg = (error as any).message;
    return typeof msg === 'string' ? msg : '';
  }
  return typeof error === 'string' ? error : '';
};

const isAuthTokenError = (error: unknown): boolean => {
  if (!error) return false;

  if ((error as any)?.status === 401) {
    return true;
  }

  const code = typeof (error as any)?.code === 'string' ? (error as any).code : '';
  if (code.includes('JWT') || code.includes('401') || code.includes('invalid')) {
    return true;
  }

  const message = extractErrorMessage(error).toLowerCase();
  if (!message) return false;

  return AUTH_ERROR_KEYWORDS.some(keyword => message.includes(keyword));
};

const forceSignOut = async () => {
  clearSessionRefreshState();
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('세션 정리 중 signOut 실패:', error);
  }
};

export const executeWithSession = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> => {
  // localhost 환경에서는 세션 체크 우회
  if (isLocalhost()) {
    return await operation();
  }

  const session = await ensureSession();

  if (!session) {
    throw new SessionExpiredError(context);
  }

  try {
    return await operation();
  } catch (error) {
    if (isAuthTokenError(error)) {
      console.warn('Supabase 인증 오류 감지, 강제 로그아웃 실행', {
        context,
        message: extractErrorMessage(error),
      });
      await forceSignOut();
      throw new SessionExpiredError(context);
    }
    throw error;
  }
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
    error instanceof SessionGetTimeoutError ||
    (error instanceof Error && (
      error.name === 'SessionRefreshTimeoutError' ||
      error.name === 'SessionGetTimeoutError'
    ))
  );
};

