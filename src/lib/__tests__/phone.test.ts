import { describe, expect, it } from 'vitest';
import { detectCountryFromDigits, extractPhoneFromText, normalizePhoneNumber } from '../phone';

describe('normalizePhoneNumber (default India +91)', () => {
  const cases: Array<[string, string | null]> = [
    ['9876543210', '919876543210'],
    ['+919876543210', '919876543210'],
    ['919876543210', '919876543210'],
    ['+91 98765 43210', '919876543210'],
    ['0919876543210', '919876543210'],
    ['09876543210', '919876543210'],
    ['+91-98765-43210', '919876543210'],
    ['(98765) 43210', '919876543210'],
    ['00919876543210', '919876543210'],
    ['+1 415 555 2671', '14155552671'],
  ];

  for (const [input, expected] of cases) {
    it(`normalizes "${input}" -> ${expected}`, () => {
      const r = normalizePhoneNumber(input, '91');
      expect(r.digits).toBe(expected);
      expect(r.error).toBeNull();
    });
  }

  it('does not double-prepend +91', () => {
    expect(normalizePhoneNumber('919876543210', '91').digits).toBe('919876543210');
  });

  it('rejects empty input', () => {
    const r = normalizePhoneNumber('', '91');
    expect(r.digits).toBeNull();
    expect(r.error).toBe('Enter a mobile number.');
  });

  it('rejects clearly invalid input', () => {
    for (const bad of ['abc', '123', '++--', '00000', '+']) {
      expect(normalizePhoneNumber(bad, '91').digits).toBeNull();
    }
  });

  it('rejects too-long numbers', () => {
    expect(normalizePhoneNumber('+911234567890123456', '91').digits).toBeNull();
  });

  it('supports other default country codes', () => {
    expect(normalizePhoneNumber('4155552671', '1').digits).toBe('14155552671');
    expect(normalizePhoneNumber('2071234567', '44').digits).toBe('442071234567');
  });
});

describe('detectCountryFromDigits', () => {
  it('detects India +91 (default stays India)', () => {
    expect(detectCountryFromDigits('919876543210')).toEqual({ dial: '91', national: '9876543210' });
  });

  it('detects USA +1, UK +44, UAE +971 on paste', () => {
    expect(detectCountryFromDigits('14155552671')).toEqual({ dial: '1', national: '4155552671' });
    expect(detectCountryFromDigits('442071234567')).toEqual({ dial: '44', national: '2071234567' });
    expect(detectCountryFromDigits('971501234567')).toEqual({ dial: '971', national: '501234567' });
  });

  it('prefers the longest dial-code match', () => {
    // '977' (Nepal) must win over any shorter prefix
    expect(detectCountryFromDigits('9779841234567')).toEqual({ dial: '977', national: '9841234567' });
  });

  it('returns null for unknown codes so UI keeps current country', () => {
    expect(detectCountryFromDigits('7001234567')).toBeNull();
    expect(detectCountryFromDigits('')).toBeNull();
  });
});

describe('extractPhoneFromText', () => {
  it('finds a number inside free-form clipboard text', () => {
    const r = extractPhoneFromText('Call me on +91 98765 43210 tomorrow', '91');
    expect(r?.digits).toBe('919876543210');
  });

  it('returns null for text without a number', () => {
    expect(extractPhoneFromText('hello there, no digits here!', '91')).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(extractPhoneFromText('   ', '91')).toBeNull();
  });
});
