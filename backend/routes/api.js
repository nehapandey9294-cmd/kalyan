const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const gameController = require('../controllers/gameController');
const walletController = require('../controllers/walletController');
const landingController = require('../controllers/landingController');
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middlewares/auth');

// Public Landing Information & Live Results endpoints
router.get('/landing/info', landingController.getLandingInfo);
router.get('/landing/rates', landingController.getLandingRates);
router.get('/landing/markets', landingController.getLandingMarkets);
router.get('/landing/chart/:chartType/:gameName', landingController.getChartData);
router.get('/landing/chart/:chartType', landingController.getChartData);

// Direct public aliases
router.get('/markets', landingController.getLandingMarkets);
router.get('/rates', landingController.getLandingRates);
router.get('/info', landingController.getLandingInfo);


// Health Check Endpoint (Checks Server & DB Health)
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    const db = require('../config/db');
    await db.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }

  const responseTime = `${Date.now() - startTime}ms`;

  const healthData = {
    status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
    message: dbStatus === 'connected' ? 'Server and Database are running smoothly' : 'Database connection error',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStatus,
      latency: responseTime,
      ...(dbError && { error: dbError })
    },
    system: {
      node_version: process.version,
      memory_usage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      }
    }
  };

  const statusCode = dbStatus === 'connected' ? 200 : 503;
  return res.status(statusCode).json(healthData);
});

