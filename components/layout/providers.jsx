'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { getQueryClient } from '@/lib/query-client';

/**
 * Data and toast providers for interactive route groups. Kept out of the root layout so the
 * static landing page does not ship them.
 */
export function Providers({ children }) {
  const [queryClient] = useState(getQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
