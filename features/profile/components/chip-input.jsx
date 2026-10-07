'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Editable list of short tags. Enter or comma adds, Backspace on an empty input removes the
 * last tag, pasting "a, b, c" adds three. Duplicates (case-insensitive) are ignored.
 *
 * @param {{
 *   label: string,
 *   value: string[],
 *   onChange: (next: string[]) => void,
 *   onBlur?: () => void,
 *   placeholder?: string,
 *   maxItems?: number,
 *   maxLength?: number,
 *   error?: string,
 *   hint?: string,
 * }} props
 */
export function ChipInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Type and press Enter',
  maxItems = 50,
  maxLength = 60,
  error,
  hint,
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState(/** @type {string | null} */ (null));
  const items = value ?? [];
  const full = items.length >= maxItems;

  function add(raw) {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...items];
    const seen = new Set(next.map((s) => s.toLowerCase()));
    for (const part of parts) {
      if (part.length > maxLength) {
        setLocalError(`"${part.slice(0, 20)}..." is longer than ${maxLength} characters.`);
        continue;
      }
      if (seen.has(part.toLowerCase())) continue;
      if (next.length >= maxItems) {
        setLocalError(`At most ${maxItems} items.`);
        break;
      }
      seen.add(part.toLowerCase());
      next.push(part);
    }
    if (next.length !== items.length) onChange(next);
    setDraft('');
  }

  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  const message = error ?? localError;
  const describedBy =
    [hint ? `${id}-hint` : null, message ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        <span className="ml-1.5 font-normal text-fg-subtle">{items.length}</span>
      </label>
      <div
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-surface px-2 py-1.5 focus-within:border-accent',
          message ? 'border-danger' : 'border-border-strong',
        )}
      >
        {items.length > 0 ? (
          <ul className="contents" aria-label={`${label} list`}>
            {items.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="inline-flex items-center gap-1 rounded-md bg-surface-2 py-0.5 pr-1 pl-2 text-sm"
              >
                <span className="max-w-56 truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded p-0.5 text-fg-subtle hover:bg-border hover:text-fg"
                  aria-label={`Remove ${item}`}
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="size-3.5"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={id}
          value={draft}
          disabled={full}
          placeholder={full ? `Limit of ${maxItems} reached` : placeholder}
          aria-describedby={describedBy}
          aria-invalid={!!message || undefined}
          onChange={(e) => {
            setLocalError(null);
            const v = e.target.value;
            if (v.includes(',')) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && draft === '' && items.length > 0) {
              remove(items.length - 1);
            }
          }}
          onBlur={() => {
            if (draft.trim()) add(draft);
            onBlur?.();
          }}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
        />
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
