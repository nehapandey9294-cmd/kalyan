import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, History, PlusCircle, ArrowUpRight, QrCode, PhoneCall, MessageCircle, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { getISTTodayStr, getISTDaysAgoStr, formatDisplayDateTime, parseDateTimeToEpoch } from '../utils/indianTime';

const WalletPage = () => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('history'); // history, deposit, withdraw
  const [screenshotName, setScreenshotName] = useState('');

  // Deposit inputs
  const [depositAmt, setDepositAmt] = useState('');
  const [utrNo, setUtrNo] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  
  // Withdraw inputs
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawRemark, setWithdrawRemark] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const d1 = getISTDaysAgoStr(6);
      const d2 = getISTTodayStr();

      const infoRes = await api.get('/wallet/info');
      if (infoRes.data.success === '1') {
        setWalletInfo(infoRes.data.data);
      }

      const historyRes = await api.get(`/wallet/history?date1=${d1}&date2=${d2}`);
      if (historyRes.data.success === '1') {
        const rawList = historyRes.data.result || historyRes.data.data || [];
        const sorted = [...rawList].sort((a, b) => {
          const idA = Number(a.id);
          const idB = Number(b.id);
          if (!isNaN(idA) && !isNaN(idB) && idA > 0 && idB > 0 && idA !== idB) {
            return idB - idA;
          }
          return parseDateTimeToEpoch(b.date, b.time) - parseDateTimeToEpoch(a.date, a.time);
        });
        setHistory(sorted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const compressImage = (file, maxWidth = 1200, quality = 0.75) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshotName(file.name);
      const compressed = await compressImage(file);
      setScreenshotBase64(compressed);
    }
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = parseFloat(depositAmt);
    if (isNaN(amt) || amt < (walletInfo?.min_deposite || 100)) {
      setError(`Minimum deposit amount is ₹${walletInfo?.min_deposite || 100}`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/wallet/fund-request', {
        amount: depositAmt,
        utr_no: utrNo,
        image: screenshotBase64,
        name: localStorage.getItem('name') || ''
      });

      if (response.data.success === '1') {
        setSuccess(response.data.msg);
        setDepositAmt('');
        setUtrNo('');
        setScreenshotBase64('');
        setScreenshotName('');
        loadData();
      } else {
        setError(response.data.msg || 'Deposit request failed');
      }
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.msg || err.response?.data?.error;
      setError(serverMsg || 'Failed to submit deposit request');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = parseInt(withdrawAmt, 10);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/wallet/withdraw-request', {
        amount: withdrawAmt,
        remark: withdrawRemark
      });

      if (response.data.success === '1') {
        setSuccess(response.data.msg);
        setWithdrawAmt('');
        setWithdrawRemark('');
        loadData();
      } else {
        setError(response.data.msg || 'Withdrawal request failed');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '20px 16px 32px' }}>
      <div style={{ marginBottom: '18px' }}>
        <Link to="/" style={{ color: 'var(--color-gold, #d6be66)', textDecoration: 'none', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> BACK TO HOME
        </Link>
      </div>

      <div className="grid-cols-2" style={{ gap: '20px' }}>
        {/* Main Wallet UI Panel */}
        <div className="card-glass-v2">
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(214, 190, 102, 0.18) 0%, rgba(16, 185, 129, 0.18) 100%)',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid rgba(214, 190, 102, 0.25)',
            marginBottom: '20px'
          }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={16} style={{ color: 'var(--color-gold, #d6be66)' }} /> Current Digital Wallet Balance
            </span>
            <h1 style={{ color: 'var(--color-gold, #d6be66)', fontSize: '2.6rem', margin: '6px 0 0 0', fontWeight: '800' }}>₹{walletInfo?.wallet || '0'}</h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button 
              onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); }}
              className={activeTab === 'history' ? 'btn-gold' : 'btn-outline'} 
              style={{ flex: 1, padding: '10px 6px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <History size={15} /> TRANSACTIONS
            </button>
            <button 
              onClick={() => { setActiveTab('deposit'); setError(''); setSuccess(''); }}
              className={activeTab === 'deposit' ? 'btn-gold' : 'btn-outline'} 
              style={{ flex: 1, padding: '10px 6px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <PlusCircle size={15} /> ADD FUNDS
            </button>
            <button 
              onClick={() => { setActiveTab('withdraw'); setError(''); setSuccess(''); }}
              className={activeTab === 'withdraw' ? 'btn-gold' : 'btn-outline'} 
              style={{ flex: 1, padding: '10px 6px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <ArrowUpRight size={15} /> WITHDRAW
            </button>
          </div>

          {error && <div className="badge badge-danger" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>{error}</div>}
          {success && <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>{success}</div>}

          {/* Transactions Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '14px', fontWeight: '700' }}>Recent Wallet Transactions</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.length === 0 ? (
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '24px' }}>No transactions recorded</p>
                ) : (
                  history.map((item, idx) => {
                    const isDebit = String(item.amount || '').trim().startsWith('-') ||
                      String(item.status || '') === '0' ||
                      /deduct|debit|revert|withdraw|bid/i.test(item.remark || '');
                    const rawAmt = String(item.amount || '0').replace(/^[+-]/, '').trim();
                    const badgeColor = isDebit ? '#f87171' : '#34d399';

                    return (
                      <div key={item.id || idx} className="flex-between" style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', borderLeft: `4px solid ${badgeColor}` }}>
                        <div>
                          <p style={{ color: '#fff', fontWeight: '600', fontSize: '0.92rem', margin: '0 0 2px 0' }}>{item.remark}</p>
                          <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.75rem' }}>
                            {formatDisplayDateTime(item.date, item.time)}
                          </span>
                        </div>
                        <strong style={{ color: badgeColor, fontSize: '1.05rem', fontWeight: '800' }}>
                          {isDebit ? `- ₹ ${rawAmt}` : `+ ₹ ${rawAmt}`}
                        </strong>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Add Funds Tab */}
          {activeTab === 'deposit' && (
            <form onSubmit={handleDepositSubmit}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '14px', fontWeight: '700' }}>Deposit Funds Request</h3>
              
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Amount (Min: ₹{walletInfo?.min_deposite || 100})</label>
                  <Link to="/add-fund" style={{ color: 'var(--color-gold, #d6be66)', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'none' }}>
                    Open Full UPI Page &gt;
                  </Link>
                </div>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Enter amount to add" 
                  value={depositAmt}
                  onChange={(e) => setDepositAmt(e.target.value)}
                  required
                />
                {depositAmt && parseFloat(depositAmt) >= (walletInfo?.min_deposite || 100) && (
                  <button
                    type="button"
                    onClick={() => {
                      const upi = walletInfo?.payment_upi_id || walletInfo?.upi_payment_id || '';
                      if (upi) {
                        const note = `DEP_${Date.now()}`;
                        const upiUrl = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(walletInfo?.upi_name || 'Pravesh')}&am=${depositAmt}&cu=INR&tn=${encodeURIComponent(note)}`;
                        window.location.href = upiUrl;
                      }
                    }}
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>⚡ OPEN UPI APP TO PAY ₹{depositAmt}</span>
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">UTR / Reference No</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter UTR transaction reference number" 
                  value={utrNo}
                  onChange={(e) => setUtrNo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Payment Receipt Screenshot</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="form-input" 
                  onChange={handleFileChange}
                  required
                />
              </div>

              <button type="submit" className="btn-gold" style={{ width: '100%', padding: '12px', borderRadius: '10px' }} disabled={loading}>
                {loading ? 'Submitting request...' : 'SUBMIT DEPOSIT REQUEST'}
              </button>
            </form>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '14px', fontWeight: '700' }}>Points Withdrawal Request</h3>
              
              <div className="form-group">
                <label className="form-label">Points to Withdraw</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Enter points to withdraw" 
                  value={withdrawAmt}
                  onChange={(e) => setWithdrawAmt(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">UPI ID / Bank details / Remark</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Provide UPI ID (e.g. PhonePe/GooglePay) or Bank remark" 
                  value={withdrawRemark}
                  onChange={(e) => setWithdrawRemark(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-gold" style={{ width: '100%', padding: '12px', borderRadius: '10px' }} disabled={loading}>
                {loading ? 'Submitting request...' : 'SUBMIT WITHDRAW REQUEST'}
              </button>
            </form>
          )}
        </div>

        {/* UPI Details & Instructions Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-glass-v2">
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
              <QrCode size={20} style={{ color: 'var(--color-gold, #d6be66)' }} /> Official UPI Payment Info
            </h3>
            
            {(() => {
              const showUpi = walletInfo?.show_upi === 1 || walletInfo?.show_upi === '1' || walletInfo?.show_upi === true;
              const showQr = walletInfo?.show_qr === 1 || walletInfo?.show_qr === '1' || walletInfo?.show_qr === true;
              const upiId = walletInfo?.upi_payment_id || walletInfo?.payment_upi_id || '';
              const rawQrImage = walletInfo?.payment_barcode_image || '';

              const getQrSrc = (src) => {
                if (!src) return '';
                if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
                if (src.startsWith('/')) return src;
                return `/uploads/${src}`;
              };

              if (!showUpi && !showQr) {
                return <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Payment details currently disabled by admin.</p>;
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {showUpi && upiId && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>OFFICIAL UPI ID</span>
                      <p style={{ color: 'var(--color-gold, #d6be66)', fontSize: '1.1rem', fontWeight: '700', margin: '4px 0 0 0', wordBreak: 'break-all' }}>{upiId}</p>
                    </div>
                  )}

                  {showQr && rawQrImage && (
                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '10px', fontWeight: '600' }}>Scan QR Code to Pay Instantly</span>
                      <img 
                        src={getQrSrc(rawQrImage)} 
                        alt="Payment QR Code" 
                        style={{ width: '190px', height: '190px', objectFit: 'contain', background: '#ffffff', padding: '10px', borderRadius: '14px', boxShadow: '0 8px 25px rgba(0,0,0,0.5)' }}
                        onError={(e) => {
                          if (!e.target.dataset.triedFallback && !rawQrImage.startsWith('http') && !rawQrImage.startsWith('data:')) {
                            e.target.dataset.triedFallback = 'true';
                            e.target.src = `/${rawQrImage.replace(/^\//, '')}`;
                          } else {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="card-glass-v2">
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
              <MessageCircle size={20} style={{ color: '#25D366' }} /> Support Helpline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.92rem' }}>
              <p style={{ margin: 0 }}>For deposit or withdrawal inquiries, contact us:</p>
              {walletInfo?.admin_mobile && <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><PhoneCall size={14} /> Mobile: <strong>{walletInfo.admin_mobile}</strong></p>}
              {walletInfo?.admin_wp && <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><MessageCircle size={14} style={{ color: '#25D366' }} /> WhatsApp: <strong>{walletInfo.admin_wp}</strong></p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
