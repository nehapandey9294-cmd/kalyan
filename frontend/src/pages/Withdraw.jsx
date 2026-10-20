import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Edit3, CheckCircle2, AlertCircle, ArrowRight, X, ShieldCheck, Clock } from 'lucide-react';
import api from '../utils/api';

const Withdraw = () => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [amount, setAmount] = useState('2000');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // UPI update modal state
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [phonepe, setPhonepe] = useState('');
  const [paytm, setPaytm] = useState('');
  const [gpay, setGpay] = useState('');
  const [upiUpdating, setUpiUpdating] = useState(false);
  const [upiMsg, setUpiMsg] = useState('');
  const [upiErr, setUpiErr] = useState('');

  const navigate = useNavigate();

  const formatTime12h = (timeStr) => {
    if (!timeStr) return 'N/A';
    const cleanStr = String(timeStr).trim();
    if (cleanStr.toUpperCase().includes('AM') || cleanStr.toUpperCase().includes('PM')) {
      return cleanStr;
    }
    const parts = cleanStr.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].padStart(2, '0');
      if (isNaN(hours)) return cleanStr;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = String(hours).padStart(2, '0');
      return `${strHours}:${minutes} ${ampm}`;
    }
    return cleanStr;
  };

  const loadData = async () => {
    try {
      const [walletRes, profileRes] = await Promise.all([
        api.get('/wallet/info'),
        api.get('/profile')
      ]);

      if (walletRes.data.success === '1') {
        setWalletInfo(walletRes.data.data);
      }
      if (profileRes.data.success === '1') {
        const u = profileRes.data.data;
        setProfile(u);
        setPhonepe(u.phonepay || '');
        setPaytm(u.paytm || '');
        setGpay(u.googlepay || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateUpi = async (e) => {
    e.preventDefault();
    setUpiUpdating(true);
    setUpiMsg('');
    setUpiErr('');

    if (!phonepe.trim() && !paytm.trim() && !gpay.trim()) {
      setUpiErr('Please enter at least one UPI ID or mobile number.');
      setUpiUpdating(false);
      return;
    }

    try {
      const res = await api.post('/profile/update', {
        phonpe: phonepe.trim(),
        phonepay: phonepe.trim(),
        paytm: paytm.trim(),
        gpay: gpay.trim(),
        googlepay: gpay.trim()
      });
      if (res.data.success === '1') {
        setUpiMsg('UPI details updated successfully!');
        setProfile(prev => ({
          ...prev,
          phonepay: phonepe.trim() || prev?.phonepay || '',
          paytm: paytm.trim() || prev?.paytm || '',
          googlepay: gpay.trim() || prev?.googlepay || ''
        }));
        setTimeout(() => {
          setShowUpiModal(false);
          setUpiMsg('');
          loadData();
        }, 1000);
      } else {
        setUpiErr(res.data.msg || 'Failed to update UPI details.');
      }
    } catch (err) {
      setUpiErr('Error updating UPI details.');
    } finally {
      setUpiUpdating(false);
    }
  };

  const handleMethodChange = (e) => {
    const val = e.target.value;
    setPaymentMethod(val);
    setError('');

    if (val === 'PhonePe' && !profile?.phonepay && !phonepe) {
      setError('PhonePe UPI ID is required! Please add your PhonePe ID below.');
      setShowUpiModal(true);
    } else if (val === 'Paytm' && !profile?.paytm && !paytm) {
      setError('Paytm UPI ID is required! Please add your Paytm ID below.');
      setShowUpiModal(true);
    } else if ((val === 'Gpay' || val === 'GPay') && !profile?.googlepay && !gpay) {
      setError('Google Pay UPI ID is required! Please add your GPay ID below.');
      setShowUpiModal(true);
    } else if (val === 'Bank' && !profile?.account_number) {
      setError('Bank Account details missing! Redirecting to add Bank Account...');
      setTimeout(() => navigate('/add-bank'), 1500);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    const amt = parseFloat(amount);
    const minWithdraw = parseFloat(walletInfo?.min_withdrawal || 1000);
    const maxWithdraw = parseFloat(walletInfo?.max_withdrawal || 50000);

    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }

    if (paymentMethod === 'Bank' && !profile?.account_number) {
      setError('Bank Account details missing! Please add your Bank Account details first.');
      setTimeout(() => navigate('/add-bank'), 1500);
      return;
    }

    if (paymentMethod === 'Paytm' && (!profile?.paytm && !paytm)) {
      setError('Paytm UPI ID is required for withdrawal! Please add your Paytm ID in the modal.');
      setShowUpiModal(true);
      return;
    }

    if (paymentMethod === 'PhonePe' && (!profile?.phonepay && !phonepe)) {
      setError('PhonePe UPI ID is required for withdrawal! Please add your PhonePe ID in the modal.');
      setShowUpiModal(true);
      return;
    }

    if ((paymentMethod === 'GPay' || paymentMethod === 'Gpay') && (!profile?.googlepay && !gpay)) {
      setError('Google Pay UPI ID is required for withdrawal! Please add your GPay ID in the modal.');
      setShowUpiModal(true);
      return;
    }

    if (isNaN(amt) || amt < minWithdraw) {
      setError(`Please enter a minimum of ₹${minWithdraw}`);
      return;
    }

    if (amt > maxWithdraw) {
      setError(`Maximum allowed withdrawal per request is ₹${maxWithdraw}`);
      return;
    }

    const currentBal = parseFloat(walletInfo?.wallet || 0);
    if (amt > currentBal) {
      setError('Insufficient wallet balance!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/wallet/withdraw-request', {
        amount: amount,
        payment_method: paymentMethod,
        remark: `Withdrawal via ${paymentMethod}`
      });

      if (res.data.success === '1') {
        const newBal = res.data.balance !== undefined ? res.data.balance : (res.data.wallet !== undefined ? res.data.wallet : null);
        if (newBal !== null) {
          setWalletInfo(prev => prev ? { ...prev, wallet: newBal } : prev);
          window.dispatchEvent(new CustomEvent('wallet_updated', { detail: { balance: newBal } }));
        }
        setMsg(res.data.msg || 'Withdrawal request submitted successfully!');
        setAmount('');
        loadData();
      } else {
        setError(res.data.msg || 'Failed to submit withdrawal request.');
      }
    } catch (err) {
      console.error(err);
      setError('Error submitting withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px 32px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: 'var(--app-gradient-primary, linear-gradient(135deg, #d6be66 0%, #10b981 100%))',
        padding: '10px 14px',
        borderRadius: '14px',
        marginBottom: '16px',
        color: '#0b1a30',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#0b1a30', flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </Link>
          <span style={{
            fontWeight: '800',
            fontSize: '0.92rem',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Withdraw Points
          </span>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: '800',
          fontSize: '0.9rem',
          background: 'rgba(11, 26, 48, 0.12)',
          padding: '6px 12px',
          borderRadius: '20px',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          <Wallet size={16} style={{ flexShrink: 0 }} />
          <span>₹{walletInfo?.wallet || '0'}</span>
        </div>
      </div>

      {/* Admin Configured Withdraw Timing Card */}
      <div className="card-glass-v2" style={{
        padding: '16px 20px',
        borderRadius: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(214, 190, 102, 0.3)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Withdraw Open Time */}
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <Clock size={15} style={{ color: '#10b981' }} /> Withdraw Open Time
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981', letterSpacing: '0.02em' }}>
              {formatTime12h(walletInfo?.withdraw_open_time || walletInfo?.min_withdraw || '09:00 AM')}
            </div>
          </div>

          {/* Withdraw Close Time */}
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <Clock size={15} style={{ color: '#ef4444' }} /> Withdraw Close Time
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444', letterSpacing: '0.02em' }}>
              {formatTime12h(walletInfo?.withdraw_close_time || walletInfo?.max_withdraw || '09:00 PM')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card-glass-v2" style={{ marginBottom: '20px' }}>
        {/* Saved UPI IDs Card */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-gold, #d6be66)' }} /> Saved Payment Methods
            </span>
            <button
              type="button"
              onClick={() => setShowUpiModal(true)}
              className="btn-gold"
              style={{
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Edit3 size={14} /> Update UPI IDs
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div onClick={() => setShowUpiModal(true)} style={{ cursor: 'pointer', background: profile?.phonepay ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)', border: profile?.phonepay ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed rgba(239, 68, 68, 0.4)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff' }}>
              PhonePe: <strong style={{ color: profile?.phonepay ? '#10b981' : '#ef4444' }}>{profile?.phonepay || '+ Add ID (Required)'}</strong>
            </div>
            <div onClick={() => setShowUpiModal(true)} style={{ cursor: 'pointer', background: profile?.paytm ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)', border: profile?.paytm ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed rgba(239, 68, 68, 0.4)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff' }}>
              Paytm: <strong style={{ color: profile?.paytm ? '#10b981' : '#ef4444' }}>{profile?.paytm || '+ Add ID (Required)'}</strong>
            </div>
            <div onClick={() => setShowUpiModal(true)} style={{ cursor: 'pointer', background: profile?.googlepay ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)', border: profile?.googlepay ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed rgba(239, 68, 68, 0.4)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff' }}>
              GPay: <strong style={{ color: profile?.googlepay ? '#10b981' : '#ef4444' }}>{profile?.googlepay || '+ Add ID (Required)'}</strong>
            </div>
          </div>
        </div>

        {msg && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>✓ {msg}</div>}
        {error && <div className="badge badge-danger" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>⚠️ {error}</div>}

        <form onSubmit={handleWithdraw}>
          {/* Payment Method Select */}
          <div className="form-group">
            <label className="form-label">Select Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={handleMethodChange}
              className="form-input"
              style={{ background: 'rgba(0,0,0,0.5)', height: '46px', borderRadius: '10px' }}
              required
            >
              <option value="">-- Choose Payment Method --</option>
              <option value="Paytm">Paytm {profile?.paytm ? `(${profile.paytm})` : '⚠️ ID Required'}</option>
              <option value="PhonePe">PhonePe {profile?.phonepay ? `(${profile.phonepay})` : '⚠️ ID Required'}</option>
              <option value="Gpay">Google Pay {profile?.googlepay ? `(${profile.googlepay})` : '⚠️ ID Required'}</option>
              {String(profile?.transfer_status ?? '1') !== '0' && (
                <option value="Bank">Bank Transfer {profile?.account_number ? `(A/C: ${profile.account_number})` : '⚠️ Bank Details Required'}</option>
              )}
            </select>
          </div>

          {/* Quick Amount Chips */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Withdrawal Amount (₹)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {['1000', '2000', '5000', '10000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '10px',
                    border: amount === val ? '2px solid var(--color-gold, #d6be66)' : '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: amount === val ? 'rgba(214, 190, 102, 0.2)' : 'rgba(0,0,0,0.3)',
                    color: amount === val ? 'var(--color-gold, #d6be66)' : '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ₹{val}
                </button>
              ))}
            </div>
            <input
              type="number"
              className="form-input"
              placeholder="Enter custom withdrawal amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-gold"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '1rem',
              letterSpacing: '0.04em'
            }}
          >
            {submitting ? 'SUBMITTING...' : `PROCEED TO WITHDRAW ₹${amount || '0'}`}
          </button>
        </form>

        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <Link to="/withdraw-history" style={{ color: 'var(--color-gold, #d6be66)', fontSize: '0.88rem', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>View Withdraw History</span> <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Note Card */}
      <div className="card-glass-v2" style={{ padding: '14px 18px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.82rem' }}>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} style={{ color: 'var(--color-gold, #d6be66)', flexShrink: 0 }} />
          <span>Withdrawal requests are processed within official market timings. Ensure payment details are accurate.</span>
        </p>
      </div>

      {/* Modal for updating UPI details */}
      {showUpiModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card-glass-v2" style={{ maxWidth: '440px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <h5 style={{ margin: 0, color: '#ffffff', fontWeight: '800', fontSize: '1.1rem' }}>Update UPI Payment IDs</h5>
              <button
                type="button"
                onClick={() => setShowUpiModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.6)' }}
              >
                <X size={18} />
              </button>
            </div>

            {upiMsg && <div className="badge badge-success" style={{ display: 'block', padding: '10px', marginBottom: '14px', textAlign: 'center' }}>✓ {upiMsg}</div>}
            {upiErr && <div className="badge badge-danger" style={{ display: 'block', padding: '10px', marginBottom: '14px', textAlign: 'center' }}>⚠️ {upiErr}</div>}

            <form onSubmit={handleUpdateUpi}>
              <div className="form-group">
                <label className="form-label">PhonePe UPI ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9876543210@ybl"
                  value={phonepe}
                  onChange={(e) => setPhonepe(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Paytm UPI ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9876543210@paytm"
                  value={paytm}
                  onChange={(e) => setPaytm(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Google Pay UPI ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9876543210@okaxis"
                  value={gpay}
                  onChange={(e) => setGpay(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowUpiModal(false)}
                  className="btn-outline"
                  style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upiUpdating}
                  className="btn-gold"
                  style={{ flex: 1, padding: '12px', borderRadius: '10px' }}
                >
                  {upiUpdating ? 'Updating...' : 'SAVE DETAILS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Withdraw;
