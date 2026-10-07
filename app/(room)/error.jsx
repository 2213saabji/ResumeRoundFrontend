'use client';

import { RouteError } from '@/components/layout/route-error';

export default function RoomError(props) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10">
      <RouteError {...props} />
    </main>
  );
}
