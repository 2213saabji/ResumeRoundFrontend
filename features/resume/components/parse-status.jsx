'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { profileKeys } from '@/lib/api/query-keys';
import { useResumeStatus } from '../hooks/use-resume-status';

/**
 * Shows parse progress for one resume. Mount with key={resumeId}.
 * @param {{ resumeId: string, autoContinue: boolean, onReupload: () => void }} props
 */
export function ParseStatus({ resumeId, autoContinue, onReupload }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resume, error, timedOut, retry } = useResumeStatus(resumeId);
  const status = resume?.status;

  useEffect(() => {
    if (status !== 'ready') return;
    // A new resume replaces the profile; drop any cached copy.
    queryClient.invalidateQueries({ queryKey: profileKeys.current });
    if (autoContinue) router.push('/profile');
  }, [status, autoContinue, queryClient, router]);

  if (status === 'failed') {
    return (
      <Alert
        tone="danger"
        title="We could not read this resume"
        action={
          <Button variant="secondary" onClick={onReupload}>
            Upload another file
          </Button>
        }
      >
        {resume?.error || 'Please try a different file.'}
      </Alert>
    );
  }

  if (status === 'ready') {
    return (
      <Alert
        tone="success"
        title={`${resume?.originalName ?? 'Your resume'} is ready`}
        action={<Button onClick={() => router.push('/profile')}>Review detected profile</Button>}
      >
        {autoContinue
          ? 'Taking you to your profile...'
          : 'Your profile was built from this resume.'}
      </Alert>
    );
  }

  if (timedOut) {
    return (
      <Alert
        tone="warning"
        title="This is taking longer than expected"
        action={
          <Button variant="secondary" onClick={retry}>
            Check again
          </Button>
        }
      >
        Parsing normally finishes in under 30 seconds. You can keep waiting or upload again later.
      </Alert>
    );
  }

  // A remembered id from an older session that no longer exists: nothing to show.
  if (error instanceof ApiError && error.code === 'NOT_FOUND') return null;

  if (error && !resume) {
    return (
      <Alert
        tone="danger"
        title="Could not check the upload"
        action={
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        }
      >
        {errorMessage(error)}
      </Alert>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Reading your resume...</p>
        <p className="text-sm text-fg-muted">
          {status === 'parsing' ? 'Extracting skills and projects' : 'Queued'}
        </p>
      </div>
      <Progress label="Resume parsing" />
      <p className="text-sm text-fg-muted">This usually takes under 30 seconds.</p>
    </div>
  );
}
