'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { LABELS } from '@/contracts/enums';
import { recentInterviews } from '@/lib/storage';

const noopSubscribe = () => () => {};
let cache = { raw: '', list: [] };

/** useSyncExternalStore needs a stable snapshot, so cache by serialised value. */
function snapshot() {
  const list = recentInterviews();
  const raw = JSON.stringify(list);
  if (raw !== cache.raw) cache = { raw, list };
  return cache.list;
}

const EMPTY = [];

/** Interviews started in this browser (there is no list endpoint yet). */
export function RecentInterviews() {
  const list = useSyncExternalStore(noopSubscribe, snapshot, () => EMPTY);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="recent" className="flex flex-col gap-3">
      <h2 id="recent" className="font-semibold">
        Recent interviews
      </h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {list.map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <span>
              {LABELS.targetRole[i.role] ?? i.role} · {LABELS.level[i.level] ?? i.level} ·{' '}
              {LABELS.mode[i.mode] ?? i.mode}
              <span className="block text-xs text-fg-subtle">
                {new Date(i.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </span>
            <span className="flex gap-3">
              <Link
                href={`/interviews/${i.id}/room`}
                className="font-medium text-accent hover:underline"
              >
                Open
              </Link>
              <Link
                href={`/interviews/${i.id}/report`}
                className="font-medium text-accent hover:underline"
              >
                Report
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
