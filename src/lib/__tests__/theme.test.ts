import { describe, expect, it } from 'vitest';
import { THEME_KEY, resolveTheme } from '../theme';

describe('resolveTheme', () => {
  it('respects an explicit saved choice', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('falls back to the OS preference', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
    expect(resolveTheme('', true)).toBe('dark');
    expect(resolveTheme('garbage', false)).toBe('light');
  });

  it('uses a stable storage key', () => {
    expect(THEME_KEY).toBe('wa-direct:theme');
  });
});
