const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { getISTDateTimeStr, getISTDateStr, getISTTimeStr, getISTTime12h } = require('../utils/istDate');

// User Registration
exports.signup = async (req, res) => {
  const { user_name, user_phone, user_password, user_mpin, user_email, token_id, referral_phone } = req.body;

  if (!user_phone || !user_password || !user_name) {
    return res.json({ success: '0', msg: 'Username, phone and password are required!' });
  }

  try {
    // Ensure missing columns exist in user_info table
    try { await db.query(`ALTER TABLE user_info ADD COLUMN referred_by_phone VARCHAR(50) DEFAULT NULL`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN m_pin VARCHAR(50) DEFAULT ''`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN email VARCHAR(100) DEFAULT ''`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN wallet VARCHAR(50) DEFAULT '0'`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN status VARCHAR(10) DEFAULT '1'`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN betting_status VARCHAR(10) DEFAULT '1'`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN transfer_status VARCHAR(10) DEFAULT '0'`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN phonepay VARCHAR(50) DEFAULT ''`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN googlepay VARCHAR(50) DEFAULT ''`); } catch (e) {}
    try { await db.query(`ALTER TABLE user_info ADD COLUMN paytm VARCHAR(50) DEFAULT ''`); } catch (e) {}

    // Check if phone already registered
    const [existing] = await db.query('SELECT * FROM user_info WHERE phone = ?', [user_phone]);
    if (existing.length > 0) {
      return res.json({ success: '0', msg: 'You are Already Signed Up!!' });
    }

    // Determine referred by
    let referred_by_value = null;
    if (referral_phone && referral_phone.trim() !== '' && /^\d{10}$/.test(referral_phone) && referral_phone !== user_phone) {
      try {
        const [refUser] = await db.query('SELECT phone FROM user_info WHERE phone = ? LIMIT 1', [referral_phone]);
        if (refUser.length > 0) {
          referred_by_value = referral_phone;
        }
      } catch (e) {}
    }

    // Check signup activation status safely
    let status = '1';
    try {
      const [activation] = await db.query('SELECT status FROM activate_rule LIMIT 1');
      if (activation.length > 0 && activation[0].status !== undefined && activation[0].status !== null) {
        status = String(activation[0].status);
      }
    } catch (e) {
      status = '1';
    }

    // Check auto_active_status & bonus from admin_settings
    let bonus = '0';
    let initialBettingStatus = '1';
    try {
      const [settings] = await db.query('SELECT Dragon_bonus, auto_active_status FROM admin_settings LIMIT 1');
      if (settings.length > 0) {
        if (settings[0].Dragon_bonus !== undefined && settings[0].Dragon_bonus !== null) {
          bonus = String(settings[0].Dragon_bonus);
        }
        if (settings[0].auto_active_status !== undefined && settings[0].auto_active_status !== null) {
          initialBettingStatus = String(settings[0].auto_active_status) === '0' ? '0' : '1';
        }
      }
    } catch (e) {
      bonus = '0';
      initialBettingStatus = '1';
    }

    // Insert user
    const today = getISTDateTimeStr(); // YYYY-MM-DD HH:MM:SS in IST
    let insertResult;
    try {
      const insertSql = `
        INSERT INTO user_info 
        (name, phone, password, m_pin, email, wallet, date, status, betting_status, transfer_status, phonepay, googlepay, paytm, referred_by_phone) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '0', '', '', '', ?)
      `;
      const [resOut] = await db.query(insertSql, [
        user_name,
        user_phone,
        user_password,
        user_mpin || '',
        user_email || '',
        bonus,
        today,
        status,
        initialBettingStatus,
        referred_by_value
      ]);
      insertResult = resOut;
    } catch (insertErr) {
      console.warn('Primary insert failed, attempting fallback insert:', insertErr.message);
      const fallbackSql = `
        INSERT INTO user_info 
        (name, phone, password, m_pin, email, wallet, date, status, betting_status, transfer_status, phonepay, googlepay, paytm) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '0', '', '', '')
      `;
      const [resOut] = await db.query(fallbackSql, [
        user_name,
        user_phone,
        user_password,
        user_mpin || '',
        user_email || '',
        bonus,
        today,
        status,
        initialBettingStatus
      ]);
      insertResult = resOut;
    }

    if (insertResult && insertResult.affectedRows > 0) {
      // Add wallet history entry if bonus is given
      if (bonus !== '0' && bonus !== 0) {
        try {
          await db.query(`CREATE TABLE IF NOT EXISTS wallet_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            status VARCHAR(10) DEFAULT '1',
            date VARCHAR(20),
            time VARCHAR(20),
            amount VARCHAR(50),
            updated_amount VARCHAR(50),
            remark TEXT,
            phone_number VARCHAR(50)
          )`);
          const currentDateStr = getISTDateStr();
          const currentTimeStr = getISTTime12h();
          await db.query(
            'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['1', currentDateStr, currentTimeStr, bonus, bonus, 'Welcome Bonus', user_phone]
          );
        } catch (e) {
          console.error('Error adding wallet history bonus:', e);
        }
      }

      // Trigger referral commission if referred
      if (referred_by_value) {
        try {
          const adminController = require('./adminController');
          if (adminController.processReferralCommission) {
            await adminController.processReferralCommission(user_phone, 'signup', 0);
          }
        } catch (e) {
          console.error('Error triggering signup referral:', e);
        }
      }

      // Handle Device Token
      if (token_id) {
        try {
          await db.query(`CREATE TABLE IF NOT EXISTS device_token (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mobile VARCHAR(50),
            token_id TEXT,
            status VARCHAR(10) DEFAULT '1'
          )`);
          const [tokenExists] = await db.query('SELECT * FROM device_token WHERE mobile = ?', [user_phone]);
          if (tokenExists.length > 0) {
            await db.query('UPDATE device_token SET token_id = ? WHERE mobile = ?', [token_id, user_phone]);
          } else {
            await db.query('INSERT INTO device_token (mobile, token_id, status) VALUES (?, ?, ?)', [user_phone, token_id, '1']);
          }
        } catch (e) {
          console.error('Error setting device token:', e);
        }
      }

      // Notify Admins if new user is registered
      try {
        const { broadcastToAdmins } = require('../socket/chatSocket');
        broadcastToAdmins({
          type: 'badge_update',
          event: 'new_user',
          user: user_phone,
          name: user_name,
          title: 'New User Registered',
          message: `🎉 New User Registered: ${user_name} (${user_phone})`,
          timestamp: new Date().toISOString()
        });
      } catch (wsErr) {}

      // Prepare response data
      const jwtToken = jwt.sign(
        { phone: user_phone, name: user_name, role: 'user' },
        process.env.JWT_SECRET || 'lucky_matka_super_secret_jwt_key_99',
        { expiresIn: '30d' }
      );

      const data = {
        msg: 'Registered Successfully',
        phone_number: user_phone,
        name: user_name,
        email: user_email || '',
        m_pin: user_mpin || '',
        wallet: bonus,
        status: status,
        phonepay: '',
        googlepay: '',
        paytm: '',
        token: jwtToken
      };

      return res.json({
        success: '1',
        msg: 'Registered Successfully',
        data: data
      });
    } else {
      return res.json({ success: '0', msg: 'Some Error Occurred! Try Again Later!!' });
    }
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: '0', msg: err.message || 'Internal server error', error: err.message });
  }
};