// Public App Info / Branding endpoint
router.get('/app-info', async (req, res) => {
  try {
    const db = require('../config/db');
    // Ensure table columns exist
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN mpin_status VARCHAR(10) DEFAULT '1'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN slider_status VARCHAR(10) DEFAULT '1'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN referral_status VARCHAR(10) DEFAULT '1'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN auto_active_status VARCHAR(10) DEFAULT '1'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN privacy_policy_url TEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN data_deletion_url TEXT`);
    } catch (e) {}

    const [settings] = await db.query('SELECT app_link, upi_name, mpin_status, slider_status, referral_status, auto_active_status, alert_message, privacy_policy_url, data_deletion_url FROM admin_settings LIMIT 1');
    const [admins] = await db.query('SELECT name FROM admin WHERE id = 1');
    const [contacts] = await db.query('SELECT mobile, wp_mobile, email FROM contact_detail LIMIT 1');
    const appName = 'Kalyan Matka';

    const contactInfo = contacts.length > 0 ? contacts[0] : {};
    const wpNum = contactInfo.wp_mobile || contactInfo.mobile || '';
    const mpinStatus = (settings.length > 0 && settings[0].mpin_status !== undefined && settings[0].mpin_status !== null) ? String(settings[0].mpin_status) : '1';
    const sliderStatus = (settings.length > 0 && settings[0].slider_status !== undefined && settings[0].slider_status !== null) ? String(settings[0].slider_status) : '1';
    const referralStatus = (settings.length > 0 && settings[0].referral_status !== undefined && settings[0].referral_status !== null) ? String(settings[0].referral_status) : '1';
    const autoActiveStatus = (settings.length > 0 && settings[0].auto_active_status !== undefined && settings[0].auto_active_status !== null) ? String(settings[0].auto_active_status) : '1';
    const alertMessage = settings.length > 0 ? (settings[0].alert_message || '') : '';
    const privacyPolicyUrl = (settings.length > 0 && settings[0].privacy_policy_url) ? settings[0].privacy_policy_url : '/privacy-policy';
    const dataDeletionUrl = (settings.length > 0 && settings[0].data_deletion_url) ? settings[0].data_deletion_url : '/data-deletion';

    let sliders = [];
    if (sliderStatus === '1') {
      try {
        const [rows] = await db.query("SELECT * FROM slider_images WHERE status = '1' ORDER BY display_order ASC, id DESC");
        sliders = rows.map(r => r.slider_image);
      } catch (e) {
        sliders = [];
      }
    }

    return res.json({
      success: '1',
      data: {
        app_name: appName,
        app_logo: '/img/logo.png',
        mobile: contactInfo.mobile || '',
        wp_mobile: wpNum,
        email: contactInfo.email || 'support@saraquiz.com',
        mpin_status: mpinStatus,
        slider_status: sliderStatus,
        referral_status: referralStatus,
        auto_active_status: autoActiveStatus,
        sliders: sliders,
        alert_message: alertMessage,
        privacy_policy_url: privacyPolicyUrl,
        data_deletion_url: dataDeletionUrl
      }
    });
  } catch (err) {
    return res.json({
      success: '1',
      data: {
        app_name: 'Kalyan Matka',
        app_logo: '/img/logo.png',
        mobile: '',
        wp_mobile: '',
        email: 'support@saraquiz.com',
        mpin_status: '1',
        slider_status: '1',
        sliders: [],
        privacy_policy_url: '/privacy-policy',
        data_deletion_url: '/data-deletion'
      }
    });
  }
});

// Public Data Deletion Request Endpoint (Google Play Store Data Safety Compliance)
router.post('/request-data-deletion', async (req, res) => {
  try {
    const db = require('../config/db');
    const { phone, email, reason } = req.body;

    if (!phone || String(phone).trim().length < 10) {
      return res.status(400).json({ success: '0', msg: 'Please provide a valid 10-digit registered mobile number.' });
    }

    const cleanPhone = String(phone).trim();
    const cleanEmail = email ? String(email).trim() : '';
    const cleanReason = reason ? String(reason).trim() : 'User requested account and data deletion';

    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS data_deletion_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(100),
          reason TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          ip_address VARCHAR(45),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {}

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    await db.query(
      'INSERT INTO data_deletion_requests (phone, email, reason, ip_address, created_at) VALUES (?, ?, ?, ?, NOW())',
      [cleanPhone, cleanEmail, cleanReason, ip]
    );

    return res.json({
      success: '1',
      msg: 'Your data deletion request has been registered successfully. Your account and personal data will be completely processed and deleted within 24 to 48 hours according to our privacy terms.'
    });
  } catch (err) {
    console.error('Data Deletion Request Error:', err);
    return res.status(500).json({ success: '0', msg: 'Failed to submit request: ' + err.message });
  }
});

// Public Sliders endpoint
router.get('/sliders', async (req, res) => {
  try {
    const db = require('../config/db');
    const [settings] = await db.query('SELECT slider_status FROM admin_settings LIMIT 1');
    const sliderStatus = (settings.length > 0 && settings[0].slider_status !== undefined && settings[0].slider_status !== null) ? String(settings[0].slider_status) : '1';

    if (sliderStatus === '0') {
      return res.json({ success: '1', slider_status: '0', data: [] });
    }

    const [rows] = await db.query("SELECT * FROM slider_images WHERE status = '1' ORDER BY display_order ASC, id DESC");
    return res.json({ success: '1', slider_status: '1', data: rows });
  } catch (err) {
    return res.status(500).json({ success: '0', error: err.message });
  }
});

// Auth endpoints
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-mpin', verifyToken, authController.verifyMpin);

// Profile endpoints (Protected)
router.get('/profile', verifyToken, authController.getProfile);
router.post('/profile/update', verifyToken, authController.editProfile);
router.post('/profile/change-mpin', verifyToken, authController.changeMpin);

// Game endpoints (Protected)
router.get('/games', verifyToken, gameController.getGames);
router.get('/games/rates', verifyToken, gameController.getRates);
router.post('/games/bid', verifyToken, gameController.placeBid);
router.get('/games/bid-history', verifyToken, gameController.getBidHistory);
router.get('/games/win-history', verifyToken, gameController.getWinReport);
router.get('/games/chart', verifyToken, gameController.getGameChart);

// Wallet & Transactions endpoints (Protected)
router.get('/wallet/info', verifyToken, walletController.getWalletInfo);
router.post('/wallet/fund-request', verifyToken, walletController.submitFundRequest);
router.post('/wallet/withdraw-request', verifyToken, walletController.submitWithdrawRequest);
router.get('/wallet/history', verifyToken, walletController.getWalletHistory);
router.get('/wallet/withdraw-history', verifyToken, walletController.getWithdrawHistory);
router.get('/wallet/deposit-requests', verifyToken, walletController.getDepositRequestStatus);

// Payment Gateways & Auto Deposit Endpoints
router.get('/payment/config', paymentController.getPublicPaymentConfig);
router.post('/payment/create-order', verifyToken, paymentController.createOrder);
router.post('/payment/submit-fund', verifyToken, paymentController.submitUpiFundRequest);
router.post('/payment/verify-payment', verifyToken, paymentController.verifyPayment);

module.exports = router;
