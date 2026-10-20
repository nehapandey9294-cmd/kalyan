import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wallet, Copy, Check, QrCode, PlusCircle, ArrowRight,
  ShieldCheck, Zap, CreditCard, Sparkles, AlertCircle, RefreshCw,
  CheckCircle2, Lock, Smartphone, ExternalLink, ChevronDown, ChevronUp,
  X, FileText, Upload, Image as ImageIcon, Clock
} from 'lucide-react';
import api from '../utils/api';

const AddFund = () => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [amount, setAmount] = useState('500.00');
  const [amountError, setAmountError] = useState('');
  const [utrNo, setUtrNo] = useState('');
  const [utrError, setUtrError] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [showManualSection, setShowManualSection] = useState(false);
  const [showDirectManualSection, setShowDirectManualSection] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedDialogUtr, setCopiedDialogUtr] = useState(false);
  const navigate = useNavigate();

  const handleCopyDialogUtr = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDialogUtr(true);
    setTimeout(() => setCopiedDialogUtr(false), 2000);
  };

  // Mode and active UPI determination (prioritizes auto_upi_id when Auto mode is active)
  const depositMode = paymentConfig?.deposit_mode || walletInfo?.deposit_mode || 'upi_intent';
  const isAutoMode = depositMode === 'upi_intent' || depositMode === 'auto';
  const autoUpi = paymentConfig?.auto_upi_id || walletInfo?.auto_upi_id || paymentConfig?.active_upi_id || '';
  const manualUpi = paymentConfig?.default_upi_id || walletInfo?.payment_upi_id || walletInfo?.upi_payment_id || '';
  const activeUpiId = isAutoMode ? (autoUpi || manualUpi) : (manualUpi || autoUpi);
  const payeeName = paymentConfig?.payee_name || 'Pravesh Online';

  // Refs for tracking active order and focusing input fields on error
  const activeOrderRef = useRef(null);
  const launchTimeRef = useRef(null);
  const isVerifyingRef = useRef(false);
  const amountInputRef = useRef(null);
  const utrInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const directUtrInputRef = useRef(null);
  const directFileInputRef = useRef(null);
  const manualUtrInputRef = useRef(null);
  const manualFileInputRef = useRef(null);

  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);

  useEffect(() => {
    isVerifyingRef.current = verifying;
  }, [verifying]);

  const loadData = async () => {
    try {
      const [walletRes, paymentRes] = await Promise.all([
        api.get('/wallet/info'),
        api.get('/payment/config').catch(() => ({ data: { success: '0' } }))
      ]);

      if (walletRes.data?.success === '1') {
        setWalletInfo(walletRes.data.data);
      }
      if (paymentRes.data?.success === '1') {
        setPaymentConfig(paymentRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick preset amounts
  const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

  // Validation Helpers
  const getMinMaxAmounts = () => {
    const minAmt = parseFloat(walletInfo?.min_deposite || paymentConfig?.min_deposite || 100);
    const maxAmt = parseFloat(walletInfo?.max_deposite || paymentConfig?.max_deposite || 50000);
    return { minAmt, maxAmt };
  };

  const validateAmount = (val) => {
    const { minAmt, maxAmt } = getMinMaxAmounts();
    if (val === undefined || val === null || String(val).trim() === '') {
      return { isValid: false, msg: 'Deposit amount is required. Please enter an amount.' };
    }
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      return { isValid: false, msg: 'Please enter a valid numeric deposit amount.' };
    }
    if (num < minAmt) {
      return { isValid: false, msg: `Minimum deposit amount is ₹${minAmt.toFixed(2)}. Please enter ₹${minAmt.toFixed(2)} or more.` };
    }
    if (num > maxAmt) {
      return { isValid: false, msg: `Maximum deposit amount is ₹${maxAmt.toFixed(2)}. Please enter ₹${maxAmt.toFixed(2)} or less.` };
    }
    return { isValid: true, msg: '', formatted: num.toFixed(2) };
  };

  const validateUtr = (val) => {
    const clean = String(val || '').replace(/\D/g, '').trim();
    if (!clean) {
      return { isValid: false, msg: 'Please enter the 12-digit UTR reference number.' };
    }
    if (clean.length !== 12) {
      return { isValid: false, msg: `UTR number must be exactly 12 digits (currently ${clean.length} digits).` };
    }
    if (/^(\d)\1{11}$/.test(clean)) {
      return { isValid: false, msg: 'Invalid UTR Number. Dummy or repeated numbers are not accepted.' };
    }
    if (clean === '123456789012' || clean === '012345678901') {
      return { isValid: false, msg: 'Invalid UTR Number. Dummy sequential numbers are not accepted.' };
    }
    return { isValid: true, msg: '', clean };
  };

  const validateFile = (file) => {
    if (!file) return { isValid: true, msg: '' };
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return { isValid: false, msg: 'Invalid file format. Only JPG, PNG, or WEBP images are allowed.' };
    }
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return { isValid: false, msg: `File size is ${sizeMb}MB. Maximum allowed screenshot size is 5MB.` };
    }
    return { isValid: true, msg: '' };
  };

  const handleSelectPreset = (val) => {
    const formatted = Number(val).toFixed(2);
    setAmount(formatted);
    setAmountError('');
    setError('');
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setAmount('');
      setAmountError('');
      return;
    }
    // Only allow numbers with at most 2 digits after the decimal point
    const regex = /^\d*(\.\d{0,2})?$/;
    if (regex.test(val)) {
      setAmount(val);
      if (amountError) {
        const check = validateAmount(val);
        if (check.isValid) {
          setAmountError('');
        }
      }
    }
  };

  const handleAmountBlur = () => {
    if (!amount || amount.trim() === '') {
      setAmountError('Deposit amount is required. Please enter an amount.');
      return;
    }
    const check = validateAmount(amount);
    if (!check.isValid) {
      setAmountError(check.msg);
    } else {
      setAmount(check.formatted);
      setAmountError('');
    }
  };

  const handleUtrChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
    setUtrNo(val);
    if (val.length === 12) {
      const check = validateUtr(val);
      if (check.isValid) {
        setUtrError('');
      } else {
        setUtrError(check.msg);
      }
    } else if (utrError && val.length < 12) {
      setUtrError('');
    }
  };

  const handleUtrBlur = () => {
    if (!utrNo) return;
    const check = validateUtr(utrNo);
    if (!check.isValid) {
      setUtrError(check.msg);
    } else {
      setUtrError('');
    }
  };

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
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const check = validateFile(file);
    if (!check.isValid) {
      setFileError(check.msg);
      setSelectedFile(null);
      setScreenshotBase64('');
      e.target.value = '';
      return;
    }

    setFileError('');
    const sizeStr = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(file.size / 1024) + ' KB';

    setSelectedFile({
      name: file.name,
      size: sizeStr
    });

    try {
      const compressed = await compressImage(file);
      setScreenshotBase64(compressed);
    } catch (err) {
      console.warn('Compress failed:', err);
      setFileError('Could not process this image. Please select another image.');
      setSelectedFile(null);
      setScreenshotBase64('');
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setScreenshotBase64('');
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (directFileInputRef.current) directFileInputRef.current.value = '';
    if (manualFileInputRef.current) manualFileInputRef.current.value = '';
  };

  const handleCopyUpi = (upiString) => {
    const textToCopy = upiString || activeOrder?.upi_id || activeUpiId || '';
    if (textToCopy) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } catch (err) {
        console.warn('Copy error:', err);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Helper to trigger UPI intent in Android WebView and mobile browsers
  const triggerUpiLaunch = (url) => {
    if (!url) return;
    try {
      window.location.href = url;
    } catch (e) {
      console.warn('Location href failed, trying anchor:', e);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_self';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (ex) {
        console.warn('Anchor click error:', ex);
      }
    }
  };

  // SUCCESS API CALL: Verify payment with backend & credit wallet
  const callVerifyPayment = async (orderToVerify = null) => {
    const targetOrder = orderToVerify || activeOrderRef.current;
    if (!targetOrder || isVerifyingRef.current) return;

    setVerifying(true);
    isVerifyingRef.current = true;
    setError('');

    try {
      const res = await api.post('/payment/verify-payment', {
        order_id: targetOrder.order_id,
        payment_id: targetOrder.order_id,
        amount: targetOrder.amount
      });

      if (res.data?.success === '1' && res.data?.approved) {
        // Admin already approved it!
        try {
          sessionStorage.removeItem('pending_upi_order');
        } catch (e) { }

        setActiveOrder(null);
        activeOrderRef.current = null;

        // Update local wallet state
        if (res.data.wallet !== undefined) {
          setWalletInfo(prev => prev ? { ...prev, wallet: res.data.wallet } : prev);
        } else {
          loadData();
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        setPaymentSuccessData({
          amount: targetOrder.amount,
          orderId: targetOrder.order_id,
          wallet: res.data.wallet,
          isManual: false,
          dateFormatted: `${dateStr}, ${timeStr}`,
          msg: res.data.msg || `₹${targetOrder.amount} has been successfully added to your wallet!`
        });
      } else if (res.data?.pending || res.data?.status === '0') {
        // PENDING Admin approval: Clear active order and show Pending screen
        try {
          sessionStorage.removeItem('pending_upi_order');
        } catch (e) { }

        setActiveOrder(null);
        activeOrderRef.current = null;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        setPaymentSuccessData({
          amount: targetOrder.amount,
          orderId: targetOrder.order_id,
          isManual: true, // triggers the amber "Pending Admin Approval" view
          dateFormatted: `${dateStr}, ${timeStr}`,
          msg: res.data.msg || 'Deposit request submitted successfully! It is currently PENDING Admin approval.'
        });
      } else {
        // Other error or rejection
        setError(res.data?.msg || 'Payment request is pending Admin verification.');
      }
    } catch (err) {
      console.error('Verify payment error:', err);
      const serverMsg = err.response?.data?.msg || err.response?.data?.error;
      setError(serverMsg || 'Verification check in progress. Please click "Verify Now" or submit UTR.');
    } finally {
      setVerifying(false);
      isVerifyingRef.current = false;
    }
  };

  // RETURN DETECTION: When user switches back from UPI app to this browser/app
  useEffect(() => {
    const handleReturn = () => {
      if (document.visibilityState === 'visible' && activeOrderRef.current && !isVerifyingRef.current) {
        const elapsed = Date.now() - (launchTimeRef.current || 0);
        // Only trigger if at least 2.5 seconds have elapsed since launching UPI app
        if (elapsed >= 2500) {
          callVerifyPayment(activeOrderRef.current);
        }
      }
    };

    const handleFocus = () => {
      if (activeOrderRef.current && !isVerifyingRef.current) {
        const elapsed = Date.now() - (launchTimeRef.current || 0);
        if (elapsed >= 2500) {
          callVerifyPayment(activeOrderRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleReturn);
    window.addEventListener('focus', handleFocus);

    // Check for saved pending order on page load (e.g., if mobile browser refreshed in background)
    try {
      const savedPending = sessionStorage.getItem('pending_upi_order');
      if (savedPending) {
        const parsed = JSON.parse(savedPending);
        const elapsed = Date.now() - (parsed.launchTime || 0);
        // If order was created in last 15 minutes, auto resume and verify
        if (elapsed < 15 * 60 * 1000) {
          setActiveOrder(parsed);
          activeOrderRef.current = parsed;
          launchTimeRef.current = parsed.launchTime;
          // Auto verify once component mounts
          setTimeout(() => {
            callVerifyPayment(parsed);
          }, 800);
        } else {
          sessionStorage.removeItem('pending_upi_order');
        }
      }
    } catch (e) {
      sessionStorage.removeItem('pending_upi_order');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleReturn);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Primary Action: PAY NOW Button Click
  const handlePayNow = async () => {
    setError('');
    setMsg('');
    setAmountError('');

    const check = validateAmount(amount);
    if (!check.isValid) {
      setAmountError(check.msg);
      if (amountInputRef.current) {
        amountInputRef.current.focus();
        amountInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const amt = parseFloat(check.formatted);
    setProcessingPayment(true);

    try {
      const payload = {
        amount: amt,
        app_code: 'upi',
        upi_id: activeUpiId
      };

      const res = await api.post('/payment/create-order', payload);
      if (res.data.success !== '1') {
        const errorMsg = res.data.msg || 'Failed to initiate UPI payment';
        if (errorMsg.toLowerCase().includes('amount') || errorMsg.toLowerCase().includes('deposit')) {
          setAmountError(errorMsg);
        } else {
          setError(errorMsg);
        }
        setProcessingPayment(false);
        return;
      }

      const orderData = res.data.data;
      const now = Date.now();
      launchTimeRef.current = now;
      activeOrderRef.current = orderData;
      setActiveOrder(orderData);

      // Save to sessionStorage for background tab survival
      try {
        sessionStorage.setItem('pending_upi_order', JSON.stringify({
          ...orderData,
          launchTime: now
        }));
      } catch (e) { }

      // Open mobile UPI app intent (shows system chooser with PhonePe, GPay, Paytm, etc.)
      const launchUrl = orderData.generic_upi_url || orderData.upi_url;
      triggerUpiLaunch(launchUrl);

    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.msg || err.response?.data?.error;
      setError(serverMsg || 'Error launching UPI payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Manual fallback: Submit UTR in case auto verification needs manual reference
  const handleSubmitUtr = async (e, fromScreen = 'active') => {
    e.preventDefault();
    setUtrError('');
    setFileError('');
    setError('');
    setMsg('');

    // 1. Validate UTR Reference Number
    const utrCheck = validateUtr(utrNo);
    if (!utrCheck.isValid) {
      setUtrError(utrCheck.msg);
      if (fromScreen === 'manual' && manualUtrInputRef.current) {
        manualUtrInputRef.current.focus();
      } else if (fromScreen === 'direct' && directUtrInputRef.current) {
        directUtrInputRef.current.focus();
      } else if (utrInputRef.current) {
        utrInputRef.current.focus();
      }
      if (fromScreen === 'active') setShowManualSection(true);
      return;
    }

    // 2. Validate Target Deposit Amount
    const targetAmt = activeOrder?.amount || amount;
    const amtCheck = validateAmount(targetAmt);
    if (!amtCheck.isValid) {
      setAmountError(amtCheck.msg);
      if (amountInputRef.current) {
        amountInputRef.current.focus();
        amountInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await api.post('/payment/submit-fund', {
        amount: parseFloat(amtCheck.formatted),
        utr_no: utrCheck.clean,
        order_id: activeOrder?.order_id || '',
        image: screenshotBase64,
        upi_app: fromScreen === 'manual' ? 'Manual QR' : 'UPI App'
      });

      if (res.data.success === '1') {
        try {
          sessionStorage.removeItem('pending_upi_order');
        } catch (e) { }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        setPaymentSuccessData({
          amount: parseFloat(amtCheck.formatted),
          utr: utrCheck.clean,
          orderId: activeOrder?.order_id || 'MANUAL_UPI',
          isManual: true,
          dateFormatted: `${dateStr}, ${timeStr}`,
          msg: res.data.msg || 'Deposit request submitted successfully! Admin will verify and credit your wallet shortly.'
        });
        setAmount('');
        setUtrNo('');
        setSelectedFile(null);
        setScreenshotBase64('');
        setUtrError('');
        setFileError('');
        setAmountError('');
        setActiveOrder(null);
        activeOrderRef.current = null;
      } else {
        if (fromScreen === 'active') setShowManualSection(true);
        if (fromScreen === 'direct') setShowDirectManualSection(true);
        let friendlyMsg = res.data.msg || 'Invalid UTR reference number. Please check and re-enter.';
        if (typeof friendlyMsg === 'string' && /column|sql|table|out of range|row \d|syntax|query|database|foreign key/i.test(friendlyMsg)) {
          friendlyMsg = 'Unable to process deposit request right now. Please check your 12-digit UTR reference number or contact Support.';
        }
        setUtrError(friendlyMsg);
      }
    } catch (err) {
      console.error('Submit fund error:', err);
      if (fromScreen === 'active') setShowManualSection(true);
      if (fromScreen === 'direct') setShowDirectManualSection(true);

      let userFriendlyMsg = 'Unable to submit deposit request right now. Please check your 12-digit UTR reference number or contact Support.';
      const rawError = err.response?.data?.msg || err.response?.data?.error || err.message;
      if (rawError && typeof rawError === 'string') {
        const isDbError = /column|sql|table|out of range|row \d|syntax|query|database|foreign key/i.test(rawError);
        if (!isDbError && rawError.length < 150) {
          userFriendlyMsg = rawError;
        }
      }
      setUtrError(userFriendlyMsg);
    } finally {
      setSubmittingUtr(false);
    }
  };

  const showUpiSetting = paymentConfig ? (paymentConfig.show_upi === 1 || paymentConfig.show_upi === '1' || paymentConfig.show_upi === true) : true;
  const showQrSetting = paymentConfig ? (paymentConfig.show_qr === 1 || paymentConfig.show_qr === '1' || paymentConfig.show_qr === true) : true;

  const numAmt = amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 ? parseFloat(amount) : 0;
  const formattedAmt = numAmt > 0 ? numAmt.toFixed(2) : '';
  const amtQuery = formattedAmt ? `&am=${formattedAmt}` : '';

  const targetQrUpiId = activeOrder?.upi_id || activeUpiId;
  const currentQrUpiUrl = activeOrder?.generic_upi_url || activeOrder?.upi_url || (targetQrUpiId ? `upi://pay?pa=${encodeURIComponent(targetQrUpiId)}&pn=${encodeURIComponent(payeeName)}${amtQuery}&cu=INR` : '');
  const dynamicQrCodeSrc = currentQrUpiUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentQrUpiUrl)}` : '';

  const manualBarcodeImage = paymentConfig?.payment_barcode_image || walletInfo?.payment_barcode_image || '';
  const manualQrImageSrc = manualBarcodeImage
    ? (manualBarcodeImage.startsWith('http') || manualBarcodeImage.startsWith('data:')
      ? manualBarcodeImage
      : `/uploads/${manualBarcodeImage}`)
    : dynamicQrCodeSrc;

  // In Auto mode: ALWAYS show dynamic QR generated from Auto UPI ID with live amount!
  // In Manual mode: show uploaded barcode image or fallback
  const qrImageSrc = isAutoMode ? (dynamicQrCodeSrc || manualQrImageSrc) : (manualQrImageSrc || dynamicQrCodeSrc);

  if (loading) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: '#ffffff' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--color-gold, #d6be66)' }} />
        <p style={{ fontWeight: '700' }}>Loading Deposit Information...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px 36px', minHeight: '80vh' }}>

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: 'var(--app-gradient-primary, linear-gradient(135deg, #d6be66 0%, #10b981 100%))',
        padding: '10px 14px',
        borderRadius: '14px',
        marginBottom: '20px',
        color: '#0b1a30',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#0b1a30', flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </Link>
          <span style={{
            fontWeight: '800',
            fontSize: '0.92rem',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Add Fund (Instant UPI)
          </span>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: '800',
          fontSize: '0.9rem',
          background: 'rgba(11, 26, 48, 0.12)',
          padding: '6px 12px',
          borderRadius: '20px',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          <Wallet size={16} style={{ flexShrink: 0 }} />
          <span>₹{walletInfo?.wallet || '0'}</span>
        </div>
      </div>

      {/* Global Status Alerts */}
      {msg && (
        <div className="badge badge-success" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: '12px', marginBottom: '18px', textAlign: 'center', borderRadius: '10px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS / DEPOSIT SUBMITTED MODAL DIALOG                                 */}
      {/* ========================================================================= */}
      {paymentSuccessData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            backgroundColor: 'rgba(4, 10, 20, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'afDialogFadeIn 0.25s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPaymentSuccessData(null);
              loadData();
            }
          }}
        >
          <style>{`
            @keyframes afDialogFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes afDialogPopIn {
              from { 
                opacity: 0; 
                transform: scale(0.9) translateY(14px); 
              }
              to { 
                opacity: 1; 
                transform: scale(1) translateY(0); 
              }
            }
            @keyframes afPulseRing {
              0% {
                transform: scale(0.85);
                opacity: 0.9;
              }
              50% {
                transform: scale(1.18);
                opacity: 0.25;
              }
              100% {
                transform: scale(0.85);
                opacity: 0.9;
              }
            }
            @keyframes afDotPulse {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.35;
                transform: scale(0.75);
              }
            }
          `}</style>

          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '430px',
              backgroundColor: '#0d1a2d',
              backgroundImage: 'linear-gradient(180deg, #11233d 0%, #0a1526 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(214, 190, 102, 0.28)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(16, 185, 129, 0.18)',
              padding: '28px 22px 24px',
              textAlign: 'center',
              color: '#ffffff',
              overflow: 'hidden',
              animation: 'afDialogPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Top radiant glow */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '260px',
              height: '130px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(214, 190, 102, 0.15) 50%, transparent 80%)',
              filter: 'blur(25px)',
              pointerEvents: 'none'
            }} />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setPaymentSuccessData(null);
                loadData();
              }}
              aria-label="Close dialog"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                zIndex: 2,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}
            >
              <X size={16} />
            </button>

            {/* Animated Icon Badge */}
            <div style={{ position: 'relative', width: '74px', height: '74px', margin: '0 auto 16px' }}>
              {/* Outer pulsing ring */}
              <div style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                animation: 'afPulseRing 2.4s infinite ease-in-out'
              }} />

              {/* Main Badge */}
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                position: 'relative',
                zIndex: 1
              }}>
                <CheckCircle2 size={40} color="#ffffff" strokeWidth={2.6} />
              </div>
            </div>

            {/* Title & Status */}
            {paymentSuccessData.isManual || paymentSuccessData.utr ? (
              <>
                <h3 style={{
                  fontSize: '1.38rem',
                  fontWeight: '800',
                  margin: '0 0 6px 0',
                  color: '#ffffff',
                  letterSpacing: '0.01em'
                }}>
                  Deposit Request Submitted!
                </h3>
                <p style={{
                  margin: '0 0 14px 0',
                  fontSize: '0.88rem',
                  color: 'rgba(255, 255, 255, 0.75)',
                  lineHeight: 1.45
                }}>
                  Your deposit receipt has been submitted and is pending admin verification.
                </p>

                {/* Status Indicator Pill */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  marginBottom: '18px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#fbbf24',
                    boxShadow: '0 0 8px #fbbf24',
                    display: 'inline-block',
                    animation: 'afDotPulse 1.5s infinite ease-in-out'
                  }} />
                  <Clock size={13} />
                  <span>Pending Admin Approval</span>
                </div>
              </>
            ) : (
              <>
                <h3 style={{
                  fontSize: '1.42rem',
                  fontWeight: '800',
                  margin: '0 0 6px 0',
                  color: '#ffffff',
                  letterSpacing: '0.01em'
                }}>
                  Deposit Request send!
                </h3>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(254, 0, 0, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#fffb00ff',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  marginBottom: '18px'
                }}>
                  <ShieldCheck size={14} />
                  <span>Pending</span>
                </div>
              </>
            )}

            {/* Receipt Summary Card */}
            <div style={{
              backgroundColor: 'rgba(11, 23, 42, 0.65)',
              border: '1px solid rgba(214, 190, 102, 0.18)',
              borderRadius: '16px',
              padding: '16px 18px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              {/* Amount Display */}
              <div style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 255, 255, 0.55)',
                  marginBottom: '2px'
                }}>
                  Deposit Amount
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: '900',
                  color: 'var(--color-gold, #d6be66)',
                  letterSpacing: '0.01em',
                  lineHeight: 1.2
                }}>
                  ₹{Number(paymentSuccessData.amount).toFixed(2)}
                </div>
              </div>

              {/* Transaction Meta Rows */}
              <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {paymentSuccessData.utr && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: '500' }}>UTR / Reference:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyDialogUtr(paymentSuccessData.utr)}
                      title="Click to copy UTR"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: copiedDialogUtr ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                        border: copiedDialogUtr ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.14)',
                        color: copiedDialogUtr ? '#34d399' : '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{paymentSuccessData.utr}</span>
                      {copiedDialogUtr ? <Check size={12} color="#34d399" /> : <Copy size={12} style={{ opacity: 0.7 }} />}
                    </button>
                  </div>
                )}

                {paymentSuccessData.orderId && paymentSuccessData.orderId !== 'MANUAL_UPI' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: '500' }}>Order ID:</span>
                    <span style={{ fontFamily: 'monospace', color: '#ffffff', fontWeight: '600' }}>
                      {paymentSuccessData.orderId}
                    </span>
                  </div>
                )}

                {paymentSuccessData.wallet !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: '500' }}>Updated Wallet:</span>
                    <span style={{ color: '#34d399', fontWeight: '800' }}>
                      ₹{Number(paymentSuccessData.wallet).toFixed(2)}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: '500' }}>Submission Time:</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontWeight: '600', fontSize: '0.8rem' }}>
                    {paymentSuccessData.dateFormatted || 'Just now'}
                  </span>
                </div>
              </div>
            </div>

            {/* Note / Helper banner */}
            {(paymentSuccessData.isManual || paymentSuccessData.utr) && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px dashed rgba(16, 185, 129, 0.28)',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left'
              }}>
                <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.82)', lineHeight: 1.4 }}>
                  Admin will verify your payment and credit your balance within <strong>5 to 15 minutes</strong>.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => navigate('/deposit-request-status')}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '14px',
                  background: 'var(--app-gradient-primary, linear-gradient(135deg, #d6be66 0%, #10b981 100%))',
                  color: '#081424',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '0.94rem',
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)';
                }}
              >
                <span>Track Deposit Status</span>
                <ArrowRight size={17} />
              </button>

              {/* Secondary Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={{
                    padding: '11px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  }}
                >
                  Go to Home
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentSuccessData(null);
                    loadData();
                  }}
                  style={{
                    padding: '11px 14px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px dashed rgba(214, 190, 102, 0.45)',
                    color: 'var(--color-gold, #d6be66)',
                    fontWeight: '700',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(214, 190, 102, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  + Add More Fund
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: ACTIVE ORDER / AWAITING RETURN FROM MOBILE UPI APP              */}
      {/* ========================================================================= */}
      {activeOrder ? (
        <div className="card-glass-v2" style={{ padding: '24px', animation: 'fadeIn 0.2s ease-out', marginBottom: '22px' }}>

          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 14px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
              animation: 'pulse 2s infinite'
            }}>
              <Smartphone size={32} />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#10b981',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '800',
              marginBottom: '10px',
              letterSpacing: '0.04em'
            }}>
              <Sparkles size={14} />
              <span>UPI APP OPENED</span>
            </div>

            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.45rem', fontWeight: '800', color: '#ffffff' }}>
              Paying ₹{Number(activeOrder.amount).toFixed(2)}
            </h4>

            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', maxWidth: '420px', marginInline: 'auto' }}>
              Complete the payment in your UPI app. Your deposit request will remain PENDING until verified and approved by Admin.
            </p>
          </div>

          {/* Realtime verification state badge */}
          {verifying ? (
            <div style={{
              backgroundColor: 'rgba(214, 190, 102, 0.15)',
              border: '1px solid rgba(214, 190, 102, 0.35)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: 'var(--color-gold, #d6be66)',
              fontWeight: '700',
              fontSize: '0.92rem'
            }}>
              <RefreshCw size={20} className="animate-spin" />
              <span>Checking payment with server...</span>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '0.84rem'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              <span>Listening for return from your UPI app...</span>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>

            {/* MANUAL VERIFY BUTTON */}
            <button
              type="button"
              disabled={verifying}
              onClick={() => callVerifyPayment(activeOrder)}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '12px',
                fontSize: '1.02rem',
                fontWeight: '800',
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(214, 190, 102, 0.35)'
              }}
            >
              {verifying ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>VERIFYING PAYMENT...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>I HAVE PAID — SUBMIT FOR ADMIN APPROVAL</span>
                </>
              )}
            </button>

            {/* RE-OPEN APP & CANCEL BUTTONS */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => triggerUpiLaunch(activeOrder.generic_upi_url || activeOrder.upi_url)}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #f1673e 0%, #f59e0b 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(241, 103, 62, 0.3)'
                }}
              >
                <ExternalLink size={16} />
                <span>Re-Open UPI App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('pending_upi_order');
                  } catch (e) { }
                  setActiveOrder(null);
                  activeOrderRef.current = null;
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Cancel / Change
              </button>
            </div>
          </div>

          {/* FALLBACK / SCAN QR CODE OR ENTER UTR TOGGLE */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={() => setShowManualSection(!showManualSection)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 0'
              }}
            >
              <span>Scan QR Code or Submit UTR Reference</span>
              {showManualSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showManualSection && (
              <div style={{ marginTop: '16px', animation: 'fadeIn 0.2s ease-out' }}>

                {/* Dynamic QR Code & UPI ID Copy (Controlled by Admin Checkboxes) */}
                {(showQrSetting || showUpiSetting) && (
                  <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px',
                    textAlign: 'center',
                    marginBottom: '18px'
                  }}>
                    {showQrSetting && qrImageSrc && (
                      <>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '700' }}>
                          SCAN QR CODE TO PAY ₹{Number(activeOrder.amount).toFixed(2)}
                        </span>

                        <div style={{
                          backgroundColor: '#ffffff',
                          padding: '10px',
                          borderRadius: '12px',
                          display: 'inline-block',
                          marginBottom: '10px',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
                        }}>
                          <img
                            src={qrImageSrc}
                            alt="UPI QR Code"
                            style={{ width: '160px', height: '160px', objectFit: 'contain', display: 'block' }}
                            onError={(e) => {
                              if (dynamicQrCodeSrc && e.target.src !== dynamicQrCodeSrc) {
                                e.target.src = dynamicQrCodeSrc;
                              }
                            }}
                          />
                        </div>
                      </>
                    )}

                    {showUpiSetting && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginTop: showQrSetting ? '6px' : '0'
                      }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--color-gold, #d6be66)' }}>
                          {activeOrder.upi_id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUpi(activeOrder.upi_id)}
                          className="btn-gold"
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copied ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* UTR Submission Form */}
                <form onSubmit={(e) => handleSubmitUtr(e, 'active')}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700' }}>12-Digit UTR / Transaction ID *</span>
                      {utrNo && (
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          color: utrNo.length === 12 ? '#10b981' : '#f59e0b',
                          background: utrNo.length === 12 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '8px'
                        }}>
                          {utrNo.length} / 12 digits
                        </span>
                      )}
                    </label>
                    <input
                      ref={utrInputRef}
                      type="text"
                      maxLength="12"
                      inputMode="numeric"
                      className="form-input"
                      style={{
                        fontSize: '1.1rem',
                        letterSpacing: '0.08em',
                        fontWeight: '800',
                        borderColor: utrError ? '#ef4444' : (utrNo.length === 12 ? '#10b981' : 'rgba(255, 255, 255, 0.15)'),
                        boxShadow: utrError ? '0 0 14px rgba(239, 68, 68, 0.35)' : (utrNo.length === 12 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'),
                        transition: 'all 0.2s ease'
                      }}
                      placeholder="e.g. 423456789012"
                      value={utrNo}
                      onChange={handleUtrChange}
                      onBlur={handleUtrBlur}
                      required
                    />

                    {/* Inline Validation Message Near UTR Field */}
                    {utrError ? (
                      <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1.5px solid rgba(239, 68, 68, 0.45)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#fca5a5',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        animation: 'fadeIn 0.2s ease-out'
                      }}>
                        <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span>{utrError}</span>
                      </div>
                    ) : (
                      <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '6px', display: 'block' }}>
                        Enter the 12-digit numeric UTR/Ref number from your Google Pay, PhonePe or Paytm payment receipt.
                      </small>
                    )}
                  </div>

                  {/* Payment Screenshot File Input with Validation */}
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700' }}>Payment Screenshot (Optional)</span>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)' }}>JPG, PNG, WEBP (Max 5MB)</span>
                    </label>

                    {!selectedFile ? (
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        className="form-input"
                        style={{
                          borderColor: fileError ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
                          padding: '10px',
                          fontSize: '0.85rem'
                        }}
                        onChange={handleFileChange}
                      />
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        border: '1.5px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '10px',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              color: '#ffffff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {selectedFile.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>
                              {selectedFile.size} • Attached
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          title="Remove file"
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#fca5a5',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                        >
                          <X size={14} />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}

                    {/* Inline Validation Message Near File Input */}
                    {fileError && (
                      <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1.5px solid rgba(239, 68, 68, 0.45)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#fca5a5',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        animation: 'fadeIn 0.2s ease-out'
                      }}>
                        <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span>{fileError}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingUtr || !utrNo}
                    className="btn-gold"
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      letterSpacing: '0.02em',
                      cursor: utrNo ? 'pointer' : 'not-allowed',
                      opacity: utrNo ? 1 : 0.6,
                      boxShadow: '0 4px 15px rgba(214, 190, 102, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {submittingUtr ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>SUBMITTING UTR...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>SUBMIT UTR TO CREDIT WALLET</span>
                      </>
                    )}
                  </button>
                </form>

              </div>
            )}
          </div>

        </div>
      ) : (

        /* ========================================================================= */
        /* SCREEN 2: INITIAL ADD FUND VIEW (ENTER AMOUNT & CLICK PAY NOW)            */
        /* ========================================================================= */
        isAutoMode ? (
          <div>

            {/* Main Deposit Card */}
            <div className="card-glass-v2" style={{ padding: '24px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={20} style={{ color: 'var(--color-gold, #d6be66)' }} />
                  <h5 style={{ color: '#ffffff', fontWeight: '800', margin: 0, fontSize: '1.15rem' }}>
                    Auto UPI Deposit
                  </h5>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    letterSpacing: '0.04em'
                  }}>
                    DIRECT PAY
                  </span>
                </div>
                <Link
                  to="/deposit-request-status"
                  style={{ color: 'var(--color-gold, #d6be66)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Deposit History</span> <ArrowRight size={14} />
                </Link>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} style={{ color: 'var(--color-gold, #d6be66)' }} />
                    <span>Quick Select Amount (₹)</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: '600' }}>
                    Tap to auto-fill
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px'
                }}>
                  {PRESET_AMOUNTS.map(preset => {
                    const isSelected = Number(amount) === preset;
                    const isPopular = preset === 500;
                    const isHot = preset === 2000;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        style={{
                          position: 'relative',
                          padding: '12px 6px',
                          borderRadius: '12px',
                          border: isSelected
                            ? '2px solid var(--color-gold, #d6be66)'
                            : '1px solid rgba(255, 255, 255, 0.12)',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(214, 190, 102, 0.22) 0%, rgba(214, 190, 102, 0.08) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                          color: isSelected ? 'var(--color-gold, #d6be66)' : '#ffffff',
                          fontWeight: '800',
                          fontSize: '1.05rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          boxShadow: isSelected
                            ? '0 0 16px rgba(214, 190, 102, 0.35), 0 4px 12px rgba(0, 0, 0, 0.4)'
                            : '0 2px 6px rgba(0, 0, 0, 0.2)',
                          transform: isSelected ? 'translateY(-2px)' : 'none',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(214, 190, 102, 0.5)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.transform = 'none';
                          }
                        }}
                      >
                        {/* Popular / Best Value Badge */}
                        {isPopular && (
                          <span style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '8px',
                            background: 'linear-gradient(135deg, #FFE066 0%, #D4AF37 100%)',
                            color: '#0b1a30',
                            fontSize: '0.58rem',
                            fontWeight: '900',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                          }}>
                            POPULAR
                          </span>
                        )}
                        {isHot && (
                          <span style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '8px',
                            background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                            color: '#ffffff',
                            fontSize: '0.58rem',
                            fontWeight: '900',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                          }}>
                            TOP PICK
                          </span>
                        )}

                        <span style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '2px',
                          letterSpacing: '0.02em',
                          lineHeight: 1.2
                        }}>
                          <span style={{ fontSize: '0.82rem', opacity: isSelected ? 1 : 0.7, fontWeight: '700' }}>+₹</span>
                          <span>{preset.toLocaleString('en-IN')}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700' }}>Deposit Amount (₹) *</span>
                  {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                    <span style={{ fontSize: '0.78rem', color: amountError ? '#ef4444' : 'var(--color-gold, #d6be66)', fontWeight: '700' }}>
                      Entered: ₹{parseFloat(amount).toFixed(2)}
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: '800',
                    fontSize: '1.25rem',
                    color: amountError ? '#ef4444' : 'var(--color-gold, #d6be66)'
                  }}>
                    ₹
                  </span>
                  <input
                    ref={amountInputRef}
                    type="text"
                    inputMode="decimal"
                    className="form-input"
                    style={{
                      paddingLeft: '40px',
                      fontSize: '1.2rem',
                      fontWeight: '800',
                      borderRadius: '12px',
                      border: amountError
                        ? '1.8px solid #ef4444'
                        : (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) >= (walletInfo?.min_deposite || 100) ? '1.8px solid rgba(16, 185, 129, 0.6)' : '1.5px solid rgba(214, 190, 102, 0.3)'),
                      background: 'rgba(11, 26, 48, 0.4)',
                      boxShadow: amountError ? '0 0 14px rgba(239, 68, 68, 0.35)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    placeholder={`Min ₹${Number(walletInfo?.min_deposite || 100).toFixed(2)} - Max ₹${Number(walletInfo?.max_deposite || 50000).toFixed(2)}`}
                    value={amount}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    required
                  />
                </div>

                {/* Inline Validation Error Message Directly Near Amount Field */}
                {amountError ? (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1.5px solid rgba(239, 68, 68, 0.45)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fca5a5',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>{amountError}</span>
                  </div>
                ) : (
                  <small style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.78rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Minimum: ₹{Number(walletInfo?.min_deposite || 100).toFixed(2)}</span>
                    <span>•</span>
                    <span>Maximum: ₹{Number(walletInfo?.max_deposite || 50000).toFixed(2)}</span>
                  </small>
                )}
              </div>

              {/* BIG PRIMARY "PAY NOW" BUTTON (OPENS MOBILE UPI APP DIRECTLY) */}
              <button
                type="button"
                disabled={processingPayment || !amount || parseFloat(amount) <= 0}
                onClick={handlePayNow}
                className="btn-gold"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '14px',
                  fontSize: '1.1rem',
                  fontWeight: '900',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 25px rgba(214, 190, 102, 0.4)',
                  cursor: (processingPayment || !amount) ? 'not-allowed' : 'pointer'
                }}
              >
                {processingPayment ? (
                  <>
                    <RefreshCw size={22} className="animate-spin" />
                    <span>OPENING UPI APP...</span>
                  </>
                ) : (
                  <>
                    <Zap size={22} />
                    <span>PAY NOW {amount && Number(amount) > 0 ? `₹${Number(amount).toFixed(2)}` : ''}</span>
                  </>
                )}
              </button>

              {/* Security & Feature Badges */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.76rem',
                color: 'rgba(255, 255, 255, 0.6)',
                flexWrap: 'wrap'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} color="#10b981" />
                  <span>Instant Auto Credit</span>
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Smartphone size={14} color="var(--color-gold, #d6be66)" />
                  <span>Supports All UPI Apps</span>
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={13} color="#60a5fa" />
                  <span>NPCI UPI 256-Bit</span>
                </span>
              </div>

            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------------------- */
          /* MANUAL MODE VIEW: QR CODE + SUBMIT REQUEST FORM (NO "PAY NOW" BUTTON)     */
          /* ------------------------------------------------------------------------- */
          <div>
            {/* Main Container Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} style={{ color: 'var(--color-gold, #d6be66)' }} />
                <h5 style={{ color: '#ffffff', fontWeight: '800', margin: 0, fontSize: '1.15rem' }}>
                  Manual QR & UPI Deposit
                </h5>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  letterSpacing: '0.04em'
                }}>
                  MANUAL MODE
                </span>
              </div>
              <Link
                to="/deposit-request-status"
                style={{ color: 'var(--color-gold, #d6be66)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Deposit History</span> <ArrowRight size={14} />
              </Link>
            </div>

            {/* STEP 1: QR CODE & UPI ADDRESS CARD */}
            <div
              className="card-glass-v2"
              style={{
                padding: '22px 18px',
                borderRadius: '18px',
                marginBottom: '20px',
                textAlign: 'center',
                border: '1.5px solid rgba(214, 190, 102, 0.35)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(214, 190, 102, 0.15)',
                border: '1px solid rgba(214, 190, 102, 0.35)',
                padding: '4px 12px',
                borderRadius: '20px',
                color: 'var(--color-gold, #d6be66)',
                fontSize: '0.78rem',
                fontWeight: '800',
                marginBottom: '14px',
                letterSpacing: '0.04em'
              }}>
                <QrCode size={15} />
                <span>STEP 1: SCAN QR OR COPY UPI ID</span>
              </div>

              {/* QR Image Box */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '16px',
                display: 'inline-block',
                boxShadow: '0 8px 26px rgba(0, 0, 0, 0.45)',
                marginBottom: '14px'
              }}>
                <img
                  src={qrImageSrc}
                  alt="Payment QR Code"
                  style={{
                    width: '200px',
                    height: '200px',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto'
                  }}
                  onError={(e) => {
                    if (dynamicQrCodeSrc && e.target.src !== dynamicQrCodeSrc) {
                      e.target.src = dynamicQrCodeSrc;
                    }
                  }}
                />
              </div>

              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '14px' }}>
                Scan using <strong>Google Pay, PhonePe, Paytm, BHIM</strong> or any UPI App to transfer the deposit amount.
              </div>

              {/* Official UPI ID Box with COPY Button */}
              {activeUpiId && (
                <div
                  onClick={() => handleCopyUpi(activeUpiId)}
                  title="Tap to copy UPI ID"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    backgroundColor: 'rgba(11, 26, 48, 0.75)',
                    border: copied
                      ? '1.5px solid #10b981'
                      : '1.5px solid rgba(214, 190, 102, 0.4)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: copied
                      ? '0 0 16px rgba(16, 185, 129, 0.35)'
                      : 'inset 0 2px 4px rgba(0, 0, 0, 0.35)'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.55)', fontWeight: '700', textTransform: 'uppercase' }}>
                      Official Payee UPI ID
                    </span>
                    <span style={{
                      fontSize: '0.92rem',
                      fontWeight: '800',
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: 'monospace, -apple-system, sans-serif',
                      letterSpacing: '0.01em',
                      marginTop: '2px'
                    }}>
                      {activeUpiId}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyUpi(activeUpiId);
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      letterSpacing: '0.03em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      border: 'none',
                      background: copied
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #FFE066 0%, #D4AF37 100%)',
                      color: copied ? '#ffffff' : '#0b1a30',
                      boxShadow: copied
                        ? '0 2px 8px rgba(16, 185, 129, 0.4)'
                        : '0 2px 8px rgba(214, 190, 102, 0.35)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2: DEPOSIT REQUEST SUBMISSION FORM (NOT COLLAPSED, DIRECTLY OPEN!) */}
            <div
              className="card-glass-v2"
              style={{
                padding: '24px',
                borderRadius: '18px',
                marginBottom: '22px',
                border: '1.5px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                padding: '4px 12px',
                borderRadius: '20px',
                color: '#10b981',
                fontSize: '0.78rem',
                fontWeight: '800',
                marginBottom: '12px',
                letterSpacing: '0.04em'
              }}>
                <FileText size={15} />
                <span>STEP 2: SUBMIT DEPOSIT REQUEST</span>
              </div>

              <h5 style={{ color: '#ffffff', fontWeight: '800', margin: '0 0 6px 0', fontSize: '1.1rem' }}>
                Submit 12-Digit UTR for Verification
              </h5>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '20px', lineHeight: 1.45 }}>
                Enter the amount transferred and the 12-digit UTR reference number from your Google Pay, PhonePe, or Paytm receipt. Admin will verify and approve your request.
              </p>

              <form onSubmit={(e) => handleSubmitUtr(e, 'manual')}>
                {/* Amount Selection Chips */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.84rem' }}>
                      Select Amount (₹) *
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: '600' }}>
                      Tap to auto-fill
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px'
                  }}>
                    {PRESET_AMOUNTS.map(preset => {
                      const isSelected = Number(amount) === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '10px',
                            border: isSelected
                              ? '2px solid var(--color-gold, #d6be66)'
                              : '1px solid rgba(255, 255, 255, 0.12)',
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(214, 190, 102, 0.22) 0%, rgba(214, 190, 102, 0.08) 100%)'
                              : 'rgba(255, 255, 255, 0.04)',
                            color: isSelected ? 'var(--color-gold, #d6be66)' : '#ffffff',
                            fontWeight: '800',
                            fontSize: '0.96rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          +₹{preset.toLocaleString('en-IN')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700' }}>Deposit Amount (₹) *</span>
                    {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                      <span style={{ fontSize: '0.78rem', color: amountError ? '#ef4444' : 'var(--color-gold, #d6be66)', fontWeight: '700' }}>
                        Entered: ₹{parseFloat(amount).toFixed(2)}
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: '800',
                      fontSize: '1.2rem',
                      color: amountError ? '#ef4444' : 'var(--color-gold, #d6be66)'
                    }}>
                      ₹
                    </span>
                    <input
                      ref={amountInputRef}
                      type="text"
                      inputMode="decimal"
                      className="form-input"
                      style={{
                        paddingLeft: '38px',
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        borderRadius: '12px',
                        borderColor: amountError ? '#ef4444' : 'rgba(255, 255, 255, 0.18)',
                        background: 'rgba(11, 26, 48, 0.45)'
                      }}
                      placeholder={`Min ₹${Number(walletInfo?.min_deposite || 100).toFixed(2)} - Max ₹${Number(walletInfo?.max_deposite || 50000).toFixed(2)}`}
                      value={amount}
                      onChange={handleAmountChange}
                      onBlur={handleAmountBlur}
                      required
                    />
                  </div>
                  {amountError && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1.5px solid rgba(239, 68, 68, 0.45)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#fca5a5',
                      fontSize: '0.82rem',
                      fontWeight: '700'
                    }}>
                      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>{amountError}</span>
                    </div>
                  )}
                </div>

                {/* 12-Digit UTR Reference Input */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700' }}>12-Digit UTR / Ref No *</span>
                    {utrNo && (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        color: utrNo.length === 12 ? '#10b981' : '#f59e0b',
                        background: utrNo.length === 12 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '8px'
                      }}>
                        {utrNo.length} / 12 digits
                      </span>
                    )}
                  </label>
                  <input
                    ref={manualUtrInputRef}
                    type="text"
                    maxLength="12"
                    inputMode="numeric"
                    className="form-input"
                    style={{
                      fontSize: '1.1rem',
                      letterSpacing: '0.08em',
                      fontWeight: '800',
                      borderColor: utrError ? '#ef4444' : (utrNo.length === 12 ? '#10b981' : 'rgba(255, 255, 255, 0.18)'),
                      boxShadow: utrError ? '0 0 14px rgba(239, 68, 68, 0.35)' : (utrNo.length === 12 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'),
                      transition: 'all 0.2s ease',
                      background: 'rgba(11, 26, 48, 0.45)'
                    }}
                    placeholder="e.g. 423456789012"
                    value={utrNo}
                    onChange={handleUtrChange}
                    onBlur={handleUtrBlur}
                    required
                  />
                  {utrError ? (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1.5px solid rgba(239, 68, 68, 0.45)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#fca5a5',
                      fontSize: '0.82rem',
                      fontWeight: '700'
                    }}>
                      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>{utrError}</span>
                    </div>
                  ) : (
                    <small style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '6px', display: 'block' }}>
                      12-digit numeric reference number from Google Pay, PhonePe, or Paytm receipt.
                    </small>
                  )}
                </div>

                {/* Payment Screenshot Upload */}
                <div className="form-group" style={{ marginBottom: '22px' }}>
                  <label className="form-label" style={{ fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700' }}>Payment Screenshot (Optional)</span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)' }}>JPG, PNG, WEBP (Max 5MB)</span>
                  </label>

                  {!selectedFile ? (
                    <input
                      ref={manualFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      className="form-input"
                      style={{
                        borderColor: fileError ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
                        padding: '10px',
                        fontSize: '0.85rem'
                      }}
                      onChange={handleFileChange}
                    />
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      border: '1.5px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '10px',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {selectedFile.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>
                            {selectedFile.size} • Attached
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        title="Remove file"
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#fca5a5',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        <X size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}

                  {fileError && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1.5px solid rgba(239, 68, 68, 0.45)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#fca5a5',
                      fontSize: '0.82rem',
                      fontWeight: '700'
                    }}>
                      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>

                {/* Submit Deposit Request Button */}
                <button
                  type="submit"
                  disabled={submittingUtr || !utrNo || !amount || parseFloat(amount) <= 0}
                  className="btn-gold"
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '14px',
                    fontSize: '1.05rem',
                    fontWeight: '800',
                    letterSpacing: '0.03em',
                    cursor: (submittingUtr || !utrNo || !amount) ? 'not-allowed' : 'pointer',
                    opacity: (utrNo && amount) ? 1 : 0.65,
                    boxShadow: '0 8px 24px rgba(214, 190, 102, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {submittingUtr ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>SUBMITTING DEPOSIT REQUEST...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>SUBMIT DEPOSIT REQUEST {amount && Number(amount) > 0 ? `(₹${Number(amount).toFixed(2)})` : ''}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Note banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.65)'
              }}>
                <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0 }} />
                <span>Admin verifies deposit requests manually in <strong>Fund Request</strong> tab and credits your wallet.</span>
              </div>
            </div>
          </div>
        )
      )}

    </div>
  );
};

export default AddFund;
