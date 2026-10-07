'use client';

import { useId, useState } from 'react';
import { RESUME_EXTENSIONS, RESUME_MIME_TYPES } from '@/contracts/limits';
import { cn } from '@/lib/cn';

const ACCEPT = [...RESUME_EXTENSIONS, ...RESUME_MIME_TYPES].join(',');

/**
 * Click, keyboard or drag-and-drop file picker. The native input stays in the tab order
 * (visually hidden) so it works with keyboards and screen readers.
 * @param {{ onFile: (file: File) => void, disabled?: boolean, file?: File | null }} props
 */
export function DropZone({ onFile, disabled, file }) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  function pick(files) {
    const f = files?.[0];
    if (f) onFile(f);
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
        'has-focus-visible:ring-2 has-focus-visible:ring-ring',
        dragging
          ? 'border-accent bg-accent-soft'
          : 'border-border-strong bg-surface hover:bg-surface-2',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <svg viewBox="0 0 24 24" className="size-10 text-fg-subtle" fill="none" aria-hidden="true">
        <path
          d="M12 16V4m0 0-4 4m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-medium text-fg">
        {file ? file.name : 'Drop your resume here, or click to choose a file'}
      </span>
      <span className="text-sm text-fg-muted">PDF or DOCX, up to 5 MB</span>
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = ''; // allow choosing the same file again
        }}
      />
    </label>
  );
}
