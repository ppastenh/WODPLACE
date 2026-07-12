/**
 * Helpers for Chilean mobile phone numbers, stored/displayed as
 * "+569 XXXX XXXX" (the 8 digits following the fixed +56 9 prefix).
 */

/** Extracts the 8 significant digits from a stored/display phone value. */
export function extractChileanDigits(value: string | null): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('569')) digits = digits.slice(3);
  else if (digits.startsWith('56')) digits = digits.slice(2);
  else if (digits.startsWith('9') && digits.length > 8) digits = digits.slice(1);
  return digits.slice(-8);
}

/** Formats an 8-digit suffix as "+569 XXXX XXXX". */
export function formatChileanPhone(digits: string): string {
  const clean = digits.replace(/\D/g, '').slice(0, 8);
  const grouped = clean.length > 4 ? `${clean.slice(0, 4)} ${clean.slice(4)}` : clean;
  return `+569${grouped ? ` ${grouped}` : ''}`;
}

export function isValidChileanPhoneDigits(digits: string): boolean {
  return /^\d{8}$/.test(digits);
}
