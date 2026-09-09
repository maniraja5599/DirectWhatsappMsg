export type ClipboardFailureReason = 'unsupported' | 'denied' | 'empty' | 'error';

export type ClipboardReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: ClipboardFailureReason; message: string };

export const CLIPBOARD_MESSAGES = {
  unsupported:
    'Clipboard access is unavailable in this browser. Long-press the number field and choose Paste.',
  denied:
    'Clipboard access is unavailable. Long-press the number field and choose Paste.',
  empty: 'No number found in clipboard.',
  error: 'Could not read the clipboard. Long-press the number field and choose Paste.',
} as const;

/**
 * Read text from the clipboard. Must only be called from an explicit
 * user gesture (click/tap). Never claims success when nothing was read.
 */
export async function readClipboardText(): Promise<ClipboardReadResult> {
  try {
    const nav = navigator as Navigator & {
      clipboard?: { readText?: () => Promise<string> };
    };
    if (!nav.clipboard?.readText) {
      return { ok: false, reason: 'unsupported', message: CLIPBOARD_MESSAGES.unsupported };
    }
    const text = await nav.clipboard.readText();
    if (!text || !text.trim()) {
      return { ok: false, reason: 'empty', message: CLIPBOARD_MESSAGES.empty };
    }
    return { ok: true, text };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return { ok: false, reason: 'denied', message: CLIPBOARD_MESSAGES.denied };
    }
    return { ok: false, reason: 'error', message: CLIPBOARD_MESSAGES.error };
  }
}

export function isClipboardLikelySupported(): boolean {
  try {
    const nav = navigator as Navigator & { clipboard?: unknown };
    return Boolean(nav.clipboard && typeof ClipboardItem !== 'undefined');
  } catch {
    return false;
  }
}

export type ClipboardPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * iPhone / iPad detection (including iPadOS desktop-mode Safari).
 * iOS shows its own system "paste?" prompt on every clipboard read and
 * needs an explicit tap — so the app guides iOS users specifically.
 */
export function isIosDevice(): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { platform?: string; maxTouchPoints?: number };
    const ua = typeof nav.userAgent === 'string' ? nav.userAgent : '';
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
  } catch {
    return false;
  }
}

/**
 * Check the clipboard-read permission WITHOUT triggering any prompt.
 * Used to decide whether a silent auto-paste attempt is even allowed —
 * we never pop a permission dialog on the user's behalf.
 */
export async function queryClipboardReadState(): Promise<ClipboardPermissionState> {
  try {
    const nav = navigator as Navigator & {
      permissions?: { query?: (descriptor: { name: string }) => Promise<{ state: string }> };
    };
    const query = nav.permissions?.query;
    if (typeof query !== 'function') return 'unsupported';
    const result = await query.call(nav.permissions, { name: 'clipboard-read' });
    if (result?.state === 'granted' || result?.state === 'denied' || result?.state === 'prompt') {
      return result.state;
    }
    return 'prompt';
  } catch {
    return 'unsupported';
  }
}
