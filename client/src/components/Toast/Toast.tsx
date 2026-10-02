import { useEffect } from 'react';
import type { ToastData } from '../../context/ToastContext';
import './Toast.css';

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

const DEFAULT_DURATION = 5000;

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, toast.duration ?? DEFAULT_DURATION);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    // The live region stays mounted so screen readers announce each new toast
    <div className="toast-region" aria-live="polite" role="status">
      {toast && (
        <div key={toast.id} className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`}>
          <span className="toast__message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="toast__close" aria-label="Dismiss" onClick={onDismiss}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
