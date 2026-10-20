import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PlayCircle, BookOpen, CheckCircle2, HelpCircle, ShieldCheck, PhoneCall, MessageCircle, Sparkles } from 'lucide-react';
import api from '../utils/api';

const HowToPlay = () => {
  const [content, setContent] = useState('');
  const [contact, setContact] = useState({ mobile: '', whatsapp: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch public/user settings
        const res = await api.get('/wallet/info').catch(() => null);
        if (res?.data?.success === '1' && res.data.data) {
          const d = res.data.data;
          setContent(d.how_to_play || '');
          setContact({
            mobile: d.admin_mobile || '',
            whatsapp: d.admin_wp || ''
          });
        } else {
          // Fallback to how-to-play public endpoint
          const publicRes = await api.get('/how-to-play').catch(() => null);
          if (publicRes?.data?.content) {
            setContent(publicRes.data.content);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cleanPhone = (contact.mobile || '').replace(/\D/g, '');
  const cleanWp = (contact.whatsapp || '').replace(/\D/g, '');
  const wpLink = cleanWp
    ? `https://wa.me/${cleanWp.length === 10 ? '91' + cleanWp : cleanWp}?text=${encodeURIComponent('Hello, I have a question about how to play.')}`
    : '#';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 14px 50px' }}>
      {/* Top Navigation Bar */}
      <div className="card-glass-v2" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        marginBottom: '20px',
        borderRadius: '20px',
        border: '1px solid rgba(214, 190, 102, 0.25)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', color: '#fff', textDecoration: 'none' }}>
            <ArrowLeft size={22} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlayCircle size={22} style={{ color: 'var(--color-gold, #d6be66)' }} />
            <span style={{ fontWeight: '800', fontSize: '1.15rem', color: '#fff', letterSpacing: '0.03em' }}>
              How To Play
            </span>
          </div>
        </div>
      </div>

      {/* Main Admin How To Play Instructions Card */}
      <div className="card-glass-v2" style={{
        borderRadius: '20px',
        padding: '24px 20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <BookOpen size={22} style={{ color: 'var(--color-gold, #d6be66)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
            Game Rules & Instructions
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.7)' }}>
            Loading game instructions...
          </div>
        ) : content ? (
          <div style={{
            color: 'rgba(255,255,255,0.92)',
            fontSize: '0.95rem',
            lineHeight: '1.7',
            whiteSpace: 'pre-line',
            backgroundColor: 'rgba(0,0,0,0.25)',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(214, 190, 102, 0.2)'
          }}>
            {content}
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.92rem', lineHeight: '1.6' }}>
            Welcome to the online game portal! Below are the step-by-step instructions to place your bids and start winning.
          </div>
        )}
      </div>

      {/* Step-by-Step Playing Guide */}
      <div className="card-glass-v2" style={{
        borderRadius: '20px',
        padding: '24px 20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <h4 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: 'var(--color-gold, #d6be66)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} /> Step-by-Step Guide to Play
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-gold, #d6be66)',
              color: '#000',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>1</div>
            <div>
              <h5 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '0.95rem', fontWeight: '700' }}>Deposit / Add Funds</h5>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Go to "Deposit Request" from menu, scan the QR code or use UPI ID to pay, and submit UTR / reference number.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-gold, #d6be66)',
              color: '#000',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>2</div>
            <div>
              <h5 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '0.95rem', fontWeight: '700' }}>Select Game Market</h5>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Choose your desired live game market (e.g. Kalyan, Milan, Rajdhani) from the Home dashboard.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-gold, #d6be66)',
              color: '#000',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>3</div>
            <div>
              <h5 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '0.95rem', fontWeight: '700' }}>Choose Game Type & Place Bid</h5>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Select Single Digit, Single Pana, Double Pana, Triple Pana, or Jodi. Enter digits & amount and click "Submit Bid".
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-gold, #d6be66)',
              color: '#000',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>4</div>
            <div>
              <h5 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '0.95rem', fontWeight: '700' }}>Winning & Automatic Payout</h5>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                When result is declared, winning points will be credited automatically to your wallet balance instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Need Help CTA */}
      <div className="card-glass-v2" style={{
        borderRadius: '20px',
        padding: '20px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <HelpCircle size={32} style={{ color: '#10b981', marginBottom: '8px' }} />
        <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1rem', fontWeight: '700' }}>Have Any Doubts?</h4>
        <p style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
          Contact our 24/7 customer support team on WhatsApp for instant guidance.
        </p>

        {cleanWp && (
          <a
            href={wpLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#25D366',
              color: '#ffffff',
              padding: '10px 22px',
              borderRadius: '30px',
              fontWeight: '700',
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)'
            }}
          >
            <MessageCircle size={18} />
            <span>Chat on WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default HowToPlay;
