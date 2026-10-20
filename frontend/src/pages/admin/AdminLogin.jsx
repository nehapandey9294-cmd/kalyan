import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { initAdminSession } from '../../utils/adminSession';

const AdminLogin = ({ setAdminAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get('reason');
    if (reason === 'inactivity') {
      setSessionNotice('You were automatically logged out due to 30 minutes of inactivity.');
    } else if (reason === 'max_session') {
      setSessionNotice('Session expired: Maximum session duration of 1 hour reached. Please log in again.');
    } else if (reason === 'expired') {
      setSessionNotice('Your admin session has expired. Please log in again.');
    } else if (reason === 'logged_out_elsewhere') {
      setSessionNotice('You were logged out from another window or tab.');
    }
  }, [location.search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSessionNotice('');
    setLoading(true);

    try {
      const response = await api.post('/admin/login', {
        username,
        password
      });

      if (response.data.success === '1') {
        initAdminSession(response.data.token, response.data.admin?.name);
        setAdminAuth(true);
        navigate('/admin');
      } else {
        setError(response.data.msg || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid username, email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f8fb',
      fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 0.75rem 1.5rem rgba(18, 38, 63, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Top Banner Header */}
        <div style={{
          backgroundColor: 'rgba(85, 110, 230, 0.25)',
          padding: '24px 24px 0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}>
          <div style={{ paddingBottom: '24px' }}>
            <h5 style={{
              color: '#556ee6',
              fontSize: '1.2rem',
              fontWeight: '600',
              margin: '0 0 6px 0'
            }}>
              Welcome Back !
            </h5>
            <p style={{
              color: '#556ee6',
              fontSize: '0.875rem',
              margin: 0,
              opacity: 0.9,
              lineHeight: 1.4
            }}>
              Sign in to continue to Admin Console.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <img
              src="/assets/images/profile-img.png"
              alt="Profile Banner"
              style={{
                width: '140px',
                height: 'auto',
                display: 'block'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Circular Avatar / Logo */}
        <div style={{
          marginTop: '-36px',
          marginLeft: '24px',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="/img/logo.png"
              alt="Logo"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.target.src = '/assets/images/logo1.png';
              }}
            />
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '0 28px 36px 28px' }}>
          {sessionNotice && !error && (
            <div style={{
              backgroundColor: '#fff8e6',
              color: '#b7791f',
              border: '1px solid #fbd38d',
              borderRadius: '6px',
              padding: '12px 14px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              lineHeight: '1.4'
            }}>
              <span style={{ fontSize: '1.1rem' }}>⏱️</span>
              <div>{sessionNotice}</div>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fde8e8',
              color: '#e53e3e',
              border: '1px solid #fbd5d5',
              borderRadius: '4px',
              padding: '10px 14px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  color: '#495057',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@solidityscan.com"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#eef3fc',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  color: '#495057',
                  outline: 'none',
                  transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#556ee6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(85, 110, 230, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ced4da';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  color: '#495057',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#eef3fc',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  color: '#495057',
                  outline: 'none',
                  transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#556ee6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(85, 110, 230, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ced4da';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#556ee6',
                color: '#ffffff',
                padding: '11px 16px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.95rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                boxShadow: '0 2px 6px 0 rgba(85, 110, 230, 0.3)',
                transition: 'background-color 0.2s ease, transform 0.1s ease'
              }}
              onMouseOver={(e) => {
                if (!loading) e.target.style.backgroundColor = '#485ec4';
              }}
              onMouseOut={(e) => {
                if (!loading) e.target.style.backgroundColor = '#556ee6';
              }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
