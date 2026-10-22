import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, AlertCircle, Clock } from 'lucide-react';
import api from '../utils/api';

// Pixel-perfect SVG icons matching the reference screenshot
const SingleDieIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
  </svg>
);

const DoubleDiceIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="8" width="13" height="13" rx="3" />
    <circle cx="6" cy="12" r="1.3" fill="currentColor" />
    <circle cx="11" cy="17" r="1.3" fill="currentColor" />
    <path d="M7 8V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" />
    <circle cx="16" cy="7.5" r="1.3" fill="currentColor" />
    <circle cx="16" cy="13.5" r="1.3" fill="currentColor" />
  </svg>
);

const SingleCardIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="3" />
    <path d="M12 6.5c-1.6 2.2-3.2 3.2-3.2 4.8a3.2 3.2 0 0 0 5.4 2.2L12 17.5l-2.2-4a3.2 3.2 0 0 0 5.4-2.2c0-1.6-1.6-2.6-3.2-4.8z" fill="currentColor" />
  </svg>
);

const DoubleCardIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="5" width="13" height="17" rx="2.5" />
    <path d="M4 17V4a2 2 0 0 1 2-2h11" />
    <circle cx="13.5" cy="13.5" r="3" fill="currentColor" />
  </svg>
);

const TripleCardIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 21L2 8a2 2 0 0 1 1.5-2.4l5.2-1.3a2 2 0 0 1 2.4 1.5L14 18" />
    <rect x="8" y="4" width="8" height="17" rx="2" />
    <path d="M19.5 21l2.5-13a2 2 0 0 0-1.5-2.4l-5.2-1.3a2 2 0 0 0-2.4 1.5L10 18" />
  </svg>
);

const HalfSangamIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2" />
    <circle cx="8" cy="7.5" r="1.8" fill="currentColor" />
    <path d="M13.5 15h4v3.5h-4z" fill="currentColor" />
  </svg>
);

const FullSangamIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7l1.5 3.5H17l-3 2.5 1.2 3.8-3.2-2.3-3.2 2.3 1.2-3.8-3-2.5h3.5z" fill="currentColor" />
  </svg>
);

const MotorIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const GAME_TYPE_CARDS = [
  { id: 'single_digits', title: 'Single Digits', targetType: 'Single Digit', rateKey: 'Single Digit', icon: SingleDieIcon },
  { id: 'single_digits_bulk', title: 'Single Digits Bulk', targetType: 'Single Digit Bulk', rateKey: 'Single Digit', icon: SingleDieIcon },
  { id: 'jodi', title: 'Jodi', targetType: 'Jodi', rateKey: 'Jodi Digit', icon: DoubleDiceIcon, openOnly: true },
  { id: 'jodi_bulk', title: 'Jodi Bulk', targetType: 'Jodi Bulk', rateKey: 'Jodi Digit', icon: DoubleDiceIcon, openOnly: true },
  { id: 'single_pana', title: 'Single Pana', targetType: 'Single Pana', rateKey: 'Single Pana', icon: SingleCardIcon },
  { id: 'single_pana_bulk', title: 'Single Pana Bulk', targetType: 'Single Pana Bulk', rateKey: 'Single Pana', icon: SingleCardIcon },
  { id: 'double_pana', title: 'Double Pana', targetType: 'Double Pana', rateKey: 'Double Pana', icon: DoubleCardIcon },
  { id: 'double_pana_bulk', title: 'Double Pana Bulk', targetType: 'Double Pana Bulk', rateKey: 'Double Pana', icon: DoubleCardIcon },
  { id: 'triple_pana', title: 'Triple Pana', targetType: 'Triple Pana', rateKey: 'Triple Pana', icon: TripleCardIcon },
  { id: 'half_sangam', title: 'Half Sangam', targetType: 'Half Sangam', rateKey: 'Half Sangam', icon: HalfSangamIcon, openOnly: true },
  { id: 'full_sangam', title: 'Full Sangam', targetType: 'Full Sangam', rateKey: 'Full Sangam', icon: FullSangamIcon, openOnly: true },
  { id: 'sp_motor', title: 'SP Motor', targetType: 'SP Motor', rateKey: 'Single Pana', icon: MotorIcon },
  { id: 'dp_motor', title: 'DP Motor', targetType: 'DP Motor', rateKey: 'Double Pana', icon: MotorIcon },
  { id: 'odd_even', title: 'Odd Even', targetType: 'Odd Even', rateKey: 'Single Digit', icon: SingleDieIcon },
  { id: 'red_bracket', title: 'Red Bracket', targetType: 'Red Bracket', rateKey: 'Jodi Digit', icon: DoubleDiceIcon, openOnly: true },
  { id: 'group_jodi', title: 'Group Jodi', targetType: 'Group Jodi', rateKey: 'Jodi Digit', icon: DoubleDiceIcon, openOnly: true },
  { id: 'sp_dp_tp', title: 'SP DP TP', targetType: 'SP DP TP', rateKey: 'Single Pana', icon: SingleCardIcon }
];

