import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const REFRESH_TIMEOUT_MS = 10000;
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
      throw result.error;
    }

    return result.data.session ?? null;
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
