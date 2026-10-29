const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { getISTDate, getISTDateStr, getISTTime12h, getISTDateTimeStr } = require('../utils/istDate');

// Default initial UPI apps for seeding
const DEFAULT_UPI_APPS = [
  {
    app_name: 'PhonePe',
    app_code: 'phonepe',
    upi_id: '',
    payee_name: 'Pravesh',
    is_active: 1,
    display_order: 1
  },
  {
    app_name: 'Google Pay',
    app_code: 'gpay',
    upi_id: '',
    payee_name: 'Pravesh',
    is_active: 1,
    display_order: 2
  },
  {
    app_name: 'Paytm UPI',
    app_code: 'paytm',
    upi_id: '',
    payee_name: 'Pravesh',
    is_active: 1,
    display_order: 3
  },
  {
    app_name: 'BHIM UPI',
    app_code: 'bhim',
    upi_id: '',
    payee_name: 'Pravesh',
    is_active: 1,
    display_order: 4
  },
  {
    app_name: 'Any UPI App',
    app_code: 'upi',
    upi_id: '',
    payee_name: 'Pravesh',
    is_active: 1,
    display_order: 5
  }
];

// Initialize UPI schema & Seed default apps
let isInitialized = false;
async function initUpiSchema() {
  if (isInitialized) return;
  try {
    // 1. Ensure admin_settings columns exist
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN deposit_mode VARCHAR(20) DEFAULT 'upi_intent'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN active_payment_gateway VARCHAR(50) DEFAULT 'upi_intent'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN payment_upi_id VARCHAR(150) DEFAULT ''`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN upi_payment_id VARCHAR(150) DEFAULT ''`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN payment_barcode_image LONGTEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings MODIFY COLUMN payment_barcode_image LONGTEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN show_upi TINYINT(1) DEFAULT 1`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN show_qr TINYINT(1) DEFAULT 1`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN auto_upi_id VARCHAR(150) DEFAULT ''`);
    } catch (e) {}

    // Ensure user_auto_deposite columns txt_id and txt_request can store VARCHAR strings (e.g. 12-digit UTR)
    try {
      await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_id VARCHAR(150) NOT NULL DEFAULT '0'`);
    } catch (e1) {
      try {
        await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_id VARCHAR(150) DEFAULT '0'`);
      } catch (e2) {
        try {
          await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_id BIGINT DEFAULT 0`);
        } catch (e3) {
          console.warn('Could not alter user_auto_deposite.txt_id:', e3.message);
        }
      }
    }

    try {
      await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_request VARCHAR(150) NOT NULL DEFAULT ''`);
    } catch (e1) {
      try {
        await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_request VARCHAR(150) DEFAULT ''`);
      } catch (e2) {}
    }

    // 2. Create upi_gateways table
    await db.query(`
      CREATE TABLE IF NOT EXISTS upi_gateways (
        id INT AUTO_INCREMENT PRIMARY KEY,
        app_name VARCHAR(100) NOT NULL,
        app_code VARCHAR(50) DEFAULT 'upi',
        upi_id VARCHAR(150) NOT NULL,
        payee_name VARCHAR(150) DEFAULT '',
        is_active TINYINT(1) DEFAULT 1,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3. Check if table is empty, seed initial apps
    const [existing] = await db.query('SELECT COUNT(*) AS count FROM upi_gateways');
    if (existing[0].count === 0) {
      const [settingsList] = await db.query('SELECT payment_upi_id, upi_payment_id, phonepepay_upi, gpay_upi, ac_name FROM admin_settings LIMIT 1');
      const settings = settingsList && settingsList[0] ? settingsList[0] : {};
      const defaultUpi = settings?.payment_upi_id || settings?.upi_payment_id || 'payment@upi';
      const payeeName = settings?.ac_name || 'Pravesh Online';

      for (const item of DEFAULT_UPI_APPS) {
        let appUpi = defaultUpi;
        if (item.app_code === 'phonepe' && settings?.phonepepay_upi) {
          appUpi = settings.phonepepay_upi;
        } else if (item.app_code === 'gpay' && settings?.gpay_upi) {
          appUpi = settings.gpay_upi;
        }

        await db.query(
          `INSERT INTO upi_gateways (app_name, app_code, upi_id, payee_name, is_active, display_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [item.app_name, item.app_code, appUpi, payeeName, item.is_active, item.display_order]
        );
      }
    }

    const [debugSettings] = await db.query('SELECT id, deposit_mode, payment_upi_id, upi_payment_id, auto_upi_id FROM admin_settings LIMIT 1');
    console.log('[DEBUG admin_settings]:', debugSettings && debugSettings[0]);

    // Clean up ghost unconfirmed intent requests created merely by clicking Pay Now (txt_id = '0' and status = '0')
    try {
      await db.query("DELETE FROM user_auto_deposite WHERE txt_id = '0' AND status = '0' AND txt_request LIKE 'UPI_%'");
      await db.query("DELETE FROM user_fund_request WHERE status = '0' AND trans_details LIKE 'Auto UPI%Order: UPI_%' AND trans_details NOT LIKE '%UTR:%'");
    } catch (cleanErr) {
      console.warn('Ghost request cleanup notice:', cleanErr.message);
    }

    isInitialized = true;
  } catch (err) {
    console.error('Error initializing upi_gateways schema:', err.message);
  }
}

