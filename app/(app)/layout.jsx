import { AppShell } from '@/components/layout/app-shell';
import { Providers } from '@/components/layout/providers';
import { AuthGuard } from '@/lib/auth/auth-guard';

export default function AppLayout({ children }) {
  return (
    <Providers>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </Providers>
  );
}
