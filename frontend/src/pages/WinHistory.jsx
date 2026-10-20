import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Calendar, Filter, Trophy, CheckCircle2, Sparkles } from 'lucide-react';
import api from '../utils/api';
import { 
  getISTTodayStr, 
  getISTDaysAgoStr, 
  getISTThisWeekStartStr, 
  getISTThisMonthStartStr, 
  formatDisplayDate 
} from '../utils/indianTime';

const WinHistory = () => {
  const [fromDate, setFromDate] = useState(getISTDaysAgoStr(6));
  const [toDate, setToDate] = useState(getISTTodayStr());
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState('0');
  const [loading, setLoading] = useState(true);

  const todayStr = getISTTodayStr();

  const fetchHistory = async (d1 = fromDate, d2 = toDate) => {
    setLoading(true);
    try {
      const [winRes, walRes] = await Promise.all([
        api.get(`/games/win-history?date1=${d1}&date2=${d2}`),
        api.get('/wallet/info')
      ]);

      if (winRes.data.success === '1') {
        setHistory(winRes.data.result || winRes.data.data || []);
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
    if (e) e.preventDefault();
    fetchHistory(fromDate, toDate);
  };

  const getWinDetail = (item) => {
    const g = item.game_type;
    const od = item.open_digit && item.open_digit !== 'NA' && item.open_digit !== 'N/A' ? String(item.open_digit).trim() : '';
    const cd = item.close_digit && item.close_digit !== 'NA' && item.close_digit !== 'N/A' ? String(item.close_digit).trim() : '';
    const op = item.open_pana && item.open_pana !== 'NA' && item.open_pana !== 'N/A' ? String(item.open_pana).trim() : '';
    const cp = item.close_pana && item.close_pana !== 'NA' && item.close_pana !== 'N/A' ? String(item.close_pana).trim() : '';

    if (g === 'Jodi Digit' || g === 'Jodi') {
      if (od.length === 2) return `Jodi: ${od}`;
      if (cd.length === 2) return `Jodi: ${cd}`;
      if (od && cd) return `Jodi: ${od}${cd}`;
      if (od || cd) return `Jodi: ${od || cd}`;
    }

    if (g === 'Half Sangam') {
      const parts = [];
      if (od) parts.push(`Open Digit: ${od}`);
      if (cp) parts.push(`Close Pana: ${cp}`);
      if (op) parts.push(`Open Pana: ${op}`);
      if (cd) parts.push(`Close Digit: ${cd}`);
      if (parts.length) return parts.join(' | ');
    }

    if (g === 'Full Sangam') {
      const parts = [];
      if (op) parts.push(`Open Pana: ${op}`);
      if (cp) parts.push(`Close Pana: ${cp}`);
      if (parts.length) return parts.join(' | ');
    }

    const parts = [];
    if (op) parts.push(`Open Pana: ${op}`);
    if (od) parts.push(`Open Digit: ${od}`);
    if (cp) parts.push(`Close Pana: ${cp}`);
    if (cd) parts.push(`Close Digit: ${cd}`);
    return parts.join(' | ');
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '16px 14px 40px' }}>
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
            <Trophy size={20} style={{ color: 'var(--color-gold)' }} />
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#fff' }}>Winning History</span>
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
          {/* Quick Date Chips */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={14} style={{ color: 'var(--color-gold, #d6be66)' }} />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Quick Date Filters</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
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
                  border: fromDate === todayStr && toDate === todayStr ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  background: fromDate === todayStr && toDate === todayStr ? 'var(--color-gold, #d6be66)' : 'rgba(255,255,255,0.06)',
                  color: fromDate === todayStr && toDate === todayStr ? '#0b1a30' : '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
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
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
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
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
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
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                This Month
              </button>
            </div>
          </div>

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
        Recent Winning Records
      </p>

      {/* Quick Filter Buttons & Summary */}
      {history.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '14px',
          marginBottom: '16px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} color="#10b981" />
            <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#ffffff' }}>
              Total Wins: <strong style={{ color: '#10b981' }}>{history.length}</strong>
            </span>
          </div>
          <div style={{ fontSize: '0.96rem', fontWeight: '900', color: '#10b981', whiteSpace: 'nowrap' }}>
            +₹{history.reduce((sum, item) => sum + (parseFloat(item.winning_points) || 0), 0).toLocaleString('en-IN')}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.7)' }}>Loading winning records...</div>
      ) : history.length === 0 ? (
        <div className="card-glass-v2" style={{
          borderRadius: '16px',
          padding: '36px 20px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)'
        }}>
          <Trophy size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <div>No winning records found in this date range.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((item, idx) => {
            const detail = getWinDetail(item);

            return (
              <div
                key={item.id || idx}
                className="card-glass-v2"
                style={{
                  borderRadius: '16px',
                  padding: '14px 16px',
                  borderLeft: '4px solid #10b981',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                }}
              >
                {/* Top Row: Game Name, Type, Date & Session */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{
                      margin: 0,
                      fontWeight: '800',
                      color: '#ffffff',
                      fontSize: '1.02rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.game_name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-gold, #d6be66)',
                        fontWeight: '700'
                      }}>
                        {item.game_type}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>•</span>
                      <span style={{
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.6)',
                        fontWeight: '600'
                      }}>
                        Bid #{item.bid_id || idx + 1}
                      </span>
                    </div>
                  </div>

                  {/* Top Right: Date & Session Pill */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {item.date && (
                      <span style={{
                        fontSize: '0.74rem',
                        color: 'rgba(255,255,255,0.65)',
                        fontWeight: '600',
                        display: 'block',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatDisplayDate(item.date)}
                      </span>
                    )}
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(214, 190, 102, 0.12)',
                      color: 'var(--color-gold, #d6be66)',
                      border: '1px solid rgba(214, 190, 102, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      marginTop: '3px',
                      whiteSpace: 'nowrap'
                    }}>
                      {(item.game_type === 'Jodi Digit' || item.game_type === 'Jodi')
                        ? 'Jodi'
                        : (item.game_type === 'Half Sangam' || item.game_type === 'Full Sangam')
                          ? 'Sangam'
                          : (item.session || 'Open')}
                    </span>
                  </div>
                </div>

                {/* Middle: Number / Pana Details */}
                {detail && (
                  <div style={{
                    fontSize: '0.82rem',
                    color: '#f1f5f9',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ color: 'var(--color-gold, #d6be66)', fontSize: '0.75rem', fontWeight: '800' }}>
                      WIN DETAIL:
                    </span>
                    <span style={{ letterSpacing: '0.02em', color: '#ffffff' }}>
                      {detail}
                    </span>
                  </div>
                )}

                {/* Bottom Row: Won Banner + Bet Amount */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {/* Left: Won Badge + Amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      flexShrink: 0
                    }}>
                      <CheckCircle2 size={13} />
                      <span>WON</span>
                    </div>
                    <span style={{
                      color: '#10b981',
                      fontWeight: '900',
                      fontSize: '1.32rem',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.02em'
                    }}>
                      +₹{item.winning_points || '0'}
                    </span>
                  </div>

                  {/* Right: Bet Points */}
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.65)',
                    whiteSpace: 'nowrap'
                  }}>
                    Bet: <strong style={{ color: '#ffffff', fontWeight: '800' }}>₹{item.points_action || item.points || '0'}</strong>
                  </div>
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

export default WinHistory;