// Helper: Reliably fetch the admin_settings record regardless of id column value
async function getAdminSettingsRow() {
  const [rows] = await db.query('SELECT * FROM admin_settings LIMIT 1');
  return (rows && rows.length > 0) ? rows[0] : {};
}

// Auto-run schema init on load
initUpiSchema();

// Admin: Get all UPI Apps & Current Deposit Settings
exports.getAdminGateways = async (req, res) => {
  try {
    await initUpiSchema();

    // 1. Get settings from admin_settings
    const settings = await getAdminSettingsRow();
    const depositMode = settings?.deposit_mode || 'upi_intent';
    const defaultUpiId = settings?.payment_upi_id || settings?.upi_payment_id || '';
    const autoUpiId = settings?.auto_upi_id || '';
    const payeeName = settings?.ac_name || 'Pravesh';
    const paymentBarcodeImage = settings?.payment_barcode_image || '';
    const showUpi = settings?.show_upi !== undefined ? settings.show_upi : 1;
    const showQr = settings?.show_qr !== undefined ? settings.show_qr : 1;

    // 2. Get all UPI Apps
    const [upiApps] = await db.query('SELECT * FROM upi_gateways ORDER BY display_order ASC, id ASC');

    return res.json({
      success: '1',
      deposit_mode: depositMode,
      default_upi_id: defaultUpiId,
      auto_upi_id: autoUpiId,
      payee_name: payeeName,
      payment_barcode_image: paymentBarcodeImage,
      show_upi: showUpi,
      show_qr: showQr,
      min_deposite: settings?.min_deposite || '100',
      max_deposite: settings?.max_deposite || '50000',
      upi_apps: upiApps,
      // Backward compatibility fields
      active_payment_gateway: 'upi_intent',
      gateways: []
    });
  } catch (err) {
    console.error('getAdminGateways error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin: Add New UPI App
exports.addUpiApp = async (req, res) => {
  const { app_name, app_code, upi_id, payee_name, is_active } = req.body;

  if (!app_name || !app_name.trim()) {
    return res.status(400).json({ success: '0', msg: 'UPI App Name is required (e.g. Google Pay, PhonePe)' });
  }
  if (!upi_id || !upi_id.trim()) {
    return res.status(400).json({ success: '0', msg: 'UPI ID is required (e.g. merchant@okhdfcbank)' });
  }

  try {
    await initUpiSchema();

    const cleanName = app_name.trim();
    const cleanUpi = upi_id.trim();
    const cleanPayee = (payee_name || '').trim();
    const code = (app_code || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')).slice(0, 50) || 'upi';
    const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    // Get max display order
    const [[maxRow]] = await db.query('SELECT MAX(display_order) as max_order FROM upi_gateways');
    const displayOrder = (maxRow?.max_order || 0) + 1;

    const [result] = await db.query(
      `INSERT INTO upi_gateways (app_name, app_code, upi_id, payee_name, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanName, code, cleanUpi, cleanPayee, active, displayOrder]
    );

    // If default UPI in admin_settings is empty, sync it
    const settings = await getAdminSettingsRow();
    if (!settings?.payment_upi_id && !settings?.upi_payment_id) {
      if (settings?.id !== undefined) {
        await db.query('UPDATE admin_settings SET payment_upi_id = ?, upi_payment_id = ? WHERE id = ?', [cleanUpi, cleanUpi, settings.id]);
      } else {
        await db.query('UPDATE admin_settings SET payment_upi_id = ?, upi_payment_id = ?', [cleanUpi, cleanUpi]);
      }
    }

    return res.json({
      success: '1',
      msg: `UPI App "${cleanName}" added successfully!`,
      app_id: result.insertId
    });
  } catch (err) {
    console.error('addUpiApp error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin: Update UPI App
exports.updateUpiApp = async (req, res) => {
  const { id, app_name, app_code, upi_id, payee_name, is_active } = req.body;

  if (!id) {
    return res.status(400).json({ success: '0', msg: 'App ID is required' });
  }

  try {
    await initUpiSchema();

    const [existing] = await db.query('SELECT * FROM upi_gateways WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: '0', msg: 'UPI App not found' });
    }

    const current = existing[0];
    const cleanName = app_name !== undefined ? app_name.trim() : current.app_name;
    const cleanUpi = upi_id !== undefined ? upi_id.trim() : current.upi_id;
    const cleanPayee = payee_name !== undefined ? payee_name.trim() : current.payee_name;
    const code = app_code !== undefined ? app_code : current.app_code;
    const active = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;

    await db.query(
      `UPDATE upi_gateways SET app_name = ?, app_code = ?, upi_id = ?, payee_name = ?, is_active = ? WHERE id = ?`,
      [cleanName, code, cleanUpi, cleanPayee, active, id]
    );

    return res.json({
      success: '1',
      msg: `UPI App "${cleanName}" updated successfully!`
    });
  } catch (err) {
    console.error('updateUpiApp error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin: Delete UPI App
exports.deleteUpiApp = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: '0', msg: 'App ID is required' });
  }

  try {
    await initUpiSchema();
    await db.query('DELETE FROM upi_gateways WHERE id = ?', [id]);
    return res.json({
      success: '1',
      msg: 'UPI App removed successfully'
    });
  } catch (err) {
    console.error('deleteUpiApp error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin: Toggle UPI App Active Status
exports.toggleUpiApp = async (req, res) => {
  const { id, is_active } = req.body;
  if (!id) {
    return res.status(400).json({ success: '0', msg: 'App ID is required' });
  }

  try {
    await initUpiSchema();
    const active = is_active ? 1 : 0;
    await db.query('UPDATE upi_gateways SET is_active = ? WHERE id = ?', [active, id]);
    return res.json({
      success: '1',
      msg: `UPI App status updated to ${active ? 'Active' : 'Inactive'}`
    });
  } catch (err) {
    console.error('toggleUpiApp error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin: Set Primary / Default UPI ID, Payee Name & QR Code Settings
exports.setDefaultUpi = async (req, res) => {
  const { upi_id, auto_upi_id, payee_name, payment_barcode_image, show_upi, show_qr } = req.body;

  try {
    await initUpiSchema();
    const cleanUpi = (upi_id || auto_upi_id || '').trim();
    const cleanPayee = (payee_name || '').trim();
    const cleanQr = payment_barcode_image !== undefined ? (payment_barcode_image || '') : undefined;
    const isShowUpi = show_upi !== undefined ? (show_upi === 1 || show_upi === '1' || show_upi === true ? 1 : 0) : undefined;
    const isShowQr = show_qr !== undefined ? (show_qr === 1 || show_qr === '1' || show_qr === true ? 1 : 0) : undefined;

    let updateQuery = 'UPDATE admin_settings SET payment_upi_id = ?, upi_payment_id = ?';
    let queryParams = [cleanUpi, cleanUpi];

    if (auto_upi_id !== undefined && auto_upi_id !== null) {
      updateQuery += ', auto_upi_id = ?';
      queryParams.push(auto_upi_id.trim());
    }
    if (cleanPayee) {
      updateQuery += ', ac_name = ?';
      queryParams.push(cleanPayee);
    }
    if (cleanQr !== undefined) {
      updateQuery += ', payment_barcode_image = ?';
      queryParams.push(cleanQr);
    }
    if (isShowUpi !== undefined) {
      updateQuery += ', show_upi = ?';
      queryParams.push(isShowUpi);
    }
    if (isShowQr !== undefined) {
      updateQuery += ', show_qr = ?';
      queryParams.push(isShowQr);
    }

    const settingsRow = await getAdminSettingsRow();
    if (settingsRow && settingsRow.id !== undefined) {
      updateQuery += ' WHERE id = ?';
      queryParams.push(settingsRow.id);
    }
    await db.query(updateQuery, queryParams);

    return res.json({
      success: '1',
      msg: 'UPI & QR Code configuration saved successfully!'
    });
  } catch (err) {
    console.error('setDefaultUpi error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin: Set Auto Deposit UPI ID (Direct UPI App Open)
exports.setAutoUpi = async (req, res) => {
  const { auto_upi_id } = req.body;
  if (!auto_upi_id || !auto_upi_id.trim()) {
    return res.status(400).json({ success: '0', msg: 'Auto Deposit UPI ID is required (e.g. autodeposit@paytm)' });
  }

  try {
    await initUpiSchema();
    const cleanUpi = auto_upi_id.trim();

    const settingsRow = await getAdminSettingsRow();
    if (settingsRow && settingsRow.id !== undefined) {
      await db.query('UPDATE admin_settings SET auto_upi_id = ?, deposit_mode = "upi_intent" WHERE id = ?', [cleanUpi, settingsRow.id]);
    } else {
      await db.query('UPDATE admin_settings SET auto_upi_id = ?, deposit_mode = "upi_intent"');
    }

    // Also sync all upi_gateways rows so any intent lookups use this clean auto UPI ID
    await db.query('UPDATE upi_gateways SET upi_id = ?', [cleanUpi]);

    return res.json({
      success: '1',
      msg: 'Auto Deposit UPI ID saved successfully!',
      auto_upi_id: cleanUpi
    });
  } catch (err) {
    console.error('setAutoUpi error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin: Set Deposit Mode ('upi_intent' or 'manual')
exports.setDepositMode = async (req, res) => {
  const { deposit_mode } = req.body;
  if (!deposit_mode) {
    return res.status(400).json({ success: '0', msg: 'Deposit mode is required' });
  }

  try {
    await initUpiSchema();
    const mode = deposit_mode.toLowerCase();
    const settingsRow = await getAdminSettingsRow();
    if (settingsRow && settingsRow.id !== undefined) {
      await db.query('UPDATE admin_settings SET deposit_mode = ? WHERE id = ?', [mode, settingsRow.id]);
    } else {
      await db.query('UPDATE admin_settings SET deposit_mode = ?', [mode]);
    }

    return res.json({
      success: '1',
      msg: `Deposit mode updated to ${mode.toUpperCase()}`,
      deposit_mode: mode
    });
  } catch (err) {
    console.error('setDepositMode error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Legacy compatibility stubs for admin
exports.updateGatewayConfig = async (req, res) => {
  return exports.updateUpiApp(req, res);
};

exports.setActiveGateway = async (req, res) => {
  return res.json({ success: '1', msg: 'UPI Intent Gateway Active' });
};

// User/Public: Get Active UPI Apps & Deposit Configuration
exports.getPublicPaymentConfig = async (req, res) => {
  try {
    await initUpiSchema();

    const settings = await getAdminSettingsRow();

    const depositMode = settings?.deposit_mode || 'upi_intent';
    const isAuto = depositMode === 'upi_intent' || depositMode === 'auto';
    const autoUpi = settings?.auto_upi_id || '';
    const defaultUpi = settings?.payment_upi_id || settings?.upi_payment_id || '';
    const activeUpi = isAuto ? (autoUpi || defaultUpi) : (defaultUpi || autoUpi);
    const payeeName = settings?.ac_name || 'Pravesh Online';

    // Get active UPI apps
    const [upiApps] = await db.query(
      'SELECT id, app_name, app_code, upi_id, payee_name, display_order FROM upi_gateways WHERE is_active = 1 ORDER BY display_order ASC, id ASC'
    );

    return res.json({
      success: '1',
      deposit_mode: depositMode,
      auto_upi_id: autoUpi,
      default_upi_id: defaultUpi,
      active_upi_id: activeUpi,
      payee_name: payeeName,
      min_deposite: settings?.min_deposite || '100',
      max_deposite: settings?.max_deposite || '50000',
      payment_barcode_image: settings?.payment_barcode_image || '',
      show_upi: settings?.show_upi ?? 1,
      show_qr: settings?.show_qr ?? 1,
      upi_apps: upiApps,
      // Backward compatibility stub for existing auto deposit code
      active_gateway: {
        id: 'upi_intent',
        name: 'Direct UPI App',
        icon: 'Zap',
        category: 'UPI Direct',
        description: 'Instant UPI App Payment (PhonePe, GPay, Paytm, BHIM)'
      }
    });
  } catch (err) {
    console.error('getPublicPaymentConfig error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Helper: Build UPI URI deep link
function buildUpiUri(appCode, upiId, payeeName, amount, orderId) {
  const encUpi = encodeURIComponent(upiId);
  const encName = encodeURIComponent(payeeName || 'Pravesh');
  const encNote = encodeURIComponent(orderId);
  const formattedAmount = Number(amount).toFixed(2);
  const baseQuery = `pa=${encUpi}&pn=${encName}&am=${formattedAmount}&cu=INR&tn=${encNote}&tr=${encNote}`;

  switch (appCode) {
    case 'phonepe':
      return {
        scheme_url: `phonepe://pay?${baseQuery}`,
        intent_url: `intent://pay?${baseQuery}#Intent;scheme=upi;package=com.phonepe.app;end`,
        generic_url: `upi://pay?${baseQuery}`
      };
    case 'gpay':
    case 'googlepay':
      return {
        scheme_url: `tez://upi/pay?${baseQuery}`,
        intent_url: `intent://pay?${baseQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
        generic_url: `upi://pay?${baseQuery}`
      };
    case 'paytm':
      return {
        scheme_url: `paytmmp://pay?${baseQuery}`,
        intent_url: `intent://pay?${baseQuery}#Intent;scheme=upi;package=net.one97.paytm;end`,
        generic_url: `upi://pay?${baseQuery}`
      };
    case 'bhim':
      return {
        scheme_url: `bhim://pay?${baseQuery}`,
        intent_url: `intent://pay?${baseQuery}#Intent;scheme=upi;package=in.org.npci.upiapp;end`,
        generic_url: `upi://pay?${baseQuery}`
      };
    default:
      return {
        scheme_url: `upi://pay?${baseQuery}`,
        intent_url: `intent://pay?${baseQuery}#Intent;scheme=upi;end`,
        generic_url: `upi://pay?${baseQuery}`
      };
  }
}

// User Protected: Create UPI Order & Return Deep Links
exports.createOrder = async (req, res) => {
  const phone = req.user.phone;
  const name = req.user.name || 'User';
  const { amount, app_id, app_code, upi_id } = req.body;

  const numAmount = parseFloat(parseFloat(amount).toFixed(2));
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.json({ success: '0', msg: 'Please enter a valid deposit amount.' });
  }

  try {
    await initUpiSchema();

    const settings = await getAdminSettingsRow();
    const minDep = parseFloat(settings?.min_deposite || '100');
    const maxDep = parseFloat(settings?.max_deposite || '50000');

    if (numAmount < minDep) {
      return res.json({ success: '0', msg: `Minimum deposit amount is ₹${minDep.toFixed(2)}.` });
    }
    if (numAmount > maxDep) {
      return res.json({ success: '0', msg: `Maximum deposit amount is ₹${maxDep.toFixed(2)}.` });
    }

    // Determine target UPI ID (prioritize auto_upi_id for auto deposit flow)
    let targetUpiId = settings?.auto_upi_id || upi_id || settings?.payment_upi_id || settings?.upi_payment_id || '';
    let targetPayee = settings?.ac_name || 'Pravesh Online';
    let targetAppName = 'UPI App';
    let targetAppCode = app_code || 'upi';

    if (app_id) {
      const [appRows] = await db.query('SELECT * FROM upi_gateways WHERE id = ? LIMIT 1', [app_id]);
      if (appRows.length > 0) {
        const app = appRows[0];
        targetUpiId = settings?.auto_upi_id || app.upi_id || targetUpiId;
        targetPayee = app.payee_name || targetPayee;
        targetAppName = app.app_name;
        targetAppCode = app.app_code;
      }
    } else if (app_code && app_code !== 'upi') {
      const [appRows] = await db.query('SELECT * FROM upi_gateways WHERE app_code = ? AND is_active = 1 LIMIT 1', [app_code]);
      if (appRows.length > 0) {
        const app = appRows[0];
        targetUpiId = settings?.auto_upi_id || app.upi_id || targetUpiId;
        targetPayee = app.payee_name || targetPayee;
        targetAppName = app.app_name;
      }
    }

    if (!targetUpiId) {
      const [activeRows] = await db.query('SELECT * FROM upi_gateways WHERE is_active = 1 AND upi_id != "" ORDER BY display_order ASC LIMIT 1');
      if (activeRows.length > 0) {
        targetUpiId = activeRows[0].upi_id;
        targetPayee = activeRows[0].payee_name || targetPayee;
      }
    }

    if (!targetUpiId) {
      return res.json({ success: '0', msg: 'UPI ID is not configured by Admin. Please contact support.' });
    }

    // Generate unique order ID
    const orderId = `UPI_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const todayDateTime = getISTDateTimeStr();

    // NOTE: Do NOT insert pending record into user_auto_deposite or user_fund_request here!
    // A payment request should ONLY reach Admin when the user has actually sent payment and submitted UTR.

    const urls = buildUpiUri(targetAppCode, targetUpiId, targetPayee, numAmount, orderId);

    return res.json({
      success: '1',
      msg: 'UPI Intent generated successfully',
      data: {
        order_id: orderId,
        amount: numAmount,
        upi_id: targetUpiId,
        payee_name: targetPayee,
        app_name: targetAppName,
        app_code: targetAppCode,
        upi_url: urls.scheme_url,
        generic_upi_url: urls.generic_url,
        intent_url: urls.intent_url,
        user: { name, phone }
      }
    });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// User Protected: Submit UPI Deposit with UTR Number & optional Screenshot
exports.submitUpiFundRequest = async (req, res) => {
  const phone = req.user.phone;
  const name = req.user.name || 'User';
  const { amount, utr_no, order_id, image, upi_app } = req.body;

  const amtNum = parseFloat(amount);
  if (isNaN(amtNum) || amtNum <= 0) {
    return res.json({ success: '0', msg: 'Please enter a valid deposit amount.' });
  }

  const cleanUtr = (utr_no || '').replace(/\D/g, '').trim();
  if (!cleanUtr) {
    return res.json({ success: '0', msg: 'Please enter the 12-digit UTR reference number.' });
  }

  if (cleanUtr.length !== 12) {
    return res.json({
      success: '0',
      msg: `UTR number must be exactly 12 digits (currently ${cleanUtr.length} digits).`
    });
  }

  // Reject dummy repeating numbers like 000000000000 or sequential numbers like 123456789012
  if (/^(\d)\1{11}$/.test(cleanUtr) || cleanUtr === '123456789012' || cleanUtr === '012345678901') {
    return res.json({
      success: '0',
      msg: 'Invalid UTR Number. Dummy or repeated numbers are not accepted.'
    });
  }

  try {
    await initUpiSchema();

    // Verify min and max deposit limits
    const settings = await getAdminSettingsRow();
    const minDep = parseFloat(settings?.min_deposite || '100');
    const maxDep = parseFloat(settings?.max_deposite || '50000');

    if (amtNum < minDep) {
      return res.json({
        success: '0',
        msg: `Minimum deposit amount is ₹${minDep.toFixed(2)}.`
      });
    }
    if (amtNum > maxDep) {
      return res.json({
        success: '0',
        msg: `Maximum deposit amount is ₹${maxDep.toFixed(2)}.`
      });
    }

    // Ensure txt_id column is VARCHAR so 12-digit UTR doesn't overflow MySQL INT
    try {
      await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_id VARCHAR(150) NOT NULL DEFAULT '0'`);
    } catch (e1) {
      try {
        await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_id VARCHAR(150) DEFAULT '0'`);
      } catch (e2) {
        try {
          await db.query(`ALTER TABLE user_auto_deposite MODIFY COLUMN txt_id BIGINT DEFAULT 0`);
        } catch (e3) {}
      }
    }

    // Check if this UTR has already been approved for another request
    const [existingApproved] = await db.query(
      "SELECT id FROM user_auto_deposite WHERE (CAST(txt_id AS CHAR) = ? OR txt_request = ? OR transaction_note LIKE ?) AND status = '1' LIMIT 1",
      [cleanUtr, cleanUtr, `%${cleanUtr}%`]
    );
    if (existingApproved.length > 0) {
      return res.json({
        success: '0',
        msg: 'This UTR number has already been used and approved for another deposit.'
      });
    }

    const [existingFund] = await db.query(
      "SELECT id FROM user_fund_request WHERE trans_details LIKE ? AND status = '1' LIMIT 1",
      [`%${cleanUtr}%`]
    );
    if (existingFund.length > 0) {
      return res.json({
        success: '0',
        msg: 'This UTR number has already been verified and credited.'
      });
    }

    let receipe_image = '';

    // Handle optional screenshot upload
    if (image && image.trim() !== '') {
      try {
        const uploadDir = path.join(__dirname, '..', '..', '_public_html (1)', 'uploads', 'fund');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `UPI_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, fileName);
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        receipe_image = `uploads/fund/${fileName}`;
      } catch (fErr) {
        console.warn('Screenshot save warning:', fErr.message);
      }
    }

    const currentDateStr = getISTDateStr();
    const trans_details = `UPI: ${cleanUtr} (${upi_app || 'UPI App'})`;

    // 1. Insert into user_fund_request for Admin verification
    await db.query(
      `INSERT INTO user_fund_request (username, points, amount, trans_details, receipe_image, date, status, action)
       VALUES (?, ?, ?, ?, ?, ?, '0', '')`,
      [phone, amtNum, amtNum, trans_details, receipe_image, currentDateStr]
    );

    // 2. Insert or update user_auto_deposite so Admin sees it in Auto Deposit tab
    const todayDateTime = getISTDateTimeStr();
    const autoNote = `Auto UPI (${upi_app || 'UPI App'}) | UTR: ${cleanUtr}`;
    const txtReq = order_id || `UPI_${cleanUtr}`;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    try {
      let updated = false;
      if (order_id) {
        const [upd] = await db.query(
          `UPDATE user_auto_deposite SET txt_id = ?, transaction_note = CONCAT(transaction_note, ' | UTR: ', ?) WHERE txt_request = ? AND (username = ? OR RIGHT(username, 10) = ?)`,
          [cleanUtr, cleanUtr, order_id, phone, cleanPhone || phone]
        );
        if (upd.affectedRows > 0) updated = true;
      }
      if (!updated) {
        await db.query(
          `INSERT INTO user_auto_deposite (username, transaction_note, amount, txt_request, txt_id, txt_date, status)
           VALUES (?, ?, ?, ?, ?, ?, '0')`,
          [phone, autoNote, amtNum, txtReq, cleanUtr, todayDateTime]
        );
      }
    } catch (depErr) {
      console.warn('user_auto_deposite update/insert error in submitUpiFundRequest:', depErr.message);
    }

    return res.json({
      success: '1',
      msg: 'Deposit Request with UTR submitted successfully! Wallet will be credited shortly upon admin verification.'
    });
  } catch (err) {
    console.error('submitUpiFundRequest error:', err);
    return res.json({
      success: '0',
      msg: 'Unable to submit deposit request right now. Please check your 12-digit reference number and try again.'
    });
  }
};

