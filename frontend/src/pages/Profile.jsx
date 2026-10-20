import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, User, Mail, Phone, Share2, Copy, Check, Save, ShieldCheck, CheckCircle2, AlertCircle, LogOut, KeyRound } from 'lucide-react';
import api from '../utils/api';

const Profile = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    wallet: '0'
  });
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // M-PIN Change states
  const [mpinStatus, setMpinStatus] = useState('1');
  const [referralStatus, setReferralStatus] = useState('1');
  const [oldMpin, setOldMpin] = useState('');
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [mpinSaving, setMpinSaving] = useState(false);
  const [mpinMsg, setMpinMsg] = useState('');
  const [mpinError, setMpinError] = useState('');

  const loadProfile = async () => {
    try {
      const [res, appRes] = await Promise.all([
        api.get('/profile').catch(() => null),
        api.get('/app-info').catch(() => null)
      ]);

      if (res?.data?.success === '1') {
        const data = res.data.data || {};
        setProfile(data);
        setNameInput(data.name || '');
        setEmailInput(data.email || '');
      }

      if (appRes?.data?.data) {
        setMpinStatus(appRes.data.data.mpin_status ?? '1');
        if (appRes.data.data.referral_status !== undefined) {
          setReferralStatus(String(appRes.data.data.referral_status));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');

    try {
      const res = await api.post('/profile/update', {
        name: nameInput.trim(),
        email: emailInput.trim()
      });

      if (res.data.success === '1') {
        setMsg('Profile Updated Successfully!');
        if (nameInput.trim()) localStorage.setItem('name', nameInput.trim());
        loadProfile();
      } else {
        setError(res.data.msg || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      setError('Error updating profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeMpin = async (e) => {
    e.preventDefault();
    setMpinSaving(true);
    setMpinMsg('');
    setMpinError('');

    if (!oldMpin) {
      setMpinError('Please enter your Current M-PIN.');
      setMpinSaving(false);
      return;
    }

    if (!/^\d{4}$/.test(newMpin)) {
      setMpinError('New M-PIN must be a 4-digit number.');
      setMpinSaving(false);
      return;
    }

    if (newMpin !== confirmMpin) {
      setMpinError('New M-PIN and Confirm M-PIN do not match.');
      setMpinSaving(false);
      return;
    }

    try {
      const res = await api.post('/profile/change-mpin', {
        old_mpin: oldMpin,
        new_mpin: newMpin
      });

      if (res.data.success === '1') {
        setMpinMsg('M-PIN Updated Successfully!');
        setOldMpin('');
        setNewMpin('');
        setConfirmMpin('');
      } else {
        setMpinError(res.data.msg || 'Failed to update M-PIN');
      }
    } catch (err) {
      console.error(err);
      setMpinError('Error updating M-PIN. Try again.');
    } finally {
      setMpinSaving(false);
    }
  };

  const referralLink = `${window.location.origin}/signup?ref=${encodeURIComponent(profile.phone || profile.phone_number || '')}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 14px' }}>
      {/* Subpage Header Banner */}
      <div className="card-glass-v2" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        marginBottom: '18px',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} style={{ color: 'var(--color-gold)' }} />
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#fff' }}>My Profile</span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'rgba(214, 190, 102, 0.15)',
          border: '1px solid rgba(214, 190, 102, 0.3)',
          borderRadius: '20px',
          fontWeight: '700',
          fontSize: '0.88rem',
          color: 'var(--color-gold)'
        }}>
          <Wallet size={16} />
          <span>₹ {profile.wallet || '0'}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gold)' }}>Loading Profile...</div>
      ) : (
        <>
          {/* Card 1: My Information */}
          <div className="card-glass-v2" style={{ padding: '20px', marginBottom: '18px', borderRadius: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img
                src="/img/logo.png"
                alt="Logo"
                style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => { e.target.src = '/img/lucky-matka-logo.png'; }}
              />
            </div>
            <h5 style={{ color: 'var(--color-gold)', fontWeight: '700', margin: '0 0 14px 0', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} />
              My Account Details
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.92rem', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={16} style={{ color: 'var(--color-gold)' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Name:</span>
                <strong>{profile.name || '—'}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} style={{ color: 'var(--color-gold)' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Phone:</span>
                <strong>{profile.phone || profile.phone_number || '—'}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} style={{ color: 'var(--color-gold)' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Email:</span>
                <strong>{profile.email || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Referral (Dost ko bulao) */}
          {referralStatus !== '0' && (
            <div className="card-glass-v2" style={{ padding: '20px', marginBottom: '18px', borderRadius: '16px' }}>
              <h5 style={{ color: 'var(--color-gold)', fontWeight: '700', margin: '0 0 6px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={18} />
                Referral Program
              </h5>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', margin: '0 0 14px 0' }}>
                Share your referral link with friends and earn rewards on signup!
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    fontSize: '0.82rem',
                    color: 'rgba(255,255,255,0.9)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="btn-gradient"
                  style={{
                    padding: '9px 16px',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
                <strong>Referral Code / Number:</strong> <span style={{ color: 'var(--color-gold)' }}>{profile.phone || profile.phone_number || ''}</span>
              </div>
            </div>
          )}

          {/* Card 3: Edit Profile */}
          <div className="card-glass-v2" style={{ padding: '20px', borderRadius: '16px' }}>
            <h5 style={{ color: 'var(--color-gold)', fontWeight: '700', margin: '0 0 16px 0', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              Edit Profile Info
            </h5>

            {msg && (
              <div style={{ backgroundColor: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {msg}
              </div>
            )}
            {error && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    placeholder="Enter Full Name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="email"
                    placeholder="Enter Email Address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                  Registered Phone
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="text"
                    readOnly
                    value={profile.phone || profile.phone_number || ''}
                    style={{ ...inputStyle, paddingLeft: '38px', backgroundColor: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.5)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-gradient"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* Card 4: Change 4-Digit M-PIN (Only if active) */}
          {String(mpinStatus) === '1' && (
            <div className="card-glass-v2" style={{ padding: '20px', borderRadius: '16px', marginTop: '18px' }}>
              <h5 style={{ color: 'var(--color-gold)', fontWeight: '700', margin: '0 0 16px 0', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} />
                Change 4-Digit M-PIN
              </h5>

              {mpinMsg && (
                <div style={{ backgroundColor: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} /> {mpinMsg}
                </div>
              )}
              {mpinError && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} /> {mpinError}
                </div>
              )}

              <form onSubmit={handleChangeMpin}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                    Current M-PIN
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Enter current 4-digit M-PIN"
                      value={oldMpin}
                      onChange={(e) => setOldMpin(e.target.value.replace(/\D/g, ''))}
                      style={{ ...inputStyle, paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                    New M-PIN
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Enter new 4-digit M-PIN"
                      value={newMpin}
                      onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ''))}
                      style={{ ...inputStyle, paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                    Confirm New M-PIN
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Confirm new 4-digit M-PIN"
                      value={confirmMpin}
                      onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
                      style={{ ...inputStyle, paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mpinSaving}
                  className="btn-gradient"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Save size={18} />
                  {mpinSaving ? 'Updating M-PIN...' : 'Update M-PIN'}
                </button>
              </form>
            </div>
          )}

          {/* Card 4: Logout */}
          <div className="card-glass-v2" style={{ padding: '16px 20px', borderRadius: '16px', marginTop: '18px' }}>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('name');
                localStorage.removeItem('phone');
                window.location.href = '/login';
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)'
              }}
            >
              <LogOut size={18} />
              Logout Account
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.15)',
  backgroundColor: 'rgba(0,0,0,0.25)',
  fontSize: '0.9rem',
  color: '#ffffff',
  boxSizing: 'border-box',
  outline: 'none'
};

export default Profile;

