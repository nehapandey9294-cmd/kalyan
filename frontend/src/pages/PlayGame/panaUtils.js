import { SINGLE_PANAS, DOUBLE_PANAS, TRIPLE_PANAS, SINGLE_DIGITS, JODI_DIGITS, ALL_PANAS } from '../../components/common/SearchableSelect';

export { SINGLE_PANAS, DOUBLE_PANAS, TRIPLE_PANAS, SINGLE_DIGITS, JODI_DIGITS, ALL_PANAS };

const valOf = (d) => (d === 0 || d === '0' ? 10 : parseInt(d, 10));

// Sort 3 digits by matka convention (1, 2, 3, 4, 5, 6, 7, 8, 9, 0)
export const sortPanaDigits = (d1, d2, d3) => {
  const arr = [d1, d2, d3];
  arr.sort((a, b) => valOf(a) - valOf(b));
  return arr.join('');
};

/**
 * Generate all Single Panas from a given string of digits (e.g. "12345")
 */
export const generateSPMotor = (digitsInput) => {
  if (!digitsInput) return [];
  const cleanDigits = Array.from(new Set(String(digitsInput).replace(/\D/g, '').split('')));
  if (cleanDigits.length < 3) return [];

  const validSet = new Set(SINGLE_PANAS);
  const result = new Set();

  for (let i = 0; i < cleanDigits.length; i++) {
    for (let j = i + 1; j < cleanDigits.length; j++) {
      for (let k = j + 1; k < cleanDigits.length; k++) {
        const pana = sortPanaDigits(cleanDigits[i], cleanDigits[j], cleanDigits[k]);
        if (validSet.has(pana)) {
          result.add(pana);
        }
      }
    }
  }

  return Array.from(result).sort((a, b) => {
    const vA = valOf(a[0]) * 100 + valOf(a[1]) * 10 + valOf(a[2]);
    const vB = valOf(b[0]) * 100 + valOf(b[1]) * 10 + valOf(b[2]);
    return vA - vB;
  });
};

/**
 * Generate all Double Panas from a given string of digits (e.g. "1234")
 */
export const generateDPMotor = (digitsInput) => {
  if (!digitsInput) return [];
  const cleanDigits = Array.from(new Set(String(digitsInput).replace(/\D/g, '').split('')));
  if (cleanDigits.length < 2) return [];

  const validSet = new Set(DOUBLE_PANAS);
  const result = new Set();

  for (let i = 0; i < cleanDigits.length; i++) {
    for (let j = 0; j < cleanDigits.length; j++) {
      if (i !== j) {
        // Double digit cleanDigits[i] + single cleanDigits[j]
        const pana = sortPanaDigits(cleanDigits[i], cleanDigits[i], cleanDigits[j]);
        if (validSet.has(pana)) {
          result.add(pana);
        }
      }
    }
  }

  return Array.from(result).sort((a, b) => {
    const vA = valOf(a[0]) * 100 + valOf(a[1]) * 10 + valOf(a[2]);
    const vB = valOf(b[0]) * 100 + valOf(b[1]) * 10 + valOf(b[2]);
    return vA - vB;
  });
};

export const isValidSinglePana = (val) => SINGLE_PANAS.includes(String(val).trim());
export const isValidDoublePana = (val) => DOUBLE_PANAS.includes(String(val).trim());
export const isValidTriplePana = (val) => TRIPLE_PANAS.includes(String(val).trim());
export const isValidJodi = (val) => JODI_DIGITS.includes(String(val).trim());

/**
 * Normalizes 3 digits by sorting them according to Matka convention (1-9, then 0)
 * e.g., '671' becomes '167', '012' becomes '120', '828' becomes '288'
 */
export const normalizePana = (val) => {
  if (!val) return '';
  const clean = String(val).replace(/\D/g, '').slice(0, 3);
  if (clean.length === 3) {
    return sortPanaDigits(clean[0], clean[1], clean[2]);
  }
  return clean;
};

export const isValidPana = (val) => {
  if (!val) return false;
  const str = String(val).trim();
  return ALL_PANAS.includes(str) || ALL_PANAS.includes(normalizePana(str));
};

export const getPanaAnk = (pana) => {
  if (!pana || String(pana).length < 3) return '';
  const sum = String(pana).split('').reduce((acc, c) => acc + (parseInt(c, 10) || 0), 0);
  return String(sum % 10);
};

/**
 * Returns the cut digit for a given digit (0-5, 1-6, 2-7, 3-8, 4-9)
 */
export const getCutDigit = (digit) => {
  if (digit === '' || digit === null || digit === undefined) return '';
  const d = parseInt(digit, 10);
  if (isNaN(d)) return '';
  return String((d + 5) % 10);
};

/**
 * Checks if a 3-digit pana belongs to a digit's family.
 * In Matka, digit D's family includes:
 * 1. Exact Ank: sum % 10 === D
 * 2. Cut Ank: sum % 10 === (D + 5) % 10
 */
export const isPanaInFamily = (pana, digit, allowCut = false) => {
  if (!pana || digit === '' || digit === null || digit === undefined) return false;
  const ank = getPanaAnk(normalizePana(pana));
  const dStr = String(digit).trim();
  if (ank === dStr) return true;
  if (allowCut && ank === getCutDigit(dStr)) return true;
  return false;
};

/**
 * Returns all 22 panas belonging to a digit (exact Ank)
 */
export const getFamilyPanas = (digit, includeCut = false) => {
  if (digit === '' || digit === null || digit === undefined) return [];
  const dStr = String(digit).trim();
  const cutDStr = getCutDigit(dStr);
  return ALL_PANAS.filter(p => {
    const ank = getPanaAnk(p);
    return ank === dStr || (includeCut && ank === cutDStr);
  });
};


