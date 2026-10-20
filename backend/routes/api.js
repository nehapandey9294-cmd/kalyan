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
router.get('/landing/markets', landingController.getLandingMarkets);
router.get('/landing/chart/:chartType/:gameName', landingController.getChartData);
router.get('/landing/chart/:chartType', landingController.getChartData);


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
    // Ensure mpin_status and slider_status columns exist in admin_settings table
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

    const [settings] = await db.query('SELECT app_link, upi_name, mpin_status, slider_status, referral_status, auto_active_status, alert_message FROM admin_settings LIMIT 1');
    const [admins] = await db.query('SELECT name FROM admin WHERE id = 1');
    const [contacts] = await db.query('SELECT mobile, wp_mobile FROM contact_detail LIMIT 1');
    let appName = 'Lucky';
    if (settings.length > 0 && settings[0].app_link && !settings[0].app_link.startsWith('http')) {
      appName = settings[0].app_link;
    } else if (settings.length > 0 && settings[0].upi_name && !settings[0].upi_name.startsWith('http')) {
      appName = settings[0].upi_name;
    } else if (admins.length > 0 && admins[0].name) {
      appName = admins[0].name;
    }

    const contactInfo = contacts.length > 0 ? contacts[0] : {};
    const wpNum = contactInfo.wp_mobile || contactInfo.mobile || '';
    const mpinStatus = (settings.length > 0 && settings[0].mpin_status !== undefined && settings[0].mpin_status !== null) ? String(settings[0].mpin_status) : '1';
    const sliderStatus = (settings.length > 0 && settings[0].slider_status !== undefined && settings[0].slider_status !== null) ? String(settings[0].slider_status) : '1';
    const referralStatus = (settings.length > 0 && settings[0].referral_status !== undefined && settings[0].referral_status !== null) ? String(settings[0].referral_status) : '1';
    const autoActiveStatus = (settings.length > 0 && settings[0].auto_active_status !== undefined && settings[0].auto_active_status !== null) ? String(settings[0].auto_active_status) : '1';
    const alertMessage = settings.length > 0 ? (settings[0].alert_message || '') : '';

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
        mpin_status: mpinStatus,
        slider_status: sliderStatus,
        referral_status: referralStatus,
        auto_active_status: autoActiveStatus,
        sliders: sliders,
        alert_message: alertMessage
      }
    });
  } catch (err) {
    return res.json({
      success: '1',
      data: {
        app_name: 'Lucky',
        app_logo: '/img/logo.png',
        mobile: '',
        wp_mobile: '',
        mpin_status: '1',
        slider_status: '1',
        sliders: []
      }
    });
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
