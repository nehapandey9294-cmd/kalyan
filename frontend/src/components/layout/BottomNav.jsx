import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, Trophy, Wallet, MessageCircle } from 'lucide-react';

const BottomNav = ({ themeColor = 'gold' }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const activeColor = themeColor === 'cyan' ? '#38bdf8' : themeColor === 'crimson' ? '#fb7185' : 'var(--color-gold, #ffd700)';

  const navItems = [
    {
      id: 'bid-history',
      path: '/bid-history',
      label: 'Bid Logs',
      icon: History
    },
    {
      id: 'win-history',
      path: '/win-history',
      label: 'Win Logs',
      icon: Trophy
    },
    {
      id: 'home',
      path: '/',
      label: 'Home',
      icon: Home,
      isCenter: true
    },
    {
      id: 'wallet',
      path: '/wallet-history',
      altPaths: ['/wallet'],
      label: 'Wallet',
      icon: Wallet
    },
    {
      id: 'support',
      path: '/support',
      label: 'Support',
      icon: MessageCircle
    }
  ];

  return (
    <footer className="bottom-nav-container">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = item.altPaths
          ? (currentPath === item.path || item.altPaths.includes(currentPath))
          : currentPath === item.path;

        if (item.isCenter) {
          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                flex: 1,
                height: '100%',
                color: isActive ? activeColor : 'rgba(255, 255, 255, 0.55)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                width: '100%'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-18px',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: themeColor === 'cyan' 
                    ? 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)' 
                    : themeColor === 'crimson' 
                      ? 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)' 
                      : 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #10b981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.6), 0 0 12px rgba(255, 215, 0, 0.25)',
                  border: '3px solid #08111e',
                  color: themeColor === 'gold' ? '#0b1a30' : '#ffffff',
                  transition: 'transform 0.2s ease'
                }}>
                  <Home size={22} />
                </div>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: isActive ? '700' : '500',
                letterSpacing: '0.01em',
                lineHeight: 1,
                marginTop: '4px'
              }}>
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.id}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              flex: 1,
              height: '100%',
              color: isActive ? activeColor : 'rgba(255, 255, 255, 0.55)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}>
              <IconComponent size={20} />
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: isActive ? '700' : '500',
              letterSpacing: '0.01em',
              lineHeight: 1,
              marginTop: '4px'
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </footer>
  );
};

export default BottomNav;
