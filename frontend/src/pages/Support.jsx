import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PhoneCall, MessageCircle, Headphones, Clock, ShieldCheck, Zap, ExternalLink } from 'lucide-react';
import api from '../utils/api';

const Support = () => {
  const [contact, setContact] = useState({
    mobile: '7309010423',
    whatsapp: '917309010423'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const res = await api.get('/wallet/info');
        if (res.data?.success === '1' && res.data.data) {
          const d = res.data.data;
          setContact({
            mobile: d.admin_mobile || '7309010423',
            whatsapp: d.admin_wp || '917309010423'
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, []);

  // Normalize phone number to prevent double "+91" when Admin adds "+91"
  const formatHelpline = (phone) => {
    if (!phone) return '—';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+91 ${digits.slice(-10)}`;
    }
    const trimmed = String(phone).trim();
    if (trimmed.startsWith('+91')) return trimmed;
    if (trimmed.startsWith('91')) return `+${trimmed}`;
    return `+91 ${trimmed}`;
  };

  const cleanPhoneDigits = (contact.mobile || '').replace(/\D/g, '');
  const tenDigitPhone = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
  const displayPhone = formatHelpline(contact.mobile);
  const callLink = tenDigitPhone ? `tel:+91${tenDigitPhone}` : (cleanPhoneDigits ? `tel:${cleanPhoneDigits}` : '#');

  const cleanWpDigits = (contact.whatsapp || '').replace(/\D/g, '');
  const tenDigitWp = cleanWpDigits.length >= 10 ? cleanWpDigits.slice(-10) : cleanWpDigits;
  const wpLink = tenDigitWp 
    ? `https://wa.me/91${tenDigitWp}?text=${encodeURIComponent('Hello Support, I need assistance.')}` 
    : '#';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 14px 40px' }}>
      {/* Top Header Navigation */}
      <div 
        className="card-glass-v2" 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          marginBottom: '20px',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(214, 190, 102, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              transition: 'all 0.2s ease',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(214, 190, 102, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)',
              border: '1px solid var(--color-gold, #d6be66)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-gold, #d6be66)'
            }}>
              <Headphones size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#ffffff' }}>Customer Support</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>24/7 Dedicated Help Center</p>
            </div>
          </div>
        </div>

        {/* Live Support Online Pulse Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#10b981',
          fontSize: '0.78rem',
          fontWeight: '700'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 10px #10b981'
          }} />
          <span>SUPPORT ONLINE</span>
        </div>
      </div>

      {/* Main Support Hero Banner */}
      <div 
        className="card-glass-v2" 
        style={{
          borderRadius: '24px',
          padding: '32px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '20px',
          border: '1px solid rgba(214, 190, 102, 0.3)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          background: 'linear-gradient(180deg, rgba(13, 22, 36, 0.8) 0%, rgba(9, 18, 31, 0.95) 100%)'
        }}
      >
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(214, 190, 102, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
          border: '2px solid var(--color-gold, #d6be66)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px auto',
          color: 'var(--color-gold, #d6be66)',
          boxShadow: '0 0 30px rgba(214, 190, 102, 0.3)'
        }}>
          <Headphones size={38} />
        </div>

        <h2 style={{ color: '#ffffff', fontWeight: '800', marginBottom: '8px', fontSize: '1.45rem', letterSpacing: '-0.3px' }}>
          How Can We Help You Today?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '26px', maxWidth: '440px', margin: '0 auto 26px auto', lineHeight: '1.5' }}>
          Have a question regarding deposit, withdrawal, or game results? Contact our official support team anytime.
        </p>

        {/* Highlighted Mobile Number Display Card */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1.5px solid var(--color-gold, #ffd700)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.15)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Official Support Helpline
          </span>
          <span style={{
            fontSize: 'clamp(1.25rem, 5vw, 1.7rem)',
            fontWeight: '900',
            color: '#ffd700',
            letterSpacing: '2px',
            textShadow: '0 0 15px rgba(255, 215, 0, 0.6), 0 0 2px #ffffff',
            fontFamily: 'monospace, monospace',
            whiteSpace: 'nowrap'
          }}>
            {displayPhone}
          </span>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Direct Phone Call Button */}
          <a
            href={callLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderRadius: '16px',
              fontSize: '1.05rem',
              fontWeight: '800',
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <PhoneCall size={22} style={{ color: '#60a5fa' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: '600' }}>Direct Call</div>
              <div style={{ color: '#ffffff', fontSize: '1rem' }}>{displayPhone !== '—' ? displayPhone : contact.mobile}</div>
            </div>
          </a>

          {/* WhatsApp Direct Chat Button */}
          <a
            href={wpLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderRadius: '16px',
              fontSize: '1.05rem',
              fontWeight: '800',
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <MessageCircle size={24} style={{ color: '#a7f3d0' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: '600' }}>WhatsApp Support</div>
              <div style={{ color: '#ffffff', fontSize: '1rem' }}>Chat Instantly</div>
            </div>
            <ExternalLink size={16} style={{ marginLeft: 'auto', opacity: 0.7 }} />
          </a>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div className="card-glass-v2" style={{ padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(214, 190, 102, 0.15)', color: 'var(--color-gold, #d6be66)' }}>
            <Clock size={20} />
          </div>
          <div>
            <h5 style={{ margin: 0, color: '#ffffff', fontSize: '0.9rem', fontWeight: '700' }}>24x7 Fast Helpline</h5>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Always open for you</p>
          </div>
        </div>

        <div className="card-glass-v2" style={{ padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Zap size={20} />
          </div>
          <div>
            <h5 style={{ margin: 0, color: '#ffffff', fontSize: '0.9rem', fontWeight: '700' }}>Instant Deposit / Withdraw</h5>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Quick query resolution</p>
          </div>
        </div>

        <div className="card-glass-v2" style={{ padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h5 style={{ margin: 0, color: '#ffffff', fontSize: '0.9rem', fontWeight: '700' }}>100% Safe & Secure</h5>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Official Support Team</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;

