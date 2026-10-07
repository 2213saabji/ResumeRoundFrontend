import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="text-2xl font-semibold">We could not find that page</h1>
      <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
        Back to home
      </Link>
    </main>
  );
}
