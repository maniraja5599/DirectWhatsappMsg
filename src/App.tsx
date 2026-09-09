import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CountryCodeSelector from './components/CountryCodeSelector';
import MessageEditor from './components/MessageEditor';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import { DEFAULT_COUNTRY_DIAL, detectCountryFromDigits, extractPhoneFromText, normalizePhoneNumber } from './lib/phone';
import { MAX_MESSAGE_LENGTH, buildIntentUrl, buildWhatsAppUrl, packageForTarget, supportsAppIntents, type ChatAppTarget } from './lib/whatsapp';
import { readClipboardText, queryClipboardReadState } from './lib/clipboard';
import { usePwaInstall } from './lib/pwa';
import { useTheme } from './lib/theme';
import {
  deleteMessage,
  getSavedMessages,
  incrementUseCount,
  saveMessage,
  seedIfEmpty,
  updateMessage,
  type SavedMessage,
} from './lib/storage';

type Status = { kind: 'success' | 'error' | 'info'; text: string } | null;

const DRAFT_KEY = 'wa-direct:draft-message:v1';
const TARGET_KEY = 'wa-direct:chat-target';
const BUSINESS_KEY = 'wa-direct:show-business';

/**
 * Apply full international digits to the form: when the number carries a
 * known country code, switch the selector to it and keep only the
 * national part in the input. Otherwise keep digits as typed.
 */
function splitForForm(fullDigits: string, fallbackDial: string): { dial: string; national: string } {
  return detectCountryFromDigits(fullDigits) ?? { dial: fallbackDial, national: fullDigits };
}

