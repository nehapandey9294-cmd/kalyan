import React, { useState, useEffect } from 'react';
import {
  CreditCard, Zap, QrCode, CheckCircle2, ShieldCheck, Key, Plus,
  Settings, Check, AlertCircle, RefreshCw, Trash2, Edit2, Copy,
  ExternalLink, Smartphone, Sparkles, ArrowRight, ArrowUpRight,
  HelpCircle, Info, Eye, Upload, CheckCheck, Layers, ChevronRight
} from 'lucide-react';
import api from '../../utils/api';

const UPI_BRAND_STYLES = {
  phonepe: {
    name: 'PhonePe',
    gradient: 'linear-gradient(135deg, #5f259f 0%, #7b2cbf 100%)',
    badgeBg: 'rgba(123, 44, 191, 0.25)',
    badgeColor: '#d8b4fe',
    accentColor: '#8b5cf6',
    iconText: 'Pe',
    scheme: 'phonepe://pay',
    description: 'Direct PhonePe native deep link'
  },
  gpay: {
    name: 'Google Pay',
    gradient: 'linear-gradient(135deg, #0c2340 0%, #1a73e8 100%)',
    badgeBg: 'rgba(26, 115, 232, 0.25)',
    badgeColor: '#93c5fd',
    accentColor: '#3b82f6',
    iconText: 'GPay',
    scheme: 'tez://upi/pay',
    description: 'Direct Google Pay (Tez) deep link'
  },
  paytm: {
    name: 'Paytm UPI',
    gradient: 'linear-gradient(135deg, #002e6e 0%, #00b9f1 100%)',
    badgeBg: 'rgba(0, 185, 241, 0.25)',
    badgeColor: '#7dd3fc',
    accentColor: '#0ea5e9',
    iconText: 'Paytm',
    scheme: 'paytmmp://pay',
    description: 'Direct Paytm wallet & UPI intent'
  },
  bhim: {
    name: 'BHIM UPI',
    gradient: 'linear-gradient(135deg, #005a36 0%, #00a651 100%)',
    badgeBg: 'rgba(0, 166, 81, 0.25)',
    badgeColor: '#86efac',
    accentColor: '#22c55e',
    iconText: 'BHIM',
    scheme: 'bhim://pay',
    description: 'National NPCI BHIM UPI gateway'
  },
  upi: {
    name: 'Any UPI App',
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    badgeColor: '#fde68a',
    accentColor: '#eab308',
    iconText: 'UPI',
    scheme: 'upi://pay',
    description: 'Opens system UPI app chooser dialog'
  }
};

const DEFAULT_SAMPLE_QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAioAAAIqCAMAAAA97pGBAAAAk1BMVEX///8CLS0BLS0AKioAJycALy/6+/sAMjLU29v09vYAIyPj6OhmgYHv8vLn6+vH0NBeeno5Wlq+ycmKnp6yv7+hsbGotrZwhobO19cSOjoXQUFMamoeQEBBYGAqT09Tb2+Yqal6j48zUlIlQ0OQo6MeRkYwVVUAHR0yTU08XV2ClZVbc3MPPDyuvLwbQ0Nqg4MAGRleT2XPAAAgAElEQVR4nO2dC3/ivI7Gpwkh3Al3Qsp1oDOFUt7v/+mWzp4Z9ChYsZtwa/Wc7m93jx3ZSf4omliRf/xQqVQqlUqlUqlUKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpXoQVZtXUhmGLVddWlFV7MwkH+ukqnjlymJnuTWPqbJLa4Gqdte966gF47b60LhmrUPJ0r4unVF9X9iU9+INrsCVW/ex83gBraKpcgU697rQuTrGWY2xtQ2N67EMZQ61lpvJ8/v7s/E/7k1n/4vntzGMOz7EpMdkVcHW3cQ8aBy1pTNqR7HDWUin9xa1pIH2m+Np/e092Yyw8/B1cjI+2YimqsPVhMznrdekrc3B+4RM9W0BppqLN3IWk9mg+eNCajVC/yr6hfe3HdVIY+kZQWpPS2ZLtaQrnVE3qZmPdVItEVEZBB7pHEbo6xYbegphInnC6uCZdq4tGQwBndUv9MCtHpxuvLgkKt7TFeTVUqiQVj+Fim82VcpAZV4qaM6luYwKvXJenEKFnIKXiQrtXEqhQgeqcVRKpPVbomKe1R2hcprkOVRIq6JiL0VFsJQHleZVUfGeLv93DpVT8zlUjLYsUClm0haonDqfQ+XUmo0KuVRnUKEXMu1VTq3f0quYTd2RVyHnl0Jldp1Y5bpepaArK0ofQIIljVWovh8qs68YqxR0ZUV9P1S+pFfRsPaBw9qmhrVmU3fkVcj5fcdXcF5BYlbTqJC+BT+AhHnIwjOw8ip/zyBvrELHdUWFTuN6qHh0XSOP2D1KobL7VTqpFjuhIi4XdhNquVRygMXz4chfGWtAtHctZAuCA0RlLqMS16gtN1TgQobXi1XCyaYYvcdirFIfLqm2eCXFWMVfLRdUQ0zRqAzAchR7ZlPsL5g14NjlGgbq4l1ob6XO0QQsr3oLQczSFkytd3ghEZVqFw9tsxQFGGeQJ0WBeRX/ZTkoRusEwg2OiiwxVvHwx1/biKc/nlm7FS+YYy5E9w28TFQxjPGh6mBCPUMJ3SrzV0xBAz3SGscFD8tRkdVawsBhz+HYlC1EJSMOcDG8LOEZOqIi3F8WUcwuiAqMlIHKu48TE+aM8sMUKmgKDDmiEhBTfvzdUEH5l0WF3OxMVGynzMdNo2KesjMq8O8jRUWQokIuVW5USPxVLCpCWCtLDGt5lJuNinVYe/YB9K9DNiqfetfnnUPF3NsZFfqC7kt6Fevf5GW9CmlVr3KnqOgDyNBZUQEpKubOGquANFbRWMVSGquYO+sDCKQPIHNnRQWkqJg7Kyog9nWheLOzUNlIa+VgOTcqDgvtMCkZFbbY7/xin+iSYa1TVQFY4c0Ia+VKCON5GFPJYW0dywgwUy+xJAxrkzaY2othLZYgqC9moTBOGMC0seukUQFbWxrWel6AltbYWboJP1rbN3rsZp0jRUH2Kk1MFZC1hSuZ4VV4EkKLtcLn/aNnwbf7bziNBd7QFhYZYGpA4MqTEHahFNaOMXVguxXG2UYxDNRZYjOewhTGDTtbqTO7CSwJoYt1';

