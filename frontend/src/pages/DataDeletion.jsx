import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, ArrowLeft, ShieldAlert, CheckCircle, AlertCircle, Phone, Mail, HelpCircle, ShieldCheck, Headphones } from 'lucide-react';
import api from '../utils/api';

const DataDeletion = () => {
  const navigate = useNavigate();
  const [appName, setAppName] = useState('Kalyan Matka');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('I want to close my account');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [wpNumber, setWpNumber] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    // Autofill phone if logged in
    const storedPhone = localStorage.getItem('phone');
    if (storedPhone) setPhone(storedPhone);

    api.get('/app-info').then(res => {
      if (res.data?.success === '1' && res.data.data) {
        if (res.data.data.app_name) setAppName(res.data.data.app_name);
        const wp = res.data.data.wp_mobile || res.data.data.mobile || '';
        if (wp) setWpNumber(wp);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit registered mobile number.');
      return;
    }

    setLoading(true);
    try {
      const fullReason = notes.trim() ? `${reason} - Note: ${notes.trim()}` : reason;
      const res = await api.post('/request-data-deletion', {
        phone: cleanPhone,
        email: email.trim(),
        reason: fullReason
      });

      if (res.data?.success === '1') {
        setSuccessMsg(res.data.msg || 'Data deletion request submitted successfully.');
        setNotes('');
      } else {
        setErrorMsg(res.data?.msg || 'Failed to submit data deletion request.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.msg || 'Network error while submitting request. Please contact support.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#09121f',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '24px 16px 80px 16px',
      boxSizing: 'border-box',
      background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.12) 0%, transparent 60%), #09121f'
    }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        
        {/* Navigation Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <Link
            to="/privacy-policy"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#d6be66',
              textDecoration: 'none',
              fontSize: '0.84rem',
              fontWeight: '600'
            }}
          >
            <ShieldCheck size={16} /> Privacy Policy
          </Link>
        </div>

        {/* Header Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(35, 18, 25, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '20px',
          padding: '32px 24px',
          marginBottom: '28px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '16px',
            boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)'
          }}>
            <Trash2 size={32} />
          </div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '1.85rem',
            fontWeight: '800',
            color: '#ffffff'
          }}>
            Data & Account Deletion Request
          </h1>
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '0.98rem',
            color: '#f87171',
            fontWeight: '600'
          }}>
            {appName} • Package: com.saraquiz.saraapps
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            color: 'rgba(255, 255, 255, 0.75)',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <span>Google Play Data Safety Standard</span>
            <span>•</span>
            <span>24–48h SLA</span>
          </div>
        </div>

        {/* Info Box: What happens on deletion */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '24px',
          marginBottom: '24px',
          fontSize: '0.92rem',
          lineHeight: '1.6'
        }}>
          <h2 style={{ fontSize: '1.15rem', color: '#ffffff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} style={{ color: '#f87171' }} />
            What Data is Deleted?
          </h2>
          <p style={{ margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.8)' }}>
            When your deletion request is verified and processed:
          </p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px', color: 'rgba(255, 255, 255, 0.85)' }}>
            <li><strong>Account Profile:</strong> Name, phone number, login credentials, and MPIN are permanently purged.</li>
            <li><strong>Device & Session Tokens:</strong> Active logins, device identifiers, and cached sessions are revoked.</li>
            <li><strong>Payment Accounts:</strong> Saved bank details and UPI IDs linked to your user profile are erased.</li>
            <li><strong>Retention Policy:</strong> Historical financial transaction logs may be retained only for the legally mandated period required by tax and anti-fraud regulations.</li>
          </ul>
        </div>

        {/* Deletion Form */}
        <div style={{
          backgroundColor: 'rgba(20, 30, 48, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '18px',
          padding: '28px 24px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ margin: '0 0 18px 0', fontSize: '1.2rem', color: '#ffffff', fontWeight: '700' }}>
            Submit Account Deletion Form
          </h3>

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              color: '#34d399',
              fontSize: '0.92rem',
              marginBottom: '20px'
            }}>
              <CheckCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Request Received!</strong>
                {successMsg}
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: '#f87171',
              fontSize: '0.9rem',
              marginBottom: '20px'
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Phone Input */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                Registered Mobile Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 52px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Email Input (Optional) */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="name@example.com (for confirmation)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Reason */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                Reason for Deletion
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              >
                <option value="I want to close my account">I want to close my account permanently</option>
                <option value="Privacy concerns">Privacy concerns</option>
                <option value="Duplicate or unused account">Duplicate or unused account</option>
                <option value="Other">Other reasons</option>
              </select>
            </div>

            {/* Additional Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px' }}>
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Any additional feedback or request specifications..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Trash2 size={18} />
              {loading ? 'Submitting Request...' : 'Confirm & Request Data Deletion'}
            </button>
          </form>

          {/* In-App Live Support Alternative */}
          <div style={{ marginTop: '22px', textAlign: 'center', paddingTop: '18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              Need urgent assistance or direct confirmation?
            </p>
            <Link
              to="/support"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-gold, #d6be66)',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: '700'
              }}
            >
              <Headphones size={15} /> Chat with {appName} Live Support
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: '28px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.82rem' }}>
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>

      </div>
    </div>
  );
};

export default DataDeletion;
