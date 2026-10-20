const db = require('../config/db');

// Helper to get IST date (Asia/Kolkata UTC+5:30)
function getISTDate() {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istString);
}

// 1. Get Landing Page Info (Branding, App Link, How to Play, Notice, Contacts, Rates)
exports.getLandingInfo = async (req, res) => {
  try {
    // Ensure table columns exist
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN app_link TEXT`); } catch (e) {}
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN how_to_play TEXT`); } catch (e) {}
    try { await db.query(`ALTER TABLE admin_settings ADD COLUMN alert_message TEXT`); } catch (e) {}

    const [settingsRows] = await db.query('SELECT * FROM admin_settings LIMIT 1');
    const settings = settingsRows.length > 0 ? settingsRows[0] : {};

    const [contactRows] = await db.query('SELECT * FROM contact_detail LIMIT 1');
    const contact = contactRows.length > 0 ? contactRows[0] : {};

    let ratesRows = [];
    try {
      const [r] = await db.query('SELECT * FROM game_rates');
      ratesRows = r;
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
    if (!alertMessage) {
      alertMessage = "Welcome to India's No.1 Live Matka Result Portal! Download our official app now.";
    }

    const rawLink = settings.app_link ? settings.app_link.trim() : '';
    const appLink = (rawLink && rawLink !== '#' && rawLink !== '/api/download-apk') ? rawLink : '/apk/gama-567.apk';
    const howToPlay = settings.how_to_play || '#';
    const mobile = contact.mobile || '';
    const wpMobile = contact.wp_mobile || contact.mobile || '';

    return res.json({
      success: '1',
      data: {
        app_name: appName,
        app_link: appLink,
        how_to_play: howToPlay,
        alert_message: alertMessage,
        mobile: mobile,
        wp_mobile: wpMobile,
        rates: ratesRows
      }
    });
  } catch (err) {
    console.error('Error fetching landing info:', err);
    return res.status(500).json({ success: '0', error: err.message });
  }
};

// 2. Get All Markets with Today's Live Declared Results for Landing Page
exports.getLandingMarkets = async (req, res) => {
  try {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nowIST = getISTDate();
    const todayDayName = daysOfWeek[nowIST.getDay()];

    const yyyy = nowIST.getFullYear();
    const mm = String(nowIST.getMonth() + 1).padStart(2, '0');
    const dd = String(nowIST.getDate()).padStart(2, '0');
    const todayDateStr = `${yyyy}-${mm}-${dd}`;

    // Step A: Get all distinct game names from game_time
    let gameRows = [];
    try {
      const [rows] = await db.query(
        `SELECT g1.* FROM game_time g1
         INNER JOIN (
           SELECT MIN(id) as min_id FROM game_time GROUP BY game
         ) g2 ON g1.id = g2.min_id
         ORDER BY id ASC`
      );
      gameRows = rows;
    } catch (e) {
      // Fallback query if JOIN fails
      try {
        const [rows] = await db.query("SELECT DISTINCT game FROM game_time");
        gameRows = rows.map((r, idx) => ({ id: idx + 1, game: r.game, open_time: '10:00 AM', close_time: '05:00 PM', status: '1' }));
      } catch (err2) {
        gameRows = [];
      }
    }

    // Step B: Fallback if game_time is completely empty -> query result_chart or default markets
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

    // Step C: Default popular markets fallback if DB has no games configured yet
    if (!gameRows || gameRows.length === 0) {
      gameRows = [
        { id: 1, game: 'KALYAN', open_time: '04:10 PM', close_time: '06:10 PM', status: '1' },
        { id: 2, game: 'TIME BAZAR', open_time: '01:00 PM', close_time: '02:00 PM', status: '1' },
        { id: 3, game: 'MAIN BAZAR', open_time: '09:35 PM', close_time: '12:05 AM', status: '1' },
        { id: 4, game: 'RAJDHANI NIGHT', open_time: '09:25 PM', close_time: '11:35 PM', status: '1' },
        { id: 5, game: 'MILAN DAY', open_time: '03:05 PM', close_time: '05:05 PM', status: '1' },
        { id: 6, game: 'SUPREME NIGHT', open_time: '08:45 PM', close_time: '10:45 PM', status: '1' }
      ];
    }

    const marketList = [];

    for (const g of gameRows) {
      const gName = g.game || g.game_name || 'MARKET';

      // Fetch today's specific timing for this game if available
      let openTime = g.open_time || '10:00 AM';
      let closeTime = g.close_time || '05:00 PM';
      try {
        const [todayTiming] = await db.query(
          "SELECT open_time, close_time, status FROM game_time WHERE TRIM(game) = TRIM(?) AND LOWER(day) = LOWER(?) LIMIT 1",
          [gName, todayDayName]
        );
        if (todayTiming.length > 0) {
          if (todayTiming[0].open_time) openTime = todayTiming[0].open_time;
          if (todayTiming[0].close_time) closeTime = todayTiming[0].close_time;
        }
      } catch (e) {}

      let openPana = "***";
      let openDigit = "*";
      let closePana = "***";
      let closeDigit = "*";
      let isDeclaredToday = false;

      // Query today's result from result_chart
      try {
        const [resChart] = await db.query(
          "SELECT * FROM result_chart WHERE TRIM(game_name) = TRIM(?) AND date = ? LIMIT 1",
          [gName, todayDateStr]
        );
        if (resChart.length > 0) {
          const row = resChart[0];
          openPana = (row.open_panna && row.open_panna !== '') ? row.open_panna : "***";
          openDigit = (row.open_digit !== null && row.open_digit !== undefined && row.open_digit !== '') ? row.open_digit : "*";
          closePana = (row.close_panna && row.close_panna !== '') ? row.close_panna : "***";
          closeDigit = (row.close_digit !== null && row.close_digit !== undefined && row.close_digit !== '') ? row.close_digit : "*";
          if (openDigit !== '*' || closeDigit !== '*') {
            isDeclaredToday = true;
          }
        }
      } catch (e) {}

      // Format result display string (e.g. 123-45-678 or ***-**-***)
      let jodiStr = "**";
      if (openDigit !== '*' && closeDigit !== '*') {
        jodiStr = `${openDigit}${closeDigit}`;
      } else if (openDigit !== '*') {
        jodiStr = `${openDigit}*`;
      }

      const resultDisplay = `${openPana}-${jodiStr}-${closePana}`;

      marketList.push({
        id: g.id || 0,
        market_name: gName,
        open_time: openTime,
        close_time: closeTime,
        status: g.status || '1',
        open_pana: openPana,
        open_digit: openDigit,
        close_pana: closePana,
        close_digit: closeDigit,
        result_display: resultDisplay,
        is_declared_today: isDeclaredToday
      });
    }

    return res.json({ success: '1', data: marketList });
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
