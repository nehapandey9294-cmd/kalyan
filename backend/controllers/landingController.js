const db = require('../config/db');
const { getISTDate, getISTDateStr } = require('../utils/istDate');

// Helper to parse time string
function getTodayTime(timeStr, refISTDate) {
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

// Evaluate market open/close timing
function evaluateGameTiming(openTimeStr, closeTimeStr, nowIST) {
  const openTimeObj = getTodayTime(openTimeStr, nowIST);
  const closeTimeObj = getTodayTime(closeTimeStr, nowIST);
  if (!openTimeObj || !closeTimeObj || isNaN(openTimeObj.getTime()) || isNaN(closeTimeObj.getTime())) {
    return { isWithinWindow: true, isOpenSessionActive: true };
  }
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
  const isWithinWindow = nowIST.getTime() <= closeTimeObj.getTime();
  const isOpenSessionActive = isWithinWindow && nowIST.getTime() < openTimeObj.getTime();
  return { isWithinWindow, isOpenSessionActive };
}

// 1. Get Landing Page Info (Branding, App Link, How to Play, Notice, Contacts, Rates)
exports.getLandingInfo = async (req, res) => {
  try {
    // Ensure table columns exist
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN app_link TEXT`); } catch (e) {}
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN how_to_play TEXT`); } catch (e) {}
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN alert_message TEXT`); } catch (e) {}
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN privacy_policy_url TEXT`); } catch (e) {}
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN data_deletion_url TEXT`); } catch (e) {}

    const [settingsRows] = await db.query('SELECT * FROM admin_settings LIMIT 1');
    const settings = settingsRows.length > 0 ? settingsRows[0] : {};

    const [contactRows] = await db.query('SELECT * FROM contact_detail LIMIT 1');
    const contact = contactRows.length > 0 ? contactRows[0] : {};

    let ratesRows = [];
    try {
      const [r] = await db.query('SELECT * FROM game_rates ORDER BY id ASC');
      ratesRows = r.map((item, idx) => {
        const minVal = Number(item.min_value) || 10;
        const maxVal = Number(item.max_value) || 950;
        const mult = (maxVal / minVal);
        return {
          id: item.id || (idx + 1),
          type: item.type || `Game Type ${idx + 1}`,
          name: item.type || `Game Type ${idx + 1}`,
          min_value: minVal,
          max_value: maxVal,
          ratio: `${minVal} Ka ${maxVal}`,
          multiplier: `${mult % 1 === 0 ? mult : mult.toFixed(1)}x`
        };
      });
    } catch (e) {
      ratesRows = [];
    }

    let alertMessage = (settings.alert_message && settings.alert_message.trim() !== '') ? settings.alert_message : '';
    if (!alertMessage) {
      try {
        const [noticeRows] = await db.query('SELECT * FROM notice ORDER BY id DESC LIMIT 1');
        if (noticeRows.length > 0 && (noticeRows[0].notice_msg || noticeRows[0].title)) {
          alertMessage = noticeRows[0].notice_msg || noticeRows[0].title;
        }
      } catch (e) {}
    }
    if (!alertMessage || alertMessage.includes('Tara Baba') || alertMessage.includes('Sara 777')) {
      alertMessage = "Welcome to Kalyan Matka! India's No.1 Live Matka Result Portal! Download our official app now.";
    }

    const appName = 'Kalyan Matka';

    const rawLink = settings.app_link ? settings.app_link.trim() : '';
    const appLink = (rawLink && rawLink !== '#' && rawLink !== '/api/download-apk') ? rawLink : 'apk/sara-777.apk';
    const howToPlay = settings.how_to_play || '#';
    const mobile = contact.mobile || '';
    const wpMobile = contact.wp_mobile || contact.mobile || '';
    const privacyPolicyUrl = settings.privacy_policy_url || '/privacy-policy';
    const dataDeletionUrl = settings.data_deletion_url || '/data-deletion';

    return res.json({
      success: '1',
      data: {
        app_name: appName,
        app_link: appLink,
        how_to_play: howToPlay,
        alert_message: alertMessage,
        mobile: mobile,
        wp_mobile: wpMobile,
        email: contact.email || 'support@saraquiz.com',
        privacy_policy_url: privacyPolicyUrl,
        data_deletion_url: dataDeletionUrl,
        rates: ratesRows
      }
    });
  } catch (err) {
    console.error('Error fetching landing info:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Public Game Rates
exports.getLandingRates = async (req, res) => {
  try {
    const [r] = await db.query('SELECT * FROM game_rates ORDER BY id ASC');
    const formatted = r.map((item, idx) => {
      const minVal = Number(item.min_value) || 10;
      const maxVal = Number(item.max_value) || 950;
      const mult = (maxVal / minVal);
      return {
        id: item.id || (idx + 1),
        type: item.type || `Rate ${idx + 1}`,
        name: item.type || `Rate ${idx + 1}`,
        min_value: minVal,
        max_value: maxVal,
        ratio: `${minVal} Ka ${maxVal}`,
        multiplier: `${mult % 1 === 0 ? mult : mult.toFixed(1)}x`
      };
    });
    return res.json({ success: '1', data: formatted });
  } catch (err) {
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 2. Get All Markets with Today's Live Declared Results for Landing Page
exports.getLandingMarkets = async (req, res) => {
  try {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nowIST = getISTDate();
    const todayDayName = daysOfWeek[nowIST.getDay()];
    const todayDateStr = getISTDateStr(nowIST);

    // Step A: Get all distinct game names from game_time for today
    let gameRows = [];
    try {
      const [rows] = await db.query(
        `SELECT g1.* FROM game_time g1
         INNER JOIN (
           SELECT game, MIN(id) as min_id FROM game_time WHERE LOWER(TRIM(day)) = LOWER(?) GROUP BY game
         ) g2 ON g1.id = g2.min_id
         ORDER BY g1.id ASC`,
        [todayDayName]
      );
      gameRows = rows;
    } catch (e) {
      gameRows = [];
    }

    // Fallback: If no day-specific game_time, get distinct games
    if (!gameRows || gameRows.length === 0) {
      try {
        const [rows] = await db.query(
          `SELECT g1.* FROM game_time g1
           INNER JOIN (
             SELECT game, MIN(id) as min_id FROM game_time GROUP BY game
           ) g2 ON g1.id = g2.min_id
           ORDER BY g1.id ASC`
        );
        gameRows = rows;
      } catch (err2) {
        try {
          const [rows] = await db.query("SELECT DISTINCT game FROM game_time");
          gameRows = rows.map((r, idx) => ({ id: idx + 1, game: r.game, open_time: '10:00 AM', close_time: '05:00 PM', status: '1' }));
        } catch (err3) {
          gameRows = [];
        }
      }
    }

    // Step B: If game_time empty -> query result_chart
    if (!gameRows || gameRows.length === 0) {
      try {
        const [chartGames] = await db.query("SELECT DISTINCT game_name as game FROM result_chart");
        gameRows = chartGames.map((g, idx) => ({
          id: idx + 1,
          game: g.game,
          open_time: '10:00 AM',
          close_time: '05:00 PM',
          status: '1'
        }));
      } catch (e) {}
    }

    // Step C: High Performance Batch Pre-fetch (Only 2 queries instead of 44 sequential network queries)
    const todayTimingMap = new Map();
    try {
      const [timings] = await db.query(
        "SELECT game, open_time, close_time, status FROM game_time WHERE LOWER(TRIM(day)) = LOWER(?)",
        [todayDayName]
      );
      for (const t of timings) {
        if (t.game) todayTimingMap.set(String(t.game).trim().toLowerCase(), t);
      }
    } catch (e) {}

    const todayResultMap = new Map();
    try {
      const [results] = await db.query(
        "SELECT game_name, open_panna, open_digit, close_panna, close_digit FROM result_chart WHERE date = ? OR DATE(date) = ? OR date LIKE ?",
        [todayDateStr, todayDateStr, `%${todayDateStr}%`]
      );
      for (const r of results) {
        if (r.game_name) todayResultMap.set(String(r.game_name).trim().toLowerCase(), r);
      }
    } catch (e) {}

    const marketList = [];

    for (const g of gameRows) {
      const gName = g.game || g.game_name || 'MARKET';
      const gKey = String(gName).trim().toLowerCase();

      // Instant in-memory lookup
      const todayTiming = todayTimingMap.get(gKey);
      let openTime = (todayTiming && todayTiming.open_time) ? todayTiming.open_time : (g.open_time || '10:00 AM');
      let closeTime = (todayTiming && todayTiming.close_time) ? todayTiming.close_time : (g.close_time || '05:00 PM');
      let gameStatus = (todayTiming && todayTiming.status !== undefined) ? todayTiming.status : (g.status || '1');

      let openPana = "***";
      let openDigit = "*";
      let closePana = "***";
      let closeDigit = "*";
      let isDeclaredToday = false;

      // Instant in-memory lookup
      const resChart = todayResultMap.get(gKey);
      if (resChart) {
        openPana = (resChart.open_panna && String(resChart.open_panna).trim() !== '') ? String(resChart.open_panna).trim() : "***";
        openDigit = (resChart.open_digit !== null && resChart.open_digit !== undefined && String(resChart.open_digit).trim() !== '') ? String(resChart.open_digit).trim() : "*";
        closePana = (resChart.close_panna && String(resChart.close_panna).trim() !== '') ? String(resChart.close_panna).trim() : "***";
        closeDigit = (resChart.close_digit !== null && resChart.close_digit !== undefined && String(resChart.close_digit).trim() !== '') ? String(resChart.close_digit).trim() : "*";
        if (openDigit !== '*' || closeDigit !== '*') {
          isDeclaredToday = true;
        }
      }

      // Format result display string (e.g. 123-45-678 or ***-**-***)
      let jodiStr = "**";
      if (openDigit !== '*' && closeDigit !== '*') {
        jodiStr = `${openDigit}${closeDigit}`;
      } else if (openDigit !== '*') {
        jodiStr = `${openDigit}*`;
      }

      const resultDisplay = `${openPana}-${jodiStr}-${closePana}`;
      const timing = evaluateGameTiming(openTime, closeTime, nowIST);
      const isBettingOpen = timing.isWithinWindow && gameStatus !== '0';

      let statusLabel = 'CLOSED';
      if (isDeclaredToday) {
        statusLabel = 'DECLARED TODAY';
      } else if (isBettingOpen) {
        statusLabel = 'OPEN FOR BETTING';
      } else {
        statusLabel = 'CLOSED FOR TODAY';
      }

      marketList.push({
        id: g.id || 0,
        market_name: gName,
        open_time: openTime,
        close_time: closeTime,
        status: gameStatus,
        is_betting_open: isBettingOpen,
        is_open_session: timing.isOpenSessionActive,
        status_label: statusLabel,
        open_pana: openPana,
        open_digit: openDigit,
        close_pana: closePana,
        close_digit: closeDigit,
        result_display: resultDisplay,
        is_declared_today: isDeclaredToday
      });
    }

    return res.json({ success: '1', data: marketList, ist_date: todayDateStr });
  } catch (err) {
    console.error('Error fetching landing markets:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// Helper: Group dates by weeks (Monday to Sunday)
function buildWeekMatrix(rows, chartType) {
  if (!rows || rows.length === 0) return [];

  const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
  const weeksMap = {};

  sorted.forEach(row => {
    if (!row.date) return;
    const d = new Date(row.date);
    if (isNaN(d.getTime())) return;

    const day = d.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeksMap[weekKey]) {
      weeksMap[weekKey] = {
        weekStart: weekKey,
        days: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 0: null }
      };
    }

    const openPa = (row.open_panna && row.open_panna !== '') ? row.open_panna : '***';
    const closePa = (row.close_panna && row.close_panna !== '') ? row.close_panna : '***';
    const openDig = (row.open_digit !== null && row.open_digit !== undefined && row.open_digit !== '') ? row.open_digit : '*';
    const closeDig = (row.close_digit !== null && row.close_digit !== undefined && row.close_digit !== '') ? row.close_digit : '*';

    let jodi = '**';
    if (openDig !== '*' && closeDig !== '*') {
      jodi = `${openDig}${closeDig}`;
    } else if (openDig !== '*') {
      jodi = `${openDig}*`;
    }

    weeksMap[weekKey].days[day] = {
      date: row.date,
      open_pana: openPa,
      close_pana: closePa,
      open_digit: openDig,
      close_digit: closeDig,
      jodi: jodi,
      full_display: `${openPa}-${jodi}-${closePa}`
    };
  });

  return Object.values(weeksMap).sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
}

// 3. Get Chart Data (Jodi or Panel) for a specific Market
exports.getChartData = async (req, res) => {
  try {
    const { chartType, gameName } = req.params;
    const gName = req.query.game || gameName;

    if (!gName) {
      return res.status(400).json({ success: '0', msg: 'Market name is required' });
    }

    const [rows] = await db.query(
      "SELECT * FROM result_chart WHERE TRIM(game_name) = TRIM(?) ORDER BY date DESC LIMIT 365",
      [gName]
    );

    const weekMatrix = buildWeekMatrix(rows, chartType);

    return res.json({
      success: '1',
      game_name: gName,
      chart_type: chartType,
      records: rows,
      weeks: weekMatrix
    });
  } catch (err) {
    console.error('Error fetching chart data:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};