export default function App() {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_DIAL);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [saved, setSaved] = useState<SavedMessage[]>(() =>
    seedIfEmpty([
      {
        title: 'Payment Reminder',
        body: 'Hello Sir, this is a reminder regarding the pending payment. Please let us know once the payment is completed.',
      },
      {
        title: 'Booking Confirmation',
        body: 'Your booking has been confirmed. Thank you for choosing us.',
      },
    ]),
  );
  const [selectedId, setSelectedId] = useState('');
  const [clipboardStatus, setClipboardStatus] = useState<Status>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<Status>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SavedMessage | null>(null);
  const [editorPrefill, setEditorPrefill] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pasteNudge, setPasteNudge] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Business button visibility — opt in/out from Settings. Default ON.
  const [businessEnabled, setBusinessEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BUSINESS_KEY) !== '0';
    } catch {
      return true;
    }
  });

  const toggleBusiness = () => {
    setBusinessEnabled((v) => {
      const next = !v;
      try {
        localStorage.setItem(BUSINESS_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };
  // Which app opens on keyboard Enter/Go — remembers the last tapped button.
  const [chatTarget, setChatTarget] = useState<ChatAppTarget>(() => {
    try {
      return localStorage.getItem(TARGET_KEY) === 'business' ? 'business' : 'personal';
    } catch {
      return 'personal';
    }
  });
  // Message composer stays collapsed until the user wants a message.
  // Restored drafts reopen it automatically so nothing is lost.
  const [composerOpen, setComposerOpen] = useState<boolean>(() => {
    try {
      return (localStorage.getItem(DRAFT_KEY) ?? '') !== '';
    } catch {
      return false;
    }
  });
  const { canInstall, showIosHint, install } = usePwaInstall();
  const { theme, toggle: toggleTheme } = useTheme();

  const phoneRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const nudgeTimer = useRef<number | undefined>(undefined);
  // Live mirrors so background listeners always see the current values.
  const phoneLiveRef = useRef(phone);
  const countryLiveRef = useRef(countryCode);
  useEffect(() => {
    phoneLiveRef.current = phone;
    countryLiveRef.current = countryCode;
  });

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const applyPastedDigits = useCallback((digits: string) => {
    const split = splitForForm(digits, countryLiveRef.current);
    setCountryCode(split.dial);
    setPhone(split.national);
    setPhoneError(null);
  }, []);

  /**
   * Best-effort auto-paste when the user (re)opens the app with a number
   * already copied. Browsers only allow this when clipboard access was
   * previously granted — otherwise we stay completely silent (no errors,
   * no prompts, never a false "pasted" claim) and the Paste button nudge
   * below guides the one-tap fallback.
   */
  const attemptAutoPaste = useCallback(async () => {
    try {
      if (phoneLiveRef.current.trim() !== '') return; // never overwrite typed input
      if (typeof document !== 'undefined' && !document.hasFocus()) return;
      if ((await queryClipboardReadState()) !== 'granted') return;
      const result = await readClipboardText();
      if (!result.ok) return;
      const found = extractPhoneFromText(result.text, countryLiveRef.current);
      if (!found?.digits) return;
      applyPastedDigits(found.digits);
      setPasteNudge(false);
      setClipboardStatus({ kind: 'success', text: 'Number pasted automatically.' });
      showToast('Number pasted.');
    } catch {
      // Silent by design.
    }
  }, [applyPastedDigits, showToast]);

  /** Gentle glow on the Paste button when the field is empty — one tap away. */
  const nudgePasteButton = useCallback(() => {
    if (phoneLiveRef.current.trim() !== '') return;
    setPasteNudge(true);
    window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => setPasteNudge(false), 2600);
    setClipboardStatus((prev) => prev ?? { kind: 'info', text: 'Copied a number? Tap Paste Number 👆.' });
  }, []);

  useEffect(() => {
    // On open + every return to the app (tab switch, app switch back).
    const kick = () => {
      void attemptAutoPaste();
      nudgePasteButton();
    };
    const boot = window.setTimeout(kick, 600);
    const onVis = () => {
      if (document.visibilityState === 'visible') kick();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', kick);
    window.addEventListener('pageshow', kick);
    return () => {
      window.clearTimeout(boot);
      window.clearTimeout(nudgeTimer.current);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', kick);
      window.removeEventListener('pageshow', kick);
    };
  }, [attemptAutoPaste, nudgePasteButton]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, message);
    } catch {
      // ignore
    }
  }, [message]);

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  const normalized = useMemo(
    () => normalizePhoneNumber(phone, countryCode),
    [phone, countryCode],
  );

  const waPreview = useMemo(() => {
    if (!normalized.digits) return null;
    try {
      return buildWhatsAppUrl(normalized.digits, message);
    } catch {
      return null;
    }
  }, [normalized.digits, message]);

  const handlePhoneChange = (value: string) => {
    if (phoneError) setPhoneError(null);
    setPasteNudge(false);
    if (value.trim() !== '') {
      // User is typing — the nudge hint has served its purpose.
      setClipboardStatus((prev) => (prev?.kind === 'info' ? null : prev));
    }
    // If the user types/pastes a full international number (leading '+'
    // or '00'), detect its country and switch the selector accordingly,
    // keeping only the national part in the field.
    const trimmed = value.trim();
    if (value.includes('+') || trimmed.startsWith('00')) {
      const parsed = normalizePhoneNumber(value, countryCode);
      if (parsed.digits) {
        const split = detectCountryFromDigits(parsed.digits);
        if (split) {
          if (split.dial !== countryCode) {
            setCountryCode(split.dial);
            showToast('Country detected — code updated.');
          }
          setPhone(split.national);
          return;
        }
      }
    }
    setPhone(value);
  };

  const handlePasteNumber = async () => {
    setPasting(true);
    setPasteNudge(false);
    setClipboardStatus({ kind: 'info', text: 'Reading clipboard…' });
    try {
      const result = await readClipboardText();
      if (!result.ok) {
        setClipboardStatus({ kind: 'error', text: result.message });
        return;
      }
      const found = extractPhoneFromText(result.text, countryCode);
      if (!found?.digits) {
        setClipboardStatus({ kind: 'error', text: 'No valid mobile number found in clipboard.' });
        return;
      }
      const split = splitForForm(found.digits, countryCode);
      setCountryCode(split.dial);
      setPhone(split.national);
      setPhoneError(null);
      setClipboardStatus({ kind: 'success', text: 'Number pasted.' });
      showToast('Number pasted.');
      phoneRef.current?.focus();
    } finally {
      setPasting(false);
    }
  };

  const handleInstall = async () => {
    if (showIosHint) {
      showToast('To install: tap Share, then Add to Home Screen.');
      return;
    }
    const outcome = await install();
    if (outcome === 'accepted') showToast('App installed.');
    else if (outcome === 'dismissed') showToast('Install dismissed.');
  };

  const openChat = (target: ChatAppTarget) => {
    setChatTarget(target);
    try {
      localStorage.setItem(TARGET_KEY, target);
    } catch {
      // ignore
    }
    const check = normalizePhoneNumber(phone, countryCode);
    if (!check.digits) {
      setPhoneError(check.error ?? 'Please enter a valid mobile number.');
      setWaStatus(null);
      phoneRef.current?.focus();
      return;
    }
    setPhoneError(null);
    const business = target === 'business';
    let url: string;
    try {
      // On Chromium Android, target the chosen app explicitly so users with
      // BOTH apps go straight to the right one. Anywhere else (or when the
      // app is missing) fall back to the normal wa.me link / web page.
      url = supportsAppIntents()
        ? buildIntentUrl(check.digits, message, packageForTarget(target))
        : buildWhatsAppUrl(check.digits, message);
    } catch {
      setPhoneError('Please enter a valid mobile number.');
      return;
    }
    const openingText = business ? 'Opening WhatsApp Business…' : 'Opening WhatsApp…';
    setWaStatus({ kind: 'info', text: openingText });
    showToast(openingText);
    // Direct navigation avoids popup blockers and works naturally on mobile.
    // Small delay lets the status render (and screen readers announce it).
    window.setTimeout(() => {
      window.location.href = url;
    }, 120);
  };

  const handleUseMessage = (m: SavedMessage) => {
    setMessage(m.body);
    setSelectedId(m.id);
    setComposerOpen(true);
    setSettingsOpen(false);
    incrementUseCount(m.id);
    setSaved(getSavedMessages());
    showToast('Message inserted.');
    // Focus after expand paints.
    window.setTimeout(() => composerRef.current?.focus(), 80);
  };

  const handleCopySaved = async (m: SavedMessage) => {
    try {
      await navigator.clipboard.writeText(m.body);
      showToast('Message copied.');
    } catch {
      // Fallback for browsers without async clipboard write.
      const ta = document.createElement('textarea');
      ta.value = m.body;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Message copied.');
      } catch {
        showToast('Could not copy. Long-press to copy manually.');
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const handleDelete = (m: SavedMessage) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return;
    deleteMessage(m.id);
    setSaved(getSavedMessages());
    if (selectedId === m.id) setSelectedId('');
    showToast('Message deleted.');
  };

  const openCreateEditor = (prefillBody = '') => {
    setEditing(null);
    setEditorPrefill(prefillBody);
    setEditorOpen(true);
  };

  const openSettings = () => setSettingsOpen(true);

  const openEditEditor = (m: SavedMessage) => {
    setEditing(m);
    setEditorPrefill('');
    setEditorOpen(true);
  };

  const handleEditorSave = (title: string, body: string): string | null => {
    try {
      if (editing) {
        const updated = updateMessage(editing.id, title, body);
        if (!updated) return 'Could not save. Please try again.';
        setSaved(getSavedMessages());
        showToast('Message saved.');
      } else {
        const created = saveMessage(title, body);
        setSaved(getSavedMessages());
        setSelectedId(created.id);
        showToast('Message saved.');
      }
      setEditorOpen(false);
      setEditing(null);
      return null;
    } catch {
      return 'Could not save. Storage may be unavailable.';
    }
  };

  const messageTooLong = message.length > MAX_MESSAGE_LENGTH;

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" role="presentation">
            <rect x="12" y="12" width="40" height="28" rx="10" fill="#fff" />
            <path d="M24 40v9l9-9z" fill="#fff" />
            <path d="M29 20l11 7-11 7z" fill="#075E54" />
          </svg>
        </span>
        <div>
          <h1 className="brand-title">FiFTO WhatsDirect</h1>
          <p className="brand-sub">Message anyone on WhatsApp — no contacts needed.</p>
        </div>
        <div className="topbar-actions">
          {(canInstall || showIosHint) && (
            <button type="button" className="btn btn--ghost btn--small install-btn" onClick={handleInstall}>
              <span aria-hidden="true">⬇</span> Install App
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost theme-btn"
            onClick={openSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <span aria-hidden="true">⚙️</span>
          </button>
        </div>
      </header>

      <main>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            // Keyboard Enter / mobile "Go" opens the chat directly
            // in the last-used app (WhatsApp or Business).
            openChat(!businessEnabled ? 'personal' : chatTarget);
          }}
        >
        {/* Number — the hero of the page */}
        <section className="card card--hero" aria-label="Mobile number">
          <label className="label label--hero" htmlFor="phone-input">
            Mobile number
          </label>
          <div className="field-row">
            <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
            <input
              id="phone-input"
              ref={phoneRef}
              className="phone-input phone-input--hero"
              type="tel"
              inputMode="tel"
              enterKeyHint="go"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? 'phone-error' : 'phone-help'}
            />
          </div>
          <p className="field-ok" id="phone-help">
            {normalized.digits ? (
              <>
                Will open <code>+{normalized.digits}</code>
              </>
            ) : (
              <>Tip: you can also long-press the field and choose Paste.</>
            )}
          </p>
          {phoneError ? (
            <p className="field-error" id="phone-error" role="alert">
              {phoneError}
            </p>
          ) : null}
          <button
            type="button"
            className={`btn btn--secondary${pasteNudge ? ' btn--nudge' : ''}`}
            onClick={handlePasteNumber}
            disabled={pasting}
          >
            <span aria-hidden="true">📋</span> {pasting ? 'Reading…' : 'Paste Number'}
          </button>
          {clipboardStatus ? (
            <p className={`status status--${clipboardStatus.kind}`} role="status">
              {clipboardStatus.text}
            </p>
          ) : null}
        </section>

        {/* Message — optional, collapsed by default for a cleaner flow */}
        <section className="card card--slim" aria-label="Optional message">
          {!composerOpen ? (
            <button
              type="button"
              className="btn btn--secondary btn--nomargin"
              onClick={() => setComposerOpen(true)}
              aria-expanded={false}
              aria-controls="composer-body"
            >
              <span aria-hidden="true">💬</span> Add a message (optional)
            </button>
          ) : (
            <div id="composer-body">
              <label className="label" htmlFor="saved-select">
                Saved message
              </label>
              <select
                id="saved-select"
                className="select"
                value={selectedId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id === '__new__') {
                    // Guide users to where new messages are added.
                    setSettingsOpen(true);
                    showToast('Add new messages in Settings ⚙️.');
                    return;
                  }
                  setSelectedId(id);
                  if (!id) return;
                  const found = saved.find((m) => m.id === id);
                  if (found) {
                    setMessage(found.body);
                    incrementUseCount(found.id);
                    setSaved(getSavedMessages());
                  }
                }}
              >
                <option value="">Select saved message…</option>
                <option value="__new__">＋ Add new message…</option>
                {saved.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <p className="field-note">Want a new message? Add it anytime in Settings ⚙️.</p>

              <div style={{ height: 10 }} />

              <label className="label" htmlFor="message-input">
                Message text
              </label>
              <textarea
                id="message-input"
                ref={composerRef}
                className="message-textarea"
                rows={4}
                placeholder="Type a message, or pick a saved one above…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  // Ctrl/Cmd+Enter sends from the message box (plain Enter = new line).
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    openChat(chatTarget);
                  }
                }}
                aria-describedby="message-count"
              />
              <div className="composer-meta">
                <span className="char-count" id="message-count">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </span>
                <span>
                  {message ? (
                    <button type="button" className="link-btn" onClick={() => setMessage('')}>
                      Clear
                    </button>
                  ) : null}{' '}
                  <button type="button" className="link-btn" onClick={() => setComposerOpen(false)}>
                    Hide
                  </button>
                </span>
              </div>
              {messageTooLong ? (
                <p className="status status--error" role="alert">
                  Message is too long — it will be trimmed to {MAX_MESSAGE_LENGTH} characters.
                </p>
              ) : null}
              <button type="button" className="btn btn--save" onClick={() => openCreateEditor(message)}>
                <span aria-hidden="true">💾</span> Save Message
              </button>
            </div>
          )}
        </section>

        {/* Open chat */}
        <section className="card" aria-label="Open chat">
          {waPreview ? (
            <p className="wa-preview" title={waPreview}>
              wa.me/{normalized.digits}
            </p>
          ) : null}
          {businessEnabled ? (
            <div className="app-duo">
              <button
                type="button"
                className="btn btn--primary btn--duo"
                onClick={() => openChat('personal')}
                aria-label="Open chat in WhatsApp"
              >
                <span aria-hidden="true">💬</span> WhatsApp
              </button>
              <button
                type="button"
                className="btn btn--business btn--duo"
                onClick={() => openChat('business')}
                aria-label="Open chat in WhatsApp Business"
              >
                <span aria-hidden="true">🏢</span> Business
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => openChat('personal')}
                aria-label="Open chat in WhatsApp"
              >
                <span aria-hidden="true">💬</span> Open WhatsApp
              </button>
              <p className="field-note field-note--center">
                Need WhatsApp Business too? Turn it on in Settings ⚙️.
              </p>
            </>
          )}
          {waStatus ? (
            <p className={`status status--${waStatus.kind}`} role="status">
              {waStatus.text}
            </p>
          ) : null}
          <p className="fallback-note">
            Have both apps? Pick which one opens the chat. If that app
            isn&apos;t installed, you&apos;ll go to WhatsApp Web instead.
            <br />
            Tip: press <kbd>Enter</kbd> on the keyboard to open directly.
          </p>
        </section>

        <footer className="footer">
          <p>
            Private by design — numbers, clipboard and messages stay on this device.
            <br />
            Works with WhatsApp &amp; WhatsApp Business.
          </p>
          <p className="footer__credit">
            Built by Mani Raja •{' '}
            <a
              href="https://instagram.com/maniraja__"
              target="_blank"
              rel="noopener noreferrer"
            >
              📷 @maniraja__
            </a>
          </p>
        </footer>
        </form>
      </main>

      <SettingsModal
        open={settingsOpen}
        messages={saved}
        businessEnabled={businessEnabled}
        onToggleBusiness={toggleBusiness}
        onClose={() => setSettingsOpen(false)}
        onUse={handleUseMessage}
        onEdit={openEditEditor}
        onDelete={handleDelete}
        onCopy={handleCopySaved}
        onNew={() => openCreateEditor('')}
      />

      <MessageEditor
        key={editorOpen ? (editing ? `edit-${editing.id}` : `create-${editorPrefill.length}`) : 'closed'}
        open={editorOpen}
        mode={editing ? 'edit' : 'create'}
        initialTitle={editing ? editing.title : ''}
        initialBody={editing ? editing.body : editorPrefill}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={handleEditorSave}
      />

      <Toast toast={toast} />
      <div className="sr-only" aria-live="polite">
        {clipboardStatus?.text} {waStatus?.text} {phoneError}
      </div>
    </div>
  );
}
