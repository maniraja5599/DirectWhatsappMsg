import type { SavedMessage } from '../lib/storage';

interface Props {
  message: SavedMessage;
  onUse: (m: SavedMessage) => void;
  onEdit: (m: SavedMessage) => void;
  onDelete: (m: SavedMessage) => void;
  onCopy: (m: SavedMessage) => void;
}

function preview(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > 90 ? `${oneLine.slice(0, 90)}…` : oneLine || '—';
}

export default function SavedMessageCard({ message, onUse, onEdit, onDelete, onCopy }: Props) {
  return (
    <li className="saved-card">
      <h3 className="saved-card__title">{message.title}</h3>
      <p className="saved-card__preview" title={message.body}>
        {preview(message.body)}
      </p>
      {message.useCount > 0 ? (
        <p className="saved-card__meta">Used {message.useCount}×</p>
      ) : null}
      <div className="saved-card__actions">
        <button type="button" className="btn btn--use btn--small" onClick={() => onUse(message)}>
          Use
        </button>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onCopy(message)}>
          Copy
        </button>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onEdit(message)}>
          Edit
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--small btn--danger"
          onClick={() => onDelete(message)}
          aria-label={`Delete ${message.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
