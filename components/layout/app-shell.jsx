'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { useAuthActions, useCurrentUser } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/interviews/new', label: 'Practice', match: '/interviews' },
  { href: '/resume', label: 'Resume' },
  { href: '/profile', label: 'Profile' },
  { href: '/progress', label: 'Progress' },
  { href: '/settings', label: 'Settings' },
];

/** Header + main container for signed-in pages (everything except the interview room). */
export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { signOut } = useAuthActions();
  const [signingOut, setSigningOut] = useState(false);
  const onboarding = pathname === '/onboarding';

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo href={onboarding ? '/onboarding' : '/interviews/new'} />
          {!onboarding ? (
            <nav aria-label="Main" className="hidden flex-1 md:block">
              <NavLinks pathname={pathname} />
            </nav>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-center gap-3">
            {user?.name || user?.email ? (
              <span className="hidden max-w-40 truncate text-sm text-fg-muted lg:inline">
                {user.name || user.email}
              </span>
            ) : null}
            <Button variant="ghost" size="sm" onClick={handleSignOut} loading={signingOut}>
              Sign out
            </Button>
          </div>
        </div>
        {!onboarding ? (
          <nav aria-label="Main" className="overflow-x-auto border-t border-border md:hidden">
            <div className="flex px-2">
              <NavLinks pathname={pathname} />
            </div>
          </nav>
        ) : null}
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

function NavLinks({ pathname }) {
  return (
    <ul className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.match ?? item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
