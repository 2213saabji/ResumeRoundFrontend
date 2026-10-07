'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { LABELS, LEVELS, SKILL_BUCKETS } from '@/contracts/enums';
import { PROJECTS_MAX, SKILL_TAGS_MAX } from '@/contracts/limits';
import { profileFormSchema } from '@/contracts/profile';
import { profilesApi } from '@/lib/api/endpoints';
import { applyFieldErrors, errorMessage } from '@/lib/api/errors';
import { profileKeys } from '@/lib/api/query-keys';
import { useCurrentUser } from '@/lib/auth/session';
import { buildProfilePatch, firstErrorMessage, profileToForm } from '../form-utils';
import { ChipInput } from './chip-input';
import { ProjectCard } from './project-card';

export function ProfileReview() {
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

  if (isPending) return <FullPageSpinner label="Loading your profile" />;

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
          title="No profile yet"
          description="Upload your resume first. We build your profile from it, and you can correct it here."
        />
        <Link href="/resume" className={buttonClasses({ size: 'lg' })}>
          Upload resume
        </Link>
      </div>
    );
  }

  // Remount the form when a different profile arrives (e.g. after a new resume upload).
  return <ProfileForm key={`${profile.id}-${profile.updatedAt ?? ''}`} profile={profile} />;
}

function ProfileForm({ profile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show } = useToast();
  const { data: user } = useCurrentUser();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileToForm(profile, user?.level),
  });
  const projects = useFieldArray({ control, name: 'projects' });

  async function save(values, { thenContinue }) {
    const patch = buildProfilePatch(values, dirtyFields);
    try {
      if (Object.keys(patch).length > 0) {
        const updated = await profilesApi.update(patch);
        queryClient.setQueryData(profileKeys.current, updated);
        reset(profileToForm(updated, user?.level));
        show({ tone: 'success', title: 'Profile saved' });
      }
      if (thenContinue) router.push('/interviews/new');
    } catch (err) {
      if (!applyFieldErrors(err, setError)) setError('root', { message: errorMessage(err) });
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={profile.editedByUser ? undefined : 'Step 3 of 3'}
        title="Review your profile"
        description="This is what we detected in your resume. Fix anything that is wrong or missing: the interviewer only asks about what is here."
        actions={profile.editedByUser ? <Badge tone="accent">Edited by you</Badge> : null}
      />

      <form
        onSubmit={handleSubmit((v) => save(v, { thenContinue: false }))}
        noValidate
        className="flex flex-col gap-6 pb-24"
      >
        {errors.root ? <Alert tone="danger">{errors.root.message}</Alert> : null}

        <Card className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Years of experience" error={errors.experienceYears?.message}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                max="50"
                {...register('experienceYears')}
              />
            </Field>
            <Field label="Seniority" error={errors.seniority?.message}>
              <Select {...register('seniority')}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LABELS.level[l]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Domain"
              optional
              hint="e.g. fintech, e-commerce"
              error={errors.domain?.message}
            >
              <Input {...register('domain')} />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold">Skills</h2>
            <p className="text-sm text-fg-muted">
              Remove anything you would not want to be questioned on.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {SKILL_BUCKETS.map((bucket) => (
              <Controller
                key={bucket}
                control={control}
                name={`skills.${bucket}`}
                render={({ field }) => (
                  <ChipInput
                    label={LABELS.skillBucket[bucket]}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    maxItems={SKILL_TAGS_MAX}
                    error={firstErrorMessage(errors.skills?.[bucket])}
                  />
                )}
              />
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Projects</h2>
              <p className="text-sm text-fg-muted">
                Your top projects drive the deep-dive questions. {projects.fields.length}/
                {PROJECTS_MAX}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={projects.fields.length >= PROJECTS_MAX}
              onClick={() =>
                projects.append({ name: '', technologies: [], description: '', scaleSignals: [] })
              }
            >
              Add project
            </Button>
          </div>
          {errors.projects?.message ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.projects.message}
            </p>
          ) : null}
          {projects.fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-fg-muted">
              No projects detected. Add at least one so the interviewer has something concrete to
              ask about.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {projects.fields.map((f, index) => (
                <ProjectCard
                  key={f.id}
                  index={index}
                  control={control}
                  register={register}
                  errors={errors}
                  onRemove={() => projects.remove(index)}
                />
              ))}
            </ul>
          )}
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-3 sm:px-6">
            <p className="mr-auto text-sm text-fg-muted" aria-live="polite">
              {isDirty ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <Button type="submit" variant="secondary" disabled={!isDirty} loading={isSubmitting}>
              Save
            </Button>
            <Button
              loading={isSubmitting}
              onClick={handleSubmit((v) => save(v, { thenContinue: true }))}
            >
              {isDirty ? 'Save and set up interview' : 'Set up interview'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
