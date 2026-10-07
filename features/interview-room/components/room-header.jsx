import { labelFor } from '@/contracts/enums';

/**
 * Minimal room chrome: what this interview is, plus status on the right.
 * @param {{ interview: any, children?: React.ReactNode }} props
 */
export function RoomHeader({ interview, children }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-14 max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <p className="text-sm font-medium">
          {labelFor('targetRole', interview.role)} interview
          <span className="text-fg-muted">
            {' '}
            · {labelFor('level', interview.level)} ·{' '}
            {labelFor('companyType', interview.companyType)}
          </span>
        </p>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}
