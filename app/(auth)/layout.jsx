import { Logo } from '@/components/brand/logo';
import { Providers } from '@/components/layout/providers';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-12">
        <div className="w-full max-w-sm">
          <Providers>{children}</Providers>
        </div>
      </main>
    </div>
  );
}
