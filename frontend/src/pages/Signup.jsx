import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Lock, KeyRound, Mail, Gift, Eye, EyeOff, MessageCircle, ShieldCheck } from 'lucide-react';
import api from '../utils/api';

const Signup = ({ setAuth }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    user_phone: '',
    user_password: '',
    user_mpin: '',
    user_email: '',
    referral_phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showMpin, setShowMpin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState('Gama 567');
  const [wpNumber, setWpNumber] = useState('');
  const [referralStatus, setReferralStatus] = useState('1');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('auth_theme_color') || 'gold');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/app-info').then(res => {
      if (res.data?.success === '1' && res.data.data) {
        if (res.data.data.referral_status !== undefined) {
          setReferralStatus(String(res.data.data.referral_status));
        }
        const supportNum = res.data.data.wp_mobile || res.data.data.mobile || '';
        if (supportNum) {
          setWpNumber(supportNum);
        }
      }
    }).catch(() => {});
  }, []);

  const handleThemeChange = (color) => {
    setThemeColor(color);
    localStorage.setItem('auth_theme_color', color);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.user_phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (formData.user_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.user_mpin.length !== 4) {
      setError('M-PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/signup', {
        user_name: formData.user_name,
        user_phone: formData.user_phone,
        user_password: formData.user_password,
        user_mpin: formData.user_mpin,
        user_email: formData.user_email,
        referral_phone: formData.referral_phone
      });

      const resData = response.data;
      if (resData.success === '1') {
        if (resData.data?.token) {
          localStorage.setItem('token', resData.data.token);
          localStorage.setItem('phone', resData.data.phone_number);
          localStorage.setItem('name', resData.data.name);
          if (setAuth) setAuth(true);
        }
        navigate('/');
      } else {
        setError(resData.msg || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cleanWpNumber = wpNumber.replace(/\D/g, '');
  const whatsappUrl = cleanWpNumber 
    ? `https://wa.me/${cleanWpNumber.length === 10 ? '91' + cleanWpNumber : cleanWpNumber}?text=${encodeURIComponent(`Hello ${appName} Support, I need help registering my new account.`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Hello ${appName} Support, I need help registering my new account.`)}`;

  return (
    <div className={`auth-page-bg auth-theme-${themeColor}`}>
      {/* Background Ambient Orbs */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: themeColor === 'cyan' ? 'rgba(168, 85, 247, 0.22)' : themeColor === 'crimson' ? 'rgba(249, 115, 22, 0.22)' : 'rgba(16, 185, 129, 0.22)',
        filter: 'blur(90px)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative', zIndex: 10 }}>
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
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <img
                src="/img/logo.png"
                alt="Gama 567 Logo"
                style={{
                  height: '68px',
                  width: 'auto',
                  maxWidth: '210px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))'
                }}
                onError={(e) => { e.target.src = '/img/lucky-matka-logo.png'; }}
              />
            </div>
            <h2 className={`auth-heading-gradient-${themeColor}`} style={{ fontSize: '1.9rem', marginBottom: '4px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              CREATE ACCOUNT
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-gold)' }} /> Join {appName} & start placing bids
            </p>
          </div>

          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Full Name
              </label>
              <div className="input-group-custom">
                <div className="input-icon-left">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="user_name"
                  className="form-input form-input-icon"
                  placeholder="Enter your full name"
                  value={formData.user_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2">
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
                    name="user_phone"
                    className="form-input form-input-icon"
                    placeholder="10-digit number"
                    value={formData.user_phone}
                    onChange={(e) => setFormData({ ...formData, user_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} /> Password
                </label>
                <div className="input-group-custom">
                  <div className="input-icon-left">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="user_password"
                    className="form-input form-input-icon"
                    placeholder="Min 6 characters"
                    value={formData.user_password}
                    onChange={handleChange}
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
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={14} /> 4-Digit M-PIN
                </label>
                <div className="input-group-custom">
                  <div className="input-icon-left">
                    <KeyRound size={18} />
                  </div>
                  <input
                    type={showMpin ? 'text' : 'password'}
                    name="user_mpin"
                    className="form-input form-input-icon"
                    placeholder="4-digit pin"
                    value={formData.user_mpin}
                    onChange={(e) => setFormData({ ...formData, user_mpin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowMpin(!showMpin)}
                    title={showMpin ? 'Hide M-PIN' : 'Show M-PIN'}
                  >
                    {showMpin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {referralStatus !== '0' && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gift size={14} /> Referral Phone (Optional)
                  </label>
                  <div className="input-group-custom">
                    <div className="input-icon-left">
                      <Gift size={18} />
                    </div>
                    <input
                      type="tel"
                      name="referral_phone"
                      className="form-input form-input-icon"
                      placeholder="Referrer number"
                      value={formData.referral_phone}
                      onChange={(e) => setFormData({ ...formData, referral_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error & Success Messages Displayed Directly Above Action Button */}
            {error && (
              <div className="badge badge-danger" style={{ display: 'block', padding: '12px 14px', marginBottom: '16px', textAlign: 'center', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '600' }}>
                {error}
              </div>
            )}

            {success && (
              <div className="badge badge-success" style={{ display: 'block', padding: '12px 14px', marginBottom: '16px', textAlign: 'center', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '600' }}>
                {success}
              </div>
            )}

            <button 
              type="submit" 
              className={`btn btn-gold btn-theme-submit-${themeColor}`} 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', letterSpacing: '0.05em', marginTop: '6px' }} 
              disabled={loading}
            >
              {loading ? 'CREATING ACCOUNT...' : 'REGISTER NOW'}
            </button>
          </form>

          {/* WhatsApp Support Section inside Card */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
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

          <div style={{ marginTop: '18px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: themeColor === 'cyan' ? '#38bdf8' : themeColor === 'crimson' ? '#fb7185' : 'var(--color-gold)', 
                textDecoration: 'none', 
                fontWeight: '700' 
              }}
            >
              Login Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
