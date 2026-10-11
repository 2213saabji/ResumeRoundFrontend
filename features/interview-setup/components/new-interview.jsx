'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { TargetJobFields } from '@/components/forms/target-job-fields';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { RadioCardGroup } from '@/components/ui/radio-card-group';
import { INTERVIEW_DURATIONS } from '@/contracts/enums';
import { createInterviewInputSchema } from '@/contracts/interview';
import { interviewsApi, newIdempotencyKey, profilesApi } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors, canReuseIdempotencyKey, errorMessage } from '@/lib/api/errors';
import { interviewKeys, profileKeys } from '@/lib/api/query-keys';
import { useCurrentUser } from '@/lib/auth/session';
import { rememberInterview } from '@/lib/storage';
import { ProfileSummary } from './profile-summary';
import { RecentInterviews } from './recent-interviews';

// Text first: the live voice call is a later milestone (until then voice interviews fall back to typing).
const MODE_OPTIONS = [
  {
    value: 'text',
    label: 'Text',
    description: 'Type your answers; the interviewer adapts to each one',
  },
  {
    value: 'voice',
    label: 'Voice call',
    description: 'Talk with the interviewer (coming soon; you can type meanwhile)',
  },
];

const DURATION_OPTIONS = INTERVIEW_DURATIONS.map((d) => ({
  value: d,
  label: `${d} minutes`,
  description: { 15: 'Quick round', 30: 'Standard round', 45: 'Full loop' }[d],
}));

export function NewInterview() {
  const {
    data: profile,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: profileKeys.current,
    queryFn: profilesApi.getCurrent,
    staleTime: 60_000,
  });

  if (isPending) return <FullPageSpinner label="Loading" />;

  if (error) {
    return (
      <Alert
        tone="danger"
        title="Could not load your profile"
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        }
      >
        {errorMessage(error)}
      </Alert>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="Upload your resume to start"
          description="Interviews are built from your own projects and skills, so we need your resume first."
        />
        <Link href="/resume" className={buttonClasses({ size: 'lg' })}>
          Upload resume
        </Link>
      </div>
    );
  }

  return <SetupForm profile={profile} />;
}

function SetupForm({ profile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  // One key per attempt: a double click or network retry never creates two interviews.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createInterviewInputSchema),
    defaultValues: {
      role: user?.targetRole ?? undefined,
      level: user?.level ?? undefined,
      companyType: user?.companyType ?? undefined,
      durationMin: '30', // radio values are strings; the schema coerces
      mode: 'text',
    },
  });

  const [role, level, companyType, durationMin, mode] = useWatch({
    control,
    name: ['role', 'level', 'companyType', 'durationMin', 'mode'],
  });

  async function onSubmit(values) {
    try {
      const interview = await interviewsApi.create(values, idempotencyKey);
      queryClient.setQueryData(interviewKeys.detail(interview.id), interview);
      rememberInterview(interview);
      router.push(`/interviews/${interview.id}/room`);
    } catch (err) {
      if (!canReuseIdempotencyKey(err)) setIdempotencyKey(newIdempotencyKey());
      if (applyFieldErrors(err, setError)) return;
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setError('root', {
          message: 'Your resume has not been processed yet. Upload it again from the Resume page.',
        });
      } else if (err instanceof ApiError && err.code === 'QUOTA_EXCEEDED') {
        setError('root', {
          message: err.message || 'You have used all free interviews for this month.',
        });
      } else {
        setError('root', { message: errorMessage(err) });
      }
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Set up an interview"
        description="Questions start from your projects and adapt to every answer. You get a scored report at the end."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
            {errors.root ? <Alert tone="danger">{errors.root.message}</Alert> : null}
            <TargetJobFields
              register={register}
              errors={errors}
              values={{ role, level, companyType }}
              roleName="role"
            />
            <RadioCardGroup
              legend="Duration"
              columns={3}
              inputProps={register('durationMin')}
              value={durationMin}
              error={errors.durationMin?.message}
              options={DURATION_OPTIONS}
            />
            <RadioCardGroup
              legend="Mode"
              inputProps={register('mode')}
              value={mode}
              error={errors.mode?.message}
              options={MODE_OPTIONS}
            />
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-fg-subtle">
                {mode === 'voice'
                  ? 'You will check your microphone before the interview starts.'
                  : 'You will see the agenda before the first question.'}
              </p>
              <Button type="submit" size="lg" loading={isSubmitting}>
                Create interview
              </Button>
            </div>
          </form>
        </Card>
        <div className="flex flex-col gap-6">
          <ProfileSummary profile={profile} />
        </div>
      </div>
      <RecentInterviews />
    </div>
  );
}
