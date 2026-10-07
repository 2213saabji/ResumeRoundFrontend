import Link from 'next/link';
import { cn } from '@/lib/cn';

/** @param {{ href?: string, className?: string }} props */
export function Logo({ href = '/', className }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2 rounded-md font-semibold text-fg', className)}
      aria-label="ResumeRound home"
    >
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <path
          d="M9 22V10h7.2c2.9 0 4.8 1.6 4.8 4.1 0 1.9-1.1 3.3-2.9 3.8L21.6 22h-3.3l-3.1-3.8H12V22H9Zm3-6.3h4c1.2 0 1.9-.6 1.9-1.6s-.7-1.6-1.9-1.6h-4v3.2Z"
          className="fill-accent-fg"
        />
        <circle cx="24" cy="22" r="2" className="fill-accent-fg" />
      </svg>
      <span className="text-base tracking-tight">ResumeRound</span>
    </Link>
  );
}
