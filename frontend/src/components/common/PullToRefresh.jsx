import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';

const THRESHOLD = 60; // Pixels needed to trigger refresh
const MAX_PULL = 85;   // Maximum visual pull distance

const PullToRefresh = ({ children, onRefresh, themeColor = 'gold' }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const vibratedRef = useRef(false);

  // Keep refs synchronized
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  const getScrollTop = () => {
    return (
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  };

  const handleStart = (clientY) => {
    if (refreshingRef.current) return;
    if (getScrollTop() <= 2) {
      startYRef.current = clientY;
      isPullingRef.current = true;
      vibratedRef.current = false;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleMove = (clientY, e) => {
    if (!isPullingRef.current || refreshingRef.current) return;

    // Check if scrolled down during move
    if (getScrollTop() > 2) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    const diffY = clientY - startYRef.current;

    if (diffY > 0) {
      // User is dragging downwards from the top of the page
      if (e && e.cancelable && diffY > 8) {
        e.preventDefault();
      }

      // Apply parabolic damping
      const damped = Math.min(diffY * 0.45, MAX_PULL);
      setPullDistance(damped);

      // Light haptic feedback when crossing threshold
      if (damped >= THRESHOLD && !vibratedRef.current) {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          try {
            window.navigator.vibrate(15);
          } catch (_) {}
        }
        vibratedRef.current = true;
      } else if (damped < THRESHOLD) {
        vibratedRef.current = false;
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleEnd = async () => {
    if (!isPullingRef.current || refreshingRef.current) return;
    isPullingRef.current = false;
    vibratedRef.current = false;

    if (pullDistanceRef.current >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(52); // Keep indicator locked in view while refreshing

      try {
        if (onRefresh) {
          await onRefresh();
        }
        setIsSuccess(true);
        await new Promise((r) => setTimeout(r, 450));
      } catch (err) {
        console.error('Pull to refresh failed:', err);
      } finally {
        setIsSuccess(false);
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Touch event listeners (Mobile WebView & Mobile Browser)
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientY);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientY, e);
      }
    };

    const onTouchEnd = () => handleEnd();

    // Mouse drag support for desktop testing
    let isMouseDown = false;
    const onMouseDown = (e) => {
      if (e.button === 0) {
        // Left click only
        isMouseDown = true;
        handleStart(e.clientY);
      }
    };

    const onMouseMove = (e) => {
      if (isMouseDown) {
        handleMove(e.clientY, e);
      }
    };

    const onMouseUp = () => {
      if (isMouseDown) {
        isMouseDown = false;
        handleEnd();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);

      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onRefresh]);

  const isReady = pullDistance >= THRESHOLD;
  const progressRatio = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100%',
        touchAction: 'pan-x pan-y'
      }}
    >
      {/* Floating Pull-to-Refresh Pill Indicator */}
      <div
        style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: `translate(-50%, ${pullDistance > 0 ? pullDistance - 48 : -65}px)`,
          opacity: refreshing || isSuccess ? 1 : Math.max(0, (pullDistance - 15) / 35),
          transition:
            refreshing || isSuccess || pullDistance === 0
              ? 'all 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
              : 'none',
          zIndex: 999,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '25px',
            background: 'rgba(11, 26, 48, 0.96)',
            border: `1.5px solid ${isReady || refreshing ? 'var(--color-gold, #d6be66)' : 'rgba(255, 255, 255, 0.25)'}`,
            boxShadow:
              isReady || refreshing
                ? '0 8px 30px rgba(0, 0, 0, 0.75), 0 0 20px rgba(214, 190, 102, 0.4)'
                : '0 6px 20px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: '700',
            userSelect: 'none'
          }}
        >
          {isSuccess ? (
            <Check size={16} style={{ color: '#10b981' }} />
          ) : refreshing ? (
            <RefreshCw
              size={16}
              style={{
                color: 'var(--color-gold, #d6be66)',
                animation: 'ptrSpin 0.75s linear infinite'
              }}
            />
          ) : isReady ? (
            <RefreshCw
              size={16}
              style={{
                color: 'var(--color-gold, #d6be66)',
                transform: 'rotate(180deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          ) : (
            <ArrowDown
              size={16}
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                transform: `rotate(${progressRatio * 180}deg)`,
                transition: 'transform 0.1s linear'
              }}
            />
          )}

          <span style={{ color: isSuccess ? '#10b981' : isReady || refreshing ? 'var(--color-gold, #d6be66)' : 'rgba(255, 255, 255, 0.85)' }}>
            {isSuccess
              ? 'Updated!'
              : refreshing
              ? 'Refreshing...'
              : isReady
              ? 'Release to refresh'
              : 'Pull down to refresh'}
          </span>
        </div>
      </div>

      {/* Page Content with smooth damped elastic translation */}
      <div
        style={{
          transform: `translate3d(0, ${refreshing ? 20 : pullDistance * 0.35}px, 0)`,
          transition:
            refreshing || pullDistance === 0
              ? 'transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
              : 'none',
          willChange: pullDistance > 0 ? 'transform' : 'auto'
        }}
      >
        {children}
      </div>

      {/* Spinner animation keyframes */}
      <style>{`
        @keyframes ptrSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PullToRefresh;
