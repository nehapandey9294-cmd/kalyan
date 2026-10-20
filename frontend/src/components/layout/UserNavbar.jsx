import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, PlusCircle, Wallet, LogOut } from 'lucide-react';
import api from '../../utils/api';

const UserNavbar = ({ onOpenSidebar, wallet = '0', themeColor = 'gold', onThemeChange, onLogout }) => {
  const [appName, setAppName] = useState('Gama 567');

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      backgroundColor: 'rgba(9, 18, 31, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
    }}>
      {/* Left: Hamburger Menu & Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Toggle Menu"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            transition: 'all 0.2s',
            outline: 'none',
            color: '#ffffff'
          }}
        >
          <Menu size={22} />
        </button>

        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src="/img/logo.png"
            alt="Gama 567 Logo"
            style={{
              height: '46px',
              width: 'auto',
              maxWidth: '160px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
            }}
            onError={(e) => {
              e.target.src = '/img/lucky-matka-logo.png';
            }}
          />
        </Link>
      </div>

      {/* Right: Quick Action Buttons & Balance Chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link
          to="/add-fund"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            height: '34px',
            padding: '0 12px',
            borderRadius: '10px',
            background: themeColor === 'cyan' ? 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' : themeColor === 'crimson' ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' : 'linear-gradient(135deg, #d6be66 0%, #bca54e 100%)',
            color: themeColor === 'gold' ? '#0b1a30' : '#ffffff',
            fontSize: '0.8rem',
            fontWeight: '700',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            boxSizing: 'border-box'
          }}
        >
          <PlusCircle size={16} />
          <span>Deposit</span>
        </Link>

        <Link
          to="/wallet-history"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '34px',
            padding: '0 12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--color-gold, #d6be66)',
            fontSize: '0.82rem',
            fontWeight: '800',
            textDecoration: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            boxSizing: 'border-box'
          }}
        >
          <Wallet size={16} />
          <span>₹{wallet}</span>
        </Link>
      </div>
    </header>
  );
};

export default UserNavbar;
