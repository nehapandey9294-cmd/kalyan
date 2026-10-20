const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { getISTDate, getISTDateStr, getISTTimeStr, getISTTime12h, getISTDateTimeStr } = require('../utils/istDate');

// Get Wallet Information & Settings
exports.getWalletInfo = async (req, res) => {
  const phone = req.user.phone;

  try {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const [users] = await db.query(
      `SELECT * FROM user_info 
       WHERE phone = ? 
          OR (LENGTH(?) = 10 AND RIGHT(phone, 10) = ?) 
          OR id = ? 
       LIMIT 1`,
      [phone, cleanPhone, cleanPhone, phone]
    );
    if (users.length === 0) {
      return res.json({ success: '0', msg: 'User Not Found!' });
    }
    const user = users[0];
    if (user.status === '0' || user.status === 0) {
      return res.json({ success: '0', msg: 'Account Inactive! Contact Admin to activate your account.', is_inactive: true });
    }

    const currentWallet = parseFloat(user.wallet || '0');
    user.wallet = isNaN(currentWallet) ? 0 : currentWallet;


    const [contacts] = await db.query('SELECT * FROM contact_detail LIMIT 1');
    const contact = contacts[0] || { mobile: '', wp_mobile: '' };

    const [settings] = await db.query('SELECT * FROM admin_settings LIMIT 1');
    const setting = settings[0] || {};

    const showUpi = setting.show_upi !== undefined ? parseInt(setting.show_upi, 10) : 1;
    const showQr = setting.show_qr !== undefined ? parseInt(setting.show_qr, 10) : 1;
    const barcodePaymentMode = (showQr || showUpi) ? 1 : 0;
    const mpinStatus = (setting.mpin_status !== undefined && setting.mpin_status !== null) ? String(setting.mpin_status) : '1';
    const depositMode = setting.deposit_mode || 'manual';
    const activePaymentGateway = setting.active_payment_gateway || 'razorpay';

    const [admins] = await db.query('SELECT wallet FROM admin WHERE id = 1');
    const adminCoins = admins.length > 0 ? parseFloat(admins[0].wallet || '0') : 0;

    const referralStatus = (setting.referral_status !== undefined && setting.referral_status !== null) ? String(setting.referral_status) : '1';

    const data = {
      phone_number: user.phone,
      wallet: currentWallet,
      admin_coins: adminCoins,
      can_bid: String(user.betting_status ?? '1') !== '0',
      status: String(user.status ?? '1'),
      betting_status: String(user.betting_status ?? '1'),
      transfer_status: String(user.transfer_status ?? '1'),
      start_time: '01:00',
      admin_mobile: contact.mobile,
      admin_wp: contact.wp_mobile,
      upi_name: 'Kalyan',
      upi_payment_id: setting.upi_payment_id || setting.payment_upi_id || '',
      payment_upi_id: setting.upi_payment_id || setting.payment_upi_id || '',
      auto_upi_id: setting.auto_upi_id || '',
      payment_barcode_image: setting.payment_barcode_image || '',
      show_upi: showUpi,
      show_qr: showQr,
      deposit_mode: depositMode,
      active_payment_gateway: activePaymentGateway,
      mpin_status: mpinStatus,
      referral_status: referralStatus,
      barcode_payment_mode: barcodePaymentMode,
      upi_phone: setting.phonepepay_upi || '',
      upi_google: setting.gpay_upi || '',
      alert_message: setting.alert_message || '',
      how_to_play: setting.how_to_play || '',
      m_pin: user.m_pin,
      min_limit: parseInt(setting.min_bid_amt, 10) > 0 ? setting.min_bid_amt : '10',
      max_limit: parseInt(setting.max_bid_amt, 10) > 0 ? setting.max_bid_amt : '50000',
      share_url: setting.app_link || '',
      share_message: setting.content || '',
      min_withdraw: setting.withdraw_open_time || '09:00',
      max_withdraw: setting.withdraw_close_time || '21:00',
      withdraw_open_time: setting.withdraw_open_time || '09:00',
      withdraw_close_time: setting.withdraw_close_time || '21:00',
      min_withdrawal: setting.min_withdrawal || '1000',
      max_withdrawal: setting.max_withdrawal || '50000',
      min_deposite: setting.min_deposite,
      max_deposite: setting.max_deposite
    };

    return res.json({
      success: '1',
      data: data
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Submit Add Fund Request (manual screenshot / UTR check)
exports.submitFundRequest = async (req, res) => {
  const phone = req.user.phone;
  const name = req.user.name;
  const { amount, utr_no, image } = req.body; // image can be a base64 encoded string

  const amtNum = parseFloat(amount);
  if (isNaN(amtNum) || amtNum <= 0) {
    return res.json({ success: '0', msg: 'Valid amount is required.' });
  }

  try {
    let receipe_image = '';
    
    // Decode base64 image if uploaded
    if (image && image.trim() !== '') {
      const uploadDir = path.join(__dirname, '..', '..', '_public_html (1)', 'uploads', 'fund');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileName = Date.now() + '.jpg';
      const filePath = path.join(uploadDir, fileName);
      
      // Clean up base64 prefix if exists
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      receipe_image = 'uploads/fund/' + fileName;
    }

    const trans_details = 'Fund Request';
    const currentDateStr = getISTDateStr();
    const todayDateTime = getISTDateTimeStr();

    // 1. Insert in user_fund_request
    const [fundResult] = await db.query(
      "INSERT INTO user_fund_request (username, points, amount, trans_details, receipe_image, date, status, action) VALUES (?, ' ', ?, ?, ?, ?, '0', '')",
      [phone, amount, trans_details, receipe_image, currentDateStr]
    );

    // 2. Insert in user_auto_deposite
    let transaction_note = name ? `Fund Request - ${name}` : 'Fund Request';
    if (utr_no) {
      transaction_note += ` | UTR: ${utr_no}`;
    }

    let depositSuccess = false;
    try {
      const [depositResult] = await db.query(
        "INSERT INTO user_auto_deposite (username, transaction_note, amount, txt_request, txt_id, txt_date, status) VALUES (?, ?, ?, ?, '0', ?, '0')",
        [phone, transaction_note, amount, utr_no || '', todayDateTime]
      );
      depositSuccess = depositResult.affectedRows > 0;
    } catch (depErr) {
      console.warn('user_auto_deposite insert warning in submitFundRequest:', depErr.message);
    }

    if (fundResult.affectedRows > 0) {
      return res.json({
        success: '1',
        msg: 'Fund request submitted successfully! It will appear in your Deposit History for admin approval.'
      });
    } else {
      return res.json({ success: '0', msg: 'Failed to submit fund request. Please try again.' });
    }
  } catch (err) {
    console.error('submitFundRequest error:', err);
    return res.status(500).json({ 
      success: '0', 
      msg: 'Unable to submit fund request right now. Please check your reference number or contact Support.',
      error: err.message 
    });
  }
};

// Submit Withdrawal Request
exports.submitWithdrawRequest = async (req, res) => {
  const phone = req.user.phone;
  const { amount, remark } = req.body;

  const points = parseInt(amount, 10);
  if (isNaN(points) || points <= 0) {
    return res.json({ success: '0', msg: 'Invalid withdrawal amount.' });
  }

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const nowIST = getISTDate();
  const currentDayName = daysOfWeek[nowIST.getDay()];
  const currentDateStr = getISTDateStr(nowIST);

  try {
    const [settings] = await db.query("SELECT * FROM admin_settings LIMIT 1");
    const limits = settings[0] || {};

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const [users] = await db.query(
      `SELECT id, phone, wallet FROM user_info 
       WHERE phone = ? 
          OR (LENGTH(?) = 10 AND RIGHT(phone, 10) = ?) 
          OR id = ? 
       LIMIT 1`,
      [phone, cleanPhone, cleanPhone, phone]
    );
    if (users.length === 0) {
      return res.json({ success: '0', msg: 'User Not Found' });
    }
    const user = users[0];
    const targetPhone = user.phone;

    const [dayLimits] = await db.query(
      "SELECT * FROM withdraw_limit_days WHERE name = ? AND status = 1 AND role = 'Days' LIMIT 1",
      [currentDayName]
    );

    if (dayLimits.length === 0) {
      return res.json({ success: '0', msg: `Withdraw Request Not Allowed on ${currentDayName}` });
    }

    // Timings validation using IST
    const currentTime = nowIST;
    const openTime = new Date(currentDateStr + 'T' + (limits.withdraw_open_time || '00:00:00'));
    const closeTime = new Date(currentDateStr + 'T' + (limits.withdraw_close_time || '23:59:59'));

    if (currentTime < openTime || currentTime > closeTime) {
      return res.json({
        success: '0',
        msg: `We are closed. Opening time ${limits.withdraw_open_time} Closing time ${limits.withdraw_close_time}`
      });
    }

    const currentWallet = parseFloat(user.wallet || '0');
    const walletAmount = isNaN(currentWallet) ? 0 : currentWallet;
    const fixLimit = parseInt(limits.min_wallet_amount || '0', 10);
    const remainingAmount = walletAmount - fixLimit;
    const minLimit = parseInt(limits.min_withdrawal || '0', 10);
    const maxLimit = parseInt(limits.max_withdrawal || '0', 10);

    if (points < minLimit || points > maxLimit) {
      return res.json({
        success: '0',
        msg: `Limit does not match! Minimum Limit is ${minLimit} & Maximum Limit is ${maxLimit}`
      });
    }

    if (points > remainingAmount) {
      return res.json({
        success: '0',
        msg: 'Insufficient balance. Please recharge your wallet.'
      });
    }

    // Check for pending requests
    const [pendingRequests] = await db.query(
      `SELECT id FROM user_withdraw_request 
       WHERE (username = ? OR username = ? OR (LENGTH(?) = 10 AND RIGHT(username, 10) = ?)) 
         AND (status = '0' OR status = 0)`,
      [phone, targetPhone, cleanPhone, cleanPhone]
    );

    if (pendingRequests.length > 0) {
      return res.json({ success: '0', msg: 'Still pending your last request' });
    }

    // Deduct wallet balance instantly on withdrawal request submission
    const newBalance = walletAmount - points;
    await db.query("UPDATE user_info SET wallet = ? WHERE id = ? OR phone = ?", [newBalance, user.id, targetPhone]);

    const currentTimeStr = getISTTime12h(nowIST);
    const historyRemark = remark ? `Withdrawal Request (${remark})` : 'Withdrawal Request Placed';

    await db.query(
      "INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['0', currentDateStr, currentTimeStr, `-${points}`, newBalance, historyRemark, targetPhone]
    );

    // Insert request with both points and amount populated
    const [insertResult] = await db.query(
      "INSERT INTO user_withdraw_request (username, points, amount, request_no, receipe_image, date, remark, status, action) VALUES (?, ?, ?, '', '', ?, ?, '0', '')",
      [targetPhone, points, points, currentDateStr, historyRemark]
    );

    if (insertResult.affectedRows > 0) {
      return res.json({
        success: '1',
        msg: 'Withdraw Request Added Successfully!!',
        balance: newBalance,
        wallet: newBalance
      });
    } else {
      return res.json({ success: '0', msg: 'Some Error Occurred! Try Again Later!!' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get User Wallet History
exports.getWalletHistory = async (req, res) => {
  const phone = req.user.phone;
  const { date1, date2 } = req.query;
  try {
    let sql = "SELECT * FROM wallet_history WHERE phone_number = ?";
    const params = [phone];
    if (date1 && date2) {
      sql += " AND date BETWEEN ? AND ?";
      params.push(date1, date2);
    }
    sql += " ORDER BY date DESC, time DESC LIMIT 100";
    const [history] = await db.query(sql, params);
    return res.json({ success: '1', data: history, result: history });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get User Withdrawal History
exports.getWithdrawHistory = async (req, res) => {
  const phone = req.user.phone;
  const { date1, date2 } = req.query;
  try {
    let sql = "SELECT * FROM user_withdraw_request WHERE username = ?";
    const params = [phone];
    if (date1 && date2) {
      sql += " AND date BETWEEN ? AND ?";
      params.push(date1, date2);
    }
    sql += " ORDER BY date DESC LIMIT 100";
    const [history] = await db.query(sql, params);
    return res.json({ success: '1', data: history, result: history });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get User Deposit Request Status (PHP deposit-request-status.php parity)
exports.getDepositRequestStatus = async (req, res) => {
  const phone = req.user.phone;
  const { date1, date2 } = req.query;
  try {
    let sql = "SELECT id, amount, txt_request, txt_date, status FROM user_auto_deposite WHERE username = ?";
    const params = [phone];
    if (date1 && date2) {
      sql += " AND DATE(txt_date) BETWEEN ? AND ?";
      params.push(date1, date2);
    }
    sql += " ORDER BY id DESC LIMIT 100";
    const [deposits] = await db.query(sql, params);
    const result = deposits.map(row => {
      let status_text = 'Pending';
      if (row.status == '1') status_text = 'Approved';
      else if (row.status == '-1') status_text = 'Rejected';
      return {
        id: row.id,
        amount: row.amount,
        utr: row.txt_request || '',
        date: row.txt_date,
        status: String(row.status),
        status_text
      };
    });
    return res.json({ success: '1', result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};
