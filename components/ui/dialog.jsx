'use client';

import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Modal built on the native <dialog> element: the browser provides focus trapping, Esc to
 * close, the backdrop and inert background. Focus returns to the opener on close.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: React.ReactNode,
 *   description?: React.ReactNode,
 *   children?: React.ReactNode,
 *   footer?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function Dialog({ open, onClose, title, description, children, footer, className }) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const openerRef = useRef(/** @type {Element | null} */ (null));
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Closing is driven by the `open` prop; on close only restore focus to the opener.
    const handleClose = () => {
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
    // 'cancel' fires on Esc; let the controlled `open` prop drive closing.
    const handleCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={(e) => {
        // A click on the backdrop targets the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-0 text-fg shadow-xl',
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="text-sm text-fg-muted">
              {description}
            </p>
          ) : null}
        </div>
        {children}
        {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </dialog>
  );
}