const GameTypes = () => {
  const [searchParams] = useSearchParams();
  const rawGameName = searchParams.get('game') || searchParams.get('name') || '';
  const gameName = rawGameName.trim();
  const openTime = searchParams.get('openTime') || '';
  const closeTime = searchParams.get('closeTime') || '';
  const navigate = useNavigate();

  const [wallet, setWallet] = useState('0');
  const [rates, setRates] = useState([]);
  const [marketStatus, setMarketStatus] = useState({
    isOpen: true,
    isOpenSession: true,
    isClosed: false
  });
  const [warningMsg, setWarningMsg] = useState('');

  const cleanTimeToToday = (timeStr, refDate = new Date()) => {
    if (!timeStr) return null;
    const clean = String(timeStr).trim().toLowerCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[4];
    if (modifier === 'pm' && hours < 12) hours += 12;
    else if (modifier === 'am' && hours === 12) hours = 0;
    const d = new Date(refDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const evaluateMarket = (g) => {
    if (g && g.is_running !== undefined && g.is_open_session !== undefined) {
      const isRunning = !!g.is_running;
      const isOpenActive = isRunning && !!g.is_open_session;
      setMarketStatus({
        isOpen: isRunning,
        isOpenSession: isOpenActive,
        isClosed: !isRunning
      });
      return;
    }

    const oTime = g?.open_time || openTime;
    const cTime = g?.close_time || closeTime;

    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const openTimeObj = cleanTimeToToday(oTime, nowIST);
    const closeTimeObj = cleanTimeToToday(cTime, nowIST);

    if (openTimeObj && closeTimeObj && closeTimeObj.getTime() <= openTimeObj.getTime()) {
      if (nowIST.getTime() >= openTimeObj.getTime()) {
        closeTimeObj.setDate(closeTimeObj.getDate() + 1);
      } else {
        const tempClose = new Date(closeTimeObj);
        if (nowIST.getTime() <= tempClose.getTime()) {
          openTimeObj.setDate(openTimeObj.getDate() - 1);
          closeTimeObj.setTime(tempClose.getTime());
        } else {
          closeTimeObj.setDate(closeTimeObj.getDate() + 1);
        }
      }
    }

    const isGameEnabled = g?.game_status === undefined || String(g.game_status) !== '0';
    const isRunning = isGameEnabled && (closeTimeObj ? nowIST.getTime() <= closeTimeObj.getTime() : true);
    const isOpenActive = isRunning && (openTimeObj ? nowIST.getTime() < openTimeObj.getTime() : true);

    setMarketStatus({
      isOpen: isRunning,
      isOpenSession: isOpenActive,
      isClosed: !isRunning
    });
  };

  const loadData = async () => {
    try {
      const [walletRes, ratesRes, gamesRes] = await Promise.all([
        api.get('/wallet/info').catch(() => null),
        api.get('/games/rates').catch(() => null),
        api.get('/games').catch(() => null)
      ]);

      if (walletRes?.data?.success === '1' && walletRes.data.data) {
        setWallet(walletRes.data.data.wallet || '0');
      }

      if (ratesRes?.data?.success === '1') {
        setRates(ratesRes.data.data || []);
      }

      const allGames = gamesRes?.data?.result || [];
      const currentG = allGames.find(g =>
        (g.games_name && g.games_name.trim().toLowerCase() === gameName.toLowerCase()) ||
        (g.game && g.game.trim().toLowerCase() === gameName.toLowerCase())
      );

      if (currentG) {
        evaluateMarket(currentG);
      } else {
        evaluateMarket(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!gameName) {
      navigate('/', { replace: true });
      return;
    }
    loadData();
  }, [gameName]);

  const getRateValue = (type) => {
    const rate = rates.find(r => r.type === type);
    return rate ? `${rate.min_value}:${rate.max_value}` : '';
  };

  const handleCardClick = (card) => {
    if (marketStatus.isClosed) {
      setWarningMsg(`Market is closed for ${gameName} today.`);
      return;
    }

    if (card.openOnly && !marketStatus.isOpenSession) {
      setWarningMsg(`${card.title} is closed because Open market time has ended.`);
      return;
    }

    navigate(
      `/play-game?game=${encodeURIComponent(gameName)}&type=${encodeURIComponent(card.targetType)}&openTime=${encodeURIComponent(openTime)}&closeTime=${encodeURIComponent(closeTime)}`
    );
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 14px 40px' }}>
      {/* Top Header Bar matching the reference screenshot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
        padding: '14px 18px',
        borderRadius: '16px',
        marginBottom: '20px',
        color: '#0b1a30',
        boxShadow: '0 8px 24px rgba(251, 140, 0, 0.35)',
        position: 'sticky',
        top: '10px',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              color: '#0b1a30',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <span style={{
            fontWeight: '900',
            fontSize: '1.15rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#0b1a30'
          }}>
            {gameName}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: '900',
          fontSize: '1.05rem',
          color: '#0b1a30',
          background: 'rgba(255, 255, 255, 0.25)',
          padding: '6px 14px',
          borderRadius: '20px'
        }}>
          <Wallet size={19} strokeWidth={2.5} />
          <span>₹ {wallet}</span>
        </div>
      </div>

      {/* Market Timing Notice */}
      {(openTime || closeTime) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '0.82rem',
          color: 'rgba(255, 255, 255, 0.85)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} style={{ color: '#ffa726' }} />
            <span>Open: <strong>{openTime || '-'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Close: <strong>{closeTime || '-'}</strong></span>
          </div>
        </div>
      )}

      {/* Closed Warnings */}
      {marketStatus.isClosed && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.18)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          color: '#fca5a5',
          fontSize: '0.88rem',
          fontWeight: '700',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={20} />
          <span>Market Closed for {gameName} today.</span>
        </div>
      )}

      {!marketStatus.isClosed && !marketStatus.isOpenSession && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '12px',
          color: '#fcd34d',
          fontSize: '0.82rem',
          fontWeight: '600',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} />
          <span>Open market closed. Only Close session games are active. Jodi & Sangam are closed.</span>
        </div>
      )}

      {warningMsg && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          color: '#f87171',
          fontSize: '0.82rem',
          fontWeight: '700',
          marginBottom: '18px',
          textAlign: 'center'
        }}>
          {warningMsg}
        </div>
      )}

      {/* 3-Column Grid of Game Types Cards (Parity with provided screenshot) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px'
      }}>
        {GAME_TYPE_CARDS.map(card => {
          const isCardClosed = marketStatus.isClosed || (card.openOnly && !marketStatus.isOpenSession);
          const rateVal = getRateValue(card.rateKey);
          const IconComp = card.icon;

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '20px 8px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isCardClosed
                  ? '0 3px 10px rgba(0, 0, 0, 0.04)'
                  : '0 8px 22px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                cursor: isCardClosed ? 'not-allowed' : 'pointer',
                opacity: isCardClosed ? 0.45 : 1,
                transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                position: 'relative',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isCardClosed) {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(245, 124, 0, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isCardClosed
                  ? '0 3px 10px rgba(0, 0, 0, 0.04)'
                  : '0 8px 22px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0,0,0,0.04)';
              }}
            >
              {/* Circular Orange Icon Container */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: isCardClosed
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #ffa726 0%, #f57c00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: isCardClosed
                  ? 'none'
                  : '0 6px 16px rgba(245, 124, 0, 0.38)',
                marginBottom: '12px'
              }}>
                <IconComp />
              </div>

              {/* Title */}
              <span style={{
                fontSize: '0.84rem',
                fontWeight: '700',
                color: '#1e293b',
                textAlign: 'center',
                lineHeight: '1.25',
                minHeight: '2.4em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {card.title}
              </span>

              {/* Rate / Status Tag */}
              {isCardClosed ? (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: '800',
                  color: '#ef4444',
                  marginTop: '4px',
                  textTransform: 'uppercase'
                }}>
                  Closed
                </span>
              ) : rateVal ? (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  color: '#f57c00',
                  marginTop: '4px'
                }}>
                  {rateVal}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameTypes;