// User Login
exports.login = async (req, res) => {
  const { phone_number, password, token_id } = req.body;

  if (!phone_number || !password) {
    return res.json({ success: '0', data: { msg: 'Phone number and password required' } });
  }

  try {
    const [users] = await db.query('SELECT * FROM user_info WHERE phone = ?', [phone_number]);
    if (users.length === 0) {
      return res.json({ success: '0', data: { msg: 'User Not Found!' } });
    }

    const user = users[0];
    if (user.password !== password) {
      return res.json({ success: '0', data: { msg: 'Wrong Password!' } });
    }

    if (user.status !== '1') {
      return res.json({ success: '0', data: { msg: 'Contact Admin to Activate your Account!' } });
    }

    // Save token if provided
    if (token_id) {
      const [tokenExists] = await db.query('SELECT * FROM device_token WHERE mobile = ?', [phone_number]);
      if (tokenExists.length > 0) {
        await db.query('UPDATE device_token SET token_id = ? WHERE mobile = ?', [token_id, phone_number]);
      } else {
        await db.query('INSERT INTO device_token (mobile, token_id, status) VALUES (?, ?, ?)', [phone_number, token_id, '1']);
      }
    }

    // Create JWT Token
    const jwtToken = jwt.sign(
      { phone: user.phone, name: user.name, role: 'user' },
      process.env.JWT_SECRET || 'lucky_matka_super_secret_jwt_key_99',
      { expiresIn: '30d' }
    );

    const data = {
      msg: 'Login Successfully',
      phone_number: user.phone,
      name: user.name,
      email: user.email,
      m_pin: user.m_pin,
      wallet: user.wallet,
      status: user.status,
      phonepay: user.phonepay,
      googlepay: user.googlepay,
      paytm: user.paytm,
      token: jwtToken
    };

    return res.json({
      success: '1',
      data: data
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: '0', data: { msg: err.message || 'Internal server error' }, error: err.message });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  const { username, password } = req.body; // username can be email or phone

  if (!username || !password) {
    return res.json({ success: '0', msg: 'Username/Email and Password are required!' });
  }

  try {
    const [admins] = await db.query(
      'SELECT * FROM admin WHERE (email = ? OR mobile = ?) AND password = ?',
      [username, username, password]
    );

    if (admins.length === 0) {
      return res.json({ success: '0', msg: 'Invalid Email/Mobile or Password!' });
    }

    const admin = admins[0];

    // Create JWT Token for admin (Expires in 1 hour)
    const jwtToken = jwt.sign(
      { id: admin.id, name: admin.name, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'lucky_matka_super_secret_jwt_key_99',
      { expiresIn: '1h' }
    );

    return res.json({
      success: '1',
      msg: 'Logged in successfully',
      token: jwtToken,
      admin: {
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', msg: 'Internal server error' });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  const phone = req.user.phone;

  try {
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const [users] = await db.query(
      'SELECT * FROM user_info WHERE phone = ? OR RIGHT(phone, 10) = ? OR id = ? LIMIT 1',
      [phone, cleanPhone || phone, phone]
    );
    if (users.length === 0) {
      return res.json({ success: '0', data: { msg: 'User Not Found!' } });
    }

    const user = users[0];

    if (user.status === '0' || user.status === 0) {
      return res.json({ success: '0', msg: 'Account Inactive! Contact Admin to activate your account.', is_inactive: true });
    }

    const data = {
      phone_number: user.phone,
      name: user.name,
      email: user.email,
      wallet: user.wallet,
      phonepay: user.phonepay || user.phonepe || user.phonpe || '',
      googlepay: user.googlepay || user.gpay || '',
      paytm: user.paytm || user.upi_id || user.upi || '',
      bank_name: user.bank_name || '',
      branch_name: user.branch_name || '',
      account_holder_name: user.account_holder_name || '',
      account_number: user.account_number || '',
      ifsc_code: user.ifsc_code || '',
      betting_status: String(user.betting_status ?? '1'),
      transfer_status: String(user.transfer_status ?? '1'),
      status: String(user.status ?? '1'),
      date: user.date,
      phone: user.phone
    };

    return res.json({
      success: '1',
      data: data
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', data: { msg: 'Internal server error' } });
  }
};

// Edit Profile
exports.editProfile = async (req, res) => {
  const phone = req.user.phone;
  const { name, email, bank_name, branch_name, account_holder_name, account_number, ifsc_code } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM user_info WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.json({ success: '0', msg: 'User Not Found!' });
    }

    const user = users[0];

    const inputPhonepe = req.body.phonepay || req.body.phonepe || req.body.phonpe || '';
    const inputGpay = req.body.googlepay || req.body.gpay || '';
    const inputPaytm = req.body.paytm || req.body.upi_id || req.body.upi || '';

    const finalPhonepay = inputPhonepe.trim() !== '' ? inputPhonepe.trim() : (user.phonepay || user.phonepe || user.phonpe || '');
    const finalGooglepay = inputGpay.trim() !== '' ? inputGpay.trim() : (user.googlepay || user.gpay || '');
    const finalPaytm = inputPaytm.trim() !== '' ? inputPaytm.trim() : (user.paytm || user.upi_id || user.upi || '');

    try { await db.query('ALTER TABLE user_info ADD COLUMN phonepe VARCHAR(100) DEFAULT ""'); } catch (e) {}
    try { await db.query('ALTER TABLE user_info ADD COLUMN phonpe VARCHAR(100) DEFAULT ""'); } catch (e) {}
    try { await db.query('ALTER TABLE user_info ADD COLUMN gpay VARCHAR(100) DEFAULT ""'); } catch (e) {}
    try { await db.query('ALTER TABLE user_info ADD COLUMN upi_id VARCHAR(100) DEFAULT ""'); } catch (e) {}
    try { await db.query('ALTER TABLE user_info ADD COLUMN upi VARCHAR(100) DEFAULT ""'); } catch (e) {}

    const fields = {
      phonepay: finalPhonepay,
      phonepe: finalPhonepay,
      phonpe: finalPhonepay,
      googlepay: finalGooglepay,
      gpay: finalGooglepay,
      paytm: finalPaytm,
      upi_id: finalPaytm,
      upi: finalPaytm
    };

    if (bank_name !== undefined) fields.bank_name = bank_name;
    if (branch_name !== undefined) fields.branch_name = branch_name;
    if (account_holder_name !== undefined) fields.account_holder_name = account_holder_name;
    if (account_number !== undefined) fields.account_number = account_number;
    if (ifsc_code !== undefined) fields.ifsc_code = ifsc_code;
    if (name !== undefined && name !== '') fields.name = name;
    if (email !== undefined && email !== '') fields.email = email;

    const setClause = Object.keys(fields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(fields);
    values.push(phone);

    const [updateResult] = await db.query(`UPDATE user_info SET ${setClause} WHERE phone = ?`, values);

    if (updateResult.affectedRows > 0) {
      return res.json({ success: '1', msg: 'Profile Updated Successfully' });
    } else {
      return res.json({ success: '0', msg: 'Some Error Occurred! Try Again Later' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', msg: 'Internal server error' });
  }
};

// Verify M-PIN
exports.verifyMpin = async (req, res) => {
  const phone = req.user.phone;
  const { mpin } = req.body;

  if (!mpin) {
    return res.json({ success: '0', msg: 'M-PIN is required' });
  }

  try {
    const [users] = await db.query('SELECT m_pin FROM user_info WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.json({ success: '0', msg: 'User Not Found!' });
    }

    const userMpin = users[0].m_pin;
    if (String(userMpin) === String(mpin)) {
      return res.json({ success: '1', msg: 'M-PIN Verified Successfully' });
    } else {
      return res.json({ success: '0', msg: 'Incorrect M-PIN! Please try again.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', msg: 'Internal server error' });
  }
};

// Change M-PIN
exports.changeMpin = async (req, res) => {
  const phone = req.user.phone;
  const { old_mpin, new_mpin } = req.body;

  if (!old_mpin || !new_mpin) {
    return res.json({ success: '0', msg: 'Old M-PIN and New M-PIN are required!' });
  }

  if (!/^\d{4}$/.test(new_mpin)) {
    return res.json({ success: '0', msg: 'New M-PIN must be a 4-digit number!' });
  }

  try {
    const [users] = await db.query('SELECT m_pin FROM user_info WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.json({ success: '0', msg: 'User Not Found!' });
    }

    const currentMpin = users[0].m_pin;
    if (currentMpin && String(currentMpin).trim() !== '' && String(currentMpin) !== String(old_mpin)) {
      return res.json({ success: '0', msg: 'Incorrect Old M-PIN! Please try again.' });
    }

    const [updateResult] = await db.query('UPDATE user_info SET m_pin = ? WHERE phone = ?', [new_mpin, phone]);

    if (updateResult.affectedRows > 0) {
      return res.json({ success: '1', msg: 'M-PIN Updated Successfully!' });
    } else {
      return res.json({ success: '0', msg: 'Failed to update M-PIN. Try again.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', msg: 'Internal server error' });
  }
};

