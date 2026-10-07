import { Providers } from '@/components/layout/providers';
import { AuthGuard } from '@/lib/auth/auth-guard';

/** The interview room has no app chrome: one question on screen, large captions. */
export default function RoomLayout({ children }) {
  return (
    <Providers>
      <AuthGuard>{children}</AuthGuard>
    </Providers>
  );
}