// User Protected: Check Payment Status (DOES NOT auto-approve; stays pending until Admin approves)
exports.verifyPayment = async (req, res) => {
  const phone = req.user.phone;
  const { order_id, payment_id, amount, utr_no } = req.body;

  const refId = payment_id || utr_no || order_id;
  if (!refId) {
    return res.json({ success: '0', msg: 'Reference ID is required.' });
  }

  const numAmount = parseFloat(amount);

  try {
    await initUpiSchema();

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    // 1. Check if Admin has already approved this record in user_auto_deposite or user_fund_request
    const [approvedAuto] = await db.query(
      `SELECT * FROM user_auto_deposite 
       WHERE (txt_request = ? OR txt_id = ? OR transaction_note LIKE ?) 
         AND (username = ? OR RIGHT(username, 10) = ?) 
         AND status = '1' 
       LIMIT 1`,
      [order_id || refId, refId, `%${refId}%`, phone, cleanPhone || phone]
    );

    const [approvedFund] = await db.query(
      `SELECT * FROM user_fund_request 
       WHERE trans_details LIKE ? 
         AND (username = ? OR RIGHT(username, 10) = ?) 
         AND status = '1' 
       LIMIT 1`,
      [`%${order_id || refId}%`, phone, cleanPhone || phone]
    );

    if (approvedAuto.length > 0 || approvedFund.length > 0) {
      const [uRows] = await db.query(
        "SELECT wallet FROM user_info WHERE phone = ? OR RIGHT(phone, 10) = ? LIMIT 1",
        [phone, cleanPhone || phone]
      );
      return res.json({ 
        success: '1', 
        approved: true,
        status: '1',
        msg: 'Payment has been approved and credited by Admin!',
        wallet: uRows.length > 0 ? parseFloat(uRows[0].wallet || '0') : undefined
      });
    }

    // 2. Check if Admin rejected this record
    const [rejectedAuto] = await db.query(
      `SELECT * FROM user_auto_deposite 
       WHERE (txt_request = ? OR txt_id = ? OR transaction_note LIKE ?) 
         AND (username = ? OR RIGHT(username, 10) = ?) 
         AND status = '-1' 
       LIMIT 1`,
      [order_id || refId, refId, `%${refId}%`, phone, cleanPhone || phone]
    );

    const [rejectedFund] = await db.query(
      `SELECT * FROM user_fund_request 
       WHERE trans_details LIKE ? 
         AND (username = ? OR RIGHT(username, 10) = ?) 
         AND status = '-1' 
       LIMIT 1`,
      [`%${order_id || refId}%`, phone, cleanPhone || phone]
    );

    if (rejectedAuto.length > 0 || rejectedFund.length > 0) {
      return res.json({
        success: '0',
        rejected: true,
        status: '-1',
        msg: 'Your deposit request was declined by Admin. Please contact support or submit your 12-digit UTR.'
      });
    }

    // 3. If user provided a 12-digit UTR during verify, save it to the pending record so admin sees it
    if (utr_no && /^\d{12}$/.test(String(utr_no).trim())) {
      const cleanUtr = String(utr_no).trim();
      try {
        await db.query(
          `UPDATE user_auto_deposite 
           SET txt_id = ?, transaction_note = CONCAT(transaction_note, ' | UTR: ', ?) 
           WHERE txt_request = ? AND (username = ? OR RIGHT(username, 10) = ?) AND status = '0'`,
          [cleanUtr, cleanUtr, order_id || refId, phone, cleanPhone || phone]
        );
        await db.query(
          `UPDATE user_fund_request 
           SET trans_details = CONCAT(trans_details, ' | UTR: ', ?) 
           WHERE trans_details LIKE ? AND (username = ? OR RIGHT(username, 10) = ?) AND status = '0'`,
          [cleanUtr, `%${order_id || refId}%`, phone, cleanPhone || phone]
        );
      } catch (e) {}
    }

    // 4. Check if a real pending deposit request was submitted with UTR
    const [pendingAuto] = await db.query(
      `SELECT * FROM user_auto_deposite 
       WHERE (txt_request = ? OR txt_id = ? OR transaction_note LIKE ?) 
         AND (username = ? OR RIGHT(username, 10) = ?) 
         AND status = '0' 
       LIMIT 1`,
      [order_id || refId, refId, `%${refId}%`, phone, cleanPhone || phone]
    );

    const [pendingFund] = await db.query(
      `SELECT * FROM user_fund_request 
       WHERE trans_details LIKE ? 
         AND (username = ? OR RIGHT(username, 10) = ?) 
         AND status = '0' 
       LIMIT 1`,
      [`%${order_id || refId}%`, phone, cleanPhone || phone]
    );

    if (pendingAuto.length > 0 || pendingFund.length > 0) {
      return res.json({
        success: '0',
        pending: true,
        status: '0',
        msg: 'Payment request received! It is currently PENDING Admin approval. Points will be credited once Admin verifies.'
      });
    }

    // 5. Not submitted yet
    return res.json({
      success: '0',
      pending: false,
      not_submitted: true,
      msg: 'No deposit request submitted yet. If you have sent payment, please enter your 12-digit UTR to submit for Admin approval.'
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};
