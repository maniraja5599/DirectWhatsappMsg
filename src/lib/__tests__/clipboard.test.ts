import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIosDevice, queryClipboardReadState } from '../clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubPermissions(state: string | Error | null) {
  if (state === null) {
    vi.stubGlobal('navigator', {});
    return;
  }
  vi.stubGlobal('navigator', {
    permissions: {
      query: async () => {
        if (state instanceof Error) throw state;
        return { state };
      },
    },
  });
}

describe('queryClipboardReadState (never prompts)', () => {
  it('returns granted/denied/prompt as-is', async () => {
    stubPermissions('granted');
    await expect(queryClipboardReadState()).resolves.toBe('granted');
    stubPermissions('denied');
    await expect(queryClipboardReadState()).resolves.toBe('denied');
    stubPermissions('prompt');
    await expect(queryClipboardReadState()).resolves.toBe('prompt');
  });

  it('returns unsupported when the API is missing or throws', async () => {
    stubPermissions(null);
    await expect(queryClipboardReadState()).resolves.toBe('unsupported');
    stubPermissions(new Error('nope'));
    await expect(queryClipboardReadState()).resolves.toBe('unsupported');
  });

  it('treats unknown states as prompt (safe default: no silent attempt)', async () => {
    stubPermissions('mystery');
    await expect(queryClipboardReadState()).resolves.toBe('prompt');
  });
});

describe('isIosDevice', () => {
  const iphoneUA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const androidUA =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
  const macUA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

  it('detects iPhone/iPad user agents', () => {
    vi.stubGlobal('navigator', { userAgent: iphoneUA });
    expect(isIosDevice()).toBe(true);
  });

  it('detects iPadOS desktop-mode Safari (MacIntel + touch)', () => {
    vi.stubGlobal('navigator', { userAgent: macUA, platform: 'MacIntel', maxTouchPoints: 5 });
    expect(isIosDevice()).toBe(true);
  });

  it('rejects Android and touch-less desktop', () => {
    vi.stubGlobal('navigator', { userAgent: androidUA });
    expect(isIosDevice()).toBe(false);
    vi.stubGlobal('navigator', { userAgent: macUA, platform: 'MacIntel', maxTouchPoints: 0 });
    expect(isIosDevice()).toBe(false);
  });
});
