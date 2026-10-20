import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, MessageCircle, ShieldCheck } from 'lucide-react';
import api from '../utils/api';

const Login = ({ setAuth }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState('Gama 567');
  const [wpNumber, setWpNumber] = useState('');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('auth_theme_color') || 'gold');
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('error') === 'inactive') {
      setError('Account Inactive! Contact Admin to activate your account.');
    }

    api.get('/app-info').then(res => {
      if (res.data?.success === '1' && res.data.data) {
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
      setError('Please enter a 10-digit phone number');
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
        setAuth(true);
        navigate('/');
      } else {
        setError(resData.data?.msg || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.msg || err.response?.data?.data?.msg;
      setError(serverMsg || 'Login failed. Please check your phone number and password.');
    } finally {
      setLoading(false);
    }
  };

  const cleanWpNumber = wpNumber.replace(/\D/g, '');
  const whatsappUrl = cleanWpNumber
    ? `https://wa.me/${cleanWpNumber.length === 10 ? '91' + cleanWpNumber : cleanWpNumber}?text=${encodeURIComponent(`Hello Gama 567 Support, I need help logging into my account.`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Hello Gama 567 Support, I need help logging into my account.`)}`;

  return (
    <div className={`auth-page-bg auth-theme-${themeColor}`}>
      {/* Background Decorative Ambient Orbs */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        left: '-100px',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: themeColor === 'cyan' ? 'rgba(6, 182, 212, 0.25)' : themeColor === 'crimson' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(214, 190, 102, 0.25)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10 }}>
        {/* Theme Color Selector Pill Bar */}
        <div className="theme-selector-bar" title="Select Theme Color">
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginRight: '4px', fontWeight: '500' }}>Theme:</span>
          <button
            type="button"
            className={`theme-pill theme-pill-gold ${themeColor === 'gold' ? 'active' : ''}`}
            onClick={() => handleThemeChange('gold')}
            title="Gold Emerald Theme"
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

        {/* Auth Glass Card */}
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <img
                src="/img/logo.png"
                alt="Gama 567 Logo"
                style={{
                  height: '72px',
                  width: 'auto',
                  maxWidth: '220px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))'
                }}
                onError={(e) => { e.target.src = '/img/lucky-matka-logo.png'; }}
              />
            </div>
            <h2 className={`auth-heading-gradient-${themeColor}`} style={{ fontSize: '2rem', marginBottom: '6px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Gama 567
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-gold)' }} /> Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} /> Phone Number
              </label>
              <div className="input-group-custom">
                <div className="input-icon-left">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  className="form-input form-input-icon"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Password
              </label>
              <div className="input-group-custom">
                <div className="input-icon-left">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input form-input-icon"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message Displayed Directly Above Action Button */}
            {error && (
              <div className="badge badge-danger" style={{ display: 'block', padding: '12px 14px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '600' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-gold btn-theme-submit-${themeColor}`}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', letterSpacing: '0.05em' }}
              disabled={loading}
            >
              {loading ? 'LOGGING IN...' : 'LOGIN TO ACCOUNT'}
            </button>
          </form>

          {/* WhatsApp Support Section inside Card */}
          <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <MessageCircle size={20} fill="#ffffff" />
              <span>WhatsApp Support</span>
            </a>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              style={{
                color: themeColor === 'cyan' ? '#38bdf8' : themeColor === 'crimson' ? '#fb7185' : 'var(--color-gold)',
                textDecoration: 'none',
                fontWeight: '700'
              }}
            >
              SignUp Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
