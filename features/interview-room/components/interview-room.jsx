'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { interviewKeys } from '@/lib/api/query-keys';
import { TextInterview } from './text-interview';
import { VoiceRoom } from './voice-room';

/** /interviews/[id]/room: loads the interview and picks voice or text mode. */
export function InterviewRoom() {
  const { id } = /** @type {{ id: string }} */ (useParams());
  const router = useRouter();
  const [forceText, setForceText] = useState(false);

  const {
    data: interview,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn: () => interviewsApi.get(id),
    staleTime: 0,
  });

  const finished = interview?.status === 'ended' || interview?.status === 'abandoned';

  useEffect(() => {
    if (finished) router.replace(`/interviews/${id}/report`);
  }, [finished, id, router]);

  if (isPending || finished) return <FullPageSpinner label="Loading interview" />;

  if (error) {
    const notFound =
      error instanceof ApiError &&
      (error.code === 'NOT_FOUND' || error.code === 'VALIDATION_ERROR');
    return (
      <main id="main" className="mx-auto max-w-xl px-4 py-16">
        <Alert
          tone="danger"
          title={notFound ? 'Interview not found' : 'Could not load the interview'}
          action={
            notFound ? (
              <Link href="/interviews/new" className={buttonClasses({ variant: 'secondary' })}>
                Start a new one
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            )
          }
        >
          {notFound
            ? 'This interview does not exist or belongs to another account.'
            : errorMessage(error)}
        </Alert>
      </main>
    );
  }

  if (interview.mode === 'text' || forceText) return <TextInterview interview={interview} />;
  return <VoiceRoom interview={interview} onUseText={() => setForceText(true)} />;
}
