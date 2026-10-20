import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, PlusCircle, ArrowDownRight, CheckCircle2, XCircle, Clock, Copy, Check, Filter, Sparkles, Calendar } from 'lucide-react';
import api from '../utils/api';
import { getISTTodayStr, getISTDaysAgoStr, formatDisplayDate } from '../utils/indianTime';

const DepositRequestStatus = () => {
  const [fromDate, setFromDate] = useState(getISTDaysAgoStr(6));
  const [toDate, setToDate] = useState(getISTTodayStr());
  const [deposits, setDeposits] = useState([]);
  const [wallet, setWallet] = useState('0');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [copiedUtr, setCopiedUtr] = useState('');

  const fetchData = async (d1 = fromDate, d2 = toDate) => {
    setLoading(true);
    try {
      const [depRes, walRes] = await Promise.all([
        api.get(`/wallet/deposit-requests?date1=${d1}&date2=${d2}`).catch(() => null),
        api.get('/wallet/info').catch(() => null)
      ]);

      if (depRes?.data?.success === '1') {
        setDeposits(depRes.data.result || []);
      }
      if (walRes?.data?.success === '1') {
        setWallet(walRes.data.data?.wallet || '0');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = (e) => {
    e.preventDefault();
    fetchData(fromDate, toDate);
  };

  const handleCopyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(''), 2500);
  };

  // Filtered deposits list
  const filteredDeposits = deposits.filter(item => {
    if (activeFilter === 'pending') return item.status === '0' || (!item.status && item.status !== '-1');
    if (activeFilter === 'approved') return item.status === '1';
    if (activeFilter === 'rejected') return item.status === '-1';
    return true;
  });

  // Calculate statistics
  const pendingCount = deposits.filter(d => d.status === '0' || (!d.status && d.status !== '-1')).length;
  const approvedCount = deposits.filter(d => d.status === '1').length;
  const rejectedCount = deposits.filter(d => d.status === '-1').length;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 14px 32px' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--app-gradient-primary, linear-gradient(135deg, #d6be66 0%, #10b981 100%))',
        padding: '12px 18px',
        borderRadius: '16px',
        marginBottom: '20px',
        color: '#0b1a30',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#0b1a30' }}>
            <ArrowLeft size={20} />
          </Link>
          <span style={{ fontWeight: '800', fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Deposit History</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.95rem' }}>
          <Wallet size={18} />
          <span>₹ {wallet}</span>
        </div>
      </div>

      {/* Date Filter Box */}
      <div className="card-glass-v2" style={{ padding: '18px', marginBottom: '20px', borderRadius: '16px' }}>
        <form onSubmit={handleApply}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                <Calendar size={14} style={{ color: 'var(--color-gold)' }} />
                From Date
              </label>
              <input
                type="date"
                className="dark-date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                <Calendar size={14} style={{ color: 'var(--color-gold)' }} />
                To Date
              </label>
              <input
                type="date"
                className="dark-date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-gradient"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Filter size={16} /> Apply Date Filter
          </button>
        </form>
      </div>

      {/* Statistics Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div className="card-glass-v2" style={{ padding: '12px', textAlign: 'center', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600', display: 'block' }}>TOTAL</span>
          <strong style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: '800' }}>{deposits.length}</strong>
        </div>
        <div className="card-glass-v2" style={{ padding: '12px', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '600', display: 'block' }}>PENDING</span>
          <strong style={{ fontSize: '1.25rem', color: '#fbbf24', fontWeight: '800' }}>{pendingCount}</strong>
        </div>
        <div className="card-glass-v2" style={{ padding: '12px', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
          <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '600', display: 'block' }}>APPROVED</span>
          <strong style={{ fontSize: '1.25rem', color: '#34d399', fontWeight: '800' }}>{approvedCount}</strong>
        </div>
      </div>

      {/* Filter Tabs & New Deposit Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'approved', label: `Approved (${approvedCount})` },
            { key: 'rejected', label: `Rejected (${rejectedCount})` }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={activeFilter === f.key ? 'btn-gold' : 'btn-outline'}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Link
          to="/add-fund"
          className="btn-gold"
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '800',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
        >
          <PlusCircle size={15} /> <span>ADD FUND</span>
        </Link>
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem' }}>
          <Clock size={28} style={{ animation: 'spin 2s linear infinite', marginBottom: '8px' }} />
          <p style={{ margin: 0 }}>Loading deposit requests...</p>
        </div>
      ) : filteredDeposits.length === 0 ? (
        <div className="card-glass-v2" style={{
          borderRadius: '18px',
          padding: '40px 20px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)'
        }}>
          <Clock size={48} style={{ color: 'var(--color-gold, #d6be66)', opacity: 0.5, marginBottom: '12px' }} />
          <h4 style={{ color: '#ffffff', fontSize: '1.1rem', margin: '0 0 6px 0', fontWeight: '700' }}>
            {activeFilter === 'all' ? 'No Deposit Requests Found' : `No ${activeFilter.toUpperCase()} Deposit Requests`}
          </h4>
          <p style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Submit a deposit request to add points to your wallet instantly.
          </p>
          <Link
            to="/add-fund"
            className="btn-gold"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '12px',
              fontWeight: '800',
              textDecoration: 'none',
              fontSize: '0.88rem'
            }}
          >
            <PlusCircle size={18} /> <span>SUBMIT DEPOSIT REQUEST</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredDeposits.map((item) => {
            const isApproved = item.status === '1';
            const isRejected = item.status === '-1';
            const isPending = !isApproved && !isRejected;

            const statusColor = isApproved ? '#34d399' : isRejected ? '#f87171' : '#fbbf24';
            const statusBg = isApproved ? 'rgba(52, 211, 153, 0.15)' : isRejected ? 'rgba(248, 113, 113, 0.15)' : 'rgba(245, 158, 11, 0.15)';
            const statusBorder = isApproved ? 'rgba(52, 211, 153, 0.35)' : isRejected ? 'rgba(248, 113, 113, 0.35)' : 'rgba(245, 158, 11, 0.35)';
            const StatusIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : Clock;

            const utrNumber = item.utr || item.txt_id || item.transaction_id || '';

            return (
              <div
                key={item.id || Math.random()}
                className="card-glass-v2"
                style={{
                  borderRadius: '16px',
                  padding: '16px 18px',
                  borderLeft: `5px solid ${statusColor}`,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>
                      Deposit Amount
                    </span>
                    <h3 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--color-gold, #d6be66)', margin: '2px 0 0 0' }}>
                      ₹ {parseFloat(item.amount || 0).toLocaleString('en-IN')}
                    </h3>
                  </div>

                  <span
                    style={{
                      backgroundColor: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusBorder}`,
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <StatusIcon size={14} />
                    {item.status_text || (isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Verification')}
                  </span>
                </div>

                {utrNumber && (
                  <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontWeight: '600' }}>
                        TRANSACTION UTR / REF NO.
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff', letterSpacing: '0.02em' }}>
                        {utrNumber}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyUtr(utrNumber)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedUtr === utrNumber ? '#34d399' : 'var(--color-gold, #d6be66)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        fontWeight: '700'
                      }}
                    >
                      {copiedUtr === utrNumber ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedUtr === utrNumber ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.55)'
                }}>
                  <span>Date: {formatDisplayDate(item.date || item.txt_date)}</span>
                  {isPending && (
                    <span style={{ color: '#fbbf24', fontStyle: 'italic' }}>
                      ⏳ Admin verification in progress
                    </span>
                  )}
                  {isApproved && (
                    <span style={{ color: '#34d399', fontWeight: '600' }}>
                      ✓ Wallet Credited
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepositRequestStatus;


