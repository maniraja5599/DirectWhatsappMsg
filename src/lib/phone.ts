export interface CountryCode {
  iso: string;
  dial: string; // digits without '+'
  name: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { iso: 'IN', dial: '91', name: 'India' },
  { iso: 'US', dial: '1', name: 'USA & Canada' },
  { iso: 'GB', dial: '44', name: 'United Kingdom' },
  { iso: 'AE', dial: '971', name: 'UAE' },
  { iso: 'SA', dial: '966', name: 'Saudi Arabia' },
  { iso: 'QA', dial: '974', name: 'Qatar' },
  { iso: 'KW', dial: '965', name: 'Kuwait' },
  { iso: 'OM', dial: '968', name: 'Oman' },
  { iso: 'BH', dial: '973', name: 'Bahrain' },
  { iso: 'SG', dial: '65', name: 'Singapore' },
  { iso: 'MY', dial: '60', name: 'Malaysia' },
  { iso: 'AU', dial: '61', name: 'Australia' },
  { iso: 'NZ', dial: '64', name: 'New Zealand' },
  { iso: 'DE', dial: '49', name: 'Germany' },
  { iso: 'FR', dial: '33', name: 'France' },
  { iso: 'ES', dial: '34', name: 'Spain' },
  { iso: 'IT', dial: '39', name: 'Italy' },
  { iso: 'NL', dial: '31', name: 'Netherlands' },
  { iso: 'IE', dial: '353', name: 'Ireland' },
  { iso: 'LK', dial: '94', name: 'Sri Lanka' },
  { iso: 'BD', dial: '880', name: 'Bangladesh' },
  { iso: 'PK', dial: '92', name: 'Pakistan' },
  { iso: 'NP', dial: '977', name: 'Nepal' },
  { iso: 'PH', dial: '63', name: 'Philippines' },
  { iso: 'ID', dial: '62', name: 'Indonesia' },
  { iso: 'TH', dial: '66', name: 'Thailand' },
  { iso: 'VN', dial: '84', name: 'Vietnam' },
  { iso: 'CN', dial: '86', name: 'China' },
  { iso: 'JP', dial: '81', name: 'Japan' },
  { iso: 'KR', dial: '82', name: 'South Korea' },
  { iso: 'ZA', dial: '27', name: 'South Africa' },
  { iso: 'NG', dial: '234', name: 'Nigeria' },
  { iso: 'KE', dial: '254', name: 'Kenya' },
  { iso: 'EG', dial: '20', name: 'Egypt' },
  { iso: 'BR', dial: '55', name: 'Brazil' },
  { iso: 'MX', dial: '52', name: 'Mexico' },
];

export const DEFAULT_COUNTRY_DIAL = '91';

export interface NormalizeResult {
  /** Digits-only E.164 without '+', suitable for wa.me. Null when invalid. */
  digits: string | null;
  /** Human-friendly display with leading '+'. */
  display: string;
  error: string | null;
}

const MIN_LEN = 7;

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+/, '');
}

function isValidE164Digits(digits: string): boolean {
  return /^[1-9]\d{6,14}$/.test(digits);
}

/**
 * Normalize a raw phone input into wa.me-compatible digits.
 *
 * Rules:
 * - Removes spaces, hyphens, brackets and other non-numeric chars
 *   (keeps an optional leading '+' only to detect intent).
 * - Handles '00' international prefix, Indian trunk '0',
 *   and avoids blindly prepending the default country code
 *   when the number already contains it.
 */
