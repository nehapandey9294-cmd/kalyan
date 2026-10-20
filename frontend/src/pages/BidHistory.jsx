import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Calendar, Filter, History } from 'lucide-react';
import api from '../utils/api';
import {
  getISTTodayStr,
  getISTDaysAgoStr,
  getISTThisWeekStartStr,
  getISTThisMonthStartStr,
  formatDisplayDateTime
} from '../utils/indianTime';

const BidHistory = () => {
  const todayStr = getISTTodayStr();
  const [fromDate, setFromDate] = useState(getISTDaysAgoStr(6));
  const [toDate, setToDate] = useState(getISTTodayStr());
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState('0');
  const [loading, setLoading] = useState(true);

  const getBidDetail = (item) => {
    const g = item.game_type;
    const s = item.session;
    const sessLower = String(s || '').trim().toLowerCase();
    const t = [];

    const od = item.open_digit && item.open_digit !== 'NA' && item.open_digit !== 'N/A' ? String(item.open_digit).trim() : '';
    const cd = item.close_digit && item.close_digit !== 'NA' && item.close_digit !== 'N/A' ? String(item.close_digit).trim() : '';
    const op = item.open_pana && item.open_pana !== 'NA' && item.open_pana !== 'N/A' ? String(item.open_pana).trim() : '';
    const cp = item.close_pana && item.close_pana !== 'NA' && item.close_pana !== 'N/A' ? String(item.close_pana).trim() : '';

    if (g === 'Jodi Digit' || g === 'Jodi') {
      let jodiVal = '';
      if (od.length === 2) jodiVal = od;
      else if (cd.length === 2) jodiVal = cd;
      else if (od && cd) jodiVal = `${od}${cd}`;
      else if (od) jodiVal = od;
      else if (cd) jodiVal = cd;

      if (jodiVal) {
        t.push(`Jodi: ${jodiVal}`);
      } else {
        t.push(`Open: ${od || '-'}, Close: ${cd || '-'}`);
      }
    } else if (g === 'Half Sangam') {
      const hs = [];
      if (od) hs.push(`Open Digit: ${od}`);
      if (cp) hs.push(`Close Pana: ${cp}`);
      if (op) hs.push(`Open Pana: ${op}`);
      if (cd) hs.push(`Close Digit: ${cd}`);
      if (hs.length) {
        t.push(hs.join(' | '));
      } else {
        t.push('Half Sangam');
      }
    } else if (g === 'Full Sangam') {
      const fs = [];
      if (op) fs.push(`Open Pana: ${op}`);
      if (cp) fs.push(`Close Pana: ${cp}`);
      if (fs.length) {
        t.push(fs.join(' | '));
      } else {
        t.push(`Open: ${op || '-'}, Close: ${cp || '-'}`);
      }
    } else if (g === 'Single Digit') {
      if (sessLower === 'open' && od) t.push(`Open Digit: ${od}`);
      else if (sessLower === 'close' && cd) t.push(`Close Digit: ${cd}`);
      else if (od) t.push(`Open Digit: ${od}`);
      else if (cd) t.push(`Close Digit: ${cd}`);
    } else if (g === 'Single Pana' || g === 'Double Pana' || g === 'Triple Pana') {
      if (sessLower === 'open' && op) t.push(`Open Pana: ${op}`);
      else if (sessLower === 'close' && cp) t.push(`Close Pana: ${cp}`);
      else if (op) t.push(`Open Pana: ${op}`);
      else if (cp) t.push(`Close Pana: ${cp}`);
    } else if (g === 'SP Motor' || g === 'DP Motor') {
      const m = [];
      if (op) m.push(`Open Pana: ${op}`);
      if (od) m.push(`Open Digit: ${od}`);
      if (cp) m.push(`Close Pana: ${cp}`);
      if (cd) m.push(`Close Digit: ${cd}`);
      if (m.length) t.push(m.join(' | '));
    } else {
      if (op) t.push(`OP: ${op}`);
      if (od) t.push(`OD: ${od}`);
      if (cp) t.push(`CP: ${cp}`);
      if (cd) t.push(`CD: ${cd}`);
    }

    return t.length ? t.join(' • ') : (g && s ? `${g} (${s})` : (g || ''));
  };

  const fetchHistory = async (d1 = fromDate, d2 = toDate) => {
    setLoading(true);
    try {
      const [bidRes, walRes] = await Promise.all([
        api.get(`/games/bid-history?date1=${d1}&date2=${d2}`),
        api.get('/wallet/info')
      ]);

      if (bidRes.data.success === '1') {
        setHistory(bidRes.data.result || bidRes.data.data || []);
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
          <span style={{ fontWeight: '800', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Bidding History</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.95rem' }}>
          <Wallet size={18} />
          <span>₹ {wallet}</span>
        </div>
      </div>

      {/* Date Filter Box */}
      <div className="card-glass-v2" style={{ marginBottom: '20px', padding: '18px' }}>
        <form onSubmit={handleApply}>
          {/* Quick Date Range Presets */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              Quick Presets
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const t = getISTTodayStr();
                  setFromDate(t);
                  setToDate(t);
                  fetchHistory(t, t);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(214,190,102,0.3)',
                  background: fromDate === todayStr && toDate === todayStr ? 'var(--color-gold, #d6be66)' : 'rgba(255,255,255,0.06)',
                  color: fromDate === todayStr && toDate === todayStr ? '#0b1a30' : '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => {
                  const y = getISTDaysAgoStr(1);
                  setFromDate(y);
                  setToDate(y);
                  fetchHistory(y, y);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Yesterday
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstDay = getISTThisWeekStartStr();
                  const today = getISTTodayStr();
                  setFromDate(firstDay);
                  setToDate(today);
                  fetchHistory(firstDay, today);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                This Week
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstDay = getISTThisMonthStartStr();
                  const today = getISTTodayStr();
                  setFromDate(firstDay);
                  setToDate(today);
                  fetchHistory(firstDay, today);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                This Month
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                <Calendar size={15} style={{ color: 'var(--color-gold, #d6be66)' }} /> From Date
              </label>
              <input
                type="date"
                className="form-input dark-date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem' }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                <Calendar size={15} style={{ color: 'var(--color-gold, #d6be66)' }} /> To Date
              </label>
              <input
                type="date"
                className="form-input dark-date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              className="btn-gold"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '0.88rem'
              }}
            >
              <Filter size={15} /> Apply Filter
            </button>
            <button
              type="button"
              onClick={() => {
                const t = getISTTodayStr();
                const past = getISTDaysAgoStr(6);
                setFromDate(past);
                setToDate(t);
                fetchHistory(past, t);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
        <History size={18} style={{ color: 'var(--color-gold, #d6be66)' }} />
        <h4 style={{ color: 'var(--color-gold, #d6be66)', fontWeight: '800', fontSize: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
          Recent Bidding Records
        </h4>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>Loading bid history...</div>
      ) : history.length === 0 ? (
        <div className="card-glass-v2" style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
          No bid history found for selected date range.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((item, idx) => {
            const detail = getBidDetail(item);
            return (
              <div
                key={item.id || idx}
                className="card-glass-v2"
                style={{ padding: '16px', borderLeft: '4px solid var(--color-gold, #d6be66)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '10px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>
                    {item.game_name || '-'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: '500' }}>
                      {formatDisplayDateTime(item.date, item.time)}
                    </span>
                    <span className="badge-open-v2" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                      {(item.game_type === 'Jodi Digit' || item.game_type === 'Jodi')
                        ? 'Jodi'
                        : (item.game_type === 'Half Sangam' || item.game_type === 'Full Sangam')
                          ? 'Sangam'
                          : (item.session || '-')}
                    </span>
                  </div>
                </div>

                {detail && (
                  <div style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-gold, #d6be66)',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontWeight: '600'
                  }}>
                    {detail}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>
                    {item.game_type || '-'}
                  </span>
                  <span style={{
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    color: 'var(--color-gold, #d6be66)',
                    padding: '4px 12px',
                    background: 'rgba(214, 190, 102, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(214, 190, 102, 0.3)'
                  }}>
                    {item.points_action || '0'} Points
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BidHistory;
