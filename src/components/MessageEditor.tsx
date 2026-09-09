import { useEffect, useRef, useState } from 'react';
import { validateSavedMessage } from '../lib/storage';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  initialTitle: string;
  initialBody: string;
  onClose: () => void;
  onSave: (title: string, body: string) => string | null;
}

export default function MessageEditor({
  open,
  mode,
  initialTitle,
  initialBody,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus after paint for mobile keyboards + screen readers.
    const t = window.setTimeout(() => titleRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateSavedMessage(title, body);
    if (err) {
      setError(err);
      return;
    }
    const saveError = onSave(title.trim(), body);
    if (saveError) setError(saveError);
  };

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="msg-editor-title"
      >
        <h2 id="msg-editor-title">{mode === 'create' ? 'New saved message' : 'Edit message'}</h2>
        <p className="modal__sub">Saved only in this browser. Nothing is uploaded.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal__field">
            <label className="label" htmlFor="msg-title">
              Title
            </label>
            <input
              id="msg-title"
              ref={titleRef}
              className="text-input"
              type="text"
              maxLength={80}
              placeholder="e.g. Payment Reminder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="modal__field">
            <label className="label" htmlFor="msg-body">
              Message
            </label>
            <textarea
              id="msg-body"
              className="message-textarea"
              rows={5}
              maxLength={4000}
              placeholder="Type the message to reuse…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="composer-meta">
              <span className="char-count">{body.length}/4000</span>
            </div>
          </div>
          {error ? (
            <p className="status status--error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="modal__actions">
            <button type="button" className="btn btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--confirm">
              {mode === 'create' ? 'Save' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
