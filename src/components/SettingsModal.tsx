import { useEffect, useRef } from 'react';
import type { SavedMessage } from '../lib/storage';
import SavedMessageCard from './SavedMessageCard';

interface Props {
  open: boolean;
  messages: SavedMessage[];
  onClose: () => void;
  onUse: (m: SavedMessage) => void;
  onEdit: (m: SavedMessage) => void;
  onDelete: (m: SavedMessage) => void;
  onCopy: (m: SavedMessage) => void;
  onNew: () => void;
}

export default function SettingsModal({
  open,
  messages,
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
        <h2 id="settings-title">Settings</h2>
        <p className="modal__sub">Saved messages live only in this browser. Nothing is uploaded.</p>

        <div className="section-head section-head--modal">
          <h3>Saved messages</h3>
          <span className="count-pill" aria-label={`${messages.length} saved messages`}>
            {messages.length}
          </span>
          <button type="button" className="btn btn--ghost btn--small" onClick={onNew}>
            + New Message
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No saved messages yet. Tap + New Message to create your first reusable message.</p>
          </div>
        ) : (
          <ul className="saved-list">
            {messages.map((m) => (
              <SavedMessageCard
                key={m.id}
                message={m}
                onUse={onUse}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopy={onCopy}
              />
            ))}
          </ul>
        )}

        <div className="modal__actions modal__actions--single">
          <button type="button" className="btn btn--cancel" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
