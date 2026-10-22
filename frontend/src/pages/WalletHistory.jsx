import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Calendar, Filter, History, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { getISTTodayStr, getISTDaysAgoStr, formatDisplayDateTime, parseDateTimeToEpoch } from '../utils/indianTime';

const WalletHistory = () => {
  const [fromDate, setFromDate] = useState(getISTDaysAgoStr(6));
  const [toDate, setToDate] = useState(getISTTodayStr());
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState('0');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async (d1 = fromDate, d2 = toDate) => {
    setLoading(true);
    try {
      const [histRes, walRes] = await Promise.all([
        api.get(`/wallet/history?date1=${d1}&date2=${d2}`),
        api.get('/wallet/info')
      ]);

      if (histRes.data.success === '1') {
        const rawHistory = histRes.data.result || histRes.data.data || [];
        // Ensure proper chronological sorting: newest first (by id DESC or parsed timestamp DESC)
        const sorted = [...rawHistory].sort((a, b) => {
          const idA = Number(a.id);
          const idB = Number(b.id);
          if (!isNaN(idA) && !isNaN(idB) && idA > 0 && idB > 0 && idA !== idB) {
            return idB - idA;
          }
          return parseDateTimeToEpoch(b.date, b.time) - parseDateTimeToEpoch(a.date, a.time);
        });
        setHistory(sorted);
      }
      if (walRes.data.success === '1') {
        setWallet(walRes.data.data?.wallet || '0');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleApply = (e) => {
    e.preventDefault();
    fetchHistory(fromDate, toDate);
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '16px 14px' }}>
      {/* Top Header */}
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
            <History size={20} style={{ color: 'var(--color-gold)' }} />
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#fff' }}>Wallet History</span>
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
                style={inputStyle}
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
                style={inputStyle}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-gradient"
            style={{
              width: '100%',
              padding: '11px',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Filter size={16} />
            Apply Filter
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.5px', marginBottom: '14px' }}>
        Recent Transactions
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.7)' }}>Loading transactions...</div>
      ) : history.length === 0 ? (
        <div className="card-glass-v2" style={{
          borderRadius: '16px',
          padding: '36px 20px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)'
        }}>
          <History size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <div>No transactions found in this date range.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((item, idx) => {
            const isDebit = String(item.amount || '').trim().startsWith('-') ||
              String(item.status || '') === '0' ||
              /deduct|debit|revert|withdraw|bid/i.test(item.remark || '');
            const rawAmt = String(item.amount || '0').replace(/^[+-]/, '').trim();
            const badgeColor = isDebit ? '#ef4444' : '#10b981';

            return (
              <div
                key={item.id || idx}
                className="card-glass-v2"
                style={{
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderLeft: `4px solid ${badgeColor}`
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>
                    {item.remark || 'Transaction'}
                  </p>
                  <h5 style={{ margin: '4px 0 2px 0', color: badgeColor, fontWeight: '800', fontSize: '1.1rem' }}>
                    {isDebit ? `- ₹ ${rawAmt}` : `+ ₹ ${rawAmt}`}
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>
                    {formatDisplayDateTime(item.date, item.time)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: badgeColor,
                    fontWeight: '800',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <CheckCircle2 size={12} />
                    {isDebit ? 'DEBITED' : 'SUCCESSFUL'}
                  </span>
                  {item.updated_amount !== undefined && item.updated_amount !== null && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                      Bal: ₹{item.updated_amount}
                    </p>
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

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.15)',
  backgroundColor: 'rgba(0,0,0,0.25)',
  fontSize: '0.88rem',
  color: '#ffffff',
  boxSizing: 'border-box',
  outline: 'none'
};

export default WalletHistory;

