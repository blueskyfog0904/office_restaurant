import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_STORAGE_KEY = 'lastActivityTime';
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10분 (밀리초)

export const useActivityTracker = (onInactive: () => void) => {
  const timeoutRef = useRef<number | null>(null);
  const onInactiveRef = useRef(onInactive);
  const inactiveNotifiedRef = useRef(false);
  
  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      const lastActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
        if (timeSinceActivity >= INACTIVITY_TIMEOUT && !inactiveNotifiedRef.current) {
          onInactiveRef.current();
          inactiveNotifiedRef.current = true;
        }
      }
    }, INACTIVITY_TIMEOUT);
  }, []);

  const updateActivityTime = useCallback(() => {
    inactiveNotifiedRef.current = false;
    localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
    resetTimeout();
  }, [resetTimeout]);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceActivity >= INACTIVITY_TIMEOUT && !inactiveNotifiedRef.current) {
        onInactiveRef.current();
        inactiveNotifiedRef.current = true;
        return true;
      }
    }
    return false;
  }, []);

  useEffect(() => {
    const lastActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        inactiveNotifiedRef.current = true;
        onInactiveRef.current();
        return;
      }
    }
    
    updateActivityTime();
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivityTime, true);
    });
    
    const intervalId = setInterval(() => {
      checkInactivity();
    }, 60000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivityTime, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      clearInterval(intervalId);
    };
  }, [updateActivityTime, checkInactivity]);

  return { checkInactivity, updateActivityTime };
};

