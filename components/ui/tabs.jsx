'use client';

import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Accessible tabs (WAI-ARIA tabs pattern): arrow keys move between tabs, Home/End jump.
 * Controlled: pass `value` and `onChange`.
 *
 * @param {{
 *   tabs: Array<{ value: string, label: React.ReactNode, content: React.ReactNode }>,
 *   value: string,
 *   onChange: (value: string) => void,
 *   label: string,
 *   className?: string,
 * }} props
 */
export function Tabs({ tabs, value, onChange, label, className }) {
  const baseId = useId();
  const listRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  function focusTab(index) {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.value);
    const el = listRef.current?.querySelector(`[data-value="${CSS.escape(next.value)}"]`);
    if (el instanceof HTMLElement) el.focus();
  }

  function onKeyDown(e) {
    const current = tabs.findIndex((t) => t.value === value);
    if (e.key === 'ArrowRight') focusTab(current + 1);
    else if (e.key === 'ArrowLeft') focusTab(current - 1);
    else if (e.key === 'Home') focusTab(0);
    else if (e.key === 'End') focusTab(tabs.length - 1);
    else return;
    e.preventDefault();
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.value}`}
              tabIndex={selected ? 0 : -1}
              data-value={tab.value}
              onClick={() => onChange(tab.value)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                selected
                  ? 'border-accent text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.value}
          role="tabpanel"
          id={`${baseId}-panel-${tab.value}`}
          aria-labelledby={`${baseId}-tab-${tab.value}`}
          hidden={tab.value !== value}
          tabIndex={0}
        >
          {tab.value === value ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
