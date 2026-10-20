// Helper functions for India Standard Time (IST / Asia/Kolkata / UTC+5:30)

/**
 * Extract date & time components in IST reliably
 */
function getISTComponents(d) {
  let dateObj = (d instanceof Date && !isNaN(d)) ? d : (d ? new Date(d) : new Date());
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  // If already an IST Date object created by getISTDate(), reuse directly to prevent double-conversion
  if (dateObj._isIST) {
    return {
      year: String(dateObj.getFullYear()),
      month: String(dateObj.getMonth() + 1).padStart(2, '0'),
      day: String(dateObj.getDate()).padStart(2, '0'),
      hour: String(dateObj.getHours()).padStart(2, '0'),
      minute: String(dateObj.getMinutes()).padStart(2, '0'),
      second: String(dateObj.getSeconds()).padStart(2, '0')
    };
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(dateObj);
  const p = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }

  const hourNum = parseInt(p.hour, 10) % 24;
  const hour24 = String(hourNum).padStart(2, '0');

  return {
    year: p.year,
    month: p.month,
    day: p.day,
    hour: hour24,
    minute: p.minute,
    second: p.second
  };
}

/**
 * Returns a JS Date object whose local getHours(), getMinutes(), getDay(), etc.
 * match India Standard Time.
 */
function getISTDate(d) {
  if (d && d._isIST) return d;
  const { year, month, day, hour, minute, second } = getISTComponents(d);
  const istDate = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10)
  );
  istDate._isIST = true;
  return istDate;
}

/**
 * Returns YYYY-MM-DD date string in IST
 */
function getISTDateStr(d) {
  const { year, month, day } = getISTComponents(d);
  return `${year}-${month}-${day}`;
}

/**
 * Returns HH:MM:SS (24-hour) time string in IST
 */
function getISTTimeStr(d) {
  const { hour, minute, second } = getISTComponents(d);
  return `${hour}:${minute}:${second}`;
}

/**
 * Returns hh:mm:ss AM/PM (12-hour) time string in IST
 */
function getISTTime12h(d, includeSeconds = true) {
  const { hour, minute, second } = getISTComponents(d);
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = String(h).padStart(2, '0');
  if (includeSeconds) {
    return `${hStr}:${minute}:${second} ${ampm}`;
  }
  return `${hStr}:${minute} ${ampm}`;
}

/**
 * Returns YYYY-MM-DD HH:MM:SS datetime string in IST
 */
function getISTDateTimeStr(d) {
  return `${getISTDateStr(d)} ${getISTTimeStr(d)}`;
}

module.exports = {
  getISTDate,
  getISTDateStr,
  getISTTimeStr,
  getISTTime12h,
  getISTDateTimeStr
};
