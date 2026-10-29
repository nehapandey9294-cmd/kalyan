const db = require('../config/db');
const { getISTDate, getISTDateStr, getISTTimeStr, getISTTime12h, getISTDateTimeStr } = require('../utils/istDate');

// Auto-ensure user_winning_report table columns support DP, SP, TP Pana and flexible types
async function initWinningReportSchema() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_winning_report (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date VARCHAR(50),
        username VARCHAR(50),
        bid_id INT DEFAULT 0,
        game_name VARCHAR(100),
        game_type VARCHAR(100),
        session VARCHAR(50) DEFAULT 'Open',
        open_pana VARCHAR(20) DEFAULT 'NA',
        open_digit VARCHAR(20) DEFAULT 'NA',
        close_pana VARCHAR(20) DEFAULT 'NA',
        close_digit VARCHAR(20) DEFAULT 'NA',
        winning_points DOUBLE DEFAULT 0,
        points_action DOUBLE DEFAULT 0,
        status VARCHAR(10) DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const modifyCols = [
      "ALTER TABLE user_winning_report MODIFY COLUMN game_type VARCHAR(100) NOT NULL",
      "ALTER TABLE user_winning_report MODIFY COLUMN session VARCHAR(50) DEFAULT 'Open'",
      "ALTER TABLE user_winning_report MODIFY COLUMN open_pana VARCHAR(20) DEFAULT 'NA'",
      "ALTER TABLE user_winning_report MODIFY COLUMN close_pana VARCHAR(20) DEFAULT 'NA'",
      "ALTER TABLE user_winning_report MODIFY COLUMN open_digit VARCHAR(20) DEFAULT 'NA'",
      "ALTER TABLE user_winning_report MODIFY COLUMN close_digit VARCHAR(20) DEFAULT 'NA'",
      "ALTER TABLE user_winning_report MODIFY COLUMN winning_points DOUBLE DEFAULT 0",
      "ALTER TABLE user_winning_report MODIFY COLUMN points_action DOUBLE DEFAULT 0"
    ];

    for (const sql of modifyCols) {
      try {
        await db.query(sql);
      } catch (colErr) {
        // column may already have matching structure
      }
    }
  } catch (err) {
    console.error('Error ensuring user_winning_report schema:', err.message);
  }
}
initWinningReportSchema();

// Ensure game_time table exists with proper schema and indexes
async function initGameTimeSchema() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS game_time (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game VARCHAR(150) NOT NULL,
        day VARCHAR(20) NOT NULL,
        open_time VARCHAR(50) NOT NULL,
        close_time VARCHAR(50) NOT NULL,
        status VARCHAR(10) DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_game (game),
        INDEX idx_day (day)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    console.warn('Error ensuring game_time schema:', err.message);
  }
}
initGameTimeSchema();

// Helper: Deduct Admin Coins (Disabled - direct deposit without coin requirement)
async function deductAdminCoins(amount) {
  return;
}

