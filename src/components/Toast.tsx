interface Props {
  toast: string | null;
}

export default function Toast({ toast }: Props) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
