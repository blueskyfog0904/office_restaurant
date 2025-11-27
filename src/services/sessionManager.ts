import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const isLocalhost = () => {
  return typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
};

const OFFLINE_ERROR_MESSAGE = 'OFFLINE';

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

// 단순화된 세션 상태 관리
export const clearSessionRefreshState = () => {
  // Supabase가 내부적으로 관리하므로 별도 상태 불필요
};

// 단순화된 세션 조회 - Supabase 기본 기능 사용
export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('세션 조회 실패:', error.message);
    return null;
  }
  return data.session;
};

// 하위 호환성을 위한 ensureSession (단순화)
export const ensureSession = async (): Promise<Session | null> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new OfflineError();
  }
  return getSession();
};

// 세션이 필요한 작업 실행
export const executeWithSession = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> => {
  if (isLocalhost()) {
    return await operation();
  }

  const session = await getSession();
  if (!session) {
    throw new SessionExpiredError(context);
  }

  return await operation();
};

// 공개 API용 래퍼 (세션 없어도 실행)
export const executePublicApi = async <T>(
  operation: () => Promise<T>,
  _context?: string
): Promise<T> => {
  return await operation();
};

export const isOfflineError = (error: unknown): boolean => {
  return (
    error instanceof OfflineError ||
    (error instanceof Error && error.name === 'OfflineError') ||
    (error instanceof Error && error.message === OFFLINE_ERROR_MESSAGE)
  );
};

export const isSessionTimeoutError = (_error: unknown): boolean => {
  // 타임아웃 로직 제거됨 - 항상 false 반환
  return false;
};