export function normalizePhoneNumber(
  raw: string,
  defaultCountryDial: string = DEFAULT_COUNTRY_DIAL,
): NormalizeResult {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { digits: null, display: '', error: 'Enter a mobile number.' };
  }

  const hadPlus = trimmed.startsWith('+');
  const defaultDial = defaultCountryDial.replace(/\D/g, '') || DEFAULT_COUNTRY_DIAL;

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return { digits: null, display: '', error: 'Please enter a valid mobile number.' };
  }

  // '00' prefix means international dial-out, e.g. 0091... -> 91...
  if (!hadPlus && digits.startsWith('00')) {
    digits = stripLeadingZeros(digits.slice(2));
    // digits.slice(2) on "0091..." gives "91..."; stripLeadingZeros is safe here
    if (!digits) {
      return { digits: null, display: '', error: 'Please enter a valid mobile number.' };
    }
    if (isValidE164Digits(digits)) {
      return { digits, display: `+${digits}`, error: null };
    }
    return { digits: null, display: '', error: 'Please enter a valid mobile number.' };
  }

  if (hadPlus) {
    digits = stripLeadingZeros(digits);
    if (isValidE164Digits(digits)) {
      return { digits, display: `+${digits}`, error: null };
    }
    return { digits: null, display: '', error: 'Please enter a valid mobile number.' };
  }

  // No '+' prefix: could be national or already include country code.

  // Indian-style trunk '0': e.g. 09876543210 -> 919876543210,
  // 0919876543210 -> 919876543210
  if (digits.startsWith('0')) {
    const stripped = stripLeadingZeros(digits);
    if (!stripped) {
      return { digits: null, display: '', error: 'Please enter a valid mobile number.' };
    }
    if (stripped.startsWith(defaultDial) && isValidE164Digits(stripped)) {
      return { digits: stripped, display: `+${stripped}`, error: null };
    }
    // 10-digit Indian mobile with trunk zero removed
    if (defaultDial === '91' && /^[6-9]\d{9}$/.test(stripped) && stripped.length === 10) {
      const withCode = `91${stripped}`;
      return { digits: withCode, display: `+${withCode}`, error: null };
    }
    // Generic: stripped national number -> prepend default
    if (stripped.length >= MIN_LEN && stripped.length <= 12 && isValidE164Digits(defaultDial + stripped)) {
      // Avoid double-prepending if stripped already looks international
      if (stripped.length > 10 && !stripped.startsWith(defaultDial)) {
        if (isValidE164Digits(stripped)) {
          return { digits: stripped, display: `+${stripped}`, error: null };
        }
      }
      const withCode = `${defaultDial}${stripped}`;
      if (isValidE164Digits(withCode)) {
        return { digits: withCode, display: `+${withCode}`, error: null };
      }
    }
    if (isValidE164Digits(stripped)) {
      return { digits: stripped, display: `+${stripped}`, error: null };
    }
    return { digits: null, display: '', error: 'Please enter a valid mobile number.' };
  }

  // Already starts with default country dial and is longer than a national number.
  if (digits.startsWith(defaultDial) && digits.length > defaultDial.length + 4) {
    const noZero = stripLeadingZeros(digits);
    if (isValidE164Digits(noZero)) {
      return { digits: noZero, display: `+${noZero}`, error: null };
    }
  }

  // Plain 10-digit Indian mobile.
  if (defaultDial === '91' && /^[6-9]\d{9}$/.test(digits) && digits.length === 10) {
    const withCode = `91${digits}`;
    return { digits: withCode, display: `+${withCode}`, error: null };
  }

  // If it already looks like a full international number, keep as-is.
  if (digits.length > 10 && isValidE164Digits(digits)) {
    return { digits, display: `+${digits}`, error: null };
  }

  // Otherwise treat as a national number and prepend the default code.
  if (digits.length >= MIN_LEN && digits.length <= 10) {
    const withCode = `${defaultDial}${stripLeadingZeros(digits)}`;
    if (isValidE164Digits(withCode)) {
      return { digits: withCode, display: `+${withCode}`, error: null };
    }
  }

  return { digits: null, display: '', error: 'Please enter a valid mobile number.' };
}

/**
 * Split full international digits (E.164 without '+', already normalized)
 * into a known country dial code + national number.
 * Longest dial-code match wins. Returns null when no known code fits,
 * so callers keep the current country instead of guessing.
 */
export function detectCountryFromDigits(
  fullDigits: string,
): { dial: string; national: string } | null {
  const digits = (fullDigits ?? '').replace(/\D/g, '');
  if (!digits) return null;
  let best: CountryCode | null = null;
  for (const code of COUNTRY_CODES) {
    if (!digits.startsWith(code.dial)) continue;
    const rest = digits.slice(code.dial.length);
    // Subscriber part must be plausible (4-13 digits) and total E.164-valid.
    if (rest.length < 4 || rest.length > 13) continue;
    if (!best || code.dial.length > best.dial.length) best = code;
  }
  if (!best) return null;
  return { dial: best.dial, national: digits.slice(best.dial.length) };
}

/** Default country dial (India). Exported so UI defaults stay in one place. */
export function getDefaultCountryDial(): string {
  return DEFAULT_COUNTRY_DIAL;
}

/**
 * Max allowed national digits per country.
 * Returns null when no strict limit is defined (allows up to 15 per E.164).
 */
export function getMaxNationalDigits(countryDial: string): number | null {
  if (countryDial === '91') return 10; // India
  if (countryDial === '1') return 10;  // USA/Canada
  if (countryDial === '44') return 10; // UK
  if (countryDial === '61') return 9;  // Australia
  if (countryDial === '65') return 8;  // Singapore
  if (countryDial === '971') return 9; // UAE
  if (countryDial === '966') return 9; // Saudi
  return null; // no strict limit
}

/**
 * Find the first valid phone number inside free-form text
 * (e.g. clipboard content like "Call me on +91 98765 43210 tomorrow").
 */
export function extractPhoneFromText(
  text: string,
  defaultCountryDial: string = DEFAULT_COUNTRY_DIAL,
): NormalizeResult | null {
  const input = (text ?? '').trim();
  if (!input) return null;

  // Fast path: the whole input is just the number.
  const direct = normalizePhoneNumber(input, defaultCountryDial);
  if (direct.digits) return direct;

  const candidates = input.match(/\+?\d[\d\s\-().]{5,}\d/g) ?? [];
  for (const candidate of candidates) {
    const result = normalizePhoneNumber(candidate, defaultCountryDial);
    if (result.digits) return result;
  }
  return null;
}

export function formatForDisplay(digitsWithoutPlus: string): string {
  const d = digitsWithoutPlus.replace(/\D/g, '');
  if (!d) return '';
  return `+${d}`;
}
