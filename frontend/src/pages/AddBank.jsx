import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Building2, Save } from 'lucide-react';
import api from '../utils/api';

const AddBank = () => {
  const [formData, setFormData] = useState({
    bank_name: '',
    branch_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: ''
  });
  const [wallet, setWallet] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await api.get('/profile');
      if (res.data.success === '1') {
        const data = res.data.data || {};
        setFormData({
          bank_name: data.bank_name || '',
          branch_name: data.branch_name || '',
          account_holder_name: data.account_holder_name || '',
          account_number: data.account_number || '',
          ifsc_code: data.ifsc_code || ''
        });
        setWallet(data.wallet || '0');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    const bankName = formData.bank_name.trim();
    const holderName = formData.account_holder_name.trim();
    const accNo = formData.account_number.trim();
    const ifsc = formData.ifsc_code.trim().toUpperCase();

    if (!bankName) {
      setError('Please enter your Bank Name.');
      return;
    }

    if (!holderName || holderName.length < 2) {
      setError('Please enter a valid Account Holder Name.');
      return;
    }

    if (!/^\d{9,18}$/.test(accNo)) {
      setError('Account Number must be between 9 and 18 digits.');
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setError('Invalid IFSC Code format! (e.g., SBIN0001234 - 11 characters, 5th character must be 0)');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/profile/update', {
        ...formData,
        bank_name: bankName,
        account_holder_name: holderName,
        account_number: accNo,
        ifsc_code: ifsc
      });
      if (res.data.success === '1') {
        setMsg('Bank Details Saved Successfully!');
        loadData();
      } else {
        setError(res.data.msg || 'Failed to save bank details');
      }
    } catch (err) {
      console.error(err);
      setError('Error saving bank details. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px 32px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--app-gradient-primary, linear-gradient(135deg, #d6be66 0%, #10b981 100%))',
        padding: '12px 18px',
        borderRadius: '14px',
        marginBottom: '20px',
        color: '#0b1a30',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#0b1a30' }}>
            <ArrowLeft size={20} />
          </Link>
          <span style={{ fontWeight: '800', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Add Bank Account</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.95rem' }}>
          <Wallet size={18} />
          <span>₹ {wallet}</span>
        </div>
      </div>

      <div className="card-glass-v2">
        <h5 style={{ color: '#ffffff', fontWeight: '800', margin: '0 0 18px 0', fontSize: '1.1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} style={{ color: 'var(--color-gold, #d6be66)' }} /> Bank Account & Withdrawal Info
        </h5>

        {msg && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>✓ {msg}</div>}
        {error && <div className="badge badge-danger" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>⚠️ {error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>Loading Bank Details...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '22px' }}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. State Bank of India, HDFC"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Branch Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Branch Address"
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">A/c Holder Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Account Holder Name"
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Number (Digits Only)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter 9 to 18 digit Account Number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                  maxLength={18}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">IFSC Code (11 Characters)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter 11-character IFSC Code (e.g. SBIN0001234)"
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                  maxLength={11}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-gold"
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '1rem',
                letterSpacing: '0.04em'
              }}
            >
              {saving ? 'SAVING...' : 'SAVE BANK DETAILS'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddBank;
