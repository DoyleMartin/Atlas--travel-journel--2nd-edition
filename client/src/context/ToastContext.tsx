import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import Toast from '../components/Toast/Toast';

export interface ToastOptions {
  message: string;
  action?: { label: string; onClick: () => void };
  tone?: 'default' | 'error';
  /** ms before auto-dismiss (default 5000) */
  duration?: number;
}

export interface ToastData extends ToastOptions {
  id: number;
}

export interface ToastContextValue {
  /** Shows a toast, replacing any current one. */
  showToast: (options: ToastOptions) => void;
  dismissToast: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
