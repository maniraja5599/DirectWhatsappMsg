import { describe, expect, it } from 'vitest';
import {
  WA_BUSINESS_PACKAGE,
  WA_PERSONAL_PACKAGE,
  buildIntentUrl,
  buildWhatsAppUrl,
  supportsAppIntents,
} from '../whatsapp';

describe('buildWhatsAppUrl', () => {
  it('builds a bare URL when message is empty', () => {
    expect(buildWhatsAppUrl('919876543210', '')).toBe('https://wa.me/919876543210');
    expect(buildWhatsAppUrl('919876543210')).toBe('https://wa.me/919876543210');
    expect(buildWhatsAppUrl('919876543210', '   ')).toBe('https://wa.me/919876543210');
  });

  it('encodes a single-line message', () => {
    expect(buildWhatsAppUrl('919876543210', 'Hello Sir, please call me')).toBe(
      'https://wa.me/919876543210?text=Hello%20Sir%2C%20please%20call%20me',
    );
  });

  it('preserves line breaks via encoding', () => {
    const url = buildWhatsAppUrl('919876543210', 'Line1\nLine2');
    expect(url).toBe('https://wa.me/919876543210?text=Line1%0ALine2');
  });

  it('encodes special characters (& ? =)', () => {
    const url = buildWhatsAppUrl('919876543210', 'a&b?c=d');
    expect(url).toBe('https://wa.me/919876543210?text=a%26b%3Fc%3Dd');
  });

  it('encodes Tamil text and emoji', () => {
    const msg = 'வணக்கம் Sir, உங்கள் booking confirm செய்யப்பட்டுள்ளது. 🎉';
    const url = buildWhatsAppUrl('919876543210', msg);
    expect(url).toBe(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`);
    // Round-trip check
    const textParam = new URL(url).searchParams.get('text');
    expect(textParam).toBe(msg);
  });

  it('encodes URLs inside the message', () => {
    const msg = 'See https://example.com/a?b=1&c=2 here';
    const url = buildWhatsAppUrl('919876543210', msg);
    expect(new URL(url).searchParams.get('text')).toBe(msg);
  });

  it('throws for missing number', () => {
    expect(() => buildWhatsAppUrl('', 'hi')).toThrow();
  });
});

describe('buildIntentUrl (WhatsApp vs Business)', () => {
  it('targets regular WhatsApp explicitly', () => {
    expect(buildIntentUrl('919876543210', 'Hi', WA_PERSONAL_PACKAGE)).toBe(
      'intent://wa.me/919876543210?text=Hi#Intent;scheme=https;package=com.whatsapp;' +
        'S.browser_fallback_url=https%3A%2F%2Fwa.me%2F919876543210%3Ftext%3DHi;end',
    );
  });

  it('targets WhatsApp Business with a working web fallback', () => {
    const url = buildIntentUrl('919876543210', 'Hello', WA_BUSINESS_PACKAGE);
    expect(url).toContain('package=com.whatsapp.w4b');
    const fallback = /S\.browser_fallback_url=([^;]+)/.exec(url)?.[1];
    expect(fallback && decodeURIComponent(fallback)).toBe('https://wa.me/919876543210?text=Hello');
  });

  it('keeps tricky messages intent-safe (semicolons, &, Tamil, emoji)', () => {
    const msg = 'a;b&c=d? வணக்கம் 🎉';
    const url = buildIntentUrl('919876543210', msg, WA_BUSINESS_PACKAGE);
    const dataPart = url.split('#Intent;')[0];
    expect(dataPart).not.toContain(';');
    const fallback = /S\.browser_fallback_url=([^;]+)/.exec(url)?.[1];
    expect(fallback && new URL(decodeURIComponent(fallback)).searchParams.get('text')).toBe(msg);
  });

  it('omits ?text for empty messages', () => {
    expect(buildIntentUrl('919876543210', '', WA_PERSONAL_PACKAGE)).toBe(
      'intent://wa.me/919876543210#Intent;scheme=https;package=com.whatsapp;' +
        'S.browser_fallback_url=https%3A%2F%2Fwa.me%2F919876543210;end',
    );
  });
});

describe('supportsAppIntents', () => {
  const pixelChrome =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
  const samsung =
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36';
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const desktop =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const firefoxAndroid =
    'Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0';

  it('allows Chromium on Android', () => {
    expect(supportsAppIntents(pixelChrome)).toBe(true);
    expect(supportsAppIntents(samsung)).toBe(true);
  });

  it('rejects iOS, desktop and Firefox', () => {
    expect(supportsAppIntents(iphone)).toBe(false);
    expect(supportsAppIntents(desktop)).toBe(false);
    expect(supportsAppIntents(firefoxAndroid)).toBe(false);
    expect(supportsAppIntents('')).toBe(false);
  });
});
