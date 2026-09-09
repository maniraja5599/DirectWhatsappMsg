import { useEffect, useRef, useState } from 'react';
import type { SavedMessage } from '../lib/storage';
import SavedMessageCard from './SavedMessageCard';

type BusinessMode = 'whatsapp' | 'business' | 'both';

interface Props {
  open: boolean;
  messages: SavedMessage[];
  businessMode: BusinessMode;
  onSetBusinessMode: (mode: BusinessMode) => void;
  onClose: () => void;
  onUse: (m: SavedMessage) => void;
  onEdit: (m: SavedMessage) => void;
  onDelete: (m: SavedMessage) => void;
  onCopy: (m: SavedMessage) => void;
  onNew: () => void;
}

const VERSION = '1.1.0';

export default function SettingsModal({
  open,
  messages,
  businessMode,
  onSetBusinessMode,
  onClose,
  onUse,
  onEdit,
  onDelete,
  onCopy,
  onNew,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => panelRef.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="modal"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
      >
        <div className="settings-header">
          <div className="settings-header__icon" aria-hidden="true">⚙️</div>
          <div className="settings-header__text">
            <h2 id="settings-title">Settings</h2>
            <p className="settings-header__ver">v{VERSION}</p>
          </div>
          <button type="button" className="btn btn--ghost btn--small settings-close" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3 className="settings-section__title">WhatsApp mode</h3>
            <p className="settings-section__desc">Choose which app(s) appear on the main screen.</p>
            <div className="mode-btns">
              <button
                type="button"
                className={`btn btn--small mode-btn${businessMode === 'whatsapp' ? ' mode-btn--active' : ''}`}
                onClick={() => onSetBusinessMode('whatsapp')}
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                className={`btn btn--small mode-btn${businessMode === 'both' ? ' mode-btn--active' : ''}`}
                onClick={() => onSetBusinessMode('both')}
              >
                Both
              </button>
              <button
                type="button"
                className={`btn btn--small mode-btn${businessMode === 'business' ? ' mode-btn--active' : ''}`}
                onClick={() => onSetBusinessMode('business')}
              >
                🏢 WA WhatsApp
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section__title">Appearance</h3>
            <p className="settings-section__desc">Switch between light and dark mode.</p>
            <ThemeToggle />
          </div>

          <div className="settings-section">
            <div className="settings-section__head">
              <h3 className="settings-section__title">Saved messages</h3>
              <span className="count-pill" aria-label={`${messages.length} saved messages`}>
                {messages.length}
              </span>
              <button type="button" className="btn btn--ghost btn--small" onClick={onNew}>
                + New
              </button>
            </div>
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>No saved messages yet. Tap + New to create your first reusable message.</p>
              </div>
            ) : (
              <>
                <ul className="saved-list">
                  {messages.map((m) => (
                    <SavedMessageCard key={m.id} message={m} onUse={onUse} onEdit={onEdit} onDelete={onDelete} onCopy={onCopy} />
                  ))}
                </ul>
                <button type="button" className="btn btn--ghost btn--small btn--danger" onClick={() => { if (window.confirm('Delete all saved messages?')) { localStorage.removeItem('wa-direct:saved-messages:v1'); window.location.reload(); } }}>
                  Clear all messages
                </button>
              </>
            )}
          </div>

          <div className="settings-section">
            <h3 className="settings-section__title">About</h3>
            <p className="settings-section__desc">
              FiFTO WhatsDirect — quickly open WhatsApp chats for any number with an optional message.
              Private by design: numbers, clipboard, and messages stay on this device. Nothing is uploaded.
            </p>
            <p className="settings-section__desc">
              Supports WhatsApp &amp; WhatsApp Business. Works offline.
            </p>
          </div>

          <div className="dev-block">
            <h3 className="settings-section__title">Developer</h3>
            <p className="dev-name">Mani Raja</p>
            <div className="dev-row">
              <a className="btn btn--ghost btn--small" href="tel:+918300030123">📞 +91 83000 30123</a>
              <a className="btn btn--ghost btn--small" href="https://instagram.com/maniraja__" target="_blank" rel="noopener noreferrer">📷 @maniraja__</a>
            </div>
          </div>

          <p className="settings-version">v{VERSION} · FiFTO WhatsDirect</p>
        </div>

        <div className="modal__actions modal__actions--single">
          <button type="button" className="btn btn--cancel" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('wa-direct:theme') ?? 'light'; } catch { return 'light'; }
  });

  useEffect(() => {
    const id = setInterval(() => {
      try { const t = localStorage.getItem('wa-direct:theme'); if (t) setTheme(t); } catch {}
    }, 500);
    return () => clearInterval(id);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('wa-direct:theme', next); } catch {}
    document.documentElement.dataset.theme = next;
    setTheme(next);
  };

  return (
    <button type="button" className="btn btn--small" onClick={toggle}>
      {theme === 'dark' ? '☀️ Switch to light mode' : '🌙 Switch to dark mode'}
    </button>
  );
}
