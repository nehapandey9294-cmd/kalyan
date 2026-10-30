const db = require('../config/db');
const { getISTDate, getISTDateStr, getISTTimeStr, getISTTime12h, compareMarketTimes } = require('../utils/istDate');

// Helper to convert time format "hh:mm AM/PM" or "hh:mm" or "hh:mm:ss" to Date object using IST date reference
function getTodayTime(timeStr, refISTDate = getISTDate()) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim().toLowerCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const modifier = match[4];
  if (modifier === 'pm' && hours < 12) {
    hours += 12;
  } else if (modifier === 'am' && hours === 12) {
    hours = 0;
  }
  const date = new Date(refISTDate);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

// Evaluate market open/close timing handling overnight windows cleanly
function evaluateGameTiming(openTimeStr, closeTimeStr, marketOpenTimeStr, nowIST = getISTDate()) {
  const openTimeObj = getTodayTime(openTimeStr, nowIST);
  const closeTimeObj = getTodayTime(closeTimeStr, nowIST);

  if (!openTimeObj || !closeTimeObj || isNaN(openTimeObj.getTime()) || isNaN(closeTimeObj.getTime())) {
    return {
      openTimeObj: null,
      closeTimeObj: null,
      isWithinWindow: false,
      isOpenSessionActive: false
    };
  }

  // Handle overnight market window (e.g., Open 10:00 PM, Close 02:00 AM next day)
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

  // Market is active/open as long as current time has not passed close time
  const isWithinWindow = nowIST.getTime() <= closeTimeObj.getTime();
  const isOpenSessionActive = isWithinWindow && nowIST.getTime() < openTimeObj.getTime();

  return {
    openTimeObj,
    closeTimeObj,
    isWithinWindow,
    isOpenSessionActive
  };
}

