'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const ToastContext = createContext(
  /** @type {null | { show: (t: ToastInput) => number, dismiss: (id: number) => void }} */ (null),
);

/**
 * @typedef {object} ToastInput
 * @property {string} title
 * @property {string} [description]
 * @property {'info' | 'success' | 'error'} [tone]
 * @property {number} [durationMs] 0 keeps it until dismissed
 */

const TONES = {
  info: 'border-border',
  success: 'border-success/40',
  error: 'border-danger/50',
};

const DOT = { info: 'bg-accent', success: 'bg-success', error: 'bg-danger' };

/** Renders toasts in a polite live region; errors use an assertive region. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState(/** @type {Array<ToastInput & { id: number }>} */ ([]));
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (/** @type {ToastInput} */ toast) => {
      const id = nextId.current++;
      const tone = toast.tone ?? 'info';
      setToasts((list) => [...list.slice(-3), { ...toast, tone, id }]);
      const duration = toast.durationMs ?? (tone === 'error' ? 8000 : 4000);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  const render = (list) =>
    list.map((t) => (
      <div
        key={t.id}
        className={cn(
          'pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-surface p-4 shadow-lg',
          TONES[t.tone],
        )}
      >
        <span
          className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[t.tone])}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium text-fg">{t.title}</p>
          {t.description ? (
            <p className="text-sm break-words text-fg-muted">{t.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dismiss(t.id)}
          className="-m-1 rounded p-1 text-fg-subtle hover:text-fg"
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    ));

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
        <div aria-live="polite" role="status" className="flex w-full flex-col gap-2">
          {render(toasts.filter((t) => t.tone !== 'error'))}
        </div>
        <div aria-live="assertive" role="alert" className="flex w-full flex-col gap-2">
          {render(toasts.filter((t) => t.tone === 'error'))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
