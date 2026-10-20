import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, BarChart3, PlusCircle, ArrowUpRight, Trophy, Percent, Megaphone, Clock, Sparkles, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import api from '../utils/api';

const Dashboard = () => {
  const [games, setGames] = useState([]);
  const [alertMsg, setAlertMsg] = useState('Welcome to Lucky! Place your bets wisely.');
  const [sliderStatus, setSliderStatus] = useState('1');
  const [sliders, setSliders] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [gamesRes, walletRes, appRes] = await Promise.all([
        api.get('/games').catch(() => null),
        api.get('/wallet/info').catch(() => null),
        api.get('/app-info').catch(() => null)
      ]);

      if (gamesRes?.data?.result) {
        setGames(gamesRes.data.result);
      }

      if (appRes?.data?.data) {
        setSliderStatus(appRes.data.data.slider_status ?? '1');
        if (Array.isArray(appRes.data.data.sliders) && appRes.data.data.sliders.length > 0) {
          setSliders(appRes.data.data.sliders);
        }
      }

      const walletAlert = walletRes?.data?.data?.alert_message;
      const appAlert = appRes?.data?.data?.alert_message;
      const msg = walletAlert || appAlert || '';
      if (msg) {
        setAlertMsg(msg);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);

    const handleAppRefresh = () => {
      loadData();
    };
    window.addEventListener('app_refresh', handleAppRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app_refresh', handleAppRefresh);
    };
  }, []);

  // Auto-play slider carousel every 4 seconds
  useEffect(() => {
    if (sliderStatus === '1' && sliders.length > 1) {
      const slideTimer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % sliders.length);
      }, 4000);
      return () => clearInterval(slideTimer);
    }
  }, [sliderStatus, sliders.length]);

  const cleanTimeToToday = (timeStr) => {
    if (!timeStr) return null;
    const clean = String(timeStr).trim().toLowerCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[4];
    if (modifier === 'pm' && hours < 12) hours += 12;
    else if (modifier === 'am' && hours === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const isMarketOpen = (g) => {
    try {
      if (!g) return false;
      if (g.is_running !== undefined) {
        return !!g.is_running;
      }
      if (g.game_status !== undefined && String(g.game_status) === '0') {
        return false;
      }

      const now = new Date();
      const closeTime = cleanTimeToToday(g.close_time);
      if (!closeTime) return false;

      const openTime = cleanTimeToToday(g.open_time);
      if (openTime && closeTime.getTime() <= openTime.getTime()) {
        if (now.getTime() >= openTime.getTime()) {
          closeTime.setDate(closeTime.getDate() + 1);
        } else if (now.getTime() <= closeTime.getTime()) {
          // overnight session past midnight
        } else {
          closeTime.setDate(closeTime.getDate() + 1);
        }
      }

      return now.getTime() <= closeTime.getTime();
    } catch (e) {
      return false;
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 16px 32px' }}>
      {/* Marquee Notice Banner */}
      {alertMsg && (
        <div style={{
          backgroundColor: 'rgba(13, 22, 36, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '10px 16px',
          marginBottom: '20px',
          border: '1px solid rgba(214, 190, 102, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 15px rgba(214, 190, 102, 0.15)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(214, 190, 102, 0.15)',
            border: '1px solid rgba(214, 190, 102, 0.35)',
            padding: '6px 12px',
            borderRadius: '10px',
            flexShrink: 0
          }}>
            <Megaphone size={18} style={{ color: 'var(--color-gold, #d6be66)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--color-gold, #d6be66)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              NOTICE
            </span>
          </div>

          <marquee style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.92rem', verticalAlign: 'middle' }}>
            <span style={{ color: 'var(--color-gold, #d6be66)', fontWeight: '700', marginRight: '8px' }}>★</span>
            {alertMsg}
          </marquee>
        </div>
      )}

      {/* Multiple Image Slider Carousel Banner */}
      {sliderStatus === '1' && sliders.length > 0 && (
        <div style={{
          position: 'relative',
          width: '100%',
          borderRadius: '20px',
          overflow: 'hidden',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          border: '1px solid rgba(214, 190, 102, 0.25)',
          backgroundColor: '#0d192b'
        }}>
          <div style={{
            display: 'flex',
            transition: 'transform 0.5s ease-in-out',
            transform: `translateX(-${currentSlide * 100}%)`,
            width: '100%'
          }}>
            {sliders.map((img, idx) => {
              const src = img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')
                ? img
                : (img.startsWith('/') ? img : `/uploads/${img}`);

              return (
                <div key={idx} style={{ minWidth: '100%', flexShrink: 0, height: '180px', position: 'relative' }}>
                  <img
                    src={src}
                    alt={`Banner ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    onError={(e) => {
                      if (!e.target.dataset.fallbackTried && !img.startsWith('http') && !img.startsWith('data:')) {
                        e.target.dataset.fallbackTried = 'true';
                        e.target.src = `/${img.replace(/^\//, '')}`;
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Prev/Next Controls */}
          {sliders.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentSlide(prev => (prev - 1 + sliders.length) % sliders.length)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10px',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide(prev => (prev + 1) % sliders.length)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '10px',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2
                }}
              >
                <ChevronRight size={20} />
              </button>

              {/* Dot Indicators */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
                zIndex: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                padding: '4px 10px',
                borderRadius: '12px',
                backdropFilter: 'blur(4px)'
              }}>
                {sliders.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentSlide(i)}
                    style={{
                      width: currentSlide === i ? '18px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: currentSlide === i ? 'var(--color-gold, #d6be66)' : 'rgba(255, 255, 255, 0.5)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Action Shortcut Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <Link to="/add-fund" className="quick-action-pill">
          <PlusCircle size={18} style={{ color: '#34d399' }} />
          <span>Add Points</span>
        </Link>
        <Link to="/withdraw" className="quick-action-pill">
          <ArrowUpRight size={18} style={{ color: '#fb7185' }} />
          <span>Withdraw</span>
        </Link>
        <Link to="/win-history" className="quick-action-pill">
          <Trophy size={18} style={{ color: '#fbbf24' }} />
          <span>Win History</span>
        </Link>
        <Link to="/game-rate" className="quick-action-pill">
          <Percent size={18} style={{ color: '#38bdf8' }} />
          <span>Game Rates</span>
        </Link>
        {/* <Link to="/how-to-play" className="quick-action-pill">
          <HelpCircle size={18} style={{ color: '#a855f7' }} />
          <span>How To Play</span>
        </Link> */}
      </div>

      {/* Markets Section Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h4 style={{
          color: '#ffffff',
          fontWeight: '800',
          fontSize: '1.25rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={20} style={{ color: 'var(--color-gold, #d6be66)' }} /> Live Game Markets
        </h4>
        <span className="badge-open-v2">
          ● Active Today
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255, 255, 255, 0.7)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading live markets...
        </div>
      ) : games.length === 0 ? (
        <div className="card-glass-v2" style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.7)' }}>
          No active games found for today.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {games.map((g) => {
            const open = isMarketOpen(g);
            return (
              <div
                key={g.id || g.games_name}
                className="game-card-v2"
                style={{ padding: '12px 14px', borderRadius: '16px' }}
              >
                {/* Top Row: Game Name & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: '800',
                    margin: 0,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase'
                  }}>
                    {g.games_name}
                  </h4>
                  <span className={open ? 'badge-open-v2' : 'badge-closed-v2'} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                    {open ? '● Open' : '✕ Closed'}
                  </span>
                </div>

                {/* Middle Row: Result & Timings (Combined Compact Box) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  {/* Left: Result */}
                  <div>
                    <span style={{ fontSize: '0.64rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontWeight: '600', display: 'block', lineHeight: 1 }}>
                      Result
                    </span>
                    <span style={{
                      fontSize: '1.15rem',
                      fontWeight: '800',
                      color: 'var(--color-gold, #d6be66)',
                      letterSpacing: '1.5px',
                      fontFamily: 'monospace',
                      marginTop: '2px',
                      display: 'inline-block'
                    }}>
                      {g.open_pana || '***'}-{(g.open_digit || '*') + (g.close_digit || '*')}-{g.close_pana || '***'}
                    </span>
                  </div>

                  {/* Right: Timings */}
                  <div style={{ textAlign: 'right', fontSize: '0.74rem' }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.64rem', fontWeight: '600', marginRight: '4px' }}>OPEN:</span>
                      <strong>{g.open_time}</strong>
                    </div>
                    <div style={{ color: 'var(--color-gold, #d6be66)', marginTop: '2px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.64rem', fontWeight: '600', marginRight: '4px' }}>CLOSE:</span>
                      <strong>{g.close_time}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Chart Link & Play Action */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Link
                    to={`/chart?game=${encodeURIComponent(g.games_name)}`}
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <BarChart3 size={14} style={{ color: 'var(--color-gold, #d6be66)' }} />
                    <span>Chart</span>
                  </Link>

                  {open ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/game-types?game=${encodeURIComponent(g.games_name)}&openTime=${encodeURIComponent(g.open_time || '')}&closeTime=${encodeURIComponent(g.close_time || '')}`)}
                      style={{
                        background: 'var(--app-gradient-primary, linear-gradient(135deg, #d6be66 0%, #10b981 100%))',
                        color: '#0b1a30',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Play size={14} fill="#0b1a30" />
                      <span>Play Now</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'rgba(255, 255, 255, 0.35)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontWeight: '600',
                        fontSize: '0.78rem',
                        cursor: 'not-allowed'
                      }}
                    >
                      Closed
                    </button>
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

export default Dashboard;