// Fetch Active Games for Today
exports.getGames = async (req, res) => {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const nowIST = getISTDate();
  const todayDayName = daysOfWeek[nowIST.getDay()];

  try {
    // 1. Get all game times for today safely (avoid ONLY_FULL_GROUP_BY issues)
    let [games] = await db.query(
      `SELECT g1.* FROM game_time g1
       INNER JOIN (
         SELECT game, MIN(id) as min_id FROM game_time WHERE LOWER(TRIM(day)) = LOWER(?) GROUP BY game
       ) g2 ON g1.id = g2.min_id
       ORDER BY g1.id ASC`,
      [todayDayName]
    );

    // If no games specifically found for today, fallback to all distinct games in game_time
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

    // 2. Fetch current market status from games_management
    const [management] = await db.query("SELECT market_status FROM games_management LIMIT 1").catch(() => [[]]);
    const marketStatus = management.length > 0 ? management[0].market_status : '1';

    // Calculate today's date in IST YYYY-MM-DD
    const yyyy = nowIST.getFullYear();
    const mm = String(nowIST.getMonth() + 1).padStart(2, '0');
    const dd = String(nowIST.getDate()).padStart(2, '0');
    const todayDateStr = `${yyyy}-${mm}-${dd}`;

    // 3. Assemble result
    const result = [];
    for (const g of games) {
      let open_pana = "***";
      let close_pana = "***";
      let open_digit = "*";
      let close_digit = "*";

      if (g.game) {
        try {
          const [resChart] = await db.query(
            "SELECT * FROM result_chart WHERE LOWER(TRIM(game_name)) = LOWER(TRIM(?)) AND date = ? LIMIT 1",
            [g.game, todayDateStr]
          );
          if (resChart.length > 0) {
            const row = resChart[0];
            open_pana = row.open_panna === "" ? "***" : row.open_panna;
            close_pana = row.close_panna === "" ? "***" : row.close_panna;
            open_digit = row.open_digit === "" ? "*" : row.open_digit;
            close_digit = row.close_digit === "" ? "*" : row.close_digit;
          }
        } catch (e) {}
      }

      const timing = evaluateGameTiming(g.open_time, g.close_time, null, nowIST);
      const gameEnabled = g.status !== '0';
      const isRunning = gameEnabled && timing.isWithinWindow;
      const isOpenSessionActive = isRunning && timing.isOpenSessionActive;

      result.push({
        id: g.id,
        games_name: g.game,
        open_time: g.open_time,
        close_time: g.close_time,
        market_status: marketStatus,
        game_status: g.status || '0',
        is_running: isRunning,
        is_open_session: isOpenSessionActive,
        open_pana,
        close_pana,
        open_digit,
        close_digit
      });
    }

    // Sort Live Game Markets chronologically by market open/close time
    result.sort(compareMarketTimes);

    return res.json({ result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Fetch Game Rates
exports.getRates = async (req, res) => {
  try {
    const [rates] = await db.query("SELECT * FROM game_rates");
    return res.json({ success: '1', data: rates });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Place Bids
exports.placeBid = async (req, res) => {
  let bids = req.body;
  if (!Array.isArray(bids)) {
    bids = [bids];
  }

  if (bids.length === 0) {
    return res.json({ success: '0', msg: 'Empty Bid Request' });
  }

  try {
    const phone = req.user.phone;
    const [userCheck] = await db.query('SELECT status, betting_status FROM user_info WHERE phone = ?', [phone]);
    if (userCheck.length > 0) {
      if (userCheck[0].status === '0' || userCheck[0].status === 0) {
        return res.json({ success: '0', msg: 'Account Inactive! Contact Admin to activate your account.', is_inactive: true });
      }
      if (userCheck[0].betting_status === '0' || userCheck[0].betting_status === 0) {
        return res.json({ success: '0', msg: 'Betting is currently blocked for your account! Contact Admin.' });
      }
    }

    const [settings] = await db.query("SELECT * FROM admin_settings LIMIT 1");
    const limits = settings[0] || {};
    const minBidAmt = parseInt(limits.min_bid_amt, 10) > 0 ? parseInt(limits.min_bid_amt, 10) : 10;
    const maxBidAmt = parseInt(limits.max_bid_amt, 10) > 0 ? parseInt(limits.max_bid_amt, 10) : 50000;

    const nowIST = getISTDate();
    const marketOpenTimeStr = limits.market_open_time && limits.market_open_time !== '00:00:00' ? limits.market_open_time : '05:00 am';

    for (const b of bids) {
      const phone = req.user.phone; // get phone number from verified token
      const { game_name, game_type, session, points_action } = b;
      let { open_pana, open_digit, close_pana, close_digit } = b;

      const points = parseInt(points_action, 10);
      if (isNaN(points) || points < minBidAmt || points > maxBidAmt) {
        return res.json({ success: '0', msg: `Invalid Bid Amount: must be between ${minBidAmt} and ${maxBidAmt}` });
      }

      // Check game exist and get timings for today (case-insensitive)
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayDayName = daysOfWeek[nowIST.getDay()];
      let [games] = await db.query(
        "SELECT * FROM game_time WHERE LOWER(TRIM(game)) = LOWER(TRIM(?)) AND LOWER(TRIM(day)) = LOWER(TRIM(?)) LIMIT 1",
        [game_name, todayDayName]
      );
      if (games.length === 0) {
        [games] = await db.query(
          "SELECT * FROM game_time WHERE LOWER(TRIM(game)) = LOWER(TRIM(?)) LIMIT 1",
          [game_name]
        );
      }
      if (games.length === 0) {
        return res.json({ success: '0', msg: 'Invalid Game Name' });
      }
      const gameTime = games[0];

      if (gameTime.status === '0') {
        return res.json({ success: '0', msg: 'Market is closed for today' });
      }

      // Validate market open/close timings with IST and overnight window handling
      const timing = evaluateGameTiming(gameTime.open_time, gameTime.close_time, marketOpenTimeStr, nowIST);

      let allowed = true;
      if (session === 'Open') {
        if (!timing.isOpenSessionActive) {
          allowed = false;
        }
      } else if (session === 'Close') {
        if (!timing.isWithinWindow) {
          allowed = false;
        }
      }

      // If game type is Jodi Digit, Half Sangam, or Full Sangam, it cannot be bid after Open time!
      if (game_type === 'Jodi' || game_type === 'Jodi Digit' || game_type === 'Half Sangam' || game_type === 'Full Sangam') {
        if (!timing.isOpenSessionActive) {
          allowed = false;
        }
      }

      if (!allowed) {
        const formattedIST = nowIST.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return res.json({
          success: '0',
          msg: session === 'Open' ? 'Open Market Closed' : 'Market Closed',
          current_time: formattedIST,
          open_time: gameTime.open_time,
          close_time: gameTime.close_time
        });
      }

      // Flexible Pana & Digit fallback from client payload
      const rawPana = b.pana || b.panna || b.pana_digit || b.digits || b.number;
      const rawDigit = b.digit || b.ank || b.single_digit;
      const sessLower = String(session || '').trim().toLowerCase();

      if ((!open_pana || open_pana === 'NA' || open_pana === '') && sessLower === 'open') {
        if (rawPana && String(rawPana).trim().length === 3) {
          open_pana = String(rawPana).trim();
        } else if (rawDigit && String(rawDigit).trim().length === 1 && (!open_digit || open_digit === 'NA')) {
          open_digit = String(rawDigit).trim();
        }
      }
      if ((!close_pana || close_pana === 'NA' || close_pana === '') && sessLower === 'close') {
        if (rawPana && String(rawPana).trim().length === 3) {
          close_pana = String(rawPana).trim();
        } else if (rawDigit && String(rawDigit).trim().length === 1 && (!close_digit || close_digit === 'NA')) {
          close_digit = String(rawDigit).trim();
        }
      }

      // Defaulting values
      open_pana = open_pana || 'NA';
      close_pana = close_pana || 'NA';
      open_digit = open_digit || 'NA';
      close_digit = close_digit || 'NA';

      // Robust Jodi handling (both 'Jodi' and 'Jodi Digit')
      if (game_type === 'Jodi' || game_type === 'Jodi Digit') {
        const rawJodi = b.jodi || b.jodi_digit || b.digits || b.number || rawDigit || rawPana;
        if (open_digit && open_digit !== 'NA' && String(open_digit).trim().length === 2) {
          const str = String(open_digit).trim();
          open_digit = str.charAt(0);
          close_digit = str.charAt(1);
        } else if (close_digit && close_digit !== 'NA' && String(close_digit).trim().length === 2) {
          const str = String(close_digit).trim();
          open_digit = str.charAt(0);
          close_digit = str.charAt(1);
        } else if (rawJodi && String(rawJodi).trim().length === 2 && (open_digit === 'NA' || close_digit === 'NA')) {
          const str = String(rawJodi).trim();
          open_digit = str.charAt(0);
          close_digit = str.charAt(1);
        } else if (open_digit !== 'NA' && close_digit !== 'NA' && String(open_digit).trim().length === 1 && String(close_digit).trim().length === 1) {
          open_digit = String(open_digit).trim();
          close_digit = String(close_digit).trim();
        }
      }

      // Half Sangam explicit fallback
      if (game_type === 'Half Sangam') {
        if (b.open_digit && b.open_digit !== 'NA') open_digit = String(b.open_digit).trim();
        if (b.close_digit && b.close_digit !== 'NA') close_digit = String(b.close_digit).trim();
        if (b.open_pana && b.open_pana !== 'NA') open_pana = String(b.open_pana).trim();
        if (b.close_pana && b.close_pana !== 'NA') close_pana = String(b.close_pana).trim();
      }

      // Check user wallet
      const [users] = await db.query("SELECT wallet FROM user_info WHERE phone = ?", [phone]);
      if (users.length === 0) {
        return res.json({ success: '0', msg: 'User Not Found' });
      }

      const balance = parseInt(users[0].wallet, 10);
      if (balance - points < 0) {
        return res.json({ success: '0', msg: 'Insufficient Funds' });
      }

      // Insert bid with IST date and time
      const currentDateStr = getISTDateStr();
      const currentTimeStr = getISTTime12h();

      const [insertResult] = await db.query(
        "INSERT INTO user_bid_history (username, game_name, game_type, session, open_pana, open_digit, close_pana, close_digit, points_action, date, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [phone, game_name, game_type, session, open_pana, open_digit, close_pana, close_digit, points, currentDateStr, currentTimeStr]
      );

      if (insertResult.affectedRows > 0) {
        const newBalance = balance - points;
        await db.query("UPDATE user_info SET wallet = ? WHERE phone = ?", [newBalance, phone]);
        await db.query(
          "INSERT INTO wallet_history (status, date, time, amount, updated_amount, remark, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
          ['0', currentDateStr, currentTimeStr, points, newBalance, 'Deduct for Bid', phone]
        );

        // Trigger referral commission for bid placement
        try {
          const adminController = require('./adminController');
          if (adminController.processReferralCommission) {
            adminController.processReferralCommission(phone, 'every_bet', points);
            adminController.processReferralCommission(phone, 'first_bet', points);
          }
        } catch (e) {
          console.error('Error triggering bid referral commission:', e);
        }
      } else {
        return res.json({ success: '0', msg: 'Database Error while placing bid' });
      }
    }

    // Return new wallet balance of the user
    const [updatedUser] = await db.query("SELECT wallet FROM user_info WHERE phone = ?", [req.user.phone]);
    return res.json({
      success: '1',
      msg: 'Bid Added Successfully',
      balance: updatedUser[0].wallet
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Fetch User Bid History
exports.getBidHistory = async (req, res) => {
  const phone = req.user.phone;
  const { date1, date2 } = req.query;
  try {
    const rawPhone = String(phone || '').replace(/^\+91/, '').replace(/^91/, '').trim();
    const phoneWithPlus = `+91${rawPhone}`;

    let sql = "SELECT * FROM user_bid_history WHERE (username = ? OR username = ? OR username = ? OR REPLACE(username, '+91', '') = ?)";
    const params = [phone, rawPhone, phoneWithPlus, rawPhone];
    if (date1 && date2) {
      sql += " AND (date BETWEEN ? AND ? OR DATE(date) BETWEEN ? AND ?)";
      params.push(date1, date2, date1, date2);
    }
    sql += " ORDER BY date DESC, id DESC LIMIT 100";
    const [bids] = await db.query(sql, params);

    const formattedBids = bids.map(item => {
      let d = item.date;
      if (d instanceof Date) {
        d = getISTDateStr(d);
      } else if (typeof d === 'string' && d.includes('T')) {
        d = d.split('T')[0];
      }

      let t = item.time;
      if (t) {
        t = String(t).trim();
        const match24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (match24) {
          let h = parseInt(match24[1], 10);
          const m = match24[2];
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          t = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
        }
      }

      let { open_digit, close_digit, open_pana, close_pana, game_type } = item;
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
        close_digit: close_digit !== undefined ? close_digit : item.close_digit,
        open_pana: open_pana !== undefined ? open_pana : item.open_pana,
        close_pana: close_pana !== undefined ? close_pana : item.close_pana,
        date: d,
        time: t
      };
    });

    return res.json({ success: '1', data: formattedBids, result: formattedBids });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Fetch User Win History
exports.getWinReport = async (req, res) => {
  const phone = req.user.phone;
  const { date1, date2 } = req.query;
  try {
    const rawPhone = String(phone || '').replace(/^\+91/, '').replace(/^91/, '').trim();
    const phoneWithPlus = `+91${rawPhone}`;

    let sql = "SELECT * FROM user_winning_report WHERE (username = ? OR username = ? OR username = ? OR REPLACE(username, '+91', '') = ?)";
    const params = [phone, rawPhone, phoneWithPlus, rawPhone];
    if (date1 && date2) {
      sql += " AND (date BETWEEN ? AND ? OR DATE(date) BETWEEN ? AND ?)";
      params.push(date1, date2, date1, date2);
    }
    sql += " ORDER BY id DESC LIMIT 100";
    const [wins] = await db.query(sql, params);

    const formattedWins = wins.map(item => {
      let d = item.date;
      if (d instanceof Date) {
        d = getISTDateStr(d);
      } else if (typeof d === 'string' && d.includes('T')) {
        d = d.split('T')[0];
      }

      let gType = item.game_type;
      if (!gType || gType === 'Open Pana' || gType === 'Close Pana' || gType === 'Pana') {
        const pVal = (item.open_pana && item.open_pana !== 'NA' && item.open_pana !== 'N/A')
          ? item.open_pana
          : ((item.close_pana && item.close_pana !== 'NA' && item.close_pana !== 'N/A') ? item.close_pana : '');
        if (pVal && pVal.length === 3) {
          const [d1, d2, d3] = pVal.split('');
          if (d1 === d2 && d2 === d3) gType = 'Triple Pana';
          else if (d1 === d2 || d2 === d3 || d1 === d3) gType = 'Double Pana';
          else gType = 'Single Pana';
        }
      }

      return {
        ...item,
        date: d,
        game_type: gType || item.game_type
      };
    });

    return res.json({ success: '1', data: formattedWins, result: formattedWins });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Fetch Game Chart
exports.getGameChart = async (req, res) => {
  const { game_name } = req.query;
  try {
    const [chart] = await db.query(
      "SELECT * FROM result_chart WHERE game_name = ? ORDER BY date DESC LIMIT 30",
      [game_name]
    );
    return res.json({ success: '1', data: chart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};
