'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
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

  const queryClient = useQueryClient();
  const { data, dataUpdatedAt, error, isPending, refetch } = useQuery({
    queryKey: interviewKeys.session(id),
    queryFn: async () => {
      const session = await interviewsApi.getSession(id);
      // Other pages (report, setup) read the plain interview from the detail key.
      queryClient.setQueryData(interviewKeys.detail(id), session.interview);
      return session;
    },
    staleTime: 0,
    // Read once per visit; afterwards the room's own start/answers responses are the truth.
    refetchOnMount: 'always',
    refetchOnReconnect: false,
  });
  const interview = data?.interview;

  const finished = interview?.status === 'ended' || interview?.status === 'abandoned';

  // Redirect only if the interview was already over when the room opened. An interview that
  // ends while the candidate is here shows its closing message first.
  const [entered, setEntered] = useState(false);
  if (interview && !finished && !entered) setEntered(true);
  const redirect = finished && !entered;

  useEffect(() => {
    if (redirect) router.replace(`/interviews/${id}/report`);
  }, [redirect, id, router]);

  if (isPending || redirect) return <FullPageSpinner label="Loading interview" />;

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

  // Snapshot of the open question and progress, for restoring a reloaded interview.
  const session = {
    progress: data.progress,
    currentTurn: data.currentTurn,
    fetchedAt: dataUpdatedAt,
  };

  if (interview.mode === 'text' || forceText) {
    return <TextInterview interview={interview} session={session} />;
  }
  return <VoiceRoom interview={interview} onUseText={() => setForceText(true)} />;
}
