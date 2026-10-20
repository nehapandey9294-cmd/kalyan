// Indian Standard Time (IST / Asia/Kolkata / UTC+5:30) helper functions

/**
 * Returns today's date in IST formatted as YYYY-MM-DD
 */
export const getISTTodayStr = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

/**
 * Returns N days ago from today in IST formatted as YYYY-MM-DD
 */
export const getISTDaysAgoStr = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

/**
 * Returns Sunday (start of current week) in IST formatted as YYYY-MM-DD
 */
export const getISTThisWeekStartStr = () => {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday
  d.setDate(d.getDate() - day);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

/**
 * Returns 1st of current month in IST formatted as YYYY-MM-DD
 */
export const getISTThisMonthStartStr = () => {
  const today = getISTTodayStr();
  return `${today.slice(0, 7)}-01`;
};

/**
 * Formats any date string or Date object to Indian display format: DD-MM-YYYY (e.g. 15-10-2026)
 */
export const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '-';
  const str = String(dateVal).trim();

  // If ISO string with timezone e.g. "2026-10-14T18:30:00.000Z"
  if (str.includes('T')) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(d).replace(/\//g, '-');
      }
    } catch (e) {}
    return str.split('T')[0];
  }

  // If YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}-${m}-${y}`;
  }

  // If already DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    return str.replace(/\//g, '-');
  }

  return str;
};

/**
 * Formats time string to 12-hour AM/PM format (e.g. "07:30 PM")
 */
export const formatDisplayTime = (timeVal) => {
  if (!timeVal) return '';
  const clean = String(timeVal).trim();

  // If already 12-hour format with AM/PM e.g. "07:30:15 PM" or "7:30 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    const h = String(parseInt(match12[1], 10)).padStart(2, '0');
    const m = match12[2];
    const ampm = match12[4].toUpperCase();
    return `${h}:${m} ${ampm}`;
  }

  // If 24-hour format (HH:MM:SS or HH:MM)
  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  return clean;
};

/**
 * Helper to get clean Indian date + time combined (e.g. "15-10-2026 • 07:30 PM")
 */
export const formatDisplayDateTime = (dateVal, timeVal) => {
  const d = formatDisplayDate(dateVal);
  const t = formatDisplayTime(timeVal);
  if (d && t && d !== '-') return `${d} • ${t}`;
  return d || t || '-';
};