const PaymentGatewayManager = ({ isMobile: propIsMobile }) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = propIsMobile !== undefined ? propIsMobile : windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;

  const [loading, setLoading] = useState(true);
  const [upiApps, setUpiApps] = useState([]);
  const [depositMode, setDepositMode] = useState('upi_intent');
  const [autoUpiId, setAutoUpiId] = useState('');
  const [savingAutoUpi, setSavingAutoUpi] = useState(false);
  const [defaultUpiId, setDefaultUpiId] = useState('9982778833@paytm');
  const [payeeName, setPayeeName] = useState('Pravesh Online');
  const [qrImage, setQrImage] = useState(DEFAULT_SAMPLE_QR);
  const [showUpi, setShowUpi] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [savingDefault, setSavingDefault] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [formData, setFormData] = useState({
    app_name: '',
    app_code: 'phonepe',
    upi_id: '',
    payee_name: '',
    is_active: true
  });
  const [savingApp, setSavingApp] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied: ${text}`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Valid VPA checker
  const isValidVpa = (vpa) => {
    if (!vpa || typeof vpa !== 'string') return false;
    const trimmed = vpa.trim();
    return trimmed.includes('@') && trimmed.length >= 5 && /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/.test(trimmed);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/payment-gateways');
      if (res.data.success === '1') {
        setUpiApps(res.data.upi_apps || []);
        setDepositMode(res.data.deposit_mode || 'upi_intent');
        setAutoUpiId(res.data.auto_upi_id || res.data.default_upi_id || '');
        setDefaultUpiId(res.data.default_upi_id || '9982778833@paytm');
        setPayeeName(res.data.payee_name || 'Pravesh Online');
        setQrImage(res.data.payment_barcode_image || DEFAULT_SAMPLE_QR);
        setShowUpi(res.data.show_upi === undefined ? true : (res.data.show_upi === 1 || res.data.show_upi === '1' || res.data.show_upi === true));
        setShowQr(res.data.show_qr === undefined ? true : (res.data.show_qr === 1 || res.data.show_qr === '1' || res.data.show_qr === true));
      }
    } catch (err) {
      console.warn('GET /admin/payment-gateways failed, trying /admin/settings fallback...', err);
      try {
        const sRes = await api.get('/admin/settings');
        if (sRes.data && (sRes.data.success === '1' || sRes.data.settings)) {
          const s = sRes.data.settings || {};
          const upi = s.auto_upi_id || s.payment_upi_id || s.upi_payment_id || '';
          setAutoUpiId(upi);
          setDefaultUpiId(upi || '9982778833@paytm');
          setPayeeName(s.ac_name || 'Pravesh Online');
          setDepositMode(s.deposit_mode || 'upi_intent');
          if (s.payment_barcode_image) setQrImage(s.payment_barcode_image);
          if (s.show_upi !== undefined) setShowUpi(s.show_upi === 1 || s.show_upi === '1' || s.show_upi === true);
          if (s.show_qr !== undefined) setShowQr(s.show_qr === 1 || s.show_qr === '1' || s.show_qr === true);
        }
      } catch (err2) {
        console.error(err2);
        showToast(err.response?.data?.error || 'Failed to load UPI configurations', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageFilePick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size exceeds 5MB limit. Please choose a smaller image.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Str = uploadEvent.target.result;
        setQrImage(base64Str);
        showToast('QR Code image selected successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDepositModeChange = async (mode) => {
    const isCurrentlyAuto = depositMode === 'upi_intent' || depositMode === 'auto';
    const isTargetAuto = mode === 'upi_intent' || mode === 'auto';
    if (isCurrentlyAuto === isTargetAuto && mode === depositMode) return;
    try {
      let updated = false;
      try {
        const res = await api.post('/admin/payment-gateways/set-mode', { deposit_mode: mode });
        if (res.data && res.data.success === '1') updated = true;
      } catch (e) {
        console.warn('set-mode endpoint failed, falling back to /admin/settings/update', e);
      }

      if (!updated) {
        const res2 = await api.post('/admin/settings/update', { settings: { deposit_mode: mode } });
        if (res2.data && (res2.data.success === '1' || res2.data.status === true)) updated = true;
      }

      if (updated) {
        setDepositMode(mode);
        showToast(`Deposit mode switched to: ${isTargetAuto ? 'DIRECT UPI APP (AUTO)' : 'MANUAL QR SCAN'}`);
      } else {
        showToast('Failed to update deposit mode', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error switching deposit mode', 'error');
    }
  };

  const handleSaveAutoUpi = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!autoUpiId || !autoUpiId.trim()) {
      showToast('Please enter a valid Auto Deposit UPI ID', 'error');
      return;
    }
    const cleanUpi = autoUpiId.trim();
    setSavingAutoUpi(true);

    let saved = false;

    // 1. Try dedicated set-auto-upi endpoint first
    try {
      const res = await api.post('/admin/payment-gateways/set-auto-upi', {
        auto_upi_id: cleanUpi
      });
      if (res.data && res.data.success === '1') {
        saved = true;
      }
    } catch (err) {
      console.warn('POST /payment-gateways/set-auto-upi failed, attempting settings/update fallback...', err);
    }

    // 2. If endpoint returned 404 on live server, use universal /admin/settings/update
    if (!saved) {
      try {
        const res = await api.post('/admin/settings/update', {
          settings: {
            payment_upi_id: cleanUpi,
            upi_payment_id: cleanUpi,
            auto_upi_id: cleanUpi,
            deposit_mode: 'upi_intent',
            active_payment_gateway: 'upi_intent'
          }
        });
        if (res.data && (res.data.success === '1' || res.data.status === true)) {
          saved = true;
        }
      } catch (err2) {
        console.warn('/admin/settings/update fallback error:', err2);
      }
    }

    // 3. Also try /admin/payment-gateways/set-default if still needed
    if (!saved) {
      try {
        const res = await api.post('/admin/payment-gateways/set-default', {
          upi_id: cleanUpi,
          auto_upi_id: cleanUpi
        });
        if (res.data && res.data.success === '1') {
          saved = true;
        }
      } catch (err3) {
        console.warn('/admin/payment-gateways/set-default fallback error:', err3);
      }
    }

    if (saved) {
      showToast('Auto Deposit Direct UPI ID saved successfully!');
      setAutoUpiId(cleanUpi);
      setDefaultUpiId(cleanUpi);
      setDepositMode('upi_intent');
    } else {
      showToast('Error saving Auto Deposit UPI ID on server', 'error');
    }
    setSavingAutoUpi(false);
  };

  const handleSaveDefaultUpi = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingDefault(true);
    let saved = false;
    try {
      const res = await api.post('/admin/payment-gateways/set-default', {
        upi_id: defaultUpiId,
        auto_upi_id: defaultUpiId,
        payee_name: payeeName,
        payment_barcode_image: qrImage,
        show_upi: showUpi ? 1 : 0,
        show_qr: showQr ? 1 : 0
      });
      if (res.data && res.data.success === '1') {
        saved = true;
      }
    } catch (err) {
      console.warn('POST /payment-gateways/set-default failed, attempting /admin/settings/update...', err);
    }

    if (!saved) {
      try {
        const res = await api.post('/admin/settings/update', {
          settings: {
            ac_name: payeeName,
            payment_upi_id: defaultUpiId,
            upi_payment_id: defaultUpiId,
            auto_upi_id: defaultUpiId,
            payment_barcode_image: qrImage,
            show_upi: showUpi ? 1 : 0,
            show_qr: showQr ? 1 : 0
          }
        });
        if (res.data && (res.data.success === '1' || res.data.status === true)) {
          saved = true;
        }
      } catch (err2) {
        console.error('Fallback /admin/settings/update failed:', err2);
      }
    }

    if (saved) {
      showToast('UPI & QR Code configuration saved successfully!');
    } else {
      showToast('Failed to save UPI configuration', 'error');
    }
    setSavingDefault(false);
  };

  const handleOpenAddModal = (presetCode = null) => {
    setEditingApp(null);
    let initialName = '';
    let code = presetCode || 'phonepe';

    if (code === 'phonepe') initialName = 'PhonePe';
    else if (code === 'gpay') initialName = 'Google Pay';
    else if (code === 'paytm') initialName = 'Paytm UPI';
    else if (code === 'bhim') initialName = 'BHIM UPI';
    else initialName = 'Any UPI App';

    setFormData({
      app_name: initialName,
      app_code: code,
      upi_id: autoUpiId || defaultUpiId || '',
      payee_name: payeeName || 'Pravesh',
      is_active: true
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (app) => {
    setEditingApp(app);
    setFormData({
      app_name: app.app_name,
      app_code: app.app_code || 'upi',
      upi_id: app.upi_id,
      payee_name: app.payee_name || payeeName || '',
      is_active: app.is_active === 1 || app.is_active === true
    });
    setModalOpen(true);
  };

  const handleSaveApp = async (e) => {
    e.preventDefault();
    if (!formData.app_name.trim() || !formData.upi_id.trim()) {
      showToast('Please enter both App Name and UPI ID', 'error');
      return;
    }

    setSavingApp(true);
    try {
      let res;
      if (editingApp) {
        res = await api.post('/admin/payment-gateways/update', {
          id: editingApp.id,
          ...formData
        });
      } else {
        res = await api.post('/admin/payment-gateways/add', formData);
      }

      if (res.data.success === '1') {
        showToast(res.data.msg || 'UPI App saved successfully!');
        setModalOpen(false);
        fetchData();
      } else {
        showToast(res.data.msg || 'Failed to save UPI App', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.msg || err.response?.data?.error || 'Error saving UPI App', 'error');
    } finally {
      setSavingApp(false);
    }
  };

  const handleToggleActive = async (app) => {
    try {
      const newStatus = app.is_active === 1 ? 0 : 1;
      const res = await api.post('/admin/payment-gateways/toggle', {
        id: app.id,
        is_active: newStatus
      });
      if (res.data.success === '1') {
        setUpiApps(prev => prev.map(a => a.id === app.id ? { ...a, is_active: newStatus } : a));
        showToast(`"${app.app_name}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleDeleteApp = async (app) => {
    if (!window.confirm(`Are you sure you want to remove "${app.app_name}"?`)) return;
    try {
      const res = await api.post('/admin/payment-gateways/delete', { id: app.id });
      if (res.data.success === '1') {
        setUpiApps(prev => prev.filter(a => a.id !== app.id));
        showToast(res.data.msg || 'UPI App removed successfully');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete UPI app', 'error');
    }
  };

  const isAutoMode = depositMode === 'upi_intent' || depositMode === 'auto';
  const activeVpa = isAutoMode ? (autoUpiId || defaultUpiId) : (defaultUpiId || autoUpiId);
  const sampleIntentUri = `upi://pay?pa=${encodeURIComponent(activeVpa || 'merchant@upi')}&pn=${encodeURIComponent(payeeName || 'Pravesh Online')}&am=500.00&cu=INR&tn=Add_Fund`;

  return (
    <div className="pgm-wrapper" style={{ minHeight: '100%', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden', fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif" }}>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 16px rgba(16, 185, 129, 0.35); }
          50% { box-shadow: 0 0 28px rgba(16, 185, 129, 0.7); }
        }
        @keyframes pulseGlowAmber {
          0%, 100% { box-shadow: 0 0 16px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 26px rgba(245, 158, 11, 0.65); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .pgm-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          min-width: 0;
        }
        .pgm-card:hover {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.07);
        }
        .pgm-card-dark {
          background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          color: #f8fafc;
          box-sizing: border-box;
          min-width: 0;
        }

        .pgm-input {
          width: 100%;
          box-sizing: border-box;
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px 14px;
          color: #0f172a;
          font-size: 0.95rem;
          font-weight: 600;
          outline: none;
          transition: all 0.2s ease;
          min-height: 44px;
        }
        .pgm-input:focus {
          border-color: #10b981;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        .pgm-input-dark {
          width: 100%;
          box-sizing: border-box;
          background: rgba(15, 23, 42, 0.75);
          border: 1.5px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          padding: 12px 14px;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          outline: none;
          transition: all 0.2s ease;
          min-height: 44px;
        }
        .pgm-input-dark:focus {
          border-color: #10b981;
          background: #0f172a;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
        }

        .pgm-toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
          flex-shrink: 0;
        }
        .pgm-toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .pgm-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 26px;
        }
        .pgm-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input:checked + .pgm-slider {
          background-color: #10b981;
        }
        input:checked + .pgm-slider:before {
          transform: translateX(22px);
        }

        .pgm-btn-emerald {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border: none;
          font-weight: 700;
          cursor: pointer;
          border-radius: 10px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
        }
        .pgm-btn-emerald:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }
        .pgm-btn-emerald:active {
          transform: scale(0.98);
        }

        .pgm-btn-amber {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          border: none;
          font-weight: 700;
          cursor: pointer;
          border-radius: 10px;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
        }
        .pgm-btn-amber:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
        }
        .pgm-btn-amber:active {
          transform: scale(0.98);
        }

        /* Responsive Layout Grid & Flex Classes */
        .pgm-header-banner {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 24px 28px;
          margin-bottom: 22px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
          color: #ffffff;
        }
        .pgm-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          flex: 1;
        }
        .pgm-header-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
          flex-shrink: 0;
        }
        .pgm-header-title {
          font-size: 1.6rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1.25;
        }
        .pgm-header-desc {
          margin: 6px 0 0 0;
          color: #94a3b8;
          font-size: 0.9rem;
          max-width: 780px;
          line-height: 1.5;
        }
        .pgm-header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .pgm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }
        .pgm-kpi-card {
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .pgm-modes-container {
          padding: 24px 26px;
          margin-bottom: 24px;
        }
        .pgm-modes-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pgm-modes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .pgm-mode-card {
          cursor: pointer;
          border-radius: 16px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          min-width: 0;
          box-sizing: border-box;
        }

        .pgm-section-card {
          padding: 24px 26px;
          min-width: 0;
          box-sizing: border-box;
        }
        .pgm-form-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .pgm-qr-grid {
          display: grid;
          grid-template-columns: 1fr 140px;
          gap: 14px;
          align-items: center;
        }
        .pgm-toggles-grid {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 18px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .pgm-form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding-top: 6px;
        }

        .pgm-apps-preview-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        /* ================= MOBILE MEDIA QUERIES (<= 768px) ================= */
        @media (max-width: 768px) {
          .pgm-header-banner {
            padding: 16px 14px;
            border-radius: 14px;
            margin-bottom: 16px;
            gap: 14px;
          }
          .pgm-header-left {
            gap: 12px;
            align-items: flex-start;
          }
          .pgm-header-icon {
            width: 42px;
            height: 42px;
            border-radius: 10px;
          }
          .pgm-header-title {
            font-size: 1.15rem;
          }
          .pgm-header-desc {
            font-size: 0.82rem;
            line-height: 1.45;
          }
          .pgm-header-actions {
            width: 100%;
            display: flex;
            gap: 8px;
          }
          .pgm-header-actions a,
          .pgm-header-actions button {
            flex: 1;
            justify-content: center;
            padding: 10px 8px !important;
            font-size: 0.78rem !important;
            white-space: nowrap;
          }

          .pgm-kpi-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 16px;
          }
          .pgm-kpi-card {
            padding: 12px 14px;
          }

          .pgm-modes-container {
            padding: 16px 14px;
            margin-bottom: 16px;
            border-radius: 14px;
          }
          .pgm-modes-header {
            gap: 8px;
            margin-bottom: 14px;
          }
          .pgm-modes-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .pgm-mode-card {
            padding: 16px 14px;
            gap: 12px;
          }

          .pgm-section-card {
            padding: 16px 14px;
            border-radius: 14px;
          }
          .pgm-form-grid-2 {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .pgm-qr-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .pgm-toggles-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 12px 14px;
          }
          .pgm-form-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .pgm-form-footer button {
            width: 100%;
            justify-content: center;
            padding: 13px !important;
          }

          .pgm-apps-preview-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .pgm-toast-box {
            top: 12px !important;
            left: 12px !important;
            right: 12px !important;
            padding: 12px 16px !important;
            font-size: 0.85rem !important;
          }
        }

        /* Extra small mobile screens (<= 480px) */
        @media (max-width: 480px) {
          .pgm-header-title {
            font-size: 1.05rem;
          }
          .pgm-apps-preview-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .pgm-input-with-copy {
            padding-right: 85px !important;
          }
        }
      `}</style>

      {/* Floating Toast Notification */}
      {notification && (
        <div className="pgm-toast-box" style={{
          position: 'fixed',
          top: isMobile ? '12px' : '24px',
          right: isMobile ? '12px' : '24px',
          left: isMobile ? '12px' : 'auto',
          zIndex: 999999,
          backgroundColor: notification.type === 'error' ? 'rgba(239, 68, 68, 0.98)' : 'rgba(16, 185, 129, 0.98)',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 12px 35px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '700',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          {notification.type === 'error' ? <AlertCircle size={isMobile ? 18 : 20} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={isMobile ? 18 : 20} style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: isMobile ? '0.86rem' : '0.92rem', wordBreak: 'break-word' }}>{notification.message}</span>
        </div>
      )}

      {/* 1. TOP EXECUTIVE HEADER BANNER */}
      <div className="pgm-header-banner">
        <div className="pgm-header-left">
          <div className="pgm-header-icon">
            <Smartphone size={isMobile ? 22 : 28} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="pgm-header-title">
                Payment Gateway &amp; UPI
              </h2>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                LIVE
              </span>
            </div>
            <p className="pgm-header-desc">
              Control user deposits: <strong>Direct 1-Tap UPI Intent</strong> (PhonePe, GPay, Paytm) or <strong>Manual QR Scan</strong>.
            </p>
          </div>
        </div>

        <div className="pgm-header-actions">
          <a
            href="/add-fund"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#ffffff',
              padding: isMobile ? '10px 14px' : '10px 18px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              minHeight: '42px',
              boxSizing: 'border-box'
            }}
          >
            <Eye size={15} />
            <span>Test User View</span>
            <ExternalLink size={12} style={{ opacity: 0.7 }} />
          </a>

          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              padding: isMobile ? '10px 14px' : '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '700',
              fontSize: '0.84rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              minHeight: '42px',
              boxSizing: 'border-box'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. HIGH-LEVEL KPI METRICS BAR */}
      <div className="pgm-kpi-grid">
        {/* KPI 1: Active Flow Mode */}
        <div className="pgm-card pgm-kpi-card">
          <div style={{
            width: isMobile ? '40px' : '44px',
            height: isMobile ? '40px' : '44px',
            borderRadius: '12px',
            background: isAutoMode
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isAutoMode ? '#10b981' : '#f59e0b',
            flexShrink: 0
          }}>
            {isAutoMode ? <Zap size={isMobile ? 20 : 22} /> : <QrCode size={isMobile ? 20 : 22} />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              Active Flow Mode
            </span>
            <h4 style={{ margin: '2px 0 0 0', fontSize: isMobile ? '0.96rem' : '1.02rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isAutoMode ? 'Direct UPI App (Auto)' : 'Manual QR & Static UPI'}
            </h4>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              color: isAutoMode ? '#059669' : '#d97706',
              display: 'block',
              marginTop: '1px'
            }}>
              {isAutoMode ? '⚡ 1-Tap Auto Launch' : '📷 Offline UTR Verification'}
            </span>
          </div>
        </div>

        {/* KPI 2: Active Deposit UPI VPA */}
        <div className="pgm-card pgm-kpi-card">
          <div style={{
            width: isMobile ? '40px' : '44px',
            height: isMobile ? '40px' : '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.25) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
            flexShrink: 0
          }}>
            <Smartphone size={isMobile ? 20 : 22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              Primary Receiving VPA
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', minWidth: 0 }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: isMobile ? '0.9rem' : '0.95rem',
                fontWeight: '800',
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
              }}>
                {activeVpa || 'Not configured'}
              </span>
              {activeVpa && (
                <button
                  type="button"
                  onClick={() => handleCopy(activeVpa, 'kpi_vpa')}
                  title="Copy UPI VPA"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedKey === 'kpi_vpa' ? '#10b981' : '#64748b',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {copiedKey === 'kpi_vpa' ? <CheckCheck size={16} color="#10b981" /> : <Copy size={15} />}
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.7rem', color: isValidVpa(activeVpa) ? '#10b981' : '#f59e0b', fontWeight: '700', display: 'block' }}>
              {isValidVpa(activeVpa) ? '✓ Valid NPCI VPA' : '⚠️ Missing @bank handle'}
            </span>
          </div>
        </div>

        {/* KPI 3: Payee / Merchant Name */}
        <div className="pgm-card pgm-kpi-card">
          <div style={{
            width: isMobile ? '40px' : '44px',
            height: isMobile ? '40px' : '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(2, 132, 199, 0.25) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7',
            flexShrink: 0
          }}>
            <ShieldCheck size={isMobile ? 20 : 22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              Payee Business Name
            </span>
            <h4 style={{ margin: '2px 0 0 0', fontSize: isMobile ? '0.96rem' : '1.02rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {payeeName || 'Pravesh Online'}
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', display: 'block' }}>
              Shown in user UPI app prompt
            </span>
          </div>
        </div>

        {/* KPI 4: QR Code Status */}
        <div className="pgm-card pgm-kpi-card">
          <div style={{
            width: isMobile ? '40px' : '44px',
            height: isMobile ? '40px' : '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(147, 51, 234, 0.25) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9333ea',
            flexShrink: 0
          }}>
            <QrCode size={isMobile ? 20 : 22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              Offline QR Status
            </span>
            <h4 style={{ margin: '2px 0 0 0', fontSize: isMobile ? '0.96rem' : '1.02rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {qrImage ? 'QR Image Loaded' : 'No QR Configured'}
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', display: 'block' }}>
              UPI ID: {showUpi ? 'Visible' : 'Hidden'} • QR: {showQr ? 'Visible' : 'Hidden'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. HERO DEPOSIT MODE SELECTOR TILES */}
      <div className="pgm-card pgm-modes-container">
        <div className="pgm-modes-header">
          <div>
            <h3 style={{ fontSize: isMobile ? '1.12rem' : '1.25rem', fontWeight: '800', margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={isMobile ? 18 : 22} color="#556ee6" style={{ flexShrink: 0 }} />
              <span>Select Deposit Flow Mode</span>
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: isMobile ? '0.8rem' : '0.86rem' }}>
              Switching this mode instantly updates the player experience on the mobile app and website.
            </p>
          </div>
          <span style={{
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: isMobile ? '0.72rem' : '0.78rem',
            fontWeight: '800',
            backgroundColor: isAutoMode ? '#ecfdf5' : '#fffbeb',
            color: isAutoMode ? '#059669' : '#d97706',
            border: `1.5px solid ${isAutoMode ? '#a7f3d0' : '#fde68a'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isAutoMode ? '#10b981' : '#f59e0b' }} />
            CURRENTLY LIVE: {isAutoMode ? 'DIRECT UPI APP (AUTO)' : 'MANUAL QR SCAN'}
          </span>
        </div>

        <div className="pgm-modes-grid">

          {/* CARD 1: DIRECT UPI APP OPEN */}
          <div
            onClick={() => handleDepositModeChange('upi_intent')}
            className="pgm-mode-card"
            style={{
              border: isAutoMode ? '2.5px solid #10b981' : '1.5px solid #e2e8f0',
              backgroundColor: isAutoMode ? '#f0fdf4' : '#ffffff',
              animation: isAutoMode ? 'pulseGlow 3s infinite' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0, flex: 1 }}>
                <div style={{
                  width: isMobile ? '40px' : '46px',
                  height: isMobile ? '40px' : '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  flexShrink: 0
                }}>
                  <Smartphone size={isMobile ? 20 : 24} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: isMobile ? '0.98rem' : '1.1rem', fontWeight: '800', color: '#1e293b' }}>
                      Direct UPI App Open (Auto)
                    </h4>
                    {isAutoMode && (
                      <span style={{
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        fontSize: '0.64rem',
                        fontWeight: '800',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        textTransform: 'uppercase'
                      }}>
                        Active
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: isMobile ? '0.74rem' : '0.8rem', color: '#059669', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                    ⚡ 1-Tap Frictionless Mobile Intent
                  </span>
                </div>
              </div>

              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: isAutoMode ? '7px solid #10b981' : '2px solid #cbd5e1',
                backgroundColor: '#ffffff',
                transition: 'all 0.2s ease',
                boxShadow: isAutoMode ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                flexShrink: 0,
                marginTop: '4px'
              }} />
            </div>

            <p style={{ margin: 0, fontSize: isMobile ? '0.82rem' : '0.88rem', color: '#475569', lineHeight: '1.45' }}>
              User enters amount and taps <strong>"Pay via PhonePe / GPay / Paytm"</strong>. The selected UPI app opens directly with the pre-filled amount and recipient VPA!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '0.76rem' : '0.82rem', color: '#065f46' }}>
                <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                <span>Zero transaction gateway commissions (Direct Bank UPI)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '0.76rem' : '0.82rem', color: '#065f46' }}>
                <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                <span>Supports Android WebView, Chrome &amp; iOS Safari</span>
              </div>
            </div>
          </div>

          {/* CARD 2: MANUAL QR SCAN */}
          <div
            onClick={() => handleDepositModeChange('manual')}
            className="pgm-mode-card"
            style={{
              border: !isAutoMode ? '2.5px solid #f59e0b' : '1.5px solid #e2e8f0',
              backgroundColor: !isAutoMode ? '#fffdf7' : '#ffffff',
              animation: !isAutoMode ? 'pulseGlowAmber 3s infinite' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0, flex: 1 }}>
                <div style={{
                  width: isMobile ? '40px' : '46px',
                  height: isMobile ? '40px' : '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                  flexShrink: 0
                }}>
                  <QrCode size={isMobile ? 20 : 24} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: isMobile ? '0.98rem' : '1.1rem', fontWeight: '800', color: '#1e293b' }}>
                      Manual QR / Static UPI Scan
                    </h4>
                    {!isAutoMode && (
                      <span style={{
                        backgroundColor: '#f59e0b',
                        color: '#ffffff',
                        fontSize: '0.64rem',
                        fontWeight: '800',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        textTransform: 'uppercase'
                      }}>
                        Active
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: isMobile ? '0.74rem' : '0.8rem', color: '#d97706', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                    📷 Traditional QR Code &amp; UTR Approval
                  </span>
                </div>
              </div>

              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: !isAutoMode ? '7px solid #f59e0b' : '2px solid #cbd5e1',
                backgroundColor: '#ffffff',
                transition: 'all 0.2s ease',
                boxShadow: !isAutoMode ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
                flexShrink: 0,
                marginTop: '4px'
              }} />
            </div>

            <p style={{ margin: 0, fontSize: isMobile ? '0.82rem' : '0.88rem', color: '#475569', lineHeight: '1.45' }}>
              User scans a static QR code from another device or copies your UPI ID, then manually submits their 12-digit UTR transaction reference number.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '0.76rem' : '0.82rem', color: '#92400e' }}>
                <CheckCircle2 size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span>Ideal for desktop players scanning via another mobile</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '0.76rem' : '0.82rem', color: '#92400e' }}>
                <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0 }} />
                <span>Requires admin approval in Fund Request tab</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. CONFIGURATION PANELS (DYNAMIC ACCORDING TO ACTIVE MODE) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* SECTION 4A: AUTO DEPOSIT DIRECT UPI ID ENGINE (ACTIVE WHEN AUTO MODE) */}
        {isAutoMode && (
          <div className="pgm-card-dark pgm-section-card" style={{
            position: 'relative',
            border: '2px solid #10b981',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  width: isMobile ? '38px' : '44px',
                  height: isMobile ? '38px' : '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)',
                  flexShrink: 0
                }}>
                  <Zap size={isMobile ? 20 : 24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                    Auto Deposit Direct UPI ID Engine
                  </h3>
                  <span style={{ fontSize: isMobile ? '0.74rem' : '0.8rem', color: '#34d399', fontWeight: '700', display: 'block' }}>
                    Used for instant PhonePe, GPay, Paytm &amp; BHIM deep links
                  </span>
                </div>
              </div>

              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: 'rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}>
                ACTIVE IN APP
              </span>
            </div>

            <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: isMobile ? '0.82rem' : '0.88rem', lineHeight: '1.5' }}>
              When a player enters their deposit amount on the mobile app and taps <strong>"PAY NOW"</strong> or selects an app, the transaction will be routed directly to this UPI ID without intermediate gateway deductions.
            </p>

            <form onSubmit={handleSaveAutoUpi} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isMobile ? '0.82rem' : '0.86rem', fontWeight: '700', marginBottom: '8px', color: '#e2e8f0', flexWrap: 'wrap', gap: '4px' }}>
                  <span>Auto Deposit UPI ID (VPA) *</span>
                  <span style={{ fontSize: '0.72rem', color: isValidVpa(autoUpiId) ? '#34d399' : '#f59e0b', fontWeight: '600' }}>
                    {isValidVpa(autoUpiId) ? '✓ Valid format' : 'Format: username@bank'}
                  </span>
                </label>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="e.g. 9982778833@paytm or autodeposit@okaxis"
                    value={autoUpiId}
                    onChange={(e) => setAutoUpiId(e.target.value)}
                    required
                    className="pgm-input-dark pgm-input-with-copy"
                    style={{
                      paddingLeft: '42px',
                      paddingRight: autoUpiId ? (isMobile ? '82px' : '110px') : '14px',
                      fontFamily: 'monospace',
                      fontSize: isMobile ? '0.88rem' : '0.98rem',
                      letterSpacing: '0.02em',
                      borderColor: isValidVpa(autoUpiId) ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.16)'
                    }}
                  />
                  <div style={{ position: 'absolute', left: '12px', color: '#10b981', display: 'flex', alignItems: 'center' }}>
                    <Smartphone size={18} />
                  </div>

                  <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center' }}>
                    {autoUpiId && (
                      <button
                        type="button"
                        onClick={() => handleCopy(autoUpiId, 'auto_upi')}
                        style={{
                          background: 'rgba(255, 255, 255, 0.12)',
                          border: 'none',
                          color: copiedKey === 'auto_upi' ? '#34d399' : '#cbd5e1',
                          padding: '6px 9px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {copiedKey === 'auto_upi' ? <CheckCheck size={13} /> : <Copy size={13} />}
                        <span>{copiedKey === 'auto_upi' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Live URI Deep-Link Inspector Box */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: isMobile ? '12px 14px' : '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: isMobile ? '0.7rem' : '0.74rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Deep-Link URI Payload (Sample ₹500)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(sampleIntentUri, 'intent_uri')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedKey === 'intent_uri' ? '#34d399' : '#38bdf8',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 0'
                    }}
                  >
                    {copiedKey === 'intent_uri' ? <CheckCheck size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === 'intent_uri' ? 'Copied URI' : 'Copy URI'}</span>
                  </button>
                </div>

                <div style={{
                  fontFamily: 'monospace',
                  fontSize: isMobile ? '0.74rem' : '0.8rem',
                  color: '#38bdf8',
                  wordBreak: 'break-all',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                  maxHeight: '90px',
                  overflowY: 'auto'
                }}>
                  {sampleIntentUri}
                </div>
              </div>

              {/* Live Mobile Experience Preview Grid */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: isMobile ? '12px' : '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#34d399" />
                    <span style={{ fontSize: isMobile ? '0.78rem' : '0.84rem', fontWeight: '800', color: '#ffffff' }}>
                      Player Mobile 1-Tap App Preview
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Auto-configured with active VPA
                  </span>
                </div>

                <div className="pgm-apps-preview-grid">
                  {[
                    { key: 'phonepe', ...UPI_BRAND_STYLES.phonepe },
                    { key: 'gpay', ...UPI_BRAND_STYLES.gpay },
                    { key: 'paytm', ...UPI_BRAND_STYLES.paytm },
                    { key: 'bhim', ...UPI_BRAND_STYLES.bhim }
                  ].map((app) => {
                    const testUri = `${app.scheme}?pa=${encodeURIComponent(activeVpa || 'merchant@upi')}&pn=${encodeURIComponent(payeeName || 'Pravesh')}&am=500.00&cu=INR&tn=Deposit_500`;
                    return (
                      <div
                        key={app.key}
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            background: app.gradient,
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '0.74rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {app.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(testUri, `app_${app.key}`)}
                            title="Copy Intent URL"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedKey === `app_${app.key}` ? '#34d399' : '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {copiedKey === `app_${app.key}` ? <CheckCheck size={14} color="#34d399" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {app.scheme}
                        </span>
                        <a
                          href={testUri}
                          style={{
                            fontSize: '0.72rem',
                            color: '#34d399',
                            fontWeight: '700',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '2px'
                          }}
                        >
                          <span>Test Deep Link</span>
                          <ArrowUpRight size={12} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div className="pgm-form-footer">
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  🔒 Updates both <code>auto_upi_id</code> and system settings safely.
                </span>

                <button
                  type="submit"
                  disabled={savingAutoUpi}
                  className="pgm-btn-emerald"
                  style={{
                    padding: isMobile ? '12px 20px' : '12px 28px',
                    fontSize: isMobile ? '0.9rem' : '0.94rem'
                  }}
                >
                  {savingAutoUpi ? <RefreshCw size={17} className="animate-spin" /> : <Check size={17} />}
                  <span>{savingAutoUpi ? 'Saving VPA...' : 'Save Auto UPI ID'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SECTION 4B: MANUAL QR & OFFLINE SETTINGS (ACTIVE WHEN MANUAL MODE) */}
        {!isAutoMode && (
          <div className="pgm-card pgm-section-card" style={{
            border: '2px solid #f59e0b',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  width: isMobile ? '38px' : '44px',
                  height: isMobile ? '38px' : '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                  flexShrink: 0
                }}>
                  <QrCode size={isMobile ? 20 : 24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                    Manual QR Code &amp; Payee Settings
                  </h3>
                  <span style={{ fontSize: isMobile ? '0.74rem' : '0.8rem', color: '#d97706', fontWeight: '700', display: 'block' }}>
                    Static QR code image &amp; merchant business name
                  </span>
                </div>
              </div>

              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a'
              }}>
                ACTIVE IN APP
              </span>
            </div>

            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: isMobile ? '0.82rem' : '0.88rem', lineHeight: '1.5' }}>
              Configure your business name and static QR code. When players choose Manual Scan, they can scan this QR with any UPI app on another phone or copy your UPI ID.
            </p>

            <form onSubmit={handleSaveDefaultUpi} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1: UPI ID & Payee Name */}
              <div className="pgm-form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: isMobile ? '0.82rem' : '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                    Manual Mode UPI ID *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9982778833@paytm"
                    value={defaultUpiId}
                    onChange={(e) => setDefaultUpiId(e.target.value)}
                    required
                    className="pgm-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: isMobile ? '0.82rem' : '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                    Payee / Merchant Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pravesh Online"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    className="pgm-input"
                  />
                </div>
              </div>

              {/* Row 2: QR Code Upload & Preview */}
              <div>
                <label style={{ display: 'block', fontSize: isMobile ? '0.82rem' : '0.85rem', fontWeight: '700', marginBottom: '8px', color: '#334155' }}>
                  QR Code Image (File Upload or Image URL)
                </label>

                <div className="pgm-qr-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      position: 'relative',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: isMobile ? '12px' : '16px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFilePick}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#475569', fontWeight: '700', fontSize: isMobile ? '0.82rem' : '0.88rem' }}>
                        <Upload size={17} color="#f59e0b" style={{ flexShrink: 0 }} />
                        <span>Click to browse QR Code image file</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                        Supports JPG, PNG, WEBP (Max 5MB)
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Or paste direct image URL / base64..."
                      value={qrImage}
                      onChange={(e) => setQrImage(e.target.value)}
                      className="pgm-input"
                      style={{ fontSize: '0.82rem', padding: '9px 12px' }}
                    />
                  </div>

                  {qrImage && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '10px'
                    }}>
                      <img
                        src={qrImage.startsWith('http') || qrImage.startsWith('data:') ? qrImage : `/uploads/${qrImage}`}
                        alt="QR Preview"
                        style={{
                          width: '90px',
                          height: '90px',
                          objectFit: 'contain',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1.5px solid #10b981',
                          padding: '4px'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setQrImage('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 6px'
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Frontend Visibility Toggles */}
              <div className="pgm-toggles-grid">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: isMobile ? '0.84rem' : '0.88rem', fontWeight: '700', color: '#1e293b', display: 'block' }}>
                      Show UPI ID on Frontend
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Displays copyable VPA to users
                    </span>
                  </div>
                  <label className="pgm-toggle-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(showUpi)}
                      onChange={(e) => setShowUpi(e.target.checked)}
                    />
                    <span className="pgm-slider" />
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: isMobile ? '0.84rem' : '0.88rem', fontWeight: '700', color: '#1e293b', display: 'block' }}>
                      Show QR Code on Frontend
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Renders barcode image to scan
                    </span>
                  </div>
                  <label className="pgm-toggle-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(showQr)}
                      onChange={(e) => setShowQr(e.target.checked)}
                    />
                    <span className="pgm-slider" />
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="pgm-form-footer" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={savingDefault}
                  className="pgm-btn-amber"
                  style={{
                    padding: isMobile ? '12px 20px' : '12px 28px',
                    fontSize: isMobile ? '0.9rem' : '0.94rem'
                  }}
                >
                  {savingDefault ? <RefreshCw size={17} className="animate-spin" /> : <Check size={17} />}
                  <span>{savingDefault ? 'Saving Settings...' : 'Save Manual QR Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* 5. ADD / EDIT UPI APP MODAL */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: isMobile ? '12px' : '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: isMobile ? '16px' : '20px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: isMobile ? '18px 16px' : '26px 28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
            color: '#ffffff',
            animation: 'fadeIn 0.2s ease-out',
            boxSizing: 'border-box'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: isMobile ? '1.08rem' : '1.2rem', fontWeight: '800', color: '#ffffff' }}>
                    {editingApp ? `Edit ${editingApp.app_name}` : 'Add UPI App Gateway'}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Configure deep link and receiving VPA address
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.6rem',
                  cursor: 'pointer',
                  lineHeight: '1',
                  padding: '4px'
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveApp}>
              {/* Provider selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '8px', color: '#cbd5e1' }}>
                  UPI App Provider Preset
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {[
                    { code: 'phonepe', label: 'PhonePe' },
                    { code: 'gpay', label: 'GPay' },
                    { code: 'paytm', label: 'Paytm' },
                    { code: 'bhim', label: 'BHIM' },
                    { code: 'upi', label: 'Other' }
                  ].map(item => {
                    const isSelected = formData.app_code === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          let defaultName = formData.app_name;
                          if (!editingApp) {
                            if (item.code === 'phonepe') defaultName = 'PhonePe';
                            else if (item.code === 'gpay') defaultName = 'Google Pay';
                            else if (item.code === 'paytm') defaultName = 'Paytm UPI';
                            else if (item.code === 'bhim') defaultName = 'BHIM UPI';
                            else defaultName = 'Any UPI App';
                          }
                          setFormData({ ...formData, app_code: item.code, app_name: defaultName });
                        }}
                        style={{
                          padding: '8px 2px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                          color: isSelected ? '#ffffff' : '#94a3b8',
                          fontSize: isMobile ? '0.72rem' : '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          minHeight: '38px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* App Display Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  App Display Name * (e.g. PhonePe, Google Pay, Paytm)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PhonePe"
                  value={formData.app_name}
                  onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  required
                  className="pgm-input-dark"
                />
              </div>

              {/* Receiving UPI ID */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Receiving UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210@ybl or merchant@okhdfcbank"
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  required
                  className="pgm-input-dark"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              {/* Payee Name */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Payee / Merchant Business Name (Shown in app)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pravesh Online"
                  value={formData.payee_name}
                  onChange={(e) => setFormData({ ...formData, payee_name: e.target.value })}
                  className="pgm-input-dark"
                />
              </div>

              {/* Active Toggle */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                padding: '12px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                gap: '10px'
              }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: isMobile ? '0.84rem' : '0.88rem', fontWeight: '700', color: '#ffffff', display: 'block' }}>
                    Active Status
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Enable this app intent on Add Fund page
                  </span>
                </div>
                <label className="pgm-toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="pgm-slider" />
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    minHeight: '44px',
                    flex: isMobile ? 1 : 'none'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingApp}
                  className="pgm-btn-emerald"
                  style={{
                    padding: '10px 22px',
                    fontSize: '0.88rem',
                    flex: isMobile ? 1 : 'none',
                    justifyContent: 'center'
                  }}
                >
                  {savingApp ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{savingApp ? 'Saving...' : 'Save UPI App'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentGatewayManager;
