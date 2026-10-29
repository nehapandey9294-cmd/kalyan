import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  X,
  Zap,
  KeyRound,
  Headphones
} from 'lucide-react';
import api from '../utils/api';

const Login = ({ setAuth }) => {
  const [phone, setPhone] = useState(() => localStorage.getItem('remember_login_phone') || '');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remember_login_phone'));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState('Kalyan Matka');
  const [wpNumber, setWpNumber] = useState('');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('auth_theme_color') || 'gold');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('error') === 'inactive') {
      setError('Account Inactive! Contact Admin to activate your account.');
    }

    api.get('/app-info').then(res => {
      if (res.data?.success === '1' && res.data.data) {
        if (res.data.data.app_name) {
          setAppName(res.data.data.app_name);
        }
        const supportNum = res.data.data.wp_mobile || res.data.data.mobile || '';
        if (supportNum) {
          setWpNumber(supportNum);
        }
      }
    }).catch(() => { });
  }, []);

  const handleThemeChange = (color) => {
    setThemeColor(color);
    localStorage.setItem('auth_theme_color', color);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/login', {
        phone_number: phone,
        password: password
      });

      const resData = response.data;
      if (resData.success === '1') {
        sessionStorage.removeItem('mpin_unlocked');
        localStorage.setItem('token', resData.data.token);
        localStorage.setItem('phone', resData.data.phone_number);
        localStorage.setItem('name', resData.data.name);

        if (rememberMe) {
          localStorage.setItem('remember_login_phone', phone);
        } else {
          localStorage.removeItem('remember_login_phone');
        }

        setAuth(true);
        navigate('/');
      } else {
        setError(resData.data?.msg || resData.msg || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.msg || err.response?.data?.data?.msg;
      setError(serverMsg || 'Login failed. Please verify your phone number and password.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={`auth-page-bg auth-theme-${themeColor}`}>
      {/* Dynamic Background Mesh Overlay */}
      <div className="auth-grid-overlay" />

      {/* Floating Animated Ambient Orbs */}
      <div
        className="auth-ambient-orb auth-ambient-orb-1"
        style={{
          background: themeColor === 'cyan'
            ? 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)'
            : themeColor === 'crimson'
              ? 'radial-gradient(circle, rgba(244, 63, 94, 0.38) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(214, 190, 102, 0.38) 0%, transparent 70%)'
        }}
      />
      <div
        className="auth-ambient-orb auth-ambient-orb-2"
        style={{
          background: themeColor === 'cyan'
            ? 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%)'
            : themeColor === 'crimson'
              ? 'radial-gradient(circle, rgba(249, 115, 22, 0.35) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%)'
        }}
      />
      <div
        className="auth-ambient-orb auth-ambient-orb-3"
        style={{
          background: themeColor === 'cyan'
            ? 'rgba(6, 182, 212, 0.15)'
            : themeColor === 'crimson'
              ? 'rgba(244, 63, 94, 0.15)'
              : 'rgba(214, 190, 102, 0.15)'
        }}
      />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        {/* Top Status & Theme Bar */}
        <div className="auth-top-bar">
          <div className="auth-security-badge">
            <span className="auth-status-dot" />
            <ShieldCheck size={13} style={{ color: '#10b981' }} />
            <span>256-Bit SSL Encrypted</span>
          </div>

          <div className="theme-selector-bar" title="Select Theme Color">
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginRight: '2px', fontWeight: '600' }}>
              <Sparkles size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
              Theme:
            </span>
            <button
              type="button"
              className={`theme-pill theme-pill-gold ${themeColor === 'gold' ? 'active' : ''}`}
              onClick={() => handleThemeChange('gold')}
              title="Gold Emerald VIP Theme"
            />
            <button
              type="button"
              className={`theme-pill theme-pill-cyan ${themeColor === 'cyan' ? 'active' : ''}`}
              onClick={() => handleThemeChange('cyan')}
              title="Cyber Cyan Theme"
            />
            <button
              type="button"
              className={`theme-pill theme-pill-crimson ${themeColor === 'crimson' ? 'active' : ''}`}
              onClick={() => handleThemeChange('crimson')}
              title="Crimson Sunset Theme"
            />
          </div>
        </div>

        {/* Auth Glass Card */}
        <div className="auth-card">
          {/* Header Branding */}
          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div className="auth-logo-wrapper">
              <div className="auth-logo-halo" />
              <img
                src="/img/logo.png?v=2"
                alt={`${appName} Logo`}
                className="auth-logo-img"
                onError={(e) => { e.target.src = '/img/logo.png'; }}
              />
            </div>

            <h1 className="auth-title-gradient">
              {appName}
            </h1>
            <p className="auth-subtitle">
              <ShieldCheck size={15} style={{ color: 'var(--theme-primary, #d6be66)' }} />
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} noValidate>
            {/* Phone Input */}
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="login-phone">
                <span className="auth-label-left">
                  <Phone size={14} style={{ color: 'var(--theme-primary, #d6be66)' }} />
                  <span>Phone Number</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: phone.length === 10 ? '#10b981' : 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                  {phone.length === 10 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={12} /> 10 / 10
                    </span>
                  ) : (
                    `${phone.length}/10`
                  )}
                </span>
              </label>

              <div className={`auth-input-wrapper ${focusedInput === 'phone' ? 'focused' : ''}`}>
                <div className="auth-input-icon">
                  <Phone size={18} />
                </div>
                <div className="auth-country-code">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  id="login-phone"
                  type="tel"
                  className="auth-field"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="auth-input-group" style={{ marginBottom: '16px' }}>
              <label className="auth-label" htmlFor="login-password">
                <span className="auth-label-left">
                  <Lock size={14} style={{ color: 'var(--theme-primary, #d6be66)' }} />
                  <span>Password</span>
                </span>
                <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)' }}>
                  Min. 6 chars
                </span>
              </label>

              <div className={`auth-input-wrapper ${focusedInput === 'password' ? 'focused' : ''}`}>
                <div className="auth-input-icon">
                  <Lock size={18} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-pass"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="auth-options-row">
              <label className="auth-remember-label">
                <input
                  type="checkbox"
                  style={{ display: 'none' }}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="auth-checkbox-custom">
                  {rememberMe && <CheckCircle2 size={13} style={{ color: '#081320' }} />}
                </span>
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                className="auth-forgot-btn"
                onClick={() => setShowHelpModal(true)}
              >
                <HelpCircle size={13} />
                <span>Forgot Password?</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="badge badge-danger"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 14px rgba(231, 29, 54, 0.3)',
                  border: '1px solid rgba(231, 29, 54, 0.4)'
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-auth-submit"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <>
                  <div className="auth-spinner" />
                  <span>VERIFYING ACCOUNT...</span>
                </>
              ) : (
                <>
                  <span>LOGIN TO ACCOUNT</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Live In-App Chat Support Banner */}
          <Link
            to="/support"
            className="auth-support-card"
          >
            <div className="auth-support-left">
              <div className="auth-support-icon-wrap" style={{ background: 'linear-gradient(135deg, #d6be66 0%, #10b981 100%)' }}>
                <Headphones size={22} color="#0b1a30" />
              </div>
              <div>
                <div className="auth-support-title">Need Help? Live Support Chat</div>
                <div className="auth-support-subtitle">
                  <span className="auth-status-dot" style={{ width: '6px', height: '6px' }} />
                  24/7 Dedicated In-App Support Team
                </div>
              </div>
            </div>
            <div className="auth-support-chip" style={{ background: 'rgba(214, 190, 102, 0.2)', color: 'var(--color-gold)' }}>
              Open Chat
            </div>
          </Link>

          {/* Security & Features Strip */}
          <div className="auth-trust-strip">
            <div className="auth-trust-item">
              <Zap size={16} className="auth-trust-icon" />
              <span className="auth-trust-text">Fast Deposit</span>
            </div>
            <div className="auth-trust-item">
              <ShieldCheck size={16} className="auth-trust-icon" />
              <span className="auth-trust-text">100% Safe</span>
            </div>
            <div className="auth-trust-item">
              <Sparkles size={16} className="auth-trust-icon" />
              <span className="auth-trust-text">Fair Play</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div style={{ marginTop: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.72)', fontSize: '0.9rem' }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              style={{
                color: 'var(--theme-accent, #fab02b)',
                textDecoration: 'none',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                marginLeft: '4px'
              }}
            >
              <span>Sign Up Here</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password / Help Modal */}
      {showHelpModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="auth-modal-close"
              onClick={() => setShowHelpModal(false)}
              title="Close"
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(250, 176, 43, 0.15)',
                border: '1px solid rgba(250, 176, 43, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: 'var(--theme-accent, #fab02b)'
              }}>
                <HelpCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '6px' }}>
                Password Recovery
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                For security reasons, password resets are verified directly by our team via Live Support Chat or Helpline.
              </p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '18px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.82rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Verify your registered mobile number</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Receive instant PIN or reset instructions</span>
              </div>
            </div>

            <Link
              to="/support"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #d6be66 0%, #10b981 100%)',
                color: '#081320',
                fontWeight: '700'
              }}
            >
              <Headphones size={18} />
              <span>Connect to Live Support Chat</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '10px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
