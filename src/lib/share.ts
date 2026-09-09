/**
 * Image sharing via Web Share API.
 * Works on iOS Safari and Android Chrome — opens native share sheet
 * where the user picks WhatsApp (or any other app) to receive the file.
 */

export function canShareFiles(): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare !== undefined;
  } catch {
    return false;
  }
}

export function canShareFile(file: File): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported' | 'error';

/**
 * Share an image + optional text to WhatsApp (or any app via the share sheet).
 * Falls back to text-only if file sharing isn't supported.
 */
export async function shareToWhatsApp(
  _numberDigits: string,
  message: string,
  image?: File | null,
): Promise<ShareResult> {
  if (!image || !canShareFiles()) return 'unsupported';

  try {
    const shareData: ShareData = {};
    if (message.trim()) shareData.text = message;
    if (image && canShareFile(image)) {
      shareData.files = [image];
    }
    // title is required on some platforms
    shareData.title = message.trim() || 'Shared via FiFTO';

    await navigator.share(shareData);
    return 'shared';
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}
