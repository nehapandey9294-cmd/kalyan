import { useState, useEffect, useCallback, useRef } from 'react';

// Session timeout constants
export const ADMIN_INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
export const ADMIN_MAX_SESSION_LIMIT_MS = 60 * 60 * 1000; // 1 hour absolute from login
export const ADMIN_WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes warning before auto logout

/**
 * Initialize Admin Session in localStorage
 */
export const initAdminSession = (token, adminName) => {
  const now = Date.now().toString();
  localStorage.setItem('admin_token', token);
  if (adminName) {
    localStorage.setItem('admin_name', adminName);
  }
  localStorage.setItem('admin_login_time', now);
  localStorage.setItem('admin_last_activity', now);
};

/**
 * Clear Admin Session from localStorage
 */
export const clearAdminSession = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_name');
  localStorage.removeItem('admin_login_time');
  localStorage.removeItem('admin_last_activity');
};

/**
 * Get current Admin Session status and remaining times
 */
export const getAdminSessionStatus = () => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return {
      isAuthenticated: false,
      isExpired: false,
      reason: null,
      inactivityRemainingMs: 0,
      sessionRemainingMs: 0
    };
  }

  const now = Date.now();
  let loginTime = parseInt(localStorage.getItem('admin_login_time'), 10);
  let lastActivity = parseInt(localStorage.getItem('admin_last_activity'), 10);

  // Fallback for sessions existing before timestamp tracking
  if (!loginTime || isNaN(loginTime) || loginTime <= 0) {
    loginTime = now;
    localStorage.setItem('admin_login_time', now.toString());
  }
  if (!lastActivity || isNaN(lastActivity) || lastActivity <= 0) {
    lastActivity = now;
    localStorage.setItem('admin_last_activity', now.toString());
  }

  const sessionElapsed = now - loginTime;
  const inactivityElapsed = now - lastActivity;

  const sessionRemainingMs = Math.max(0, ADMIN_MAX_SESSION_LIMIT_MS - sessionElapsed);
  const inactivityRemainingMs = Math.max(0, ADMIN_INACTIVITY_LIMIT_MS - inactivityElapsed);

  let isExpired = false;
  let reason = null;

  if (sessionRemainingMs <= 0) {
    isExpired = true;
    reason = 'max_session';
  } else if (inactivityRemainingMs <= 0) {
    isExpired = true;
    reason = 'inactivity';
  }

  return {
    isAuthenticated: true,
    isExpired,
    reason,
    inactivityRemainingMs,
    sessionRemainingMs
  };
};

/**
 * Custom hook to monitor Admin Session and handle auto-logout
 * @param {Function} onLogout Callback when session expires, receives (reason)
 */
export const useAdminSession = (onLogout) => {
  const [warning, setWarning] = useState(null); // { type: 'inactivity' | 'max_session', secondsLeft: number }
  const lastWriteRef = useRef(0);
  const isLoggingOutRef = useRef(false);

  const performLogout = useCallback((reason) => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    clearAdminSession();
    if (typeof onLogout === 'function') {
      onLogout(reason);
    }
  }, [onLogout]);

  // Record user interaction (throttled to avoid heavy localStorage writes)
  const recordActivity = useCallback(() => {
    if (isLoggingOutRef.current) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const now = Date.now();

    // Before updating activity, check if session already expired
    const status = getAdminSessionStatus();
    if (status.isExpired) {
      performLogout(status.reason);
      return;
    }

    // Dismiss warning if it was an inactivity warning and user became active
    setWarning(prev => {
      if (prev && prev.type === 'inactivity') {
        return null;
      }
      return prev;
    });

    // Throttle writes to localStorage to once every 3 seconds
    if (now - lastWriteRef.current > 3000) {
      lastWriteRef.current = now;
      localStorage.setItem('admin_last_activity', now.toString());
    }
  }, [performLogout]);

  // Periodic heartbeat checker
  useEffect(() => {
    const checkSession = () => {
      if (isLoggingOutRef.current) return;
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const status = getAdminSessionStatus();

      if (status.isExpired) {
        performLogout(status.reason);
        return;
      }

      // Check for 2-minute warning
      if (status.sessionRemainingMs <= ADMIN_WARNING_THRESHOLD_MS) {
        setWarning({
          type: 'max_session',
          secondsLeft: Math.ceil(status.sessionRemainingMs / 1000)
        });
      } else if (status.inactivityRemainingMs <= ADMIN_WARNING_THRESHOLD_MS) {
        setWarning({
          type: 'inactivity',
          secondsLeft: Math.ceil(status.inactivityRemainingMs / 1000)
        });
      } else {
        setWarning(null);
      }
    };

    // Run check immediately on mount
    checkSession();

    // Check every 5 seconds
    const interval = setInterval(checkSession, 5000);

    // Event listeners for user interaction
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const throttledListener = () => recordActivity();

    activityEvents.forEach(evt => {
      window.addEventListener(evt, throttledListener, { passive: true });
    });

    // Also check immediately when window gains focus or tab becomes visible
    const handleFocusOrVisible = () => {
      checkSession();
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // Cross-tab synchronization
    const handleStorageChange = (e) => {
      if (e.key === 'admin_token' && !e.newValue) {
        // Logged out in another tab
        performLogout('logged_out_elsewhere');
      } else if (e.key === 'admin_last_activity') {
        // Activity detected in another tab - dismiss inactivity warning if present
        setWarning(prev => (prev?.type === 'inactivity' ? null : prev));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, throttledListener);
      });
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [performLogout, recordActivity]);

  const extendInactivity = useCallback(() => {
    const now = Date.now();
    lastWriteRef.current = now;
    localStorage.setItem('admin_last_activity', now.toString());
    setWarning(null);
  }, []);

  return {
    warning,
    extendInactivity
  };
};
