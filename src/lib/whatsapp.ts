export const MAX_MESSAGE_LENGTH = 4000;

/** Android package names used to target a specific app explicitly. */
export const WA_PERSONAL_PACKAGE = 'com.whatsapp';
export const WA_BUSINESS_PACKAGE = 'com.whatsapp.w4b';

export type ChatAppTarget = 'personal' | 'business';

export function packageForTarget(target: ChatAppTarget): string {
  return target === 'business' ? WA_BUSINESS_PACKAGE : WA_PERSONAL_PACKAGE;
}

/**
 * Build a wa.me deep link.
 * - numberDigits: digits-only E.164 without '+' (already normalized).
 * - message: optional; when empty/whitespace-only no ?text param is added.
 */
export function buildWhatsAppUrl(numberDigits: string, message?: string): string {
  const digits = (numberDigits ?? '').replace(/\D/g, '');
  if (!digits) throw new Error('Enter a mobile number.');
  const base = `https://wa.me/${digits}`;
  const text = (message ?? '').replace(/\r\n/g, '\n');
  if (!text.trim()) return base;
  const clipped = text.length > MAX_MESSAGE_LENGTH ? text.slice(0, MAX_MESSAGE_LENGTH) : text;
  return `${base}?text=${encodeURIComponent(clipped)}`;
}

export function validateMessage(message: string): string | null {
  if (!message) return null;
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Message is too long (max ${MAX_MESSAGE_LENGTH} characters). It will be trimmed.`;
  }
  return null;
}

/**
 * Build an Android `intent://` URL that opens the wa.me link in one
 * specific app (WhatsApp vs WhatsApp Business). `S.browser_fallback_url`
 * makes Chrome fall back to the normal wa.me page when that app is not
 * installed — so there is never a dead end.
 *
 * Only use on Chromium-based Android browsers (see supportsAppIntents).
 * The ?text value comes from encodeURIComponent, which escapes `;` `#`
 * `:` etc., so the message can never break the intent syntax.
 */
export function buildIntentUrl(
  numberDigits: string,
  message: string | undefined,
  androidPackage: string,
): string {
  const waUrl = buildWhatsAppUrl(numberDigits, message);
  const path = waUrl.replace(/^https:\/\//, '');
  return (
    `intent://${path}#Intent;scheme=https;package=${androidPackage};` +
    `S.browser_fallback_url=${encodeURIComponent(waUrl)};end`
  );
}

/**
 * intent:// links with an explicit package only work in Chromium-based
 * browsers on Android. Everywhere else (iOS, desktop, Firefox) callers
 * must use the plain https://wa.me link and let the OS decide.
 */
export function supportsAppIntents(userAgent?: string): boolean {
  const ua =
    userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!/Android/i.test(ua)) return false;
  if (/Firefox|FxiOS/i.test(ua)) return false;
  return /Chrome|EdgA|OPR|SamsungBrowser/i.test(ua);
}