// Get Admin Dashboard Metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM user_info');
    const [[{ unapproved_users }]] = await db.query("SELECT COUNT(*) as unapproved_users FROM user_info WHERE status = '0'");
    const [[{ approved_users }]] = await db.query("SELECT COUNT(*) as approved_users FROM user_info WHERE status = '1'");
    const [[{ total_games }]] = await db.query('SELECT COUNT(DISTINCT game) as total_games FROM game_time');
    const [[{ today_bid_amount }]] = await db.query('SELECT SUM(points_action) as today_bid_amount FROM user_bid_history WHERE date = ?', [getISTDateStr()]);

    const [[{ total_bids }]] = await db.query('SELECT COUNT(*) as total_bids FROM user_bid_history');
    const [[{ total_withdrawals }]] = await db.query("SELECT SUM(points) as total_withdrawals FROM user_withdraw_request WHERE status = '1'");
    const [[{ total_wallet_balance }]] = await db.query('SELECT SUM(wallet) as total_wallet_balance FROM user_info');
    const [[{ admin_wallet }]] = await db.query('SELECT wallet as admin_wallet FROM admin WHERE id = 1');
    
    // Recent 5 Bids
    const [recentBids] = await db.query('SELECT * FROM user_bid_history ORDER BY id DESC LIMIT 5');

    return res.json({
      success: '1',
      metrics: {
        total_users,
        unapproved_users: unapproved_users || 0,
        approved_users: approved_users || 0,
        total_games: total_games || 0,
        today_bid_amount: today_bid_amount || 0,
        total_bids: total_bids || 0,
        total_withdrawals: total_withdrawals || 0,
        total_wallet_balance: total_wallet_balance || 0,
        admin_wallet: admin_wallet || 0
      },
      recentBids
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Real-time Badge Counts for Admin Sidebar & Navigation
exports.getBadgeCounts = async (req, res) => {
  try {
    let pending_deposits = 0;
    let pending_auto_deposits = 0;
    let pending_withdrawals = 0;
    let unread_chats = 0;
    let unapproved_users = 0;

    try {
      const [[resDep]] = await db.query("SELECT COUNT(*) as cnt FROM user_fund_request WHERE status = '0'");
      pending_deposits = Number(resDep?.cnt || 0);
    } catch (e) {}

    try {
      const [[resAuto]] = await db.query("SELECT COUNT(*) as cnt FROM user_auto_deposite WHERE status = '0'");
      pending_auto_deposits = Number(resAuto?.cnt || 0);
    } catch (e) {}

    try {
      const [[resWith]] = await db.query("SELECT COUNT(*) as cnt FROM user_withdraw_request WHERE (status = '0' OR status = 0 OR status = 'Pending')");
      pending_withdrawals = Number(resWith?.cnt || 0);
    } catch (e) {}

    try {
      const [[resChat]] = await db.query("SELECT COUNT(DISTINCT user_phone) as cnt FROM chat_messages WHERE sender_type = 'user' AND is_read = 0");
      unread_chats = Number(resChat?.cnt || 0);
    } catch (e) {}

    try {
      const [[resUser]] = await db.query("SELECT COUNT(*) as cnt FROM user_info WHERE status = '0'");
      unapproved_users = Number(resUser?.cnt || 0);
    } catch (e) {}

    let new_users_today = 0;
    try {
      const [[resNewUsers]] = await db.query("SELECT COUNT(*) as cnt FROM user_info WHERE DATE(date) = CURDATE()");
      new_users_today = Number(resNewUsers?.cnt || 0);
    } catch (e) {}

    // Recent notifications list for admin dropdown
    const recent_notifications = [];
    try {
      const [recentUsers] = await db.query("SELECT id, name, phone, date, status FROM user_info ORDER BY id DESC LIMIT 4");
      (recentUsers || []).forEach(u => {
        recent_notifications.push({
          id: `user_${u.id}`,
          type: 'new_user',
          title: 'New User Registered',
          message: `${u.name || 'User'} (${u.phone}) registered`,
          date: u.date || '',
          tab: 'user_management'
        });
      });
    } catch (e) {}

    const total_wallet_pending = pending_deposits + pending_withdrawals;
    const total_notifications = total_wallet_pending + pending_auto_deposits + unread_chats + unapproved_users;

    return res.json({
      success: '1',
      data: {
        pending_deposits,
        pending_auto_deposits,
        pending_withdrawals,
        total_wallet_pending,
        unread_chats,
        unapproved_users,
        new_users_today,
        total_notifications,
        recent_notifications
      }
    });
  } catch (err) {
    console.error('getBadgeCounts error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get List of Users (Supports pagination, search, and status filter)
exports.getUsers = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status !== undefined ? String(req.query.status).trim() : '';
    const filter = req.query.filter ? String(req.query.filter).trim() : '';
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status !== '' && status !== 'all') {
      whereConditions.push('status = ?');
      params.push(status);
    } else if (filter === 'unapproved') {
      whereConditions.push("status = '0'");
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    if (page && limit) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;

      const [countRes] = await db.query(`SELECT COUNT(*) as total FROM user_info ${whereClause}`, params);
      const total = countRes[0]?.total || 0;

      const [users] = await db.query(
        `SELECT id, name, phone, password, m_pin, email, wallet, status, betting_status, transfer_status, date, referred_by_phone FROM user_info ${whereClause} ORDER BY id DESC LIMIT ${safeLimit} OFFSET ${offset}`,
        params
      );

      return res.json({
        success: '1',
        data: users,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit))
        }
      });
    } else {
      const [users] = await db.query(`SELECT id, name, phone, password, m_pin, email, wallet, status, betting_status, transfer_status, date, referred_by_phone FROM user_info ${whereClause} ORDER BY id DESC`, params);
      return res.json({
        success: '1',
        data: users,
        total: users.length,
        pagination: {
          total: users.length,
          page: 1,
          limit: users.length,
          totalPages: 1
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Update User Status, Betting Permissions, or Wallet Points
exports.updateUser = async (req, res) => {
  const { userId, status, betting_status, wallet } = req.body;

  try {
    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (betting_status !== undefined) {
      updates.push('betting_status = ?');
      values.push(betting_status);
    }
    if (wallet !== undefined) {
      const [currentUser] = await db.query('SELECT wallet FROM user_info WHERE id = ?', [userId]);
      if (currentUser.length > 0) {
        const oldWallet = parseFloat(currentUser[0].wallet || '0');
        const newWallet = parseFloat(wallet || '0');
        const diff = newWallet - oldWallet;
        if (diff > 0) {
          await deductAdminCoins(diff);
        }
      }
      updates.push('wallet = ?');
      values.push(wallet);
    }

    if (updates.length === 0) {
      return res.json({ success: '0', msg: 'No updates provided' });
    }

    values.push(userId);
    const [updateResult] = await db.query(`UPDATE user_info SET ${updates.join(', ')} WHERE id = ?`, values);

    if (updateResult.affectedRows > 0) {
      return res.json({ success: '1', msg: 'User updated successfully' });
    } else {
      return res.json({ success: '0', msg: 'Failed to update user' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Pending Deposits (Supports pagination and search)
exports.getPendingDeposits = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    let whereClause = "WHERE status = '0'";
    const params = [];

    if (search) {
      whereClause += ' AND (username LIKE ? OR txn_id LIKE ? OR utr_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (page && limit) {
      const offset = (page - 1) * limit;
      const [countRes] = await db.query(`SELECT COUNT(*) as total FROM user_auto_deposite ${whereClause}`, params);
      const total = countRes[0]?.total || 0;

      const [deposits] = await db.query(`SELECT * FROM user_auto_deposite ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
      return res.json({
        success: '1',
        data: deposits,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    } else {
      const [deposits] = await db.query(`SELECT * FROM user_auto_deposite ${whereClause} ORDER BY id DESC`, params);
      return res.json({ success: '1', data: deposits });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Approve Deposit Request (handles both user_fund_request and user_auto_deposite)
exports.approveDeposit = async (req, res) => {
  const depositId = req.body.depositId || req.body.requestId || req.body.id;
  if (!depositId) {
    return res.status(400).json({ success: '0', msg: 'Deposit ID is required' });
  }

  const targetTable = req.body.type || (req.body.requestId ? 'fund_request' : (req.body.response !== undefined ? 'auto_deposit' : null));

  try {
    let depositRecord = null;
    let isFundRequest = false;

    // Check specified table first to avoid ID collision between tables
    if (targetTable === 'auto_deposit') {
      const [autoDeps] = await db.query('SELECT * FROM user_auto_deposite WHERE id = ?', [depositId]);
      if (autoDeps.length > 0) {
        depositRecord = autoDeps[0];
        isFundRequest = false;
      }
    } else if (targetTable === 'fund_request') {
      const [funds] = await db.query('SELECT * FROM user_fund_request WHERE id = ?', [depositId]);
      if (funds.length > 0) {
        depositRecord = funds[0];
        isFundRequest = true;
      }
    }

    // Fallback: check both tables if not found in targeted table
    if (!depositRecord) {
      const [funds] = await db.query('SELECT * FROM user_fund_request WHERE id = ?', [depositId]);
      if (funds.length > 0) {
        depositRecord = funds[0];
        isFundRequest = true;
      } else {
        const [autoDeps] = await db.query('SELECT * FROM user_auto_deposite WHERE id = ?', [depositId]);
        if (autoDeps.length > 0) {
          depositRecord = autoDeps[0];
          isFundRequest = false;
        }
      }
    }

    if (!depositRecord) {
      return res.status(404).json({ success: '0', msg: 'Deposit request not found' });
    }

    if (depositRecord.status === '1') {
      return res.json({ success: '0', msg: 'This deposit request has already been approved.' });
    }

    const username = depositRecord.username;
    const amount = parseFloat(depositRecord.amount || depositRecord.points || 0);

    if (isNaN(amount) || amount <= 0) {
      return res.json({ success: '0', msg: 'Invalid deposit amount' });
    }

    // Flexible user lookup: phone, 10-digit phone, id, or name
    const cleanPhone = String(username || '').replace(/\D/g, '').slice(-10);
    const [users] = await db.query(
      `SELECT id, phone, name, wallet FROM user_info 
       WHERE phone = ? 
          OR (LENGTH(?) = 10 AND RIGHT(phone, 10) = ?) 
          OR id = ? 
          OR name = ? 
       ORDER BY (phone = ?) DESC, id DESC 
       LIMIT 1`,
      [username, cleanPhone, cleanPhone, username, username, username]
    );

    if (users.length === 0) {
      return res.json({ success: '0', msg: `User account not found for username/phone: ${username}` });
    }

    const user = users[0];
    const targetPhone = user.phone;
    const currentWallet = parseFloat(user.wallet || '0');
    const safeCurrentWallet = isNaN(currentWallet) ? 0 : currentWallet;
    const updatedWallet = safeCurrentWallet + amount;

    // Extract unique UTR / reference if present
    let txnRef = null;
    if (isFundRequest) {
      if (depositRecord.trans_details) {
        const m = String(depositRecord.trans_details).match(/\b\d{10,20}\b/);
        if (m) txnRef = m[0];
      }
    } else {
      if (depositRecord.txt_id && depositRecord.txt_id !== '0' && depositRecord.txt_id !== 'null') {
        txnRef = String(depositRecord.txt_id).trim();
      } else if (depositRecord.txt_request && depositRecord.txt_request !== '0' && depositRecord.txt_request !== 'null') {
        txnRef = String(depositRecord.txt_request).trim();
      }
      if (!txnRef && depositRecord.transaction_note) {
        const m = String(depositRecord.transaction_note).match(/\b\d{10,20}\b/);
        if (m) txnRef = m[0];
      }
    }

    // 1. Mark status as '1' ONLY in the targeted record
    if (isFundRequest) {
      await db.query("UPDATE user_fund_request SET status = '1' WHERE id = ?", [depositId]);

      // If this request has a unique transaction/UTR reference, sync ONLY the single matching twin record in user_auto_deposite
      if (txnRef && txnRef !== '0') {
        await db.query(
          `UPDATE user_auto_deposite 
           SET status = '1' 
           WHERE (txt_id = ? OR txt_request = ? OR transaction_note LIKE ?) 
             AND (username = ? OR username = ? OR (LENGTH(?) = 10 AND RIGHT(username, 10) = ?)) 
             AND status = '0' 
           LIMIT 1`,
          [txnRef, txnRef, `%${txnRef}%`, username, targetPhone, cleanPhone, cleanPhone]
        );
      }
    } else {
      await db.query("UPDATE user_auto_deposite SET status = '1' WHERE id = ?", [depositId]);

      // If this request has a unique transaction/UTR reference, sync ONLY the single matching twin record in user_fund_request
      if (txnRef && txnRef !== '0') {
        await db.query(
          `UPDATE user_fund_request 
           SET status = '1' 
           WHERE trans_details LIKE ? 
             AND (username = ? OR username = ? OR (LENGTH(?) = 10 AND RIGHT(username, 10) = ?)) 
             AND status = '0' 
           LIMIT 1`,
          [`%${txnRef}%`, username, targetPhone, cleanPhone, cleanPhone]
        );
      }
    }

    // 2. Update user_info.wallet using primary key id AND phone
    await db.query(
      'UPDATE user_info SET wallet = ? WHERE id = ? OR phone = ?',
      [updatedWallet, user.id, targetPhone]
    );

    console.log(`[Deposit Approved] Credited ₹${amount} to user ${targetPhone} (id: ${user.id}). Wallet was: ${safeCurrentWallet}, now: ${updatedWallet}`);

    await deductAdminCoins(amount);

    // 3. Log in wallet_history so user can see it in statements
    const today = getISTDateStr();
    const time = getISTTime12h();
    const remark = isFundRequest ? 'Fund Request Approved' : 'Auto Deposit Approved';
    try {
      await db.query(
        'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES ("1", ?, ?, ?, ?, ?, ?)',
        [today, time, amount, updatedWallet, remark, targetPhone]
      );
    } catch (whErr) {
      console.warn('wallet_history log warning:', whErr.message);
    }

    // 4. Trigger referral commission for deposit
    try {
      if (typeof exports.processReferralCommission === 'function') {
        exports.processReferralCommission(targetPhone, 'every_deposit', amount);
        exports.processReferralCommission(targetPhone, 'first_deposit', amount);
      }
    } catch (refErr) {}

    try {
      const { broadcastToAdmins } = require('../socket/chatSocket');
      broadcastToAdmins({ type: 'badge_update', event: 'deposit_approved', id: depositId });
    } catch (wsErr) {}

    return res.json({
      success: '1',
      msg: `Deposit of ₹${amount} approved & wallet updated successfully. New Balance: ₹${updatedWallet}`,
      wallet: updatedWallet
    });
  } catch (err) {
    console.error('approveDeposit error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Reject Deposit Request
exports.rejectDeposit = async (req, res) => {
  const depositId = req.body.depositId || req.body.requestId || req.body.id;
  const targetTable = req.body.type || (req.body.requestId ? 'fund_request' : (req.body.response !== undefined ? 'auto_deposit' : null));

  try {
    let depositRecord = null;
    let isFundRequest = false;

    if (targetTable === 'auto_deposit') {
      const [autoDeps] = await db.query('SELECT * FROM user_auto_deposite WHERE id = ?', [depositId]);
      if (autoDeps.length > 0) {
        depositRecord = autoDeps[0];
        isFundRequest = false;
      }
    } else if (targetTable === 'fund_request') {
      const [funds] = await db.query('SELECT * FROM user_fund_request WHERE id = ?', [depositId]);
      if (funds.length > 0) {
        depositRecord = funds[0];
        isFundRequest = true;
      }
    }

    if (!depositRecord) {
      const [funds] = await db.query('SELECT * FROM user_fund_request WHERE id = ?', [depositId]);
      if (funds.length > 0) {
        depositRecord = funds[0];
        isFundRequest = true;
      } else {
        const [autoDeps] = await db.query('SELECT * FROM user_auto_deposite WHERE id = ?', [depositId]);
        if (autoDeps.length > 0) {
          depositRecord = autoDeps[0];
          isFundRequest = false;
        }
      }
    }

    if (!depositRecord) {
      return res.status(404).json({ success: '0', msg: 'Deposit request not found' });
    }

    const username = depositRecord.username;
    const cleanPhone = String(username || '').replace(/\D/g, '').slice(-10);

    // Extract unique UTR / reference if present
    let txnRef = null;
    if (isFundRequest) {
      if (depositRecord.trans_details) {
        const m = String(depositRecord.trans_details).match(/\b\d{10,20}\b/);
        if (m) txnRef = m[0];
      }
    } else {
      if (depositRecord.txt_id && depositRecord.txt_id !== '0' && depositRecord.txt_id !== 'null') {
        txnRef = String(depositRecord.txt_id).trim();
      } else if (depositRecord.txt_request && depositRecord.txt_request !== '0' && depositRecord.txt_request !== 'null') {
        txnRef = String(depositRecord.txt_request).trim();
      }
      if (!txnRef && depositRecord.transaction_note) {
        const m = String(depositRecord.transaction_note).match(/\b\d{10,20}\b/);
        if (m) txnRef = m[0];
      }
    }

    // Reject ONLY the targeted record, plus exact twin by UTR if available
    if (isFundRequest) {
      await db.query("UPDATE user_fund_request SET status = '-1' WHERE id = ?", [depositId]);
      if (txnRef && txnRef !== '0') {
        await db.query(
          `UPDATE user_auto_deposite 
           SET status = '-1' 
           WHERE (txt_id = ? OR txt_request = ? OR transaction_note LIKE ?) 
             AND (username = ? OR (LENGTH(?) = 10 AND RIGHT(username, 10) = ?)) 
             AND status = '0' 
           LIMIT 1`,
          [txnRef, txnRef, `%${txnRef}%`, username, cleanPhone, cleanPhone]
        );
      }
    } else {
      await db.query("UPDATE user_auto_deposite SET status = '-1' WHERE id = ?", [depositId]);
      if (txnRef && txnRef !== '0') {
        await db.query(
          `UPDATE user_fund_request 
           SET status = '-1' 
           WHERE trans_details LIKE ? 
             AND (username = ? OR (LENGTH(?) = 10 AND RIGHT(username, 10) = ?)) 
             AND status = '0' 
           LIMIT 1`,
          [`%${txnRef}%`, username, cleanPhone, cleanPhone]
        );
      }
    }

    try {
      const { broadcastToAdmins } = require('../socket/chatSocket');
      broadcastToAdmins({ type: 'badge_update', event: 'deposit_rejected', id: depositId });
    } catch (wsErr) {}

    return res.json({ success: '1', msg: 'Deposit request rejected' });
  } catch (err) {
    console.error('rejectDeposit error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Pending Withdrawals (Supports pagination and search)
exports.getWithdrawRequests = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    let whereClause = "WHERE (w.status = '0' OR w.status = 'Pending')";
    const params = [];

    if (search) {
      whereClause += ' AND (w.username LIKE ? OR u.phone LIKE ? OR u.name LIKE ? OR u.account_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const selectQuery = `
      SELECT 
        w.*,
        COALESCE(u.name, w.username) as user_name,
        u.id as user_id,
        u.phone as user_phone,
        u.wallet as current_wallet,
        u.bank_name,
        u.branch_name,
        u.account_holder_name,
        u.account_number,
        u.ifsc_code,
        u.paytm,
        u.phonepay,
        u.googlepay
      FROM user_withdraw_request w
      LEFT JOIN user_info u ON (w.username = u.phone OR RIGHT(w.username, 10) = RIGHT(u.phone, 10))
    `;

    if (page && limit) {
      const offset = (page - 1) * limit;
      const [countRes] = await db.query(`SELECT COUNT(*) as total FROM user_withdraw_request w LEFT JOIN user_info u ON (w.username = u.phone OR RIGHT(w.username, 10) = RIGHT(u.phone, 10)) ${whereClause}`, params);
      const total = countRes[0]?.total || 0;

      const [withdrawals] = await db.query(`${selectQuery} ${whereClause} ORDER BY w.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
      return res.json({
        success: '1',
        data: withdrawals,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    } else {
      const [withdrawals] = await db.query(`${selectQuery} ${whereClause} ORDER BY w.id DESC`, params);
      return res.json({ success: '1', data: withdrawals });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

exports.getPendingWithdrawals = exports.getWithdrawRequests;

// Approve Withdrawal Request
exports.approveWithdrawal = async (req, res) => {
  const withdrawId = req.body.withdrawId || req.body.requestId || req.body.id;
  const remark = req.body.remark || '';

  if (!withdrawId) {
    return res.status(400).json({ success: '0', msg: 'Withdrawal ID is required' });
  }

  try {
    const [requests] = await db.query(
      'SELECT * FROM user_withdraw_request WHERE id = ? AND (status = "0" OR status = 0)',
      [withdrawId]
    );

    if (requests.length === 0) {
      return res.json({ success: '0', msg: 'Withdrawal request not found or already processed' });
    }

    const reqRow = requests[0];
    const phone = reqRow.username;
    const amount = parseFloat(reqRow.points || reqRow.amount || '0');

    const walletRemark = remark || `${amount}₹ Withdrawal Approved!`;

    // Update status to '1' (approved) - points were already deducted when user placed withdrawal request
    await db.query("UPDATE user_withdraw_request SET status = '1', remark = ? WHERE id = ?", [walletRemark, withdrawId]);
    await db.query(
      "UPDATE wallet_history SET status = '1', remark = ? WHERE phone_number = ? AND status = '0' AND (remark LIKE '%Withdrawal%' OR remark LIKE '%withdraw%') ORDER BY id DESC LIMIT 1",
      [walletRemark, phone]
    );

    try {
      const { broadcastToAdmins } = require('../socket/chatSocket');
      broadcastToAdmins({ type: 'badge_update', event: 'withdrawal_approved', id: withdrawId });
    } catch (wsErr) {}

    return res.json({ success: '1', msg: 'Withdraw request approved successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Reject Withdrawal Request (Refunds points back to user wallet)
exports.rejectWithdrawal = async (req, res) => {
  const withdrawId = req.body.withdrawId || req.body.requestId || req.body.id;
  const remark = req.body.remark || 'Rejected by Admin';

  if (!withdrawId) {
    return res.status(400).json({ success: '0', msg: 'Withdrawal ID is required' });
  }

  try {
    const [requests] = await db.query(
      'SELECT * FROM user_withdraw_request WHERE id = ? AND (status = "0" OR status = 0)',
      [withdrawId]
    );

    if (requests.length === 0) {
      return res.json({ success: '0', msg: 'Withdrawal request not found or already processed' });
    }

    const reqRow = requests[0];
    const phone = reqRow.username;
    const amount = parseFloat(reqRow.points || reqRow.amount || '0');

    // Refund points back to user wallet
    await db.query('UPDATE user_info SET wallet = wallet + ? WHERE phone = ?', [amount, phone]);
    const [[user]] = await db.query('SELECT wallet FROM user_info WHERE phone = ?', [phone]);
    const updatedWallet = user ? user.wallet : 0;

    const currentDateStr = getISTDateStr();
    const currentTimeStr = getISTTime12h();
    const walletRemark = `Withdrawal Rejected (${remark}) - Refunded`;

    await db.query(
      'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['1', currentDateStr, currentTimeStr, `+${amount}`, updatedWallet, walletRemark, phone]
    );

    await db.query(
      "UPDATE user_withdraw_request SET status = '-1', remark = ? WHERE id = ?",
      [walletRemark, withdrawId]
    );

    try {
      const { broadcastToAdmins } = require('../socket/chatSocket');
      broadcastToAdmins({ type: 'badge_update', event: 'withdrawal_rejected', id: withdrawId });
    } catch (wsErr) {}

    return res.json({ success: '1', msg: 'Withdraw request rejected & points refunded successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};


// Helper: Classify whether a 3-digit pana is Single Pana, Double Pana, or Triple Pana
function classifyPanaType(panaStr, declaredGameType = '') {
  const cleanType = String(declaredGameType || '').trim().toLowerCase();
  if (cleanType.includes('triple') || cleanType.includes('tripple') || cleanType === 'tp') return 'Triple Pana';
  if (cleanType.includes('double') || cleanType === 'dp' || cleanType.includes('dp motor')) return 'Double Pana';
  if (cleanType.includes('single') || cleanType === 'sp' || cleanType.includes('sp motor')) return 'Single Pana';

  // Fallback: analyze digits
  if (panaStr && typeof panaStr === 'string' && panaStr.length === 3) {
    const [d1, d2, d3] = panaStr.split('');
    if (d1 === d2 && d2 === d3) return 'Triple Pana';
    if (d1 === d2 || d2 === d3 || d1 === d3) return 'Double Pana';
  }
  return 'Single Pana';
}

// Helper: Get multiplier from game_rates rows
function getRateMultiplier(ratesRows, type) {
  const defaultRates = {
    'Single Digit': 9.5,
    'Jodi Digit': 95,
    'Single Pana': 150,
    'Double Pana': 300,
    'Triple Pana': 700,
    'Half Sangam': 1000,
    'Full Sangam': 10000
  };

  if (!Array.isArray(ratesRows) || ratesRows.length === 0) {
    return defaultRates[type] || 9.5;
  }

  const clean = (s) => String(s || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  const t = clean(type);

  let row = ratesRows.find(r => clean(r.type) === t);

  if (!row) {
    if (t.includes('tripple') || t.includes('triple') || t === 'tp') {
      row = ratesRows.find(r => {
        const c = clean(r.type);
        return c.includes('triple') || c.includes('tripple') || c === 'tp';
      });
    } else if (t.includes('double') || t === 'dp' || t.includes('dpmotor')) {
      row = ratesRows.find(r => {
        const c = clean(r.type);
        return c.includes('double') || c === 'dp';
      });
    } else if (t.includes('singlepana') || t === 'sp' || t.includes('spmotor') || t.includes('pana')) {
      row = ratesRows.find(r => {
        const c = clean(r.type);
        return c.includes('singlepana') || c === 'sp';
      });
    } else if (t.includes('singledigit') || t.includes('digit') || t.includes('ank')) {
      row = ratesRows.find(r => clean(r.type).includes('singledigit') || clean(r.type).includes('digit'));
    } else if (t.includes('jodi')) {
      row = ratesRows.find(r => clean(r.type).includes('jodi'));
    } else if (t.includes('halfsangam') || t.includes('half')) {
      row = ratesRows.find(r => clean(r.type).includes('half'));
    } else if (t.includes('fullsangam') || t.includes('full')) {
      row = ratesRows.find(r => clean(r.type).includes('full'));
    }
  }

  if (row) {
    const min = parseFloat(row.min_value);
    const max = parseFloat(row.max_value);
    if (!isNaN(min) && !isNaN(max) && min > 0) {
      return max / min;
    }
  }

  return defaultRates[type] || 9.5;
}

// Helper: Calculate win amounts based on rates and credit users
async function processWinners(con, gameName, date, queryStr, params, winCategory, defaultWinType, openPanaVal, openDigitVal, closePanaVal, closeDigitVal, session) {
  const [bids] = await con.query(queryStr, params);
  if (!bids || bids.length === 0) return 0;

  const [ratesRows] = await con.query('SELECT * FROM game_rates');
  const currentDateStr = getISTDateStr();
  const currentTimeStr = getISTTime12h();

  let totalCredited = 0;

  for (const b of bids) {
    const phone = b.username || b.phone_number;
    const points = parseInt(b.points_action || b.points, 10);
    if (isNaN(points) || points <= 0) continue;

    // Determine exact game type (Single Pana, Double Pana, Triple Pana)
    let actualGameType = b.game_type;
    if (winCategory === 'pana') {
      const declaredPanaVal = (session.toLowerCase() === 'open') ? openPanaVal : closePanaVal;
      actualGameType = classifyPanaType(declaredPanaVal, b.game_type);
    } else if (!actualGameType || actualGameType === 'NA') {
      actualGameType = defaultWinType;
    }

    const rateVal = getRateMultiplier(ratesRows, actualGameType);
    const winAmount = Math.round(rateVal * points);

    const sessionFormatted = session.charAt(0).toUpperCase() + session.slice(1).toLowerCase();
    const winRemark = `${actualGameType} Winning Reward (${gameName} - ${session.toUpperCase()})`;

    // Insert into user_winning_report with robust error handling and fallback
    try {
      await con.query(
        'INSERT INTO user_winning_report (date, username, bid_id, game_name, game_type, session, open_pana, open_digit, close_pana, close_digit, winning_points, points_action) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [date, phone, b.id || 0, gameName, actualGameType, sessionFormatted, openPanaVal, openDigitVal, closePanaVal, closeDigitVal, winAmount, points]
      );
    } catch (insertErr) {
      console.warn('Initial insert to user_winning_report failed, retrying with fallback:', insertErr.message);
      const legacyType = sessionFormatted === 'Open' ? 'Open Pana' : 'Close Pana';
      try {
        await con.query(
          'INSERT INTO user_winning_report (date, username, bid_id, game_name, game_type, session, open_pana, open_digit, close_pana, close_digit, winning_points, points_action) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [date, phone, b.id || 0, gameName, legacyType, sessionFormatted, openPanaVal, openDigitVal, closePanaVal, closeDigitVal, winAmount, points]
        );
      } catch (legacyErr) {
        console.error('Failed to insert winning report even with fallback:', legacyErr.message);
      }
    }

    // Credit wallet
    const rawPhone = String(phone).trim();
    const clean10 = rawPhone.replace(/\D/g, '').slice(-10);
    const [users] = await con.query(
      'SELECT id, phone, wallet FROM user_info WHERE phone = ? OR RIGHT(phone, 10) = ? OR REPLACE(phone, "+91", "") = ? LIMIT 1',
      [rawPhone, clean10, clean10]
    );
    if (users.length > 0) {
      const userRow = users[0];
      const currentWallet = parseFloat(userRow.wallet || '0');
      const newWallet = currentWallet + winAmount;

      await con.query('UPDATE user_info SET wallet = ? WHERE id = ?', [newWallet, userRow.id]);
      await con.query(
        'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['1', currentDateStr, currentTimeStr, winAmount, newWallet, winRemark, userRow.phone]
      );
    }

    totalCredited += winAmount;
  }

  return totalCredited;
}

// Helper: Revert winnings for a game, date, and session (deducts from user wallets, logs to wallet_history, and deletes from user_winning_report)
async function revertWinnersForGame(gameName, date, session) {
  const sess = session ? session.toLowerCase() : 'all';
  let winQuery = `
    SELECT * FROM user_winning_report 
    WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
    AND (date = ? OR DATE(date) = ? OR date LIKE ?)
  `;
  const winParams = [gameName, date, date, `${date}%`];

  if (sess === 'open') {
    // If open result is deleted/updated, revert Open session bets AND Jodi/Sangam bets (as Jodi & Sangam depend on open digit)
    winQuery += ` AND (
      LOWER(session) = 'open' 
      OR LOWER(game_type) LIKE '%jodi%' 
      OR LOWER(game_type) LIKE '%sangam%'
      OR game_type IN ('Open Pana', 'Single Pana', 'Double Pana', 'Triple Pana', 'Single Digit', 'SP Motor', 'DP Motor')
    )`;
  } else if (sess === 'close') {
    // If close result is deleted/updated, revert Close session bets AND all Jodi & Sangam bets
    winQuery += ` AND (
      LOWER(session) = 'close' 
      OR LOWER(game_type) LIKE '%jodi%' 
      OR LOWER(game_type) LIKE '%sangam%'
      OR game_type IN ('Close Pana', 'Single Pana', 'Double Pana', 'Triple Pana', 'Single Digit', 'Jodi Digit', 'Jodi', 'Half Sangam', 'Full Sangam', 'SP Motor', 'DP Motor')
    )`;
  }

  const [winners] = await db.query(winQuery, winParams);
  const currentDateStr = getISTDateStr();
  const currentTimeStr = getISTTime12h();
  let totalReverted = 0;

  for (const w of winners) {
    const phone = w.username || w.phone_number;
    const winPoints = parseFloat(w.winning_points || '0');

    if (winPoints > 0 && phone) {
      const rawPhone = String(phone).trim();
      const clean10 = rawPhone.replace(/\D/g, '').slice(-10);

      const [users] = await db.query(
        'SELECT id, phone, wallet FROM user_info WHERE phone = ? OR RIGHT(phone, 10) = ? OR REPLACE(phone, "+91", "") = ? LIMIT 1',
        [rawPhone, clean10, clean10]
      );

      if (users.length > 0) {
        const userRow = users[0];
        const currentWallet = parseFloat(userRow.wallet || '0');
        const newWallet = Math.max(0, currentWallet - winPoints);

        await db.query('UPDATE user_info SET wallet = ? WHERE id = ?', [newWallet, userRow.id]);
        await db.query(
          'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['0', currentDateStr, currentTimeStr, winPoints, newWallet, `Revert Win - ${gameName} (${w.game_type || sess.toUpperCase()})`, userRow.phone]
        );
        totalReverted += winPoints;
      }
    }
    await db.query('DELETE FROM user_winning_report WHERE id = ?', [w.id]);
  }

  return { revertedCount: winners.length, totalAmount: totalReverted };
}

// Declare Game Result & Distribute Payouts (supports updating existing results with automatic wallet deduction & re-credit)
exports.declareResult = async (req, res) => {
  const { game_name, date, session, open_pana, open_result, close_pana, close_result } = req.body;

  if (!game_name || !date || !session) {
    return res.json({ success: '0', msg: 'Game name, date and session are required!' });
  }

  try {
    const sessionKey = session.toLowerCase();
    const panaVal = sessionKey === 'open' ? 'open_panna' : 'close_panna';
    const digitVal = sessionKey === 'open' ? 'open_digit' : 'close_digit';
    const declaredPana = sessionKey === 'open' ? open_pana : close_pana;
    const declaredDigit = sessionKey === 'open' ? open_result : close_result;

    if (!declaredPana || !declaredDigit) {
      return res.json({ success: '0', msg: 'Winning pana and digit are required!' });
    }

    // 1. Check if result already declared
    const [checkChart] = await db.query(
      'SELECT * FROM result_chart WHERE (date = ? OR DATE(date) = ? OR date LIKE ?) AND TRIM(LOWER(game_name)) = TRIM(LOWER(?))',
      [date, date, `${date}%`, game_name]
    );

    let isUpdate = false;
    let revertedCount = 0;

    if (checkChart.length > 0) {
      const row = checkChart[0];
      if (sessionKey === 'close') {
        if (!row.open_panna || !row.open_digit) {
          return res.json({ success: '0', msg: 'Please declare Open Result first!' });
        }
        if (row.close_panna && row.close_digit) {
          // Re-declaring / updating Close result:
          // Revert previous close winners AND previous Jodi / Sangam winners
          const rev = await revertWinnersForGame(game_name, date, 'close');
          revertedCount = rev.revertedCount;
          isUpdate = true;
        }
        // Update close result
        await db.query(
          `UPDATE result_chart SET ${panaVal} = ?, ${digitVal} = ? WHERE id = ?`,
          [declaredPana, declaredDigit, row.id]
        );
      } else {
        // sessionKey === 'open'
        if (row.open_panna && row.open_digit) {
          // Re-declaring / updating Open result:
          // Revert previous open winners AND previous Jodi / Sangam winners (since Jodi depends on open!)
          const rev = await revertWinnersForGame(game_name, date, 'open');
          revertedCount = rev.revertedCount;
          isUpdate = true;
        }
        // Update open result
        await db.query(
          `UPDATE result_chart SET ${panaVal} = ?, ${digitVal} = ? WHERE id = ?`,
          [declaredPana, declaredDigit, row.id]
        );
      }
    } else {
      if (sessionKey === 'close') {
        return res.json({ success: '0', msg: 'Please declare Open Result first!' });
      }
      // Insert new open result
      await db.query(
        'INSERT INTO result_chart (game_name, date, open_panna, open_digit, close_panna, close_digit, status) VALUES (?, ?, ?, ?, "", "", "1")',
        [game_name, date, declaredPana, declaredDigit]
      );
    }

    // 2. Process winners based on declared results
    if (sessionKey === 'open') {
      // Open Pana Winners (Single Pana, Double Pana, Triple Pana, SP Motor, DP Motor)
      const openPanaQuery = `
        SELECT * FROM user_bid_history 
        WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
        AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
        AND LOWER(session) = 'open'
        AND (
          TRIM(open_pana) = TRIM(?) 
          OR (TRIM(open_pana) = 'NA' AND TRIM(close_pana) = TRIM(?))
        )
        AND game_type != 'Half Sangam' AND game_type != 'Full Sangam'
      `;
      await processWinners(db, game_name, date, openPanaQuery, [game_name, date, date, `${date}%`, declaredPana, declaredPana], 'pana', 'Single Pana', declaredPana, declaredDigit, 'N/A', 'N/A', 'Open');

      // Open Digit Winners
      const openDigitQuery = `
        SELECT * FROM user_bid_history 
        WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
        AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
        AND LOWER(session) = 'open'
        AND (
          open_digit = ? 
          OR (open_digit = 'NA' AND close_digit = ?)
        )
        AND (game_type = 'Single Digit' OR game_type = 'Single Ank')
      `;
      await processWinners(db, game_name, date, openDigitQuery, [game_name, date, date, `${date}%`, declaredDigit, declaredDigit], 'digit', 'Single Digit', declaredPana, declaredDigit, 'N/A', 'N/A', 'Open');

      // If Close result was already declared in chart, also process new Jodi & Sangam winners!
      const [[updatedChartRow]] = await db.query(
        'SELECT * FROM result_chart WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) AND (date = ? OR DATE(date) = ? OR date LIKE ?) LIMIT 1',
        [game_name, date, date, `${date}%`]
      );
      if (updatedChartRow && updatedChartRow.close_panna && updatedChartRow.close_digit) {
        const openRe = declaredDigit;
        const closeRe = updatedChartRow.close_digit;
        const openPa = declaredPana;
        const closePa = updatedChartRow.close_panna;

        // Jodi Winners
        const jodiQuery = `
          SELECT * FROM user_bid_history 
          WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
          AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
          AND (game_type = 'Jodi Digit' OR game_type = 'Jodi' OR game_type LIKE '%Jodi%' OR game_type = 'Red Bracket') 
          AND open_digit = ? AND close_digit = ?
        `;
        await processWinners(db, game_name, date, jodiQuery, [game_name, date, date, `${date}%`, openRe, closeRe], 'jodi', 'Jodi Digit', openPa, openRe, closePa, closeRe, 'Close');

        // Half Sangam Winners
        const halfSangamQuery = `
          SELECT * FROM user_bid_history 
          WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
          AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
          AND game_type = 'Half Sangam' 
          AND ((open_digit = ? AND close_pana = ?) OR (open_pana = ? AND close_digit = ?))
        `;
        await processWinners(db, game_name, date, halfSangamQuery, [game_name, date, date, `${date}%`, openRe, closePa, openPa, closeRe], 'sangam', 'Half Sangam', openPa, openRe, closePa, closeRe, 'Close');

        // Full Sangam Winners
        const fullSangamQuery = `
          SELECT * FROM user_bid_history 
          WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
          AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
          AND game_type = 'Full Sangam' 
          AND open_pana = ? AND close_pana = ?
        `;
        await processWinners(db, game_name, date, fullSangamQuery, [game_name, date, date, `${date}%`, openPa, closePa], 'sangam', 'Full Sangam', openPa, openRe, closePa, closeRe, 'Close');
      }
    } else {
      // sessionKey === 'close'
      // Fetch open result from chart row if available
      const [[chartRow]] = await db.query(
        'SELECT * FROM result_chart WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) AND (date = ? OR DATE(date) = ? OR date LIKE ?)',
        [game_name, date, date, `${date}%`]
      );
      const prevOpenPa = chartRow ? chartRow.open_panna : 'N/A';
      const prevOpenRe = chartRow ? chartRow.open_digit : 'N/A';

      // Close Pana Winners (Single Pana, Double Pana, Triple Pana, SP Motor, DP Motor)
      const closePanaQuery = `
        SELECT * FROM user_bid_history 
        WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
        AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
        AND LOWER(session) = 'close'
        AND (
          TRIM(close_pana) = TRIM(?) 
          OR (TRIM(close_pana) = 'NA' AND TRIM(open_pana) = TRIM(?))
        )
        AND game_type != 'Half Sangam' AND game_type != 'Full Sangam'
      `;
      await processWinners(db, game_name, date, closePanaQuery, [game_name, date, date, `${date}%`, declaredPana, declaredPana], 'pana', 'Single Pana', prevOpenPa, prevOpenRe, declaredPana, declaredDigit, 'Close');

      // Close Digit Winners
      const closeDigitQuery = `
        SELECT * FROM user_bid_history 
        WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
        AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
        AND LOWER(session) = 'close'
        AND (
          close_digit = ? 
          OR (close_digit = 'NA' AND open_digit = ?)
        )
        AND (game_type = 'Single Digit' OR game_type = 'Single Ank')
      `;
      await processWinners(db, game_name, date, closeDigitQuery, [game_name, date, date, `${date}%`, declaredDigit, declaredDigit], 'digit', 'Single Digit', prevOpenPa, prevOpenRe, declaredPana, declaredDigit, 'Close');

      if (chartRow) {
        const openRe = chartRow.open_digit;
        const closeRe = declaredDigit;
        const openPa = chartRow.open_panna;
        const closePa = declaredPana;

        // Jodi Winners
        const jodiQuery = `
          SELECT * FROM user_bid_history 
          WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
          AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
          AND (game_type = 'Jodi Digit' OR game_type = 'Jodi' OR game_type LIKE '%Jodi%' OR game_type = 'Red Bracket') 
          AND open_digit = ? AND close_digit = ?
        `;
        await processWinners(db, game_name, date, jodiQuery, [game_name, date, date, `${date}%`, openRe, closeRe], 'jodi', 'Jodi Digit', openPa, openRe, closePa, closeRe, 'Close');

        // Half Sangam Winners
        const halfSangamQuery = `
          SELECT * FROM user_bid_history 
          WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
          AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
          AND game_type = 'Half Sangam' 
          AND ((open_digit = ? AND close_pana = ?) OR (open_pana = ? AND close_digit = ?))
        `;
        await processWinners(db, game_name, date, halfSangamQuery, [game_name, date, date, `${date}%`, openRe, closePa, openPa, closeRe], 'sangam', 'Half Sangam', openPa, openRe, closePa, closeRe, 'Close');

        // Full Sangam Winners
        const fullSangamQuery = `
          SELECT * FROM user_bid_history 
          WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) 
          AND (date = ? OR DATE(date) = ? OR date LIKE ?) 
          AND game_type = 'Full Sangam' 
          AND open_pana = ? AND close_pana = ?
        `;
        await processWinners(db, game_name, date, fullSangamQuery, [game_name, date, date, `${date}%`, openPa, closePa], 'sangam', 'Full Sangam', openPa, openRe, closePa, closeRe, 'Close');
      }
    }

    const successMsg = isUpdate
      ? `Result updated successfully! Reverted ${revertedCount} previous winner payout(s) from user wallets and credited new winners.`
      : 'Result Declared and Winners credited successfully!';

    return res.json({ success: '1', msg: successMsg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get List of Declared Results
exports.getDeclaredResults = async (req, res) => {
  try {
    const { date } = req.query;
    let sql = "SELECT * FROM result_chart";
    const params = [];
    if (date && date.trim() !== '') {
      sql += " WHERE date = ?";
      params.push(date.trim());
    }
    sql += " ORDER BY id DESC LIMIT 100";
    const [results] = await db.query(sql, params);
    return res.json({ success: '1', data: results, result: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Revert & Delete Declared Result (Deducts payouts from user wallets & deletes result entries)
exports.deleteDeclaredResult = async (req, res) => {
  const { game_name, date, session } = req.body;
  if (!game_name || !date) {
    return res.status(400).json({ success: '0', msg: 'Game name and date are required!' });
  }

  try {
    const sess = session ? session.toLowerCase() : 'all';
    
    // 1. Revert wallet balances for all matching winners (including Jodi & Sangam)
    const { revertedCount, totalAmount } = await revertWinnersForGame(game_name, date, sess);

    // 2. Update or delete result_chart entry
    const [chartRows] = await db.query(
      'SELECT * FROM result_chart WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) AND (date = ? OR DATE(date) = ? OR date LIKE ?)',
      [game_name, date, date, `${date}%`]
    );

    if (chartRows.length > 0) {
      const row = chartRows[0];
      if (sess === 'open') {
        if (!row.close_panna || row.close_panna === '') {
          await db.query('DELETE FROM result_chart WHERE id = ?', [row.id]);
        } else {
          await db.query('UPDATE result_chart SET open_panna = "", open_digit = "" WHERE id = ?', [row.id]);
        }
      } else if (sess === 'close') {
        if (!row.open_panna || row.open_panna === '') {
          await db.query('DELETE FROM result_chart WHERE id = ?', [row.id]);
        } else {
          await db.query('UPDATE result_chart SET close_panna = "", close_digit = "" WHERE id = ?', [row.id]);
        }
      } else {
        await db.query('DELETE FROM result_chart WHERE id = ?', [row.id]);
      }
    }

    return res.json({
      success: '1',
      msg: `Result deleted and payouts reverted for ${revertedCount} winner(s) (₹${totalAmount}) successfully!`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Preview Winners for a potential declared result
exports.previewWinners = async (req, res) => {
  const { game_name, date, session, open_pana, open_result, close_pana, close_result } = req.body;
  if (!game_name || !date || !session) {
    return res.status(400).json({ success: '0', msg: 'Game name, date and session are required!' });
  }

  try {
    const sessionKey = String(session).trim().toLowerCase();
    const declaredPana = sessionKey === 'open' ? String(open_pana || '').trim() : String(close_pana || '').trim();
    const declaredDigit = sessionKey === 'open' ? String(open_result || '').trim() : String(close_result || '').trim();

    if (!declaredPana || !declaredDigit) {
      return res.json({ success: '0', msg: 'Winning pana and digit are required for preview!' });
    }

    // Build alternative date formats (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY)
    let altDate1 = String(date).trim();
    let altDate2 = String(date).trim();
    if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          altDate1 = `${parts[2]}-${parts[1]}-${parts[0]}`;
          altDate2 = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else if (parts[2].length === 4) {
          altDate1 = `${parts[2]}-${parts[1]}-${parts[0]}`;
          altDate2 = `${parts[0]}/${parts[1]}/${parts[2]}`;
        }
      }
    }

    const [ratesRows] = await db.query('SELECT * FROM game_rates');
    const potentialWinners = [];

    // Helper to evaluate and push winner
    const addWinner = (b, winType) => {
      const rate = getRateMultiplier(ratesRows, winType);
      const points = parseInt(b.points_action || b.points || 0, 10);
      if (!isNaN(points) && points > 0) {
        potentialWinners.push({
          ...b,
          winType,
          rate,
          winAmount: Math.round(points * rate)
        });
      }
    };

    if (sessionKey === 'open') {
      // 1. Open Pana Bids (Single Pana, Double Pana, Triple Pana, SP Motor, DP Motor)
      const [openPanaBids] = await db.query(
        `SELECT b.*, u.name as user_fullname 
         FROM user_bid_history b 
         LEFT JOIN user_info u ON (u.phone = b.username OR u.phone = REPLACE(b.username, '+91', '') OR CONCAT('+91', u.phone) = b.username) 
         WHERE TRIM(LOWER(b.game_name)) = TRIM(LOWER(?)) 
         AND (b.date = ? OR b.date = ? OR b.date = ? OR b.date LIKE ?) 
         AND LOWER(b.session) = 'open'
         AND (
           TRIM(b.open_pana) = TRIM(?) 
           OR (TRIM(b.open_pana) = 'NA' AND TRIM(b.close_pana) = TRIM(?))
         )
         AND b.game_type != 'Half Sangam' AND b.game_type != 'Full Sangam'`,
        [game_name, date, altDate1, altDate2, `${date}%`, declaredPana, declaredPana]
      );
      for (const b of openPanaBids) {
        const actualType = classifyPanaType(declaredPana, b.game_type);
        addWinner(b, actualType);
      }

      // 2. Open Single Digit Bids
      const [openDigitBids] = await db.query(
        `SELECT b.*, u.name as user_fullname 
         FROM user_bid_history b 
         LEFT JOIN user_info u ON (u.phone = b.username OR u.phone = REPLACE(b.username, '+91', '') OR CONCAT('+91', u.phone) = b.username) 
         WHERE TRIM(LOWER(b.game_name)) = TRIM(LOWER(?)) 
         AND (b.date = ? OR b.date = ? OR b.date = ? OR b.date LIKE ?) 
         AND LOWER(b.session) = 'open'
         AND (
           b.open_digit = ? 
           OR (b.open_digit = 'NA' AND b.close_digit = ?)
         )
         AND (b.game_type = 'Single Digit' OR b.game_type = 'Single Ank')`,
        [game_name, date, altDate1, altDate2, `${date}%`, declaredDigit, declaredDigit]
      );
      for (const b of openDigitBids) {
        addWinner(b, 'Single Digit');
      }
    } else {
      // 1. Close Pana Bids (Single Pana, Double Pana, Triple Pana, SP Motor, DP Motor)
      const [closePanaBids] = await db.query(
        `SELECT b.*, u.name as user_fullname 
         FROM user_bid_history b 
         LEFT JOIN user_info u ON (u.phone = b.username OR u.phone = REPLACE(b.username, '+91', '') OR CONCAT('+91', u.phone) = b.username) 
         WHERE TRIM(LOWER(b.game_name)) = TRIM(LOWER(?)) 
         AND (b.date = ? OR b.date = ? OR b.date = ? OR b.date LIKE ?) 
         AND LOWER(b.session) = 'close'
         AND (
           TRIM(b.close_pana) = TRIM(?) 
           OR (TRIM(b.close_pana) = 'NA' AND TRIM(b.open_pana) = TRIM(?))
         )
         AND b.game_type != 'Half Sangam' AND b.game_type != 'Full Sangam'`,
        [game_name, date, altDate1, altDate2, `${date}%`, declaredPana, declaredPana]
      );
      for (const b of closePanaBids) {
        const actualType = classifyPanaType(declaredPana, b.game_type);
        addWinner(b, actualType);
      }

      // 2. Close Single Digit Bids
      const [closeDigitBids] = await db.query(
        `SELECT b.*, u.name as user_fullname 
         FROM user_bid_history b 
         LEFT JOIN user_info u ON (u.phone = b.username OR u.phone = REPLACE(b.username, '+91', '') OR CONCAT('+91', u.phone) = b.username) 
         WHERE TRIM(LOWER(b.game_name)) = TRIM(LOWER(?)) 
         AND (b.date = ? OR b.date = ? OR b.date = ? OR b.date LIKE ?) 
         AND LOWER(b.session) = 'close'
         AND (
           b.close_digit = ? 
           OR (b.close_digit = 'NA' AND b.open_digit = ?)
         )
         AND (b.game_type = 'Single Digit' OR b.game_type = 'Single Ank')`,
        [game_name, date, altDate1, altDate2, `${date}%`, declaredDigit, declaredDigit]
      );
      for (const b of closeDigitBids) {
        addWinner(b, 'Single Digit');
      }

      // 3. Check Jodi and Sangam if Open is declared in chart or provided in request
      const [chartRows] = await db.query(
        'SELECT * FROM result_chart WHERE TRIM(LOWER(game_name)) = TRIM(LOWER(?)) AND (date = ? OR date = ? OR date LIKE ?) LIMIT 1', 
        [game_name, date, altDate1, `${date}%`]
      );
      const chartRow = chartRows && chartRows.length > 0 ? chartRows[0] : null;

      const openRe = (chartRow && chartRow.open_digit && chartRow.open_digit !== 'NA') ? String(chartRow.open_digit).trim() : String(open_result || '').trim();
      const openPa = (chartRow && chartRow.open_panna && chartRow.open_panna !== 'NA') ? String(chartRow.open_panna).trim() : String(open_pana || '').trim();

      if (openRe && openPa && openRe !== 'NA' && openPa !== 'NA') {
        // Jodi Bids
        const [jodiBids] = await db.query(
          `SELECT b.*, u.name as user_fullname 
           FROM user_bid_history b 
           LEFT JOIN user_info u ON (u.phone = b.username OR u.phone = REPLACE(b.username, '+91', '') OR CONCAT('+91', u.phone) = b.username) 
           WHERE TRIM(LOWER(b.game_name)) = TRIM(LOWER(?)) 
           AND (b.date = ? OR b.date = ? OR b.date = ? OR b.date LIKE ?) 
           AND (b.game_type = 'Jodi Digit' OR b.game_type = 'Jodi' OR b.game_type LIKE '%Jodi%' OR b.game_type = 'Red Bracket') 
           AND b.open_digit = ? AND b.close_digit = ?`,
          [game_name, date, altDate1, altDate2, `${date}%`, openRe, declaredDigit]
        );
        for (const b of jodiBids) {
          addWinner(b, 'Jodi Digit');
        }

        // Half Sangam Bids
        const [halfSangamBids] = await db.query(
          `SELECT b.*, u.name as user_fullname 
           FROM user_bid_history b 
           LEFT JOIN user_info u ON (u.phone = b.username OR u.phone = REPLACE(b.username, '+91', '') OR CONCAT('+91', u.phone) = b.username) 
           WHERE TRIM(LOWER(b.game_name)) = TRIM(LOWER(?)) 
           AND (b.date = ? OR b.date = ? OR b.date = ? OR b.date LIKE ?) 
           AND b.game_type = 'Half Sangam' 
           AND ((b.open_digit = ? AND b.close_pana = ?) OR (b.open_pana = ? AND b.close_digit = ?))`,
          [game_name, date, altDate1, altDate2, `${date}%`, openRe, declaredPana, openPa, declaredDigit]
        );
        for (const b of halfSangamBids) {
          addWinner(b, 'Half Sangam');
        }

        // Full Sangam Bids
        const [fullSangamBids] = await db.query(
          `SELECT b.*, u.name as user_fullname 
           FROM user_bid_history b 
           LEFT JOIN user_info u ON (u.phone = b.username OR u.phone = REPLACE(b.username, '+91', '') OR CONCAT('+91', u.phone) = b.username) 
           WHERE TRIM(LOWER(b.game_name)) = TRIM(LOWER(?)) 
           AND (b.date = ? OR b.date = ? OR b.date = ? OR b.date LIKE ?) 
           AND b.game_type = 'Full Sangam' 
           AND b.open_pana = ? AND b.close_pana = ?`,
          [game_name, date, altDate1, altDate2, `${date}%`, openPa, declaredPana]
        );
        for (const b of fullSangamBids) {
          addWinner(b, 'Full Sangam');
        }
      }
    }

    const totalWinners = potentialWinners.length;
    const totalPayout = potentialWinners.reduce((sum, item) => sum + (item.winAmount || 0), 0);

    return res.json({
      success: '1',
      totalWinners,
      totalPayout,
      winners: potentialWinners
    });
  } catch (err) {
    console.error('previewWinners error:', err);
    return res.status(500).json({ success: '0', error: err.message, msg: err.message });
  }
};

// Delete Bid from History (with Refund & User Wallet History generation)
exports.deleteBidHistory = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: '0', msg: 'Bid ID is required' });
    }
    const [bids] = await db.query('SELECT * FROM user_bid_history WHERE id = ?', [id]);
    if (bids.length > 0) {
      const b = bids[0];
      const amount = parseFloat(b.points_action || b.points || '0');
      const user = b.username || b.phone_number;
      if (amount > 0 && user) {
        await db.query('UPDATE user_info SET wallet = wallet + ? WHERE phone = ?', [amount, user]);
        const [[u]] = await db.query('SELECT wallet FROM user_info WHERE phone = ?', [user]);
        const today = getISTDateStr();
        const time = getISTTime12h();
        const remarkStr = `Bid Cancelled & Refunded for ${b.game_name || ''} (${b.game_type || ''})`;
        await db.query(
          'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['1', today, time, `+${amount}`, u ? u.wallet : 0, remarkStr, user]
        );
      }
    }
    await db.query('DELETE FROM user_bid_history WHERE id = ?', [id]);
    return res.json({ success: '1', msg: 'Bid deleted and amount refunded to user wallet history successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Admin Settings and Contacts (PHP Parity)
exports.getSettings = async (req, res) => {
  try {
    const [settingsRows] = await db.query('SELECT * FROM admin_settings LIMIT 1');
    const settings = settingsRows && settingsRows.length > 0 ? settingsRows[0] : {};
    const [contactRows] = await db.query('SELECT * FROM contact_detail LIMIT 1');
    const contact = contactRows && contactRows.length > 0 ? contactRows[0] : {};
    const [daysRows] = await db.query("SELECT name FROM withdraw_limit_days WHERE role = 'Days' AND status = 1");
    const withdraw_days = daysRows.map(r => r.name);
    return res.json({ success: '1', settings: settings || {}, contact: contact || {}, withdraw_days });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Update Admin Settings (Bank Details, UPI/QR, Limits & Days - PHP main-settings.php parity)
exports.updateSettings = async (req, res) => {
  try {
    const body = req.body.settings || req.body;
    const {
      ac_name,
      ac_number,
      ifsc_code,
      alert_message,
      min_deposite,
      max_deposite,
      min_withdrawal,
      max_withdrawal,
      min_transfer,
      max_transfer,
      min_bid_amt,
      max_bid_amt,
      Dragon_bonus,
      referral_commission,
      min_wallet_amount,
      withdraw_open_time,
      withdraw_close_time,
      payment_upi_id,
      upi_payment_id,
      payment_barcode_image,
      show_upi,
      show_qr,
      how_to_play,
      app_link,
      withdraw_days,
      mpin_status,
      slider_status,
      referral_status,
      referral_type,
      auto_active_status,
      deposit_mode,
      active_payment_gateway,
      auto_upi_id,
      privacy_policy_url,
      data_deletion_url
    } = body;

    // Helper for bool/int values
    const parseFlag = (val) => {
      if (val === undefined || val === null) return null;
      if (val === 1 || val === '1' || val === true || val === 'true') return 1;
      return 0;
    };

    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN referral_status VARCHAR(10) DEFAULT '1'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN referral_type VARCHAR(50) DEFAULT 'signup'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN app_link TEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN auto_active_status VARCHAR(10) DEFAULT '1'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN deposit_mode VARCHAR(20) DEFAULT 'manual'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN active_payment_gateway VARCHAR(50) DEFAULT 'razorpay'`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN auto_upi_id VARCHAR(150) DEFAULT ''`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN privacy_policy_url TEXT`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE admin_settings ADD COLUMN data_deletion_url TEXT`);
    } catch (e) {}

    const upiVal = (payment_upi_id !== undefined || upi_payment_id !== undefined) 
      ? (payment_upi_id || upi_payment_id || '') 
      : (auto_upi_id !== undefined ? auto_upi_id : undefined);

    const cleanAutoUpi = auto_upi_id !== undefined ? auto_upi_id.trim() : (upiVal !== undefined ? upiVal.trim() : undefined);

    // If auto_upi_id is provided, also sync upi_gateways table
    if (cleanAutoUpi) {
      try {
        await db.query('UPDATE upi_gateways SET upi_id = ?', [cleanAutoUpi]);
      } catch (e) {}
    }

    // Update admin_settings
    const [targetRows] = await db.query('SELECT id FROM admin_settings LIMIT 1');
    const targetId = targetRows && targetRows.length > 0 ? targetRows[0].id : 1;

    await db.query(
      `UPDATE admin_settings SET 
        ac_name = COALESCE(?, ac_name),
        ac_number = COALESCE(?, ac_number),
        ifsc_code = COALESCE(?, ifsc_code),
        alert_message = COALESCE(?, alert_message),
        min_deposite = COALESCE(?, min_deposite),
        max_deposite = COALESCE(?, max_deposite),
        min_withdrawal = COALESCE(?, min_withdrawal),
        max_withdrawal = COALESCE(?, max_withdrawal),
        min_transfer = COALESCE(?, min_transfer),
        max_transfer = COALESCE(?, max_transfer),
        min_bid_amt = COALESCE(?, min_bid_amt),
        max_bid_amt = COALESCE(?, max_bid_amt),
        Dragon_bonus = COALESCE(?, Dragon_bonus),
        referral_commission = COALESCE(?, referral_commission),
        min_wallet_amount = COALESCE(?, min_wallet_amount),
        withdraw_open_time = COALESCE(?, withdraw_open_time),
        withdraw_close_time = COALESCE(?, withdraw_close_time),
        payment_upi_id = COALESCE(?, payment_upi_id),
        upi_payment_id = COALESCE(?, upi_payment_id),
        payment_barcode_image = COALESCE(?, payment_barcode_image),
        show_upi = COALESCE(?, show_upi),
        show_qr = COALESCE(?, show_qr),
        how_to_play = COALESCE(?, how_to_play),
        app_link = COALESCE(?, app_link),
        mpin_status = COALESCE(?, mpin_status),
        slider_status = COALESCE(?, slider_status),
        referral_status = COALESCE(?, referral_status),
        referral_type = COALESCE(?, referral_type),
        auto_active_status = COALESCE(?, auto_active_status),
        deposit_mode = COALESCE(?, deposit_mode),
        active_payment_gateway = COALESCE(?, active_payment_gateway),
        auto_upi_id = COALESCE(?, auto_upi_id),
        privacy_policy_url = COALESCE(?, privacy_policy_url),
        data_deletion_url = COALESCE(?, data_deletion_url)
       WHERE id = ?`,
      [
        ac_name !== undefined ? ac_name : null,
        ac_number !== undefined ? ac_number : null,
        ifsc_code !== undefined ? ifsc_code : null,
        alert_message !== undefined ? alert_message : null,
        min_deposite !== undefined ? min_deposite : null,
        max_deposite !== undefined ? max_deposite : null,
        min_withdrawal !== undefined ? min_withdrawal : null,
        max_withdrawal !== undefined ? max_withdrawal : null,
        min_transfer !== undefined ? min_transfer : null,
        max_transfer !== undefined ? max_transfer : null,
        min_bid_amt !== undefined ? min_bid_amt : null,
        max_bid_amt !== undefined ? max_bid_amt : null,
        Dragon_bonus !== undefined ? Dragon_bonus : null,
        referral_commission !== undefined ? referral_commission : null,
        min_wallet_amount !== undefined ? min_wallet_amount : null,
        withdraw_open_time !== undefined ? withdraw_open_time : null,
        withdraw_close_time !== undefined ? withdraw_close_time : null,
        upiVal !== undefined ? upiVal : null,
        upiVal !== undefined ? upiVal : null,
        payment_barcode_image !== undefined ? payment_barcode_image : null,
        parseFlag(show_upi),
        parseFlag(show_qr),
        how_to_play !== undefined ? how_to_play : null,
        app_link !== undefined ? app_link : null,
        mpin_status !== undefined && mpin_status !== null ? String(mpin_status) : null,
        slider_status !== undefined && slider_status !== null ? String(slider_status) : null,
        referral_status !== undefined && referral_status !== null ? String(referral_status) : null,
        referral_type !== undefined && referral_type !== null ? String(referral_type) : null,
        auto_active_status !== undefined && auto_active_status !== null ? String(auto_active_status) : null,
        deposit_mode !== undefined && deposit_mode !== null ? String(deposit_mode) : null,
        active_payment_gateway !== undefined && active_payment_gateway !== null ? String(active_payment_gateway) : null,
        cleanAutoUpi !== undefined ? cleanAutoUpi : null,
        privacy_policy_url !== undefined ? privacy_policy_url : null,
        data_deletion_url !== undefined ? data_deletion_url : null,
        targetId
      ]
    );

    // Update withdraw allowed days if provided
    if (Array.isArray(withdraw_days)) {
      await db.query("DELETE FROM withdraw_limit_days WHERE role = 'Days'");
      for (const day of withdraw_days) {
        await db.query(
          "INSERT INTO withdraw_limit_days (name, status, role, updated_on) VALUES (?, 1, 'Days', NOW())",
          [day]
        );
      }
    }

    return res.json({ success: '1', msg: 'Main Settings updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Update Contact Details (PHP contact-settings.php parity)
exports.updateContact = async (req, res) => {
  try {
    const {
      mobile,
      alt_mobile,
      wp_mobile,
      landline,
      alt_landline,
      email,
      alt_email,
      facebook,
      twitter,
      youtube,
      instagram,
      address
    } = req.body;

    await db.query(
      `UPDATE contact_detail SET 
        mobile = ?, 
        alt_mobile = ?,
        wp_mobile = ?, 
        landline = ?,
        alt_landline = ?,
        email = ?,
        alt_email = ?,
        facebook = ?,
        twitter = ?,
        youtube = ?,
        instagram = ?,
        address = ?
       WHERE id = 1`,
      [
        mobile || '',
        alt_mobile || '',
        wp_mobile || '',
        landline || '',
        alt_landline || '',
        email || '',
        alt_email || '',
        facebook || '',
        twitter || '',
        youtube || '',
        instagram || '',
        address || ''
      ]
    );

    return res.json({ success: '1', msg: 'Contact Details updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Game Payout Rates
exports.getGameRates = async (req, res) => {
  try {
    const [rates] = await db.query('SELECT * FROM game_rates ORDER BY id ASC');
    return res.json({ success: '1', data: rates });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Update Game Payout Rates
exports.updateGameRates = async (req, res) => {
  try {
    const body = req.body;
    if (Array.isArray(body.rates)) {
      for (const rate of body.rates) {
        if (rate.id) {
          await db.query(
            'UPDATE game_rates SET min_value = ?, max_value = ? WHERE id = ?',
            [rate.min_value, rate.max_value, rate.id]
          );
        } else if (rate.type) {
          const isTriple = /tripp?le\s*pana/i.test(rate.type);
          if (isTriple) {
            await db.query(
              'UPDATE game_rates SET min_value = ?, max_value = ? WHERE type = ? OR LOWER(type) IN ("triple pana", "tripple pana")',
              [rate.min_value, rate.max_value, rate.type]
            );
          } else {
            await db.query(
              'UPDATE game_rates SET min_value = ?, max_value = ? WHERE type = ? OR REPLACE(LOWER(type), " ", "") = REPLACE(LOWER(?), " ", "")',
              [rate.min_value, rate.max_value, rate.type, rate.type]
            );
          }
        }
      }
    } else if (body.rates && typeof body.rates === 'object') {
      for (const [type, val] of Object.entries(body.rates)) {
        const isTriple = /tripp?le\s*pana/i.test(type);
        if (isTriple) {
          await db.query(
            'UPDATE game_rates SET min_value = ?, max_value = ? WHERE type = ? OR LOWER(type) IN ("triple pana", "tripple pana")',
            [val.min_value, val.max_value, type]
          );
        } else {
          await db.query(
            'UPDATE game_rates SET min_value = ?, max_value = ? WHERE type = ? OR REPLACE(LOWER(type), " ", "") = REPLACE(LOWER(?), " ", "")',
            [val.min_value, val.max_value, type, type]
          );
        }
      }
    } else {
      // Direct keys like single_digit_1, single_digit_2 matching PHP update-game-rates.php
      const mapping = {
        'Single Digit': [body.single_digit_1, body.single_digit_2],
        'Jodi Digit': [body.jodi_digit_1, body.jodi_digit_2],
        'Single Pana': [body.single_pana_1, body.single_pana_2],
        'Double Pana': [body.double_pana_1, body.double_pana_2],
        'Triple Pana': [body.triple_pana_1, body.triple_pana_2],
        'Tripple Pana': [body.triple_pana_1, body.triple_pana_2],
        'Half Sangam': [body.half_sangam_1, body.half_sangam_2],
        'Full Sangam': [body.full_sangam_1, body.full_sangam_2]
      };
      for (const [type, [v1, v2]] of Object.entries(mapping)) {
        if (v1 !== undefined && v2 !== undefined) {
          await db.query(
            'UPDATE game_rates SET min_value = ?, max_value = ? WHERE type = ?',
            [v1, v2, type]
          );
        }
      }
    }
    return res.json({ success: '1', msg: 'Game rates updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Slider Images
exports.getSliderImages = async (req, res) => {
  try {
    const [sliders] = await db.query('SELECT * FROM slider_images ORDER BY id DESC');
    return res.json({ success: '1', data: sliders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Add Slider Image
exports.addSliderImage = async (req, res) => {
  try {
    const { slider_image, display_order } = req.body;
    if (!slider_image) {
      return res.status(400).json({ success: '0', msg: 'Slider image path or URL is required' });
    }
    await db.query(
      'INSERT INTO slider_images (slider_image, display_order, creation_date, status, action) VALUES (?, ?, CURDATE(), "1", "")',
      [slider_image, display_order || '1']
    );
    return res.json({ success: '1', msg: 'Slider image added successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Toggle Slider Status
exports.toggleSliderStatus = async (req, res) => {
  try {
    const { id } = req.body;
    await db.query("UPDATE slider_images SET status = IF(status = '1', '0', '1') WHERE id = ?", [id]);
    return res.json({ success: '1', msg: 'Slider status updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Delete Slider Image
exports.deleteSliderImage = async (req, res) => {
  try {
    const { id } = req.body;
    await db.query('DELETE FROM slider_images WHERE id = ?', [id]);
    return res.json({ success: '1', msg: 'Slider image deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Single Ank Bids (Ank 0 through 9)
exports.getSingleAnkBids = async (req, res) => {
  try {
    const { game_name, market_status, date } = req.query;
    const targetDate = (date && date.trim() !== '') ? date : new Date().toISOString().slice(0, 10);

    let query = `
      SELECT open_digit, close_digit, session, points_action 
      FROM user_bid_history 
      WHERE (date = ? OR DATE_FORMAT(date, '%Y-%m-%d') = ?)
        AND (game_type LIKE '%Single%' OR game_type = 'Single Digit' OR game_type = 'Single Ank')
    `;
    const params = [targetDate, targetDate];

    if (game_name && game_name !== '' && game_name !== 'all') {
      query += ' AND game_name = ?';
      params.push(game_name);
    }

    if (market_status === 'close_digit') {
      query += " AND (LOWER(session) = 'close' OR (close_digit IS NOT NULL AND close_digit != 'NA'))";
    } else if (market_status === 'open_digit') {
      query += " AND (LOWER(session) = 'open' OR (open_digit IS NOT NULL AND open_digit != 'NA'))";
    }

    const [rows] = await db.query(query, params);

    const anks = {};
    for (let i = 0; i <= 9; i++) {
      anks[i] = { bids: 0, amount: 0 };
    }

    rows.forEach(r => {
      let digitVal = null;
      if (market_status === 'close_digit') {
        digitVal = (r.close_digit && r.close_digit !== 'NA') ? r.close_digit : r.open_digit;
      } else {
        digitVal = (r.open_digit && r.open_digit !== 'NA') ? r.open_digit : r.close_digit;
      }

      const digit = parseInt(digitVal, 10);
      if (!isNaN(digit) && digit >= 0 && digit <= 9 && anks[digit]) {
        anks[digit].bids += 1;
        anks[digit].amount += Number(r.points_action) || 0;
      }
    });

    return res.json({ success: '1', data: anks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Bid Win Report for Game & Date
exports.getBidWinReport = async (req, res) => {
  try {
    const { date, game_name } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    let bidQuery = 'SELECT SUM(points_action) as total_bid FROM user_bid_history WHERE date = ?';
    let winQuery = 'SELECT SUM(winning_points) as total_win FROM user_winning_report WHERE date = ?';
    const params = [targetDate];

    if (game_name && game_name !== 'all') {
      bidQuery += ' AND game_name = ?';
      winQuery += ' AND game_name = ?';
      params.push(game_name);
    }

    const [[{ total_bid }]] = await db.query(bidQuery, params);
    const [[{ total_win }]] = await db.query(winQuery, params);

    const totalBidAmt = Number(total_bid) || 0;
    const totalWinAmt = Number(total_win) || 0;
    const profitAmt = totalBidAmt - totalWinAmt;

    return res.json({
      success: '1',
      total_bid: totalBidAmt,
      total_win: totalWinAmt,
      profit: profitAmt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Toggle User Field (status, betting_status, transfer_status)
exports.toggleUserField = async (req, res) => {
  try {
    const { userId, field } = req.body;
    if (!['status', 'betting_status', 'transfer_status'].includes(field)) {
      return res.status(400).json({ success: '0', msg: 'Invalid field' });
    }

    const [user] = await db.query('SELECT ?? FROM user_info WHERE id = ?', [field, userId]);
    if (!user.length) {
      return res.status(404).json({ success: '0', msg: 'User not found' });
    }

    const currentVal = user[0][field];
    const newVal = currentVal === '1' || currentVal === 1 ? '0' : '1';

    await db.query('UPDATE user_info SET ?? = ? WHERE id = ?', [field, newVal, userId]);
    return res.json({ success: '1', msg: 'Updated successfully', newVal });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Referral Report (Supports pagination and search)
exports.getReferralReport = async (req, res) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const conditions = ["u.referred_by_phone IS NOT NULL AND TRIM(u.referred_by_phone) != ''"];
    const params = [];

    if (search && search.trim() !== '') {
      conditions.push('(u.name LIKE ? OR u.phone LIKE ? OR u.referred_by_phone LIKE ? OR r.name LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = ' WHERE ' + conditions.join(' AND ');

    const [countRes] = await db.query(`
      SELECT COUNT(*) as total
      FROM user_info u
      LEFT JOIN user_info r ON r.phone = u.referred_by_phone
      ${whereClause}
    `, params);
    const total = countRes[0]?.total || 0;

    let query = `
      SELECT u.id, u.name, u.phone, u.date, u.referred_by_phone, r.name AS referrer_name
      FROM user_info u
      LEFT JOIN user_info r ON r.phone = u.referred_by_phone
      ${whereClause}
      ORDER BY u.id DESC
    `;

    if (page && limit) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;

      const [list] = await db.query(query, params);
      return res.json({
        success: '1',
        data: list,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit))
        }
      });
    } else {
      query += ' LIMIT 1000';
      const [list] = await db.query(query, params);
      return res.json({
        success: '1',
        data: list,
        pagination: {
          total,
          page: 1,
          limit: list.length,
          totalPages: 1
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Commission Report (Pending approval, supports pagination and search)
exports.getCommissionReport = async (req, res) => {
  try {
    const { from_date, to_date, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const conditions = ['c.status = "0"'];
    const params = [];

    if (from_date && to_date) {
      conditions.push('c.bid_date BETWEEN ? AND ?');
      params.push(from_date, to_date);
    }

    if (search && search.trim() !== '') {
      conditions.push('(c.referrer_phone LIKE ? OR r.name LIKE ? OR c.referred_phone LIKE ? OR c.game_name LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = ' WHERE ' + conditions.join(' AND ');

    const [countRes] = await db.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(CAST(c.amount AS DECIMAL(10,2))), 0) as total_amount
      FROM user_referral_commission c 
      LEFT JOIN user_info r ON r.phone = c.referrer_phone 
      ${whereClause}
    `, params);
    const total = countRes[0]?.total || 0;
    const totalAmount = parseFloat(countRes[0]?.total_amount) || 0;

    let query = `
      SELECT c.*, r.name as referrer_name 
      FROM user_referral_commission c 
      LEFT JOIN user_info r ON r.phone = c.referrer_phone 
      ${whereClause}
      ORDER BY c.id DESC
    `;

    if (page && limit) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;

      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        data: rows,
        total_amount: totalAmount,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit))
        }
      });
    } else {
      query += ' LIMIT 1000';
      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        data: rows,
        total_amount: totalAmount,
        pagination: {
          total,
          page: 1,
          limit: rows.length,
          totalPages: 1
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Approve Commission (Single or Bulk)
exports.approveCommission = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) {
      return res.status(400).json({ success: '0', msg: 'No commission IDs provided' });
    }
    for (const id of ids) {
      const [comm] = await db.query('SELECT * FROM user_referral_commission WHERE id = ? AND status = "0"', [id]);
      if (comm.length > 0) {
        const { referrer_phone, amount } = comm[0];
        await db.query('UPDATE user_referral_commission SET status = "1" WHERE id = ?', [id]);
        await db.query('UPDATE user_info SET wallet = wallet + ? WHERE phone = ?', [amount, referrer_phone]);
        const today = getISTDateStr();
        const time = getISTTime12h();
        await db.query('INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES ("1", ?, ?, ?, ?, "Referral Commission", ?)', [today, time, amount, amount, referrer_phone]);
      }
    }
    return res.json({ success: '1', msg: 'Commissions approved successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Auto Deposits History (Enhanced with date filter, server pagination, and summaries)
exports.getAutoDeposits = async (req, res) => {
  try {
    const { date, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const conditions = [];
    const params = [];

    if (date && date !== 'all' && date.trim() !== '') {
      const cleanDate = date.trim();
      let dmyHyphen = '';
      let dmySlash = '';
      if (cleanDate.includes('-') && cleanDate.split('-')[0].length === 4) {
        const [y, m, d_part] = cleanDate.split('-');
        dmyHyphen = `${d_part}-${m}-${y}`;
        dmySlash = `${d_part}/${m}/${y}`;
      }
      conditions.push('(d.txt_date LIKE ? OR (d.txt_date LIKE ? AND ? != "") OR (d.txt_date LIKE ? AND ? != "") OR DATE(d.txt_date) = ?)');
      params.push(`%${cleanDate}%`, `%${dmyHyphen}%`, dmyHyphen, `%${dmySlash}%`, dmySlash, cleanDate);
    }

    if (search && search.trim() !== '') {
      conditions.push('(d.username LIKE ? OR u.name LIKE ? OR d.txt_id LIKE ? OR d.amount LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Calculate totals across whole dataset matching filter
    const [totalsRes] = await db.query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CAST(d.amount AS DECIMAL(10,2))), 0) as total_transfer,
        COALESCE(SUM(CASE WHEN d.status = '1' OR d.status = 1 THEN CAST(d.amount AS DECIMAL(10,2)) ELSE 0 END), 0) as total_approved,
        COALESCE(SUM(CASE WHEN d.status = '-1' OR d.status = -1 THEN CAST(d.amount AS DECIMAL(10,2)) ELSE 0 END), 0) as total_rejected,
        COALESCE(SUM(CASE WHEN d.status = '0' OR d.status = 0 OR d.status IS NULL THEN CAST(d.amount AS DECIMAL(10,2)) ELSE 0 END), 0) as total_pending
      FROM user_auto_deposite d
      LEFT JOIN user_info u ON u.phone = d.username
      ${whereClause}
    `, params);

    const total = totalsRes[0]?.total_count || 0;
    const totals = {
      total_transfer: parseFloat(totalsRes[0]?.total_transfer) || 0,
      total_approved: parseFloat(totalsRes[0]?.total_approved) || 0,
      total_rejected: parseFloat(totalsRes[0]?.total_rejected) || 0,
      total_pending: parseFloat(totalsRes[0]?.total_pending) || 0
    };

    let query = `
      SELECT d.*, u.name as user_name, u.id as user_id
      FROM user_auto_deposite d
      LEFT JOIN user_info u ON u.phone = d.username
      ${whereClause}
      ORDER BY d.id DESC
    `;

    if (page && limit) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;

      const [deposits] = await db.query(query, params);
      return res.json({
        success: '1',
        data: deposits,
        totals,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit))
        }
      });
    } else {
      query += ' LIMIT 2000';
      const [deposits] = await db.query(query, params);
      return res.json({
        success: '1',
        data: deposits,
        totals,
        pagination: {
          total,
          page: 1,
          limit: deposits.length,
          totalPages: 1
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Handle Auto Deposit Action (Approve / Decline)
exports.handleAutoDeposit = async (req, res) => {
  try {
    const { id, response } = req.body; // response: "1" (approve) or "-1" / "2" (reject)
    req.body.depositId = id;
    req.body.type = 'auto_deposit';

    if (String(response) === '1') {
      return exports.approveDeposit(req, res);
    } else {
      return exports.rejectDeposit(req, res);
    }
  } catch (err) {
    console.error('handleAutoDeposit error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Get Paid Commission Report (status = '1', supports pagination and search)
exports.getCommissionPayList = async (req, res) => {
  try {
    const { from_date, to_date, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const conditions = ['c.status = "1"'];
    const params = [];

    if (from_date && to_date) {
      conditions.push('DATE(c.created_at) BETWEEN ? AND ?');
      params.push(from_date, to_date);
    }

    if (search && search.trim() !== '') {
      conditions.push('(c.referrer_phone LIKE ? OR r.name LIKE ? OR c.referred_phone LIKE ? OR c.game_name LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = ' WHERE ' + conditions.join(' AND ');

    const [countRes] = await db.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(CAST(c.amount AS DECIMAL(10,2))), 0) as total_amount
      FROM user_referral_commission c 
      LEFT JOIN user_info r ON r.phone = c.referrer_phone 
      ${whereClause}
    `, params);
    const total = countRes[0]?.total || 0;
    const totalAmount = parseFloat(countRes[0]?.total_amount) || 0;

    let query = `
      SELECT c.*, r.name as referrer_name 
      FROM user_referral_commission c 
      LEFT JOIN user_info r ON r.phone = c.referrer_phone 
      ${whereClause}
      ORDER BY c.created_at DESC
    `;

    if (page && limit) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;

      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        data: rows,
        total_amount: totalAmount,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit))
        }
      });
    } else {
      query += ' LIMIT 1000';
      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        data: rows,
        total_amount: totalAmount,
        pagination: {
          total,
          page: 1,
          limit: rows.length,
          totalPages: 1
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Change Admin Password
exports.changePassword = async (req, res) => {
  try {
    const { oldpass, newpass, retypepass } = req.body;
    if (!oldpass || !newpass || !retypepass) {
      return res.status(400).json({ success: '0', msg: 'All password fields are required' });
    }
    if (newpass !== retypepass) {
      return res.status(400).json({ success: '0', msg: 'New password and confirm password do not match' });
    }
    const adminId = req.user.id;
    const [admins] = await db.query('SELECT * FROM admin WHERE id = ?', [adminId]);
    if (!admins.length || admins[0].password !== oldpass) {
      return res.status(400).json({ success: '0', msg: 'Incorrect old password' });
    }
    await db.query('UPDATE admin SET password = ? WHERE id = ?', [newpass, adminId]);
    return res.json({ success: '1', msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// ==========================================
// REPORT MANAGEMENT CONTROLLERS (PHP PARITY)
// ==========================================

// 1. Get Bid History Report (Supports pagination and search)
exports.getBidHistoryReport = async (req, res) => {
  try {
    const { date, game_name, game_type, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const targetDate = date || new Date().toISOString().slice(0, 10);
    
    const conditions = ['(b.date = ? OR DATE(b.date) = ? OR b.date LIKE ?)'];
    const params = [targetDate, targetDate, `${targetDate}%`];

    if (game_name && game_name !== 'all') {
      conditions.push('TRIM(LOWER(b.game_name)) = TRIM(LOWER(?))');
      params.push(game_name);
    }
    if (game_type && game_type !== 'all') {
      if (game_type === 'Jodi Digit' || game_type === 'Jodi') {
        conditions.push("(b.game_type = 'Jodi Digit' OR b.game_type = 'Jodi')");
      } else {
        conditions.push('b.game_type = ?');
        params.push(game_type);
      }
    }
    if (search && search.trim() !== '') {
      conditions.push('(b.username LIKE ? OR u.name LIKE ? OR b.open_pana LIKE ? OR b.open_digit LIKE ? OR b.close_pana LIKE ? OR b.close_digit LIKE ? OR b.points_action LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s, s);
    }

    const whereClause = ' WHERE ' + conditions.join(' AND ');

    const [countRes] = await db.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(CAST(b.points_action AS DECIMAL(10,2))), 0) as total_bid_amount
      FROM user_bid_history b
      LEFT JOIN user_info u ON u.phone = b.username
      ${whereClause}
    `, params);
    const total = countRes[0]?.total || 0;
    const totalBidAmount = parseFloat(countRes[0]?.total_bid_amount) || 0;

    let query = `
      SELECT b.*, u.name as user_name, u.id as user_id
      FROM user_bid_history b
      LEFT JOIN user_info u ON u.phone = b.username
      ${whereClause}
      ORDER BY b.id DESC
    `;

    let safePage = 1;
    let safeLimit = total || 1;
    if (page && limit) {
      safePage = Math.max(1, page);
      safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;
    } else {
      query += ' LIMIT 1000';
    }

    const [rows] = await db.query(query, params);
    const formattedRows = rows.map(item => {
      let { open_digit, close_digit, game_type } = item;
      if (game_type === 'Jodi' || game_type === 'Jodi Digit') {
        if (open_digit && open_digit !== 'NA' && String(open_digit).trim().length === 2 && (!close_digit || close_digit === 'NA')) {
          const str = String(open_digit).trim();
          open_digit = str.charAt(0);
          close_digit = str.charAt(1);
        } else if (close_digit && close_digit !== 'NA' && String(close_digit).trim().length === 2 && (!open_digit || open_digit === 'NA')) {
          const str = String(close_digit).trim();
          open_digit = str.charAt(0);
          close_digit = str.charAt(1);
        }
      }
      return {
        ...item,
        open_digit: open_digit !== undefined ? open_digit : item.open_digit,
        close_digit: close_digit !== undefined ? close_digit : item.close_digit
      };
    });

    return res.json({
      success: '1',
      data: formattedRows,
      total_bid_amount: totalBidAmount,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / (page && limit ? safeLimit : (total || 1))))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Update Bid in History (PHP edit_bid1.php parity)
exports.updateBidHistory = async (req, res) => {
  try {
    const { id, open_pana, open_digit, close_pana, close_digit, points_action } = req.body;
    if (!id) {
      return res.status(400).json({ success: '0', msg: 'Bid ID is required' });
    }
    const [existing] = await db.query('SELECT * FROM user_bid_history WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: '0', msg: 'Bid not found' });
    }

    await db.query(
      'UPDATE user_bid_history SET open_pana = ?, open_digit = ?, close_pana = ?, close_digit = ?, points_action = ? WHERE id = ?',
      [
        open_pana !== undefined ? open_pana : existing[0].open_pana,
        open_digit !== undefined ? open_digit : existing[0].open_digit,
        close_pana !== undefined ? close_pana : existing[0].close_pana,
        close_digit !== undefined ? close_digit : existing[0].close_digit,
        points_action !== undefined ? points_action : existing[0].points_action,
        id
      ]
    );

    return res.json({ success: '1', msg: 'Bid updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 2. Get Customer Sell Report
exports.getCustomerSellReport = async (req, res) => {
  try {
    const { date, game_name, game_type, market_status } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const session = market_status || 'open';

    const getNumbersData = async (typeFilter, fieldName) => {
      let numbersQuery = 'SELECT number FROM game_number WHERE ';
      if (typeFilter === 'Single Digit') {
        numbersQuery += "type = 'Single Digit'";
      } else if (typeFilter === 'Jodi Digit') {
        numbersQuery += "type = 'Jodi Digit'";
      } else if (typeFilter === 'Single Pana') {
        numbersQuery += "type LIKE '%Single Pana%'";
      } else if (typeFilter === 'Double Pana') {
        numbersQuery += "type LIKE '%Double Pana%'";
      } else if (typeFilter === 'Triple Pana') {
        numbersQuery += "(type LIKE '%Tripple Pana%' OR type LIKE '%Triple Pana%')";
      }
      numbersQuery += ' ORDER BY id ASC';

      const [numRows] = await db.query(numbersQuery);

      let bidsQuery = `
        SELECT 
          ${typeFilter === 'Jodi Digit' ? "CONCAT(open_digit, close_digit) as num" : `?? as num`},
          SUM(CAST(points_action AS UNSIGNED)) as total_points
        FROM user_bid_history
        WHERE date = ? AND game_type = ?
      `;
      const bidsParams = typeFilter === 'Jodi Digit' 
        ? [targetDate, typeFilter] 
        : [fieldName, targetDate, typeFilter];

      if (game_name && game_name !== 'all') {
        bidsQuery += ' AND game_name = ?';
        bidsParams.push(game_name);
      }

      bidsQuery += ` GROUP BY ${typeFilter === 'Jodi Digit' ? 'CONCAT(open_digit, close_digit)' : '??'}`;
      if (typeFilter !== 'Jodi Digit') {
        bidsParams.push(fieldName);
      }

      const [bidSums] = await db.query(bidsQuery, bidsParams);
      const pointsMap = {};
      bidSums.forEach(b => {
        if (b.num !== null && b.num !== undefined) {
          pointsMap[b.num.toString().trim()] = Number(b.total_points) || 0;
        }
      });

      return numRows.map(n => {
        const numStr = n.number.toString().trim();
        return {
          number: numStr,
          sum: pointsMap[numStr] || 0
        };
      });
    };

    const targetTypes = (!game_type || game_type === 'all')
      ? ['Single Digit', 'Jodi Digit', 'Single Pana', 'Double Pana', 'Triple Pana']
      : [game_type];

    const results = {};
    let grandTotal = 0;

    for (const t of targetTypes) {
      const field = (t === 'Single Digit') ? `${session}_digit` : `${session}_pana`;
      const data = await getNumbersData(t, field);
      const typeTotal = data.reduce((acc, curr) => acc + curr.sum, 0);
      grandTotal += typeTotal;
      results[t] = {
        data,
        total_points: typeTotal
      };
    }

    return res.json({
      success: '1',
      date: targetDate,
      game_name,
      market_status: session,
      results,
      grand_total: grandTotal
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 3. Get Winning Report (Supports pagination and search)
exports.getWinningReport = async (req, res) => {
  try {
    const { date, game_name, market_status, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const conditions = ['(w.date = ? OR DATE(w.date) = ? OR w.date LIKE ?)'];
    const params = [targetDate, targetDate, `${targetDate}%`];

    if (game_name && game_name !== 'all') {
      conditions.push('TRIM(LOWER(w.game_name)) = TRIM(LOWER(?))');
      params.push(game_name);
    }
    if (market_status && market_status !== 'all') {
      conditions.push('LOWER(w.session) = LOWER(?)');
      params.push(market_status);
    }
    if (search && search.trim() !== '') {
      conditions.push('(w.username LIKE ? OR u.name LIKE ? OR w.open_pana LIKE ? OR w.open_digit LIKE ? OR w.close_pana LIKE ? OR w.close_digit LIKE ? OR w.winning_points LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s, s);
    }

    const whereClause = ' WHERE ' + conditions.join(' AND ');

    const [sumRes] = await db.query(`
      SELECT COUNT(*) as total_count,
             COALESCE(SUM(CAST(w.winning_points AS DECIMAL(10,2))), 0) as total_winning,
             COALESCE(SUM(CAST(w.points_action AS DECIMAL(10,2))), 0) as total_points
      FROM user_winning_report w
      LEFT JOIN user_info u ON (u.phone = w.username OR u.phone = REPLACE(w.username, '+91', '') OR CONCAT('+91', u.phone) = w.username)
      ${whereClause}
    `, params);

    const total = sumRes[0]?.total_count || 0;
    const totalWinning = parseFloat(sumRes[0]?.total_winning) || 0;
    const totalPoints = parseFloat(sumRes[0]?.total_points) || 0;

    let query = `
      SELECT w.*, u.name as user_name, u.id as user_id
      FROM user_winning_report w
      LEFT JOIN user_info u ON (u.phone = w.username OR u.phone = REPLACE(w.username, '+91', '') OR CONCAT('+91', u.phone) = w.username)
      ${whereClause}
      ORDER BY w.id DESC
    `;

    let safePage = 1;
    let safeLimit = total || 1;
    if (page && limit) {
      safePage = Math.max(1, page);
      safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;
    } else {
      query += ' LIMIT 1000';
    }

    const [rows] = await db.query(query, params);

    // Format rows to ensure game_type is descriptive (SP, DP, TP) if stored as Open Pana / Close Pana
    const formattedRows = rows.map(r => {
      let gType = r.game_type;
      if (!gType || gType === 'Open Pana' || gType === 'Close Pana' || gType === 'Pana') {
        const pVal = (r.open_pana && r.open_pana !== 'NA' && r.open_pana !== 'N/A')
          ? r.open_pana
          : ((r.close_pana && r.close_pana !== 'NA' && r.close_pana !== 'N/A') ? r.close_pana : '');
        if (pVal && pVal.length === 3) {
          const [d1, d2, d3] = pVal.split('');
          if (d1 === d2 && d2 === d3) gType = 'Triple Pana';
          else if (d1 === d2 || d2 === d3 || d1 === d3) gType = 'Double Pana';
          else gType = 'Single Pana';
        }
      }
      return {
        ...r,
        game_type: gType || r.game_type
      };
    });

    return res.json({
      success: '1',
      data: formattedRows,
      total_winning: totalWinning,
      total_points: totalPoints,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / (page && limit ? safeLimit : (total || 1))))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 4. Get Transfer Point Report (Supports pagination and search)
exports.getTransferReport = async (req, res) => {
  try {
    const { date, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const conditions = ["(DATE(date) = ? OR date LIKE ?) AND remark LIKE '%Points Transferred%' AND CAST(amount AS SIGNED) > 0"];
    const params = [targetDate, `%${targetDate}%`];

    if (search && search.trim() !== '') {
      conditions.push('(phone_number LIKE ? OR remark LIKE ? OR amount LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    const whereClause = ' WHERE ' + conditions.join(' AND ');

    const [countRes] = await db.query(`SELECT COUNT(*) as total, COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0) as total_amount FROM wallet_history ${whereClause}`, params);
    const total = countRes[0]?.total || 0;
    const totalAmount = parseFloat(countRes[0]?.total_amount) || 0;

    let query = `
      SELECT id, status, DATE_FORMAT(date, '%Y-%m-%d') as date, time, amount, updated_amount, remark, phone_number
      FROM wallet_history
      ${whereClause}
      ORDER BY id DESC
    `;

    let safePage = 1;
    let safeLimit = total || 1;
    if (page && limit) {
      safePage = Math.max(1, page);
      safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;
    } else {
      query += ' LIMIT 1000';
    }

    const [rows] = await db.query(query, params);

    const phones = new Set();
    rows.forEach(r => {
      const senderPhone = r.remark ? r.remark.trim().slice(-10) : '';
      if (senderPhone) phones.add(senderPhone);
      if (r.phone_number) phones.add(r.phone_number.trim());
    });

    let userMap = {};
    if (phones.size > 0) {
      const [users] = await db.query('SELECT id, name, phone FROM user_info WHERE phone IN (?)', [Array.from(phones)]);
      users.forEach(u => {
        userMap[u.phone] = u;
      });
    }

    const data = rows.map((r, index) => {
      const senderPhone = r.remark ? r.remark.trim().slice(-10) : '';
      const receiverPhone = r.phone_number ? r.phone_number.trim() : '';
      const amt = Number(r.amount) || 0;

      return {
        sno: (safePage - 1) * safeLimit + index + 1,
        id: r.id,
        sender_name: userMap[senderPhone] ? userMap[senderPhone].name : 'N/A',
        sender_phone: senderPhone,
        sender_user_id: userMap[senderPhone] ? userMap[senderPhone].id : null,
        receiver_name: userMap[receiverPhone] ? userMap[receiverPhone].name : 'N/A',
        receiver_phone: receiverPhone,
        receiver_user_id: userMap[receiverPhone] ? userMap[receiverPhone].id : null,
        amount: amt,
        date: r.date,
        time: r.time
      };
    });

    return res.json({
      success: '1',
      total_amount: totalAmount,
      data,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / (page && limit ? safeLimit : (total || 1))))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 5. Get Withdraw Report (Searches both user_withdraw_request & wallet_history with pagination)
exports.getWithdrawalReport = async (req, res) => {
  try {
    const { date, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    let reqParams = [];
    let whereReq = " WHERE 1=1 ";
    let whereHist = " WHERE (w.remark LIKE '%Withdraw%' OR w.remark LIKE '%Transferred to your Account%' OR w.remark LIKE '%Withdrawal%') ";

    if (date && date !== 'all' && date.trim() !== '') {
      const parts = date.split('-');
      let altDate = date;
      if (parts.length === 3 && parts[0].length === 4) {
        altDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      whereReq += " AND (DATE(w.date) = ? OR w.date LIKE ? OR w.date LIKE ?)";
      whereHist += " AND (DATE(w.date) = ? OR w.date LIKE ? OR w.date LIKE ?)";
      reqParams.push(date, `%${date}%`, `%${altDate}%`);
    }

    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      whereReq += " AND (w.username LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR w.remark LIKE ?)";
      reqParams.push(s, s, s, s);
    }

    // 1. Query user_withdraw_request table
    let queryReq = `
      SELECT w.id, w.status, w.date, w.time, COALESCE(NULLIF(w.points, 0), w.amount, 0) as amount, w.remark,
             COALESCE(w.username, u.phone) as phone_number, u.name as user_name, u.id as user_id
      FROM user_withdraw_request w
      LEFT JOIN user_info u ON (u.phone = w.username OR RIGHT(u.phone, 10) = RIGHT(w.username, 10))
      ${whereReq}
      ORDER BY w.id DESC
    `;

    const [countReq] = await db.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(CAST(COALESCE(NULLIF(w.points, 0), w.amount, 0) AS DECIMAL(10,2))), 0) as total_amount
      FROM user_withdraw_request w
      LEFT JOIN user_info u ON (u.phone = w.username OR RIGHT(u.phone, 10) = RIGHT(w.username, 10))
      ${whereReq}
    `, reqParams);

    let total = countReq[0]?.total || 0;
    let totalAmount = parseFloat(countReq[0]?.total_amount) || 0;

    let safePage = 1;
    let safeLimit = total || 1;
    if (page && limit) {
      safePage = Math.max(1, page);
      safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      queryReq += ` LIMIT ${safeLimit} OFFSET ${offset}`;
    } else {
      queryReq += ' LIMIT 1000';
    }

    let [reqRows] = await db.query(queryReq, reqParams);
    let rows = reqRows || [];

    // Fallback if empty and date was set
    if (rows.length === 0 && (!date || date === 'all')) {
      const [fallbackRows] = await db.query(`
        SELECT w.id, w.status, w.date, w.time, COALESCE(NULLIF(w.points, 0), w.amount, 0) as amount, w.remark,
               COALESCE(w.username, u.phone) as phone_number, u.name as user_name, u.id as user_id
        FROM user_withdraw_request w
        LEFT JOIN user_info u ON (u.phone = w.username OR RIGHT(u.phone, 10) = RIGHT(w.username, 10))
        ORDER BY w.id DESC LIMIT 500
      `);
      if (fallbackRows && fallbackRows.length > 0) {
        rows = fallbackRows;
        total = fallbackRows.length;
      }
    }

    const data = rows.map((r, index) => {
      const amt = Math.abs(Number(r.amount) || 0);
      return {
        sno: (safePage - 1) * safeLimit + index + 1,
        id: r.id,
        user_name: r.user_name || 'N/A',
        phone_number: r.phone_number || 'N/A',
        user_id: r.user_id,
        amount: amt,
        date: r.date,
        time: r.time,
        remark: r.remark,
        status: r.status
      };
    });

    return res.json({
      success: '1',
      total_amount: totalAmount,
      data,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / (page && limit ? safeLimit : (total || 1))))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// ==========================================
// WALLET MANAGEMENT CONTROLLERS (PHP PARITY)
// ==========================================

// 1. Get Fund Requests (PHP fund-request-management.php parity)
exports.getFundRequests = async (req, res) => {
  try {
    const { date, search, status } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const whereConditions = [];
    const params = [];

    if (date && date !== 'all' && date.trim() !== '') {
      whereConditions.push('f.date LIKE ?');
      params.push(`%${date.trim()}%`);
    }

    if (status !== undefined && status !== '' && status !== 'all') {
      whereConditions.push('f.status = ?');
      params.push(status);
    }

    if (search && search.trim() !== '') {
      whereConditions.push('(f.username LIKE ? OR u.name LIKE ? OR f.trans_details LIKE ? OR f.amount LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Calculate total count and total amount matching criteria
    const [sumRes] = await db.query(
      `SELECT COUNT(*) as total_count, COALESCE(SUM(CAST(COALESCE(NULLIF(f.amount, 0), f.points, 0) AS DECIMAL(10,2))), 0) as total_amount 
       FROM user_fund_request f 
       LEFT JOIN user_info u ON (u.phone = f.username OR (LENGTH(f.username) = 10 AND RIGHT(u.phone, 10) = f.username))
       ${whereClause}`,
      params
    );

    const total = sumRes[0]?.total_count || 0;
    const totalAmount = parseFloat(sumRes[0]?.total_amount) || 0;

    let query = `
      SELECT f.*, u.name as user_name, u.id as user_id, u.wallet as current_wallet
      FROM user_fund_request f
      LEFT JOIN user_info u ON (u.phone = f.username OR (LENGTH(f.username) = 10 AND RIGHT(u.phone, 10) = f.username))
      ${whereClause}
      ORDER BY f.id DESC
    `;

    if (page && limit) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;

      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        total_amount: totalAmount,
        data: rows,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit))
        }
      });
    } else {
      query += ' LIMIT 1000';
      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        total_amount: totalAmount,
        data: rows,
        pagination: {
          total,
          page: 1,
          limit: rows.length,
          totalPages: 1
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 2. Get Withdrawal Requests (PHP withdraw-request-management.php parity)
exports.getWithdrawalRequests = async (req, res) => {
  try {
    const { date, search, status } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const whereConditions = [];
    const params = [];

    if (date && date !== 'all' && date.trim() !== '') {
      whereConditions.push('w.date LIKE ?');
      params.push(`%${date.trim()}%`);
    }

    if (status !== undefined && status !== '' && status !== 'all') {
      whereConditions.push('w.status = ?');
      params.push(status);
    }

    if (search && search.trim() !== '') {
      whereConditions.push('(w.username LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR w.remark LIKE ? OR w.request_number LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Calculate summary statistics across full dataset matching filter
    const [totalsRes] = await db.query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CAST(COALESCE(NULLIF(w.points, 0), w.amount, 0) AS DECIMAL(10,2))), 0) as total_amount,
        COALESCE(SUM(CASE WHEN w.status = '1' OR w.status = 1 THEN CAST(COALESCE(NULLIF(w.points, 0), w.amount, 0) AS DECIMAL(10,2)) ELSE 0 END), 0) as total_approved,
        COALESCE(SUM(CASE WHEN w.status = '-1' OR w.status = -1 THEN CAST(COALESCE(NULLIF(w.points, 0), w.amount, 0) AS DECIMAL(10,2)) ELSE 0 END), 0) as total_rejected,
        COALESCE(SUM(CASE WHEN w.status = '0' OR w.status = 0 OR w.status = 'Pending' THEN CAST(COALESCE(NULLIF(w.points, 0), w.amount, 0) AS DECIMAL(10,2)) ELSE 0 END), 0) as total_pending
      FROM user_withdraw_request w
      LEFT JOIN user_info u ON (w.username = u.phone OR RIGHT(w.username, 10) = RIGHT(u.phone, 10))
      ${whereClause}
    `, params);

    const total = totalsRes[0]?.total_count || 0;
    const totals = {
      total_amount: parseFloat(totalsRes[0]?.total_amount) || 0,
      total_approved: parseFloat(totalsRes[0]?.total_approved) || 0,
      total_rejected: parseFloat(totalsRes[0]?.total_rejected) || 0,
      total_pending: parseFloat(totalsRes[0]?.total_pending) || 0
    };

    let query = `
      SELECT 
        w.*, 
        COALESCE(u.name, w.username) as user_name,
        u.id as user_id,
        u.phone as user_phone,
        u.wallet as current_wallet,
        u.bank_name,
        u.branch_name,
        u.account_holder_name,
        u.account_number,
        u.ifsc_code,
        u.paytm,
        u.phonepay,
        u.googlepay
      FROM user_withdraw_request w
      LEFT JOIN user_info u ON (w.username = u.phone OR RIGHT(w.username, 10) = RIGHT(u.phone, 10))
      ${whereClause}
      ORDER BY w.id DESC
    `;

    if (page && limit) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;

      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        totals,
        data: rows,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit))
        }
      });
    } else {
      query += ' LIMIT 1000';
      const [rows] = await db.query(query, params);
      return res.json({
        success: '1',
        totals,
        data: rows,
        pagination: {
          total,
          page: 1,
          limit: rows.length,
          totalPages: 1
        }
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 3. Add Fund To User Wallet (PHP action-code/add-fund-user-wallet.php parity)
exports.addFundToUserWallet = async (req, res) => {
  try {
    const { phone, amount } = req.body;
    if (!phone || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: '0', msg: 'Valid phone and amount are required' });
    }

    const addedAmount = parseFloat(amount);

    const [users] = await db.query('SELECT * FROM user_info WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(404).json({ success: '0', msg: 'User not found' });
    }

    const currentWallet = parseFloat(users[0].wallet || '0');
    const newWallet = currentWallet + addedAmount;

    await db.query('UPDATE user_info SET wallet = ? WHERE phone = ?', [newWallet, phone]);

    const dateStr = getISTDateStr();
    const timeStr = getISTTime12h();
    const receivedAmount = `+${addedAmount}`;
    const remark = 'Points Added By Admin ';

    await db.query(
      'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['1', dateStr, timeStr, receivedAmount, newWallet, remark, phone]
    );

    // Deduct admin coins for added funds (1 Rs = 1 coin)
    await deductAdminCoins(addedAmount);

    return res.json({ success: '1', msg: 'Points Added Successfully!!', new_wallet: newWallet });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 4. Get Bids for Revert (PHP ajax/get-bid-revert.php parity)
exports.getBidRevertList = async (req, res) => {
  try {
    const { date, game_name } = req.query;
    if (!date || !game_name) {
      return res.status(400).json({ success: '0', msg: 'Date and Game Name are required' });
    }

    const [rows] = await db.query(`
      SELECT b.*, u.name as user_name, u.id as user_id
      FROM user_bid_history b
      LEFT JOIN user_info u ON u.phone = b.username
      WHERE b.game_name = ? AND b.date = ?
      ORDER BY b.id DESC
    `, [game_name, date]);

    return res.json({ success: '1', data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 5. Execute Bid Revert & Refund All (PHP delete/bid-revert.php parity with user history generation)
exports.executeBidRevert = async (req, res) => {
  try {
    const { date, game_name } = req.body;
    if (!date || !game_name) {
      return res.status(400).json({ success: '0', msg: 'Date and Game Name are required' });
    }

    const [bids] = await db.query(
      'SELECT * FROM user_bid_history WHERE game_name = ? AND date = ?',
      [game_name, date]
    );

    if (bids.length === 0) {
      return res.json({ success: '0', msg: 'No bids found to revert for this game and date' });
    }

    const today = getISTDateStr();
    const time = getISTTime12h();

    // Refund points to each user & generate user-side wallet history
    for (const b of bids) {
      const amount = parseFloat(b.points_action || b.points || '0');
      const user = b.username || b.phone_number;
      if (amount > 0 && user) {
        await db.query('UPDATE user_info SET wallet = wallet + ? WHERE phone = ?', [amount, user]);
        const [[u]] = await db.query('SELECT wallet FROM user_info WHERE phone = ?', [user]);
        const newWallet = u ? u.wallet : 0;
        const remarkStr = `Bid Reverted Refund for ${game_name} (${b.game_type || ''})`;
        await db.query(
          'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['1', today, time, `+${amount}`, newWallet, remarkStr, user]
        );
      }
    }

    // Delete bid records
    await db.query('DELETE FROM user_bid_history WHERE game_name = ? AND date = ?', [game_name, date]);

    return res.json({ success: '1', msg: 'Bids Reverted & Refunded Successfully! User wallet history generated.', count: bids.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 6. Get Add Fund (Admin) Report (PHP add-fund-report.php parity, supports pagination and search)
exports.getAddFundReport = async (req, res) => {
  try {
    const { date, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const conditions = ["(w.remark LIKE '%Points Added By Admin%' OR w.remark LIKE '%Added By Admin%' OR w.amount LIKE '+%')"];
    const params = [];

    if (date && date !== 'all' && date.trim() !== '') {
      conditions.push("(DATE(w.date) = ? OR w.date LIKE ?)");
      params.push(date, `%${date}%`);
    }

    if (search && search.trim() !== '') {
      conditions.push("(w.phone_number LIKE ? OR u.name LIKE ? OR w.remark LIKE ? OR w.amount LIKE ?)");
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereClause = ' WHERE ' + conditions.join(' AND ');

    const [countRes] = await db.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(CAST(REPLACE(w.amount, '+', '') AS DECIMAL(10,2))), 0) as total_amount
      FROM wallet_history w
      LEFT JOIN user_info u ON u.phone = w.phone_number
      ${whereClause}
    `, params);
    const total = countRes[0]?.total || 0;
    const totalAmount = parseFloat(countRes[0]?.total_amount) || 0;

    let query = `
      SELECT w.id, w.status, DATE_FORMAT(w.date, '%Y-%m-%d') as date, w.time, w.amount, w.updated_amount, w.remark, w.phone_number, u.name as user_name, u.id as user_id
      FROM wallet_history w
      LEFT JOIN user_info u ON u.phone = w.phone_number
      ${whereClause}
      ORDER BY w.id DESC
    `;

    let safePage = 1;
    let safeLimit = total || 1;
    if (page && limit) {
      safePage = Math.max(1, page);
      safeLimit = Math.max(1, Math.min(500, limit));
      const offset = (safePage - 1) * safeLimit;
      query += ` LIMIT ${safeLimit} OFFSET ${offset}`;
    } else {
      query += ' LIMIT 1000';
    }

    const [rows] = await db.query(query, params);

    return res.json({
      success: '1',
      total_amount: totalAmount,
      data: rows,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / (page && limit ? safeLimit : (total || 1))))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// ==========================================
// GAMES MANAGEMENT CONTROLLERS (PHP PARITY)
// ==========================================

// Helper: Convert HH:mm to hh:mm a
function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();
  if (clean.toLowerCase().includes('am') || clean.toLowerCase().includes('pm')) {
    return clean;
  }
  const parts = clean.split(':');
  if (parts.length < 2) return clean;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2).padStart(2, '0');
  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hStr = hours < 10 ? '0' + hours : '' + hours;
  return `${hStr}:${minutes} ${modifier}`;
}

// 1. Get Game Names List with Today's Open/Close and Market Status (PHP game-name.php parity)
exports.getAdminGamesList = async (req, res) => {
  try {
    await initGameTimeSchema();
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nowIST = getISTDate();
    const todayDayName = daysOfWeek[nowIST.getDay()];

    // Get today's game times safely avoiding ONLY_FULL_GROUP_BY failure
    let [games] = await db.query(
      `SELECT g1.* FROM game_time g1
       INNER JOIN (
         SELECT game, MIN(id) as min_id FROM game_time WHERE LOWER(TRIM(day)) = LOWER(?) GROUP BY game
       ) g2 ON g1.id = g2.min_id
       ORDER BY g1.id ASC`,
      [todayDayName]
    );

    // If no games found for today specifically, fallback to all distinct games in game_time
    if (!games || games.length === 0) {
      const [allDistinct] = await db.query(
        `SELECT g1.* FROM game_time g1
         INNER JOIN (
           SELECT game, MIN(id) as min_id FROM game_time GROUP BY game
         ) g2 ON g1.id = g2.min_id
         ORDER BY g1.id ASC`
      );
      games = allDistinct;
    }

    const parseTimeToDate = (timeStr) => {
      if (!timeStr) return null;
      const clean = String(timeStr).trim().toLowerCase();
      const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const modifier = match[4];
      if (modifier === 'pm' && hours < 12) hours += 12;
      else if (modifier === 'am' && hours === 12) hours = 0;
      const d = new Date(nowIST);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    const formattedGames = games.map((g) => {
      const openTimeObj = parseTimeToDate(g.open_time);
      const closeTimeObj = parseTimeToDate(g.close_time);
      const isStatusInactive = g.status === '0' || g.status === 0;

      if (openTimeObj && closeTimeObj) {
        if (closeTimeObj.getTime() <= openTimeObj.getTime()) {
          if (nowIST.getTime() >= openTimeObj.getTime()) {
            closeTimeObj.setDate(closeTimeObj.getDate() + 1);
          } else {
            const tempCloseToday = new Date(closeTimeObj);
            if (nowIST.getTime() <= tempCloseToday.getTime()) {
              openTimeObj.setDate(openTimeObj.getDate() - 1);
              closeTimeObj.setTime(tempCloseToday.getTime());
            } else {
              closeTimeObj.setDate(closeTimeObj.getDate() + 1);
            }
          }
        }
      }

      const isMarketOpen = !isStatusInactive && (closeTimeObj ? nowIST.getTime() <= closeTimeObj.getTime() : true);

      return {
        id: g.id,
        game: g.game,
        day: g.day,
        open_time: g.open_time,
        close_time: g.close_time,
        status: g.status || '1',
        market_status: isMarketOpen ? 'Market Running' : 'Market Closed'
      };
    });

    return res.json({ success: '1', data: formattedGames });
  } catch (err) {
    console.error('getAdminGamesList error:', err);
    return res.json({ success: '0', msg: err.message, error: err.message, data: [] });
  }
};

// 2. Add New Game with all 7 days (PHP action-code/add-game.php parity)
exports.addGame = async (req, res) => {
  try {
    await initGameTimeSchema();
    const { game_name, open_time, close_time } = req.body;
    if (!game_name || !open_time || !close_time) {
      return res.json({ success: '0', msg: 'Game name, open time and close time are required' });
    }

    const trimmedName = String(game_name).trim();
    if (!trimmedName) {
      return res.json({ success: '0', msg: 'Please enter a valid game name' });
    }

    // Check if game already exists (case-insensitive)
    const [existing] = await db.query(
      'SELECT id FROM game_time WHERE LOWER(TRIM(game)) = LOWER(TRIM(?)) LIMIT 1',
      [trimmedName]
    );
    if (existing.length > 0) {
      return res.json({ success: '0', msg: `Game "${trimmedName}" already exists! You can edit its schedule from the list.` });
    }

    const formattedOpen = formatTimeTo12Hour(open_time);
    const formattedClose = formatTimeTo12Hour(close_time);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const day of days) {
      await db.query(
        'INSERT INTO game_time (game, day, open_time, close_time, status) VALUES (?, ?, ?, ?, "1")',
        [trimmedName, day, formattedOpen, formattedClose]
      );
    }

    return res.json({ success: '1', msg: 'Game Added Successfully' });
  } catch (err) {
    console.error('addGame error:', err);
    return res.json({ success: '0', msg: err.message || 'Error adding game', error: err.message });
  }
};

// 3. Get Game Week Schedule (PHP edit-week-game.php parity)
exports.getGameWeekSchedule = async (req, res) => {
  try {
    await initGameTimeSchema();
    const { gameName } = req.params;
    if (!gameName) {
      return res.json({ success: '0', msg: 'Game name is required' });
    }

    const [rows] = await db.query(
      'SELECT * FROM game_time WHERE LOWER(TRIM(game)) = LOWER(TRIM(?)) ORDER BY FIELD(day, "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")',
      [gameName]
    );

    if (rows.length === 0) {
      return res.json({ success: '0', msg: 'Game not found' });
    }

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const defaultOpen = rows[0]?.open_time || '10:00 AM';
    const defaultClose = rows[0]?.close_time || '11:00 AM';

    const allDays = daysOfWeek.map((dayName) => {
      const found = rows.find(r => r.day && r.day.toLowerCase() === dayName.toLowerCase());
      if (found) return found;
      return {
        id: 0,
        game: gameName,
        day: dayName,
        open_time: defaultOpen,
        close_time: defaultClose,
        status: '1'
      };
    });

    return res.json({ success: '1', game_name: gameName, days: allDays });
  } catch (err) {
    console.error('getGameWeekSchedule error:', err);
    return res.json({ success: '0', msg: err.message || 'Error fetching schedule', error: err.message });
  }
};

// 4. Update Game Week Schedule (PHP edit/edit-game-time.php parity)
exports.updateGameWeekSchedule = async (req, res) => {
  try {
    await initGameTimeSchema();
    const { game_name, days } = req.body;
    if (!game_name || !days || !Array.isArray(days)) {
      return res.json({ success: '0', msg: 'Game name and days array are required' });
    }

    for (const d of days) {
      const openTime = formatTimeTo12Hour(d.open_time || d.open_time_24);
      const closeTime = formatTimeTo12Hour(d.close_time || d.close_time_24);
      const status = (d.status === '1' || d.status === 1 || d.status === true) ? '1' : '0';

      const [existing] = await db.query(
        'SELECT id FROM game_time WHERE LOWER(TRIM(game)) = LOWER(TRIM(?)) AND LOWER(TRIM(day)) = LOWER(TRIM(?)) LIMIT 1',
        [game_name, d.day]
      );

      if (existing.length > 0) {
        await db.query(
          'UPDATE game_time SET open_time = ?, close_time = ?, status = ? WHERE id = ?',
          [openTime, closeTime, status, existing[0].id]
        );
      } else {
        await db.query(
          'INSERT INTO game_time (game, day, open_time, close_time, status) VALUES (?, ?, ?, ?, ?)',
          [game_name, d.day, openTime, closeTime, status]
        );
      }
    }

    return res.json({ success: '1', msg: 'Game Week Schedule Updated Successfully' });
  } catch (err) {
    console.error('updateGameWeekSchedule error:', err);
    return res.json({ success: '0', msg: err.message || 'Error updating schedule', error: err.message });
  }
};

// 5. Delete Game (PHP delete/delete-game-name.php parity)
exports.deleteGame = async (req, res) => {
  try {
    await initGameTimeSchema();
    const { game_name } = req.body;
    if (!game_name) {
      return res.json({ success: '0', msg: 'Game name is required' });
    }

    await db.query('DELETE FROM game_time WHERE LOWER(TRIM(game)) = LOWER(TRIM(?))', [game_name]);
    return res.json({ success: '1', msg: 'Game Deleted Successfully' });
  } catch (err) {
    console.error('deleteGame error:', err);
    return res.json({ success: '0', msg: err.message || 'Error deleting game', error: err.message });
  }
};

// Get Full Details for a Single User (Profile, Wallet History, Bids, Winnings, Referrals)
exports.getUserFullDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    let users = [];

    if (!userId || userId === 'null' || userId === 'undefined' || userId === 'first') {
      [users] = await db.query('SELECT * FROM user_info ORDER BY id DESC LIMIT 1');
    } else {
      const cleanPhone = String(userId).replace(/\D/g, '');
      const phone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      [users] = await db.query(
        'SELECT * FROM user_info WHERE id = ? OR phone = ? OR RIGHT(phone, 10) = ? LIMIT 1',
        [userId, userId, phone10]
      );
    }

    if (users.length === 0) {
      return res.status(404).json({ success: '0', msg: 'User not found' });
    }

    const user = users[0];
    const phone = user.phone;

    // Fetch Wallet History
    let walletHistory = [];
    try {
      const [rows] = await db.query('SELECT * FROM wallet_history WHERE phone_number = ? ORDER BY id DESC', [phone]);
      walletHistory = rows;
    } catch (e) {
      console.error('Error fetching walletHistory for user:', e.message);
    }

    // Fetch Bid History
    let bids = [];
    try {
      const rawPhone = String(phone || '').replace(/^\+91/, '').replace(/^91/, '').trim();
      const phoneWithPlus = `+91${rawPhone}`;
      const [rows] = await db.query(
        'SELECT * FROM user_bid_history WHERE (username = ? OR username = ? OR username = ? OR REPLACE(username, "+91", "") = ?) ORDER BY id DESC',
        [phone, rawPhone, phoneWithPlus, rawPhone]
      );
      bids = rows.map(item => {
        let { open_digit, close_digit, game_type } = item;
        if (game_type === 'Jodi' || game_type === 'Jodi Digit') {
          if (open_digit && open_digit !== 'NA' && String(open_digit).trim().length === 2 && (!close_digit || close_digit === 'NA')) {
            const str = String(open_digit).trim();
            open_digit = str.charAt(0);
            close_digit = str.charAt(1);
          } else if (close_digit && close_digit !== 'NA' && String(close_digit).trim().length === 2 && (!open_digit || open_digit === 'NA')) {
            const str = String(close_digit).trim();
            open_digit = str.charAt(0);
            close_digit = str.charAt(1);
          }
        }
        return {
          ...item,
          open_digit: open_digit !== undefined ? open_digit : item.open_digit,
          close_digit: close_digit !== undefined ? close_digit : item.close_digit
        };
      });
    } catch (e) {
      console.error('Error fetching bids for user:', e.message);
    }

    // Fetch Winning History
    let winnings = [];
    try {
      const rawPhone = String(phone || '').replace(/^\+91/, '').replace(/^91/, '').trim();
      const phoneWithPlus = `+91${rawPhone}`;
      const [rows] = await db.query(
        'SELECT * FROM user_winning_report WHERE (username = ? OR username = ? OR username = ? OR REPLACE(username, "+91", "") = ?) ORDER BY id DESC',
        [phone, rawPhone, phoneWithPlus, rawPhone]
      );
      winnings = rows.map(r => {
        let gType = r.game_type;
        if (!gType || gType === 'Open Pana' || gType === 'Close Pana' || gType === 'Pana') {
          const pVal = (r.open_pana && r.open_pana !== 'NA' && r.open_pana !== 'N/A')
            ? r.open_pana
            : ((r.close_pana && r.close_pana !== 'NA' && r.close_pana !== 'N/A') ? r.close_pana : '');
          if (pVal && pVal.length === 3) {
            const [d1, d2, d3] = pVal.split('');
            if (d1 === d2 && d2 === d3) gType = 'Triple Pana';
            else if (d1 === d2 || d2 === d3 || d1 === d3) gType = 'Double Pana';
            else gType = 'Single Pana';
          }
        }
        return { ...r, game_type: gType || r.game_type };
      });
    } catch (e) {
      console.error('Error fetching winnings for user:', e.message);
    }

    // Fetch Referrals
    let referrals = [];
    try {
      const [rows] = await db.query('SELECT id, name, phone, email, date, wallet FROM user_info WHERE referred_by_phone = ? ORDER BY id DESC', [phone]);
      referrals = rows;
    } catch (e) {
      console.error('Error fetching referrals for user:', e.message);
    }

    // Fetch Referral Commissions
    let commissions = [];
    try {
      const [rows] = await db.query('SELECT * FROM user_referral_commission WHERE referrer_phone = ? ORDER BY id DESC', [phone]);
      commissions = rows;
    } catch (e) {
      console.error('Error fetching commissions for user:', e.message);
    }

    // Fetch Deposit Requests (user_fund_request)
    let depositRequests = [];
    try {
      const rawPhone = String(phone || '').replace(/^\+91/, '').replace(/^91/, '').trim();
      const phoneWithPlus = `+91${rawPhone}`;
      const phone10 = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;
      const [rows] = await db.query(
        'SELECT * FROM user_fund_request WHERE (username = ? OR username = ? OR username = ? OR RIGHT(username, 10) = ?) ORDER BY id DESC LIMIT 200',
        [phone, rawPhone, phoneWithPlus, phone10]
      );
      depositRequests = rows;
    } catch (e) {
      console.error('Error fetching depositRequests for user:', e.message);
    }

    // Fetch Withdraw Requests (user_withdraw_request)
    let withdrawRequests = [];
    try {
      const rawPhone = String(phone || '').replace(/^\+91/, '').replace(/^91/, '').trim();
      const phoneWithPlus = `+91${rawPhone}`;
      const phone10 = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;
      const [rows] = await db.query(
        'SELECT * FROM user_withdraw_request WHERE (username = ? OR username = ? OR username = ? OR RIGHT(username, 10) = ?) ORDER BY id DESC LIMIT 200',
        [phone, rawPhone, phoneWithPlus, phone10]
      );
      withdrawRequests = rows;
    } catch (e) {
      console.error('Error fetching withdrawRequests for user:', e.message);
    }

    return res.json({
      success: '1',
      data: {
        user,
        walletHistory,
        bids,
        winnings,
        referrals,
        commissions,
        depositRequests,
        withdrawRequests
      }
    });
  } catch (err) {
    console.error('getUserFullDetails main error:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin Change User Password
exports.updateUserPassword = async (req, res) => {
  try {
    const { userId, phone, newPassword } = req.body;
    if ((!userId && !phone) || !newPassword || newPassword.trim() === '') {
      return res.status(400).json({ success: '0', msg: 'User identifier and new password are required' });
    }

    const target = userId || phone;
    const [result] = await db.query('UPDATE user_info SET password = ? WHERE id = ? OR phone = ?', [newPassword.trim(), target, target]);

    if (result.affectedRows > 0) {
      return res.json({ success: '1', msg: 'User password updated successfully!' });
    } else {
      return res.status(404).json({ success: '0', msg: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Admin Adjust User Wallet (Add / Deduct Amount)
exports.adjustUserWallet = async (req, res) => {
  try {
    const { phone, type, amount, remark } = req.body;
    const adjAmt = parseFloat(amount);

    if (!phone || isNaN(adjAmt) || adjAmt <= 0) {
      return res.status(400).json({ success: '0', msg: 'Valid phone and positive amount are required' });
    }

    const [users] = await db.query('SELECT * FROM user_info WHERE phone = ? OR id = ?', [phone, phone]);
    if (users.length === 0) {
      return res.status(404).json({ success: '0', msg: 'User not found' });
    }

    const user = users[0];
    const userPhone = user.phone;
    const currentWallet = parseFloat(user.wallet || '0');

    let newWallet = currentWallet;
    let histAmount = '';
    let defaultRemark = '';

    if (type === 'add' || type === 'credit' || type === 'plus') {
      newWallet = currentWallet + adjAmt;
      histAmount = `+${adjAmt}`;
      defaultRemark = 'Points Added By Admin';
    } else if (type === 'deduct' || type === 'debit' || type === 'minus') {
      if (currentWallet < adjAmt) {
        return res.json({ success: '0', msg: `User wallet balance (${currentWallet}) is less than deduction amount (${adjAmt})` });
      }
      newWallet = Math.max(0, currentWallet - adjAmt);
      histAmount = `-${adjAmt}`;
      defaultRemark = 'Points Deducted By Admin';
    } else {
      return res.status(400).json({ success: '0', msg: 'Invalid operation type. Must be add or deduct' });
    }

    await db.query('UPDATE user_info SET wallet = ? WHERE phone = ?', [newWallet, userPhone]);

    const dateStr = getISTDateStr();
    const timeStr = getISTTime12h();
    const finalRemark = remark && remark.trim() !== '' ? remark.trim() : defaultRemark;

    await db.query(
      'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['1', dateStr, timeStr, histAmount, newWallet, finalRemark, userPhone]
    );

    return res.json({
      success: '1',
      msg: `Wallet ${type === 'add' ? 'credited' : 'debited'} successfully!`,
      new_wallet: newWallet
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Helper to process referral commission for various triggers (signup, first_deposit, every_deposit, first_bet, every_bet)
exports.processReferralCommission = async (userPhone, triggerType, triggerAmount) => {
  try {
    if (!userPhone) return;
    const [[user]] = await db.query('SELECT referred_by_phone FROM user_info WHERE phone = ? LIMIT 1', [userPhone]);
    if (!user || !user.referred_by_phone) return;

    const referrerPhone = String(user.referred_by_phone).trim();
    if (!referrerPhone || referrerPhone === String(userPhone)) return;

    const [[settings]] = await db.query('SELECT referral_status, referral_type, referral_commission FROM admin_settings WHERE id = 1');
    if (!settings) return;

    const rStatus = String(settings.referral_status ?? '1');
    const rType = settings.referral_type || 'signup';
    const rCommValue = parseFloat(settings.referral_commission || '0');

    if (rStatus !== '1' || rCommValue <= 0) return;

    let isEligible = false;
    if (rType === triggerType) {
      if (rType === 'first_deposit') {
        const [[{ count }]] = await db.query("SELECT COUNT(*) as count FROM user_fund_request WHERE username = ? AND status = '1'", [userPhone]);
        if (count <= 1) isEligible = true;
      } else if (rType === 'first_bet') {
        const [[{ count }]] = await db.query("SELECT COUNT(*) as count FROM user_bid_history WHERE (username = ? OR phone_number = ?)", [userPhone, userPhone]);
        if (count <= 1) isEligible = true;
      } else if (rType === 'every_deposit' || rType === 'every_bet' || rType === 'signup') {
        isEligible = true;
      }
    }

    if (!isEligible) return;

    let commissionAmt = 0;
    if (rType === 'signup') {
      commissionAmt = rCommValue;
    } else {
      commissionAmt = (parseFloat(triggerAmount || 0) * rCommValue) / 100;
    }

    commissionAmt = Math.round(commissionAmt * 100) / 100;
    if (commissionAmt <= 0) return;

    await db.query('UPDATE user_info SET wallet = wallet + ? WHERE phone = ?', [commissionAmt, referrerPhone]);
    const [[refU]] = await db.query('SELECT wallet FROM user_info WHERE phone = ?', [referrerPhone]);
    const todayStr = getISTDateStr();
    const timeStr = getISTTime12h();
    const remarkStr = `Referral Commission (${rType}) from ${userPhone}`;

    await db.query(
      'INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['1', todayStr, timeStr, `+${commissionAmt}`, refU ? refU.wallet : 0, remarkStr, referrerPhone]
    );

    try {
      await db.query(
        'INSERT INTO user_referral_commission (referrer_phone, referred_user, amount, remark, date, status) VALUES (?, ?, ?, ?, ?, "1")',
        [referrerPhone, userPhone, commissionAmt, remarkStr, todayStr]
      );
    } catch (e) {}
  } catch (err) {
    console.error('Error processing referral commission:', err);
  }
};



