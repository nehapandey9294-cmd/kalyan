import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import UserNavbar from './UserNavbar';
import SidebarDrawer from './SidebarDrawer';
import BottomNav from './BottomNav';
import LockScreen from './LockScreen';
import PullToRefresh from '../common/PullToRefresh';
import QuizApp from '../../pages/QuizApp';
import api from '../../utils/api';

const UserLayout = ({ children, setAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('auth_theme_color') || 'gold');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [userData, setUserData] = useState({
    name: localStorage.getItem('name') || '',
    phone: localStorage.getItem('phone') || '',
    email: '',
    wallet: '0'
  });
  const [wpNumber, setWpNumber] = useState('');
  const [mpinStatus, setMpinStatus] = useState(() => localStorage.getItem('app_mpin_status') || '0');
  const [autoActiveStatus, setAutoActiveStatus] = useState('1');
  const [isLocked, setIsLocked] = useState(() => sessionStorage.getItem('mpin_unlocked') !== 'true');
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePageRefresh = async () => {
    try {
      await loadUserData();
      window.dispatchEvent(new CustomEvent('app_refresh'));
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  const loadUserData = async () => {
    try {
      const [walletRes, profileRes, appRes] = await Promise.all([
        api.get('/wallet/info').catch(() => null),
        api.get('/profile').catch(() => null),
        api.get('/app-info').catch(() => null)
      ]);

      const rawWallet = walletRes?.data?.data?.wallet ?? profileRes?.data?.data?.wallet;
      const wallet = (rawWallet !== undefined && rawWallet !== null) ? String(rawWallet) : '0';
      const prof = profileRes?.data?.data || walletRes?.data?.data || {};
      const appInfo = appRes?.data?.data || {};

      // Check if user account is inactive
      if (prof.status === '0' || prof.status === 0 || walletRes?.data?.is_inactive || profileRes?.data?.is_inactive) {
        handleLogout();
        navigate('/login?error=inactive', { replace: true });
        return;
      }

      const currentMpinStatus = (appInfo.mpin_status !== undefined && appInfo.mpin_status !== null)
        ? String(appInfo.mpin_status)
        : (walletRes?.data?.data?.mpin_status !== undefined && walletRes?.data?.data?.mpin_status !== null)
          ? String(walletRes?.data?.data?.mpin_status)
          : '0';
      setMpinStatus(currentMpinStatus);
      localStorage.setItem('app_mpin_status', currentMpinStatus);

      if (appInfo.auto_active_status !== undefined && appInfo.auto_active_status !== null) {
        setAutoActiveStatus(String(appInfo.auto_active_status));
      }

      setUserData({
        name: prof.name || localStorage.getItem('name') || 'Kalyan Matka Player',
        phone_number: prof.phone_number || prof.phone || localStorage.getItem('phone') || '',
        phone: prof.phone || localStorage.getItem('phone') || '',
        email: prof.email || '',
        wallet: wallet,
        status: String(prof.status ?? '1'),
        betting_status: String(prof.betting_status ?? walletRes?.data?.data?.betting_status ?? '1'),
        transfer_status: String(prof.transfer_status ?? walletRes?.data?.data?.transfer_status ?? '1')
      });

      if (appInfo.wp_mobile || appInfo.mobile) {
        setWpNumber(appInfo.wp_mobile || appInfo.mobile);
      }

      if (prof.name) localStorage.setItem('name', prof.name);
      if (prof.phone) localStorage.setItem('phone', prof.phone);
    } catch (err) {
      console.error('Error loading user layout data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    const interval = setInterval(loadUserData, 15000); // 15s refresh

    const handleWalletUpdated = (e) => {
      if (e?.detail?.balance !== undefined) {
        setUserData(prev => ({ ...prev, wallet: String(e.detail.balance) }));
      }
      loadUserData();
    };

    const onThemeChange = () => {
      setThemeColor(localStorage.getItem('auth_theme_color') || 'gold');
    };

    const isMobileDevice = () => {
      if (typeof window === 'undefined') return false;
      const ua = navigator.userAgent || navigator.vendor || window.opera || '';
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|wv/i.test(ua) || (window.innerWidth <= 768);
    };

    let lockTimeoutId = null;

    const handleLockTrigger = () => {
      sessionStorage.removeItem('mpin_unlocked');
      setIsLocked(true);
    };

    const handleVisibilityChange = () => {
      // Only lock on mobile devices & Android WebViews
      if (!isMobileDevice()) return;

      if (document.visibilityState === 'hidden') {
        // Debounce lock trigger to prevent nuisance locking when opening native pickers or brief app pauses
        lockTimeoutId = setTimeout(() => {
          handleLockTrigger();
        }, 1500);
      } else if (document.visibilityState === 'visible') {
        if (lockTimeoutId) {
          clearTimeout(lockTimeoutId);
          lockTimeoutId = null;
        }
      }
    };

    window.addEventListener('wallet_updated', handleWalletUpdated);
    window.addEventListener('storage', onThemeChange);
    window.addEventListener('focus', loadUserData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (lockTimeoutId) clearTimeout(lockTimeoutId);
      clearInterval(interval);
      window.removeEventListener('wallet_updated', handleWalletUpdated);
      window.removeEventListener('storage', onThemeChange);
      window.removeEventListener('focus', loadUserData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Lock body scroll when LockScreen is active
  useEffect(() => {
    if (mpinStatus === '1' && isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mpinStatus, isLocked]);

  const changeTheme = (newColor) => {
    setThemeColor(newColor);
    localStorage.setItem('auth_theme_color', newColor);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mpin_unlocked');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('name');
    localStorage.removeItem('phone');
    if (setAuth) setAuth(false);
    navigate('/login', { replace: true });
  };

  // Fetch unread in-app chat count
  useEffect(() => {
    const phone = localStorage.getItem('phone');
    if (!phone) return;
    const checkUnread = () => {
      api.get(`/chat/unread-count?phone=${phone}`).then(res => {
        if (res.data?.success === '1') {
          setUnreadChatCount(Number(res.data.count) || 0);
        }
      }).catch(() => {});
    };
    checkUnread();
    const interval = setInterval(checkUnread, 12000);
    return () => clearInterval(interval);
  }, []);

  if (dataLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#09121f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        padding: '20px'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          border: '3px solid rgba(214, 190, 102, 0.2)',
          borderTopColor: 'var(--color-gold, #d6be66)',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <span style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: '600' }}>
          Loading application...
        </span>
      </div>
    );
  }

  if (String(userData.betting_status) === '0') {
    return <QuizApp onLogout={handleLogout} wpNumber={wpNumber} />;
  }

  return (
    <div className={`app-theme-${themeColor}`} style={{
      minHeight: '100vh',
      backgroundColor: 'var(--app-bg, #09121f)',
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff',
      position: 'relative',
      overflowX: 'hidden',
      transition: 'background 0.4s ease'
    }}>
      {/* Background Decorative Glowing Ambient Orbs */}
      <div style={{
        position: 'fixed',
        top: '-120px',
        left: '-120px',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        background: themeColor === 'cyan' ? 'rgba(6, 182, 212, 0.15)' : themeColor === 'crimson' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(214, 190, 102, 0.15)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-120px',
        right: '-120px',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        background: themeColor === 'cyan' ? 'rgba(168, 85, 247, 0.15)' : themeColor === 'crimson' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Fixed Top Navbar */}
      <UserNavbar
        onOpenSidebar={() => setSidebarOpen(true)}
        wallet={userData.wallet}
        themeColor={themeColor}
        onThemeChange={changeTheme}
        onLogout={handleLogout}
      />

      {/* Slide-out Left Drawer */}
      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={userData}
        onLogout={handleLogout}
        themeColor={themeColor}
        onThemeChange={changeTheme}
      />

      {/* Main Content Area with Pull-to-Refresh */}
      <main style={{
        flex: 1,
        paddingTop: '64px',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        zIndex: 1
      }}>
        <PullToRefresh onRefresh={handlePageRefresh} themeColor={themeColor}>
          <div key={refreshKey}>
            {children}
          </div>
        </PullToRefresh>
      </main>

      {/* Floating In-App Live Support Chat Button */}
      {location.pathname !== '/support' && (
        <Link
          to="/support"
          style={{
            position: 'fixed',
            bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))',
            right: '16px',
            zIndex: 998,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #d6be66 0%, #10b981 100%)',
            color: '#081320',
            padding: '10px 16px',
            borderRadius: '30px',
            fontWeight: '700',
            fontSize: '0.84rem',
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(214, 190, 102, 0.35)',
            transition: 'all 0.25s ease'
          }}
          title="Open Live Support Chat"
        >
          <Headphones size={18} />
          <span>Live Chat</span>
          {unreadChatCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '0.72rem',
              fontWeight: '800',
              animation: 'pulseDot 1.5s infinite'
            }}>
              {unreadChatCount}
            </span>
          )}
        </Link>
      )}

      {/* Fixed Bottom Navigation */}
      <BottomNav themeColor={themeColor} />

      {/* M-PIN Lock Screen Overlay */}
      {mpinStatus === '1' && isLocked && (
        <LockScreen
          onUnlock={() => setIsLocked(false)}
          onLogout={handleLogout}
          themeColor={themeColor}
        />
      )}
    </div>
  );
};

export default UserLayout;
