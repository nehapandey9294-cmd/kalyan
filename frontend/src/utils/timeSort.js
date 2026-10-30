/**
 * Time parsing and sorting utility for Market timings.
 * Handles 12-hour AM/PM formats, 24-hour formats, and handles Indian Matka
 * day cycle offsets (e.g. overnight/midnight markets past 11:59 PM).
 */

/**
 * Convert time string (e.g. "10:00 AM", "01:15 PM", "12:30 AM", "14:00") to minutes
 * relative to the Indian Matka business day start (~05:00 AM).
 * 
 * In Indian Matka, the market schedule starts early morning (~05:00 AM).
 * Midnight and early-morning markets (00:00 - 04:59 AM) belong to the night session
 * of the current day cycle, so adding 24 hours (1440 minutes) ensures they sort
 * AFTER 11:59 PM rather than before morning markets.
 */
export const getMarketTimeMinutes = (timeStr) => {
  if (!timeStr) return 999999;
  const clean = String(timeStr).trim().toLowerCase();
  const match = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return 999999;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) || 0;
  const modifier = match[4] ? match[4].toLowerCase() : null;

  if (modifier === 'pm') {
    if (hours < 12) hours += 12;
  } else if (modifier === 'am') {
    if (hours === 12) hours = 0;
  }

  // Market day cycle offset: 00:00 - 04:59 AM belong to the night session (after 11:59 PM)
  if (hours < 5) {
    hours += 24;
  }

  return hours * 60 + minutes;
};

/**
 * Compare two markets chronologically by open_time, then close_time, then name
 */
export const compareMarketTimes = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const openA = getMarketTimeMinutes(a.open_time);
  const openB = getMarketTimeMinutes(b.open_time);
  if (openA !== openB) {
    return openA - openB;
  }

  const closeA = getMarketTimeMinutes(a.close_time);
  const closeB = getMarketTimeMinutes(b.close_time);
  if (closeA !== closeB) {
    return closeA - closeB;
  }

  const nameA = a.games_name || a.game || a.market_name || '';
  const nameB = b.games_name || b.game || b.market_name || '';
  return String(nameA).localeCompare(String(nameB));
};
