import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  User,
  Building2,
  PlusCircle,
  Wallet,
  ArrowUpRight,
  Trophy,
  History,
  Percent,
  MessageCircle,
  LogOut,
  X,
  Palette,
  ShieldCheck,
  PlayCircle,
  HelpCircle,
  Shield,
  Trash2
} from 'lucide-react';

const SidebarDrawer = ({
  isOpen,
  onClose,
  user = {},
  onLogout,
  themeColor = 'gold',
  onThemeChange
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleNavClick = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 1000005,
          transition: 'opacity 0.3s ease'
        }}
      />

      {/* Slide-out Left Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          height: '100%',
          maxHeight: '100dvh',
          width: '295px',
          maxWidth: '85vw',
          backgroundColor: 'rgba(13, 22, 36, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '8px 0 35px rgba(0, 0, 0, 0.7)',
          zIndex: 1000006,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          animation: 'slideInLeft 0.25s ease-out'
        }}
      >
        {/* User Info Header Box */}
        <div
          style={{
            background: themeColor === 'cyan' ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)' : themeColor === 'crimson' ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)' : 'linear-gradient(135deg, rgba(214, 190, 102, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            position: 'relative',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff'
            }}
          >
            <X size={16} />
          </button>

          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid var(--color-gold, #d6be66)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-gold, #d6be66)',
            flexShrink: 0
          }}>
            <User size={28} />
          </div>

          <div style={{ overflow: 'hidden' }}>
            <h4
              style={{
                color: '#ffffff',
                fontSize: '1.05rem',
                margin: '0 0 2px 0',
                textTransform: 'capitalize',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}
            >
              {user.name || localStorage.getItem('name') || 'Kalyan Matka Player'}
            </h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.82rem', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              {user.phone_number || user.phone || localStorage.getItem('phone') || ''}
            </p>
          </div>
        </div>

        {/* Theme Selector Pill Bar inside Sidebar */}
        {onThemeChange && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} /> UI Theme Color
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`theme-pill theme-pill-gold ${themeColor === 'gold' ? 'active' : ''}`}
                onClick={() => onThemeChange('gold')}
                title="Gold Emerald Theme"
              />
              <button
                type="button"
                className={`theme-pill theme-pill-cyan ${themeColor === 'cyan' ? 'active' : ''}`}
                onClick={() => onThemeChange('cyan')}
                title="Cyber Cyan Theme"
              />
              <button
                type="button"
                className={`theme-pill theme-pill-crimson ${themeColor === 'crimson' ? 'active' : ''}`}
                onClick={() => onThemeChange('crimson')}
                title="Crimson Sunset Theme"
              />
            </div>
          </div>
        )}

        {/* Menu Items List */}
        <div
          className="sidebar-scroll-container"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            padding: '10px 8px calc(48px + env(safe-area-inset-bottom, 24px)) 8px'
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li onClick={() => handleNavClick('/')} style={menuItemStyle}>
              <Home size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Home</span>
            </li>

            <li onClick={() => handleNavClick('/profile')} style={menuItemStyle}>
              <User size={18} style={{ color: 'var(--color-gold)' }} />
              <span>My Profile</span>
            </li>

            <li onClick={() => handleNavClick('/add-bank')} style={menuItemStyle}>
              <Building2 size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Add Bank Account</span>
            </li>

            <li onClick={() => handleNavClick('/add-fund')} style={menuItemStyle}>
              <PlusCircle size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Deposit Request</span>
            </li>

            <li onClick={() => handleNavClick('/withdraw')} style={menuItemStyle}>
              <ArrowUpRight size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Withdraw Points</span>
            </li>

            <hr style={dividerStyle} />

            <li onClick={() => handleNavClick('/wallet-history')} style={menuItemStyle}>
              <Wallet size={18} style={{ color: 'var(--color-gold)' }} />
              <span>My Wallet & Transactions</span>
            </li>

            <li onClick={() => handleNavClick('/withdraw-history')} style={menuItemStyle}>
              <History size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Withdraw History</span>
            </li>

            <li onClick={() => handleNavClick('/win-history')} style={menuItemStyle}>
              <Trophy size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Win History</span>
            </li>

            <li onClick={() => handleNavClick('/bid-history')} style={menuItemStyle}>
              <History size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Bidding History</span>
            </li>

            <li onClick={() => handleNavClick('/game-rate')} style={menuItemStyle}>
              <Percent size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Game Rates</span>
            </li>

            <li onClick={() => handleNavClick('/how-to-play')} style={menuItemStyle}>
              <PlayCircle size={18} style={{ color: 'var(--color-gold)' }} />
              <span>How To Play</span>
            </li>

            <li onClick={() => handleNavClick('/support')} style={menuItemStyle}>
              <HelpCircle size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Customer Support</span>
            </li>

            <hr style={dividerStyle} />

            <li onClick={() => handleNavClick('/privacy-policy')} style={menuItemStyle}>
              <Shield size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Privacy Policy</span>
            </li>

            <li onClick={() => handleNavClick('/data-deletion')} style={menuItemStyle}>
              <Trash2 size={18} style={{ color: '#f87171' }} />
              <span>Data Deletion Request</span>
            </li>

            <hr style={dividerStyle} />

            <li
              onClick={() => {
                onClose();
                if (onLogout) onLogout();
              }}
              style={{
                ...menuItemStyle,
                color: '#f87171',
                fontWeight: '700',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                marginTop: '4px',
                marginBottom: '8px'
              }}
            >
              <LogOut size={18} style={{ color: '#ef4444' }} />
              <span>Logout Account</span>
            </li>
          </ul>
        </div>

        {/* Pinned Bottom Footer: Logout (Always visible immediately) */}
        {/* <div
          style={{
            padding: '12px 14px calc(14px + env(safe-area-inset-bottom, 0px)) 14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(9, 18, 31, 0.98)',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '0.94rem',
              boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <LogOut size={18} />
            <span>Logout Account</span>
          </button>
        </div> */}
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .sidebar-scroll-container {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          touch-action: pan-y !important;
          overscroll-behavior: contain !important;
          scrollbar-width: thin;
          scrollbar-color: rgba(214, 190, 102, 0.3) transparent;
        }
        .sidebar-scroll-container::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(214, 190, 102, 0.3);
          border-radius: 4px;
        }
      `}</style>
    </>
  );
};

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '11px 14px',
  borderRadius: '10px',
  cursor: 'pointer',
  color: 'rgba(255, 255, 255, 0.88)',
  fontSize: '0.92rem',
  fontWeight: '600',
  transition: 'all 0.15s ease'
};

const dividerStyle = {
  margin: '8px 4px',
  border: 0,
  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
};

export default SidebarDrawer;
